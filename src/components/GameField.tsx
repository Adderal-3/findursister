import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { animate, motion } from 'framer-motion';
import { ScanSearch } from 'lucide-react';
import { getItem } from '../game/items';
import { ITEM_GEOMETRY } from '../game/itemGeometry';
import { SCENE_ITEM_FRACTION, SCENE_SCALE } from '../game/scene';
import { LEVEL_TYPE_LABELS } from '../game/levels';
import { unlockAudio } from '../game/sound';
import type { Game } from '../hooks/useGame';
import type { PlacedItem } from '../game/types';
import bgQingyaWarm from '../assets/backgrounds/qingya-courtyard-warm-v3.webp';

/** 点按 / 拖动判定阈值（像素）：按下后位移超过它就视为拖动，不触发任何点击判定 */
const DRAG_THRESHOLD_PX = 8;
/** 透明素材命中蒙版精度；123 件素材全部缓存后也只有约 0.5 MiB。 */
const HIT_MASK_SIZE = 64;
const HIT_ALPHA_THRESHOLD = 22;
/** 只在真实透明轮廓外扩少量像素，兼顾触屏并避免细长物品隔空抢点。 */
const TOUCH_PADDING_PX = 6;

interface AlphaHitMask {
  alpha: Uint8ClampedArray;
}

const alphaHitMasks = new Map<string, AlphaHitMask>();
const pendingHitMasks = new Set<string>();

function loadAlphaHitMask(itemId: string) {
  if (alphaHitMasks.has(itemId) || pendingHitMasks.has(itemId)) return;
  pendingHitMasks.add(itemId);
  const image = new Image();
  image.decoding = 'async';
  // 上线后素材走 CDN 跨域，不加这句 canvas 会被污染，getImageData 抛 SecurityError。
  image.crossOrigin = 'anonymous';
  image.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = HIT_MASK_SIZE;
    canvas.height = HIT_MASK_SIZE;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (context) {
      context.drawImage(image, 0, 0, HIT_MASK_SIZE, HIT_MASK_SIZE);
      const pixels = context.getImageData(0, 0, HIT_MASK_SIZE, HIT_MASK_SIZE).data;
      const alpha = new Uint8ClampedArray(HIT_MASK_SIZE * HIT_MASK_SIZE);
      for (let index = 0; index < alpha.length; index += 1) {
        alpha[index] = pixels[index * 4 + 3];
      }
      alphaHitMasks.set(itemId, { alpha });
    }
    pendingHitMasks.delete(itemId);
  };
  image.onerror = () => pendingHitMasks.delete(itemId);
  image.src = getItem(itemId).img;
}

/**
 * 在素材的 0..1 局部坐标中检查透明像素。
 * 返回命中点到真实轮廓的蒙版像素距离；null 表示未命中。
 */
function alphaHitDistance(mask: AlphaHitMask, u: number, v: number, paddingPx: number): number | null {
  const centerX = Math.round(u * (HIT_MASK_SIZE - 1));
  const centerY = Math.round(v * (HIT_MASK_SIZE - 1));
  const radius = Math.max(0, Math.ceil(paddingPx));
  let best = Number.POSITIVE_INFINITY;

  for (let y = Math.max(0, centerY - radius); y <= Math.min(HIT_MASK_SIZE - 1, centerY + radius); y += 1) {
    for (let x = Math.max(0, centerX - radius); x <= Math.min(HIT_MASK_SIZE - 1, centerX + radius); x += 1) {
      const distance = Math.hypot(x - centerX, y - centerY);
      if (distance > radius || distance >= best) continue;
      if (mask.alpha[y * HIT_MASK_SIZE + x] >= HIT_ALPHA_THRESHOLD) best = distance;
    }
  }
  return Number.isFinite(best) ? best : null;
}

/**
 * 场景里单个物品（纯渲染）。
 * 注意：物品自身不再响应指针事件，命中判定统一由视口层在"轻点"时做，
 * 这样才能区分"点按物品"和"按住拖动场景"。
 */
