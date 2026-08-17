/**
 * 回归专用：在 Node 侧用与浏览器完全相同的代码路径 + 相同的种子复刻
 * useGame 的 setupRound 场景生成，得到目标物件的精确坐标与名称。
 *
 * 用法：
 *   1) node tools/regression/build-scene-bundle.mjs   （构建 .gen/scene-bundle.mjs）
 *   2) driver.mjs 会自动使用本模块（ScenePlanner）
 *
 * 浏览器侧需注入同一 PRNG（driver.mjs 的 __rng 注入脚本），并通过
 * planner.consumeSilently(实测消耗数) 对齐两端的随机数流位置。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const genDir = join(root, 'tools', 'regression', '.gen');
const bundle = await import(pathToFileURL(join(genDir, 'scene-bundle.mjs')).href);
const { generateScene, getTaskRule, ITEMS, ITEM_GEOMETRY, COLLECTIBLE_ITEMS, itemMatchesTask } = bundle;
export { getTaskRule, itemMatchesTask };

/** 任务匹配物品的显示名集合（DOM 驱动兜底用）。 */
export function taskMatchingNames(taskId, targetCount) {
  const rule = getTaskRule(taskId, targetCount);
  return new Set(
    ITEMS.filter((item) => itemMatchesTask(item, rule)).map((item) => item.name),
  );
}

/** 与浏览器注入端一致的 PRNG（mulberry32）。 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function bundleName(itemId) {
  const item = ITEMS.find((i) => i.id === itemId);
  return item ? item.name : itemId;
}

export function itemGeometry(itemId) {
  return ITEM_GEOMETRY[itemId] ?? null;
}

/** 可克隆状态的多项式生成器（状态仅为一个 32 位整数，便于搜索场景起点）。 */
class Gen {
  constructor(seed) {
    this.a = seed >>> 0;
  }

  next() {
    this.a = (this.a + 0x6D2B79F5) >>> 0;
    let t = this.a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  clone() {
    const g = new Gen(0);
    g.a = this.a;
    return g;
  }

  skip(n) {
    for (let i = 0; i < n; i += 1) this.next();
  }
}

function parseLevelsCsv() {
  const csv = readFileSync(join(root, '数值表_src', 'levels_200.csv'), 'utf8').trim();
  const lines = csv.split(/\r?\n/);
  const headers = lines[0].split(',');
  const rows = {};
  for (const line of lines.slice(1)) {
    const values = line.split(',');
    const row = Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    rows[Number(row.level)] = {
      goals: (row.taskIds || row.taskId || '')
        .split('|').filter(Boolean)
        .map((taskId, index) => ({
          taskId,
          targetCount: Number((row.targetCounts || '').split('|')[index] ?? 1),
        })),
      distractors: Number(row.distractors),
    };
  }
  return rows;
}

const LEVEL_ROWS = parseLevelsCsv();

/**
 * 搜索式复刻场景：结算面板渲染等环节会在 n1 之后、场景生成之前额外消耗少量
 * 随机数，起点无法精确预知。在 n1..n1+maxDelta 内逐个起点生成场景，找到
 * 「生成消耗恰好等于浏览器实测 (n2 - n1)」的起点。
 *
 * @param {number} seed PRNG 种子
 * @param {number} n0 场景 1 生成前浏览器已消耗调用数
 * @param {number} n1 结算面板出现时浏览器总调用数
 * @param {number} n2 场景 2 出现时浏览器总调用数
 * @param {number} scene1Consumed 复刻场景 1 的消耗
 * @param {string[]} level1TargetIds 场景 1 目标 id（决定场景 2 的 preferredTargetIds）
 * @returns {{scene2, delta} | null}
 */
export function searchScene2(seed, n0, n1, n2, scene1Consumed, level1TargetIds, maxDelta = 200) {
  const targetConsumed = n2 - n1;
  const positionAfterScene1 = n0 + scene1Consumed;
  const gapBase = Math.max(0, n1 - positionAfterScene1);
  const base = new Gen(seed);
  base.skip(positionAfterScene1 + gapBase);
  for (let delta = 0; delta <= maxDelta; delta += 1) {
    const gen = base.clone();
    gen.skip(delta);
    const planner = new ScenePlanner(0);
    planner.gen = gen;
    planner.collectedIds = new Set(level1TargetIds);
    try {
      const scene2 = planner.scene(2);
      if (planner.lastSceneConsumed === targetConsumed) {
        planner.dispose();
        return { scene2, delta };
      }
    } catch {
      // 该起点装箱失败（理论上不会发生），继续下一个
    }
    planner.dispose();
  }
  return null;
}
/**
 * 浏览器随机数流对位器：Math.random 被替换为「计数 + 同种子序列」，
 * 用于把 Node 侧的场景复刻与浏览器实测消耗数对齐。
 */
export class ScenePlanner {
  constructor(seed) {
    this.gen = new Gen(seed);
    this.calls = 0;
    this.collectedIds = new Set();
    this.lastSceneConsumed = 0;
    this._origRandom = Math.random;
    Math.random = () => { this.calls += 1; return this.gen.next(); };
  }

  /** 静默消耗 n 个随机数（对齐浏览器在场景生成前已消耗的数量）。 */
  consumeSilently(n) {
    for (let i = 0; i < n; i += 1) this.gen.next();
  }

  /** 复刻一关场景（与 useGame.setupRound('levels') 的调用方式一致）。 */
  scene(level) {
    const before = this.calls;
    const cfg = LEVEL_ROWS[level];
    if (!cfg) throw new Error(`缺少第 ${level} 关配置`);
    const rules = cfg.goals.map((goal) => getTaskRule(goal.taskId, goal.targetCount));
    // useGame 传入的 preferredTargetIds 是「全部可收集物品中尚未发现者」，必须原样复刻。
    const preferredTargetIds = new Set(
      COLLECTIBLE_ITEMS
        .filter((item) => !this.collectedIds.has(item.id))
        .map((item) => item.id),
    );
    const result = generateScene({
      rules,
      distractors: cfg.distractors,
      levelType: 'standard', // UNIFY_LEVEL_TYPE 后 levelConfig 恒为 standard
      preferredTargetIds,
    });
    for (const item of result.items) {
      if (item.isTarget) this.collectedIds.add(item.itemId);
    }
    this.lastSceneConsumed = this.calls - before;
    return result;
  }

  dispose() {
    Math.random = this._origRandom;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(genDir, { recursive: true });
  const beforeScene1 = Number(process.argv[2] ?? 0);
  const beforeScene2 = Number(process.argv[3] ?? 0);
  const planner = new ScenePlanner(Number(process.argv[4] ?? 20260817));
  try {
    planner.consumeSilently(beforeScene1);
    const scene1 = planner.scene(1);
    planner.consumeSilently(Math.max(0, beforeScene2 - planner.calls));
    const scene2 = planner.scene(2);
    const targets1 = scene1.items.filter((i) => i.isTarget);
    const targets2 = scene2.items.filter((i) => i.isTarget);
    writeFileSync(join(genDir, 'scenes.json'), JSON.stringify({ scene1, scene2, targets1, targets2 }, null, 2));
    console.log(`scene1: ${scene1.items.length} items, targets: ${targets1.map((t) => bundleName(t.itemId)).join(',')}`);
    console.log(`scene2: ${scene2.items.length} items, targets: ${targets2.map((t) => bundleName(t.itemId)).join(',')}`);
    console.log(`planner.calls=${planner.calls} (输入偏移 ${beforeScene1}/${beforeScene2})`);
    console.log('written -> tools/regression/.gen/scenes.json');
  } finally {
    planner.dispose();
  }
}
