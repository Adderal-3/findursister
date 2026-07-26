// ============================================================
// 忙忙碌碌寻宝藏 —— 属性关卡场景生成器
// ============================================================

import type { ItemDef, PlacedItem, TagId, TargetTask, TaskRule } from './types';
import { getItemTags, ITEMS } from './items';
import { ITEM_GEOMETRY } from './itemGeometry';
import type { LevelType } from './levels';

/**
 * 场景在水平方向延展 1.5 屏：给物件留出横向空间，避免一屏内互相压叠，
 * 同时恢复左右拖动探索。纵向锁定一屏。
 */
export const SCENE_SCALE = { w: 1.5, h: 1 } as const;
/** 单件物体的基准边长相对视口短边的比例，生成器与渲染器共用。 */
export const SCENE_ITEM_FRACTION = 0.19;

const BASE_X_PERCENT = (SCENE_ITEM_FRACTION / SCENE_SCALE.w) * 100;
const BASE_Y_PERCENT = SCENE_ITEM_FRACTION * 100;
const EDGE_SAFE_X = 1.4;
const EDGE_SAFE_Y = 1.3;
/** 顶部关卡牌 + 任务条占位，物件不得侵入，否则会被 HUD 遮挡。 */
const HUD_SAFE_TOP = 22;
/** 底部三枚圆钮 + 文字标签占位，避免物件躲到按钮后面。 */
const ACTION_SAFE_BOTTOM = 13;
const GAP_X = 0.04;
const GAP_Y = 0.06;
/** 使用完整可见轮廓包围盒装箱，保证单屏移动画布里的主体不会互相压叠。 */
const PACKING_FOOTPRINT_FACTOR = 1;

let uidCounter = 1;

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function shuffle<T>(items: T[]): T[] {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}

interface PackedRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

interface PreparedItem {
  def: ItemDef;
  isTarget: boolean;
  targetTaskIds: string[];
  scale: number;
  rot: number;
  area: number;
  landmarkIndex?: number;
  landmarkCount?: number;
}

/** 按透明主体尺寸与旋转角度估算屏幕上的可见包围盒。 */
function footprint(def: ItemDef, scale: number, rot: number): { width: number; height: number } {
  const geometry = ITEM_GEOMETRY[def.id] ?? { width: 0.875, height: 0.875 };
  const angle = Math.abs(rot) * (Math.PI / 180);
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return {
    width: BASE_X_PERCENT * scale * (geometry.width * cos + geometry.height * sin) * PACKING_FOOTPRINT_FACTOR,
    height: BASE_Y_PERCENT * scale * (geometry.width * sin + geometry.height * cos) * PACKING_FOOTPRINT_FACTOR,
  };
}

function paddedRect(x: number, y: number, width: number, height: number): PackedRect {
  return {
    left: x - width / 2 - GAP_X,
    right: x + width / 2 + GAP_X,
    top: y - height / 2 - GAP_Y,
    bottom: y + height / 2 + GAP_Y,
  };
}

function collides(candidate: PackedRect, placed: PackedRect[]): boolean {
  return placed.some((other) => !(
    candidate.right <= other.left || candidate.left >= other.right ||
    candidate.bottom <= other.top || candidate.top >= other.bottom
  ));
}

/** 先遍历完整池再重复，避免目标数量较大时总刷出同一件物品。 */
function pickInRounds<T>(pool: T[], count: number): T[] {
  const output: T[] = [];
  while (output.length < count) {
    output.push(...shuffle(pool).slice(0, count - output.length));
  }
  return output;
}

export interface SceneSpec {
  rules: TaskRule[];
  distractors: number;
  levelType?: LevelType;
  /** 隐藏发现追赶：候选充足时，每组优先混入至少一件尚未发现的目标。 */
  preferredTargetIds?: Set<string>;
}

export interface GeneratedScene {
  items: PlacedItem[];
  targets: TargetTask[];
}

export function itemMatchesTask(item: ItemDef, rule: TaskRule): boolean {
  const tags = new Set<TagId>(getItemTags(item));
  const satisfiesAll = (rule.allOf ?? []).every((tag) => tags.has(tag));
  const satisfiesAny = !rule.anyOf?.length || rule.anyOf.some((tag) => tags.has(tag));
  const satisfiesNone = !(rule.noneOf ?? []).some((tag) => tags.has(tag));
  return satisfiesAll && satisfiesAny && satisfiesNone;
}