const FieldItem = memo(function FieldItem({
  item, baseSize, hinted,
}: {
  item: PlacedItem;
  baseSize: number;
  hinted: boolean;
}) {
  const def = getItem(item.itemId);
  const size = baseSize * item.scale;

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 select-none"
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        zIndex: Math.round(item.y),
        // 定位与动画必须分层：Framer Motion 的 rotate 会覆盖同一元素上的 translate。
        pointerEvents: 'none',
      }}
    >
      <motion.button
        type="button"
        tabIndex={-1}
        initial={{ scale: 0, opacity: 0 }}
        animate={
          item.found
            ? { scale: 0, opacity: 0, rotate: item.rot + 120 }
            : { scale: 1, opacity: 1, rotate: item.rot }
        }
        transition={{ type: 'spring', stiffness: 320, damping: 20 }}
        className="relative block select-none"
        aria-label={def.name}
      >
        {/* 提示高亮圈 */}
        {hinted && !item.found && (
          <span className="absolute inset-0 -m-2 animate-ping rounded-full border-4 border-amber-400" />
        )}
        {hinted && !item.found && (
          <span className="absolute inset-0 -m-2 rounded-full border-4 border-amber-400 bg-amber-300/30" />
        )}
        {def.img ? (
          <img
            src={def.img}
            alt={def.name}
            draggable={false}
            className="block object-contain"
            style={{ width: size, height: size }}
          />
        ) : (
          <span
            className="block leading-none drop-shadow-sm"
            style={{ fontSize: size }}
          >
            {def.emoji}
          </span>
        )}
      </motion.button>
    </div>
  );
});

/** 寻物主场景（可拖动探索的虚拟大场景） */
export function GameField({ game }: { game: Game }) {
  const fieldRef = useRef<HTMLDivElement>(null);
  /** 内层可平移的虚拟大场景容器；拖动时直接改它的 transform，不触发 React 重渲染。 */
  const sceneRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ w: 800, h: 500 }); // 可视区尺寸
  const [dragging, setDragging] = useState(false);

  /** 镜头平移量（始终 ≤ 0）。唯一真源是 ref；只在事件和 effect 中读取，避免拖动 60+ 次/秒的 setState。 */
  const panRef = useRef({ x: 0, y: 0 });
  /** 一次按压的拖动过程快照（用 ref 避免闭包旧值） */
  const dragRef = useRef({ active: false, dragging: false, startX: 0, startY: 0, panX: 0, panY: 0 });
  /** 提示联动镜头的补间动画 */
  const panAnimRef = useRef<{ stop: () => void } | null>(null);

  /**
   * 平移镜头：只写 ref + 直接改 DOM transform，绕开 React 渲染。
   * 拖动 / 补间的每一帧都走这里，因此 50+ 个物件不再每帧重新协调。
   */
  const paintPan = useCallback((p: { x: number; y: number }) => {
    panRef.current = p;
    const el = sceneRef.current;
    if (el) el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
  }, []);

  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    const updateSize = () => {
      const nextView = { w: el.clientWidth, h: el.clientHeight };
      setView(nextView);
      const nextWorldWidth = nextView.w * SCENE_SCALE.w;
      paintPan({ x: (nextView.w - nextWorldWidth) / 2, y: 0 });
    };
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    updateSize();
    return () => ro.disconnect();
  }, [paintPan]);

  // 每轮提前生成当前场景素材的透明像素蒙版，轻点时即可同步精确命中。
  useEffect(() => {
    for (const item of game.items) loadAlphaHitMask(item.itemId);
  }, [game.items]);

  // 虚拟大场景的像素尺寸
  const worldW = view.w * SCENE_SCALE.w;
  const worldH = view.h * SCENE_SCALE.h;

  /** 把平移量钳制在场景边界内（永远不会露出场景外） */
  const clampPan = useCallback(
    (x: number) => ({
      x: Math.min(0, Math.max(view.w - worldW, x)),
      // 本玩法只允许水平探索，纵向始终锁定。
      y: 0,
    }),
    [view.w, worldW],
  );

  // 视口尺寸变化时重新钳制当前镜头
  useEffect(() => {
    paintPan(clampPan(panRef.current.x));
  }, [clampPan, paintPan]);

  // 提示联动镜头：提示物品在视野外时，平滑平移过去让它进入视野
  useEffect(() => {
    if (game.hintUid == null) return;
    const item = game.items.find((i) => i.uid === game.hintUid);
    if (!item || item.found) return;
    const ix = (item.x / 100) * worldW;
    const iy = (item.y / 100) * worldH;
    const cur = panRef.current;
    const margin = 80; // 距视野边缘多少像素以内也算"看得见"
    const inView =
      ix >= -cur.x + margin && ix <= -cur.x + view.w - margin &&
      iy >= -cur.y + margin && iy <= -cur.y + view.h - margin;
    if (inView) return;
    const target = clampPan(-(ix - view.w / 2));
    const from = { ...cur };
    panAnimRef.current?.stop();
    panAnimRef.current = animate(0, 1, {
      duration: 0.55,
      ease: 'easeInOut',
      onUpdate: (t) =>
        paintPan({
          x: from.x + (target.x - from.x) * t,
          y: from.y + (target.y - from.y) * t,
        }),
    });
  }, [game.hintUid, game.items, view, worldW, worldH, clampPan, paintPan]);

  // 卸载时停掉镜头补间
  useEffect(() => () => panAnimRef.current?.stop(), []);

  // 与装箱器使用同一基准；短屏会整体缩放，但不改变物体间的有机疏密。
  const baseSize = Math.max(
    50,
    Math.min(146, view.w * SCENE_ITEM_FRACTION, view.h * SCENE_ITEM_FRACTION),
  );

  /**
   * 轻点命中测试：视口坐标 → 虚拟大场景坐标，
   * 在容错框重叠时优先选离点击位置最近的物品，避免密集场景里被邻近物体“抢点击”。
   */
  const handleTap = useCallback(
    (clientX: number, clientY: number) => {
      const rect = fieldRef.current?.getBoundingClientRect();
      if (!rect) return;
      const wx = clientX - rect.left - panRef.current.x;
      const wy = clientY - rect.top - panRef.current.y;
      let hit: PlacedItem | null = null;
      let hitDistance = Number.POSITIVE_INFINITY;
      for (const item of game.items) {
        if (item.found) continue;
        const ix = (item.x / 100) * worldW;
        const iy = (item.y / 100) * worldH;
        const radians = (item.rot * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const dx = wx - ix;
        const dy = wy - iy;
        // 反向旋转点击坐标，使透明蒙版与画面中的旋转素材完全对齐。
        const localX = dx * cos + dy * sin;
        const localY = -dx * sin + dy * cos;
        const size = baseSize * item.scale;
        const u = localX / size + 0.5;
        const v = localY / size + 0.5;
        const padding = Math.min(TOUCH_PADDING_PX, size * 0.1);
        const mask = alphaHitMasks.get(item.itemId);
        let distance: number | null = null;

        if (mask && u >= -0.12 && u <= 1.12 && v >= -0.12 && v <= 1.12) {
          distance = alphaHitDistance(mask, u, v, (padding / size) * HIT_MASK_SIZE);
        } else if (!mask) {
          // 图片尚在解码时使用同样会随素材旋转的紧凑可见边界兜底。
          const geometry = ITEM_GEOMETRY[item.itemId] ?? { width: 0.875, height: 0.875 };
          const halfX = (size * geometry.width) / 2 + padding;
          const halfY = (size * geometry.height) / 2 + padding;
          if (Math.abs(localX) <= halfX && Math.abs(localY) <= halfY) {
            distance = Math.hypot(localX / halfX, localY / halfY) + 1;
          }
        }

        if (distance != null && (distance < hitDistance || (distance === hitDistance && hit && item.y > hit.y))) {
          hit = item;
          hitDistance = distance;
        }
      }
      if (hit) {
        // PointerUp 同步解锁音频，确保移动端第一次命中也能立即播放正确音效。
        unlockAudio();
        game.handleItemClick(hit.uid);
      } else {
        unlockAudio();
        // 点到空背景：换成虚拟大场景的百分比坐标报误点
        game.handleFieldMiss((wx / worldW) * 100, (wy / worldH) * 100);
      }
    },
    [game, baseSize, worldW, worldH],
  );

  // ---------- 拖动平移（Pointer Events，鼠标 / 触摸通用） ----------
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return; // 只响应主按键
    panAnimRef.current?.stop(); // 打断提示镜头动画，玩家接管
    dragRef.current = {
      active: true,
      dragging: false,
      startX: e.clientX,
      startY: e.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
    };
    fieldRef.current?.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = dragRef.current;
      if (!d.active) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        d.dragging = true;
        setDragging(true);
      }
      // 直接写 DOM，不走 setState，拖动全程零 React 重渲染。
      if (d.dragging) paintPan(clampPan(d.panX + dx));
    },
    [clampPan, paintPan],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
      const d = dragRef.current;
      if (!d.active) return;
      d.active = false;
      const wasDragging = d.dragging;
      d.dragging = false;
      setDragging(false);
      // 只有真正的轻点（位移没超过阈值）才触发命中 / 误点判定
      if (!wasDragging && !cancelled) handleTap(e.clientX, e.clientY);
    },
    [handleTap],
  );

  // 点错时的震动动画（shake 计数变化即重播）
  const shakeAnim = useMemo(
    () => (game.shake > 0 ? { x: [0, -12, 12, -8, 8, -4, 0] } : { x: 0 }),
    [game.shake],
  );

  const taskLabel = game.targets.length > 1
    ? `${game.targets.length} 项寻找目标`
    : game.targets[0]?.label ?? '忙忙碌碌寻宝藏';
  const urgent = game.timeLeft <= 10;
  const levelType = game.mode === 'levels' ? game.levelInfo.type : null;

  return (
    <motion.div
      animate={shakeAnim}
      transition={{ duration: 0.4 }}
      className="relative h-full w-full bg-[#efe5cf]"
    >
      {/* 视口：固定一屏，负责接收指针事件 */}
      <div
        ref={fieldRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endDrag(e, false)}
        onPointerCancel={(e) => endDrag(e, true)}
        className={`relative h-full w-full touch-none overflow-hidden select-none ${
          dragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{ backgroundImage: `url(${bgQingyaWarm})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        {/* 虚拟大场景：放大的内层平移容器，物品 / 飘字 / 粒子都挂在这里（% 坐标不变） */}
        {/* 平移只写这一层的 transform（走 sceneRef 直接改 DOM），拖动时不触发 React 重渲染。 */}
        <div
          ref={sceneRef}
          className="pointer-events-none absolute top-0 left-0"
          style={{
            width: `${SCENE_SCALE.w * 100}%`,
            height: `${SCENE_SCALE.h * 100}%`,
            backgroundImage: `url(${bgQingyaWarm})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* 场景物品 */}
          {game.items.map((item) => (
            <FieldItem
              key={item.uid}
              item={item}
              baseSize={baseSize}
              hinted={game.hintUid === item.uid}
            />
          ))}

          {/* 飘字特效 */}
          {game.floats.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -46, scale: 1.15 }}
              transition={{ duration: 0.85, ease: 'easeOut' }}
              className={`pointer-events-none absolute z-[999] -translate-x-1/2 text-lg font-black drop-shadow-md ${
                f.kind === 'score'
                  ? 'text-amber-700'
                  : f.kind === 'penalty'
                    ? 'text-red-500'
                    : f.kind === 'combo'
                      ? 'text-orange-500'
                      : 'text-yellow-700'
              }`}
              style={{ left: `${f.x}%`, top: `${f.y}%` }}
            >
              {f.text}
            </motion.div>
          ))}

          {/* 找到时的粒子爆发 */}
          {game.bursts.map((b) => (
            <div
              key={b.id}
              className="pointer-events-none absolute z-[998]"
              style={{ left: `${b.x}%`, top: `${b.y}%` }}
            >
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 8) * Math.PI * 2;
                return (
                  <motion.span
                    key={i}
                    initial={{ x: 0, y: 0, opacity: 1, scale: 0.6 }}
                    animate={{
                      x: Math.cos(angle) * 44,
                      y: Math.sin(angle) * 44,
                      opacity: 0,
                      scale: 1.2,
                    }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="absolute text-sm"
                  >
                    {b.emoji}
                  </motion.span>
                );
              })}
            </div>
          ))}
        </div>

        {levelType === 'mist' && (
          <div
            className="pointer-events-none absolute inset-0 z-[30] opacity-35"
            style={{
              backgroundImage: [
                'radial-gradient(circle at 18% 30%, rgba(255,255,255,.06), rgba(244,239,222,.4) 42%, transparent 70%)',
                'radial-gradient(circle at 82% 72%, rgba(255,255,255,.08), rgba(232,226,207,.34) 38%, transparent 72%)',
              ].join(','),
            }}
          />
        )}
        {levelType === 'night' && (
          <div
            className="pointer-events-none absolute inset-0 z-[30]"
            style={{
              // 只在四周压暗形成夜色氛围，中心保持明亮可辨物，避免整屏发灰。
              background: 'radial-gradient(circle at 50% 46%, transparent 0 46%, rgba(30,40,64,.16) 78%, rgba(20,28,50,.3) 100%)',
            }}
          />
        )}
        {levelType === 'boss' && (
          <div className="pointer-events-none absolute inset-0 z-[30] shadow-[inset_0_0_60px_rgba(116,49,31,.2)] ring-2 ring-inset ring-[#9e593d]/20" />
        )}

        {/* 点错红闪（固定在视口，不随场景平移） */}
        {game.shake > 0 && (
          <motion.div
            key={game.shake}
            initial={{ opacity: 0.28 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="pointer-events-none absolute inset-0 z-[997] rounded-3xl bg-red-500"
          />
        )}

        {/* 新委托以短促电影字幕入场，不打断玩家操作。 */}
        <motion.div
          key={`brief-${game.round}`}
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: [0, 1, 1, 0], y: [18, 0, 0, -12], scale: [0.96, 1, 1, 1.02] }}
          transition={{ duration: 1.8, times: [0, 0.16, 0.72, 1], ease: 'easeOut' }}
          className="pointer-events-none absolute inset-x-0 top-[39%] z-40 flex justify-center px-4"
        >
          <div className="qingya-level-plaque flex min-w-64 items-center justify-center gap-3 px-7 py-3 text-white shadow-2xl">
            <ScanSearch className="h-5 w-5 text-[#f8e6ad]" />
            <div>
              <div className="text-[9px] font-bold tracking-[0.24em] text-[#ead8bc]">
                {game.mode === 'levels'
                  ? `第 ${game.level} 关 · ${LEVEL_TYPE_LABELS[game.levelInfo.type]}`
                  : `第 ${game.level} 波 · 夜巡令`}
              </div>
              <div className="font-display text-base font-black tracking-wider text-[#fff9dc]">{taskLabel}</div>
            </div>
          </div>
        </motion.div>

        {/* 最后十秒只用边缘光提醒，不再增加额外按钮或文字。 */}
        {urgent && (
          <motion.div
            animate={{ opacity: [0.18, 0.42, 0.18] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
            className="pointer-events-none absolute inset-0 z-[996] shadow-[inset_0_0_55px_rgba(177,45,34,.82)] ring-2 ring-[#b43f34]/55"
          />
        )}
      </div>
    </motion.div>
  );
}