export function generateScene(spec: SceneSpec): GeneratedScene {
  if (!spec.rules.length) throw new Error('场景至少需要一个寻找目标');

  const selectedTargetIds = new Set<string>();
  const targetEntries = new Map<string, { def: ItemDef; targetTaskIds: string[] }>();
  const targetTasks: TargetTask[] = [];

  for (const rule of spec.rules) {
    const targetPool = ITEMS.filter(
      (item) => !item.distractorOnly
        && !selectedTargetIds.has(item.id)
        && itemMatchesTask(item, rule),
    );
    const targetCount = Math.min(
      Math.max(1, Math.trunc(rule.targetCount)),
      targetPool.length,
    );
    const preferredPool = spec.preferredTargetIds
      ? targetPool.filter((item) => spec.preferredTargetIds?.has(item.id))
      : [];
    const preferredCount = Math.min(
      preferredPool.length,
      targetCount,
      Math.max(1, Math.ceil(targetCount * 0.4)),
    );
    const preferred = shuffle(preferredPool).slice(0, preferredCount);
    const preferredIds = new Set(preferred.map((item) => item.id));
    const remaining = shuffle(targetPool.filter((item) => !preferredIds.has(item.id)))
      .slice(0, targetCount - preferred.length);
    const selected = shuffle([...preferred, ...remaining]);
    for (const def of selected) {
      selectedTargetIds.add(def.id);
      targetEntries.set(def.id, { def, targetTaskIds: [rule.id] });
    }
    targetTasks.push({
      taskId: rule.id,
      label: rule.label,
      allOf: rule.allOf,
      anyOf: rule.anyOf,
      noneOf: rule.noneOf,
      remaining: selected.length,
      total: selected.length,
    });
  }

  const targetDefs = [...targetEntries.values()];
  const taskUsesLandmarks = targetDefs.some((entry) => entry.def.role === 'landmark');
  const distractorPool = ITEMS.filter(
    (item) => (taskUsesLandmarks || item.role !== 'landmark')
      && !selectedTargetIds.has(item.id)
      && (item.distractorOnly || !spec.rules.some((rule) => itemMatchesTask(item, rule))),
  );
  if (targetTasks.some((target) => target.total === 0) || !distractorPool.length) {
    throw new Error(`任务 ${spec.rules.map((rule) => rule.id).join('|')} 缺少目标或干扰物素材`);
  }

  // 干扰项也先铺满完整素材池再重复，减少一屏里无意义的高频重复图。
  const distractorDefs = pickInRounds(distractorPool, spec.distractors);
  const spawnList: Array<{ def: ItemDef; isTarget: boolean; targetTaskIds: string[] }> = shuffle([
    ...targetDefs.map((entry) => ({ ...entry, isTarget: true })),
    ...distractorDefs.map((def) => ({ def, isTarget: false, targetTaskIds: [] })),
  ]);

  // 先放大物体，再填小物体，是常见的二维装箱做法；可减少后段无处可放的概率。
  const landmarkCount = spawnList.filter((entry) => entry.def.role === 'landmark').length;
  // 少物件关直接放大，高密度后期关再按数量平滑收缩，避免开局“又小又散”。
  const densityScale = Math.max(0.42, Math.min(1.08, Math.sqrt(20 / spawnList.length)));
  let landmarkIndex = 0;
  const prepared: PreparedItem[] = spawnList
    .map((entry) => {
      const isLandmark = entry.def.role === 'landmark';
      // 细长物（针、钩、簪、箭等）的透明画布占比虽大，但真实笔画很细，需要额外可见性补偿。
      const visibilityBoost = entry.def.visualTags?.includes('slender') ? 1.16 : 1;
      const scale = (isLandmark
        ? rand(1, 1.2)
        : entry.isTarget && spec.levelType === 'boss'
          ? rand(0.96, 1.14)
        : entry.isTarget
          ? rand(1.05, 1.34)
          : rand(0.9, 1.3)) * (isLandmark ? 1 : densityScale * visibilityBoost);
      const rot = isLandmark ? 0 : rand(-25, 25);
      const size = footprint(entry.def, scale, rot);
      return {
        ...entry,
        scale,
        rot,
        area: size.width * size.height,
        landmarkIndex: isLandmark ? landmarkIndex++ : undefined,
        landmarkCount: isLandmark ? landmarkCount : undefined,
      };
    })
    .sort((a, b) => (
      Number(b.isTarget) - Number(a.isTarget)
      || Number(b.landmarkIndex != null) - Number(a.landmarkIndex != null)
      || b.area - a.area
    ));

  // 聚集中心完全随机，不再沿横向均分；减少视觉上的等距分栏与整齐行列。
  // 候选点以不对称抖动散落在中心附近，同时保留部分全场随机点形成自然留白。
  const clusterCount = Math.max(4, Math.round(spawnList.length / 14));
  const clusters = Array.from({ length: clusterCount }, () => ({
    x: rand(6, 94),
    y: rand(HUD_SAFE_TOP + 4, 100 - ACTION_SAFE_BOTTOM - 4),
    spreadX: rand(7, 15),
    spreadY: rand(10, 22),
  }));
  const packedRects: PackedRect[] = [];
  const placed: PlacedItem[] = [];

  for (const entry of prepared) {
    let scale = entry.scale;
    const minimumScale = entry.landmarkIndex != null
      ? 0.88
      : entry.isTarget
        ? (entry.def.visualTags?.includes('slender') ? 0.76 : 0.68)
        : (entry.def.visualTags?.includes('slender') ? 0.48 : 0.4);
    let position: { x: number; y: number; rect: PackedRect } | null = null;

    // 地标优先落在场景下半部的固定槽位，保持水平且不参与随机聚类。
    if (entry.landmarkIndex != null && entry.landmarkCount) {
      const size = footprint(entry.def, scale, 0);
      const x = ((entry.landmarkIndex + 0.75) / (entry.landmarkCount + 0.5)) * 100;
      const y = entry.landmarkIndex % 2 === 0 ? 76 : 84;
      const rect = paddedRect(x, y, size.width, size.height);
      if (!collides(rect, packedRects)) {
        position = { x, y, rect };
      }
    }

    // 每轮尝试失败后只缩小一点，保留明显但不过度的大小层次。
    for (let shrinkRound = 0; shrinkRound < 14 && !position; shrinkRound += 1) {
      const size = footprint(entry.def, scale, entry.rot);
      const canvasHalfX = (BASE_X_PERCENT * scale) / 2;
      const canvasHalfY = (BASE_Y_PERCENT * scale) / 2;
      const minX = Math.max(size.width / 2 + EDGE_SAFE_X, canvasHalfX + EDGE_SAFE_X);
      const maxX = Math.min(100 - size.width / 2 - EDGE_SAFE_X, 100 - canvasHalfX - EDGE_SAFE_X);
      const minY = Math.max(HUD_SAFE_TOP, size.height / 2 + EDGE_SAFE_Y, canvasHalfY + EDGE_SAFE_Y);
      const maxY = Math.min(100 - ACTION_SAFE_BOTTOM, 100 - size.height / 2 - EDGE_SAFE_Y, 100 - canvasHalfY - EDGE_SAFE_Y);

      for (let attempt = 0; attempt < 900; attempt += 1) {
        let x: number;
        let y: number;
        if (entry.landmarkIndex != null) {
          x = rand(minX, maxX);
          y = rand(Math.max(minY, 68), maxY);
        } else if (Math.random() < (spec.levelType === 'cluster' ? 0.82 : 0.6)) {
          const cluster = spec.levelType === 'cluster' && entry.isTarget
            ? clusters[0]
            : clusters[Math.floor(rand(0, clusters.length))];
          // 两个均匀随机数相加形成三角分布，靠近中心的概率更高、又没有硬边界。
          x = cluster.x + (Math.random() + Math.random() - 1) * cluster.spreadX;
          y = cluster.y + (Math.random() + Math.random() - 1) * cluster.spreadY;
        } else {
          x = rand(minX, maxX);
          y = rand(minY, maxY);
        }
        x = Math.max(minX, Math.min(maxX, x));
        y = Math.max(minY, Math.min(maxY, y));
        const rect = paddedRect(x, y, size.width, size.height);
        if (!collides(rect, packedRects)) {
          position = { x, y, rect };
        }
        if (position) break;
      }

      // 随机装箱接近饱和时会留下许多不规则空洞；用细网格从随机起点补扫，
      // 只填真实可容纳的缝隙，因此能保持密集感，同时仍严格通过碰撞检测。
      if (!position) {
        const gridStep = 0.8;
        const columns = Math.max(1, Math.floor((maxX - minX) / gridStep) + 1);
        const rows = Math.max(1, Math.floor((maxY - minY) / gridStep) + 1);
        const cellCount = columns * rows;
        const startCell = Math.floor(rand(0, cellCount));
        for (let offset = 0; offset < cellCount; offset += 1) {
          const cell = (startCell - offset + cellCount) % cellCount;
          const column = cell % columns;
          const row = Math.floor(cell / columns);
          const x = Math.min(maxX, Math.max(minX, minX + column * gridStep + rand(-0.32, 0.32)));
          const y = Math.min(maxY, Math.max(minY, minY + row * gridStep + rand(-0.32, 0.32)));
          const rect = paddedRect(x, y, size.width, size.height);
          if (!collides(rect, packedRects)) {
            position = { x, y, rect };
            break;
          }
        }
      }

      if (!position) {
        const nextScale = Math.max(minimumScale, scale * 0.95);
        if (nextScale === scale) break;
        scale = nextScale;
      }
    }

    if (!position) {
      // 目标物优先装箱；极端随机分布下宁可少一个干扰物，也不缩成难以点击的小点。
      if (!entry.isTarget) continue;
      throw new Error(`场景装箱失败：${entry.def.id}，请降低本关干扰物数量`);
    }
    packedRects.push(position.rect);
    placed.push({
      uid: uidCounter++,
      itemId: entry.def.id,
      x: position.x,
      y: position.y,
      scale,
      rot: entry.rot,
      found: false,
      isTarget: entry.isTarget,
      targetTaskIds: entry.targetTaskIds,
    });
  }

  return {
    items: placed,
    targets: targetTasks,
  };
}
