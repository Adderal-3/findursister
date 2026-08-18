import { CATEGORIES, CATEGORY_ORDER } from './items';
import type { CategoryId, TagId, TaskRule } from './types';

/** 可供正式关卡和无尽模式共用的组合任务库。 */
export const TASK_RULES: TaskRule[] = [
  { id: 'instrument', label: '找出所有乐器', allOf: ['instrument'], targetCount: 8 },
  { id: 'written', label: '找出所有带字物品', allOf: ['written'], targetCount: 6 },
  { id: 'flying', label: '找出所有会飞的物品', allOf: ['flying'], targetCount: 8 },
  { id: 'glowing', label: '找出所有会发光的物品', allOf: ['glowing'], targetCount: 7 },
  { id: 'sharp', label: '找出所有尖锐物品', allOf: ['sharp'], targetCount: 8 },
  { id: 'sweet_food', label: '找出所有甜食', allOf: ['sweet_food'], targetCount: 8 },
  { id: 'vehicle', label: '找出所有载具与坐骑', allOf: ['vehicle'], targetCount: 8 },
  { id: 'food', label: '找出所有食物', allOf: ['food'], targetCount: 8 },
  { id: 'animal', label: '找出所有动物伙伴', allOf: ['animal'], targetCount: 7 },
  { id: 'container', label: '找出能装东西的容器', allOf: ['container'], targetCount: 8 },
  { id: 'plant', label: '找出属于植物的物品', allOf: ['plant'], targetCount: 8 },
  { id: 'fruit', label: '找出所有水果', allOf: ['fruit'], targetCount: 7 },
  { id: 'vegetable', label: '找出所有蔬菜', allOf: ['vegetable'], targetCount: 6 },
  { id: 'wearable', label: '找出所有穿戴物', allOf: ['wearable'], targetCount: 6 },
  { id: 'weapon', label: '找出所有兵器', allOf: ['weapon'], targetCount: 5 },
  { id: 'wood', label: '找出木制物品', allOf: ['wood'], targetCount: 7 },
  { id: 'ceramic', label: '找出陶瓷物品', allOf: ['ceramic'], targetCount: 6 },
  { id: 'metal_jewelry', label: '找出金属或珠宝物品', allOf: ['metal_jewelry'], targetCount: 7 },
  { id: 'round', label: '找出圆形轮廓的物品', allOf: ['round'], targetCount: 7 },
  { id: 'slender', label: '找出细长轮廓的物品', allOf: ['slender'], targetCount: 7 },
  { id: 'patterned', label: '找出纹样明显的物品', allOf: ['patterned'], targetCount: 7 },
  { id: 'sweet_plants', label: '找出既是植物又是甜食的物品', allOf: ['plant', 'sweet_food'], targetCount: 6 },
  { id: 'wooden_bridges', label: '找出木制桥梁、栈道或码头', allOf: ['bridge', 'wood'], targetCount: 5 },
  { id: 'metal_wearables', label: '找出金属或珠宝制的穿戴物', allOf: ['wearable', 'metal_jewelry'], targetCount: 5 },
  { id: 'luminous_fliers', label: '找出会飞又会发光的物品', allOf: ['flying', 'glowing'], targetCount: 3 },
  { id: 'fruit_or_vegetable', label: '找出水果或蔬菜', anyOf: ['fruit', 'vegetable'], targetCount: 8 },
  { id: 'animal_or_vehicle', label: '找出动物伙伴、载具或坐骑', anyOf: ['animal', 'vehicle'], targetCount: 8 },
  { id: 'food_not_sweet', label: '找出食物，但不要点甜食', allOf: ['food'], noneOf: ['sweet_food'], targetCount: 6 },
  { id: 'sharp_not_weapon', label: '找出尖锐但不是兵器的物品', allOf: ['sharp'], noneOf: ['weapon'], targetCount: 5 },
  { id: 'bridge_not_wood', label: '找出不是木制的桥', allOf: ['bridge'], noneOf: ['wood'], targetCount: 3 },
];

const TASK_MAP = new Map(TASK_RULES.map((task) => [task.id, task]));

function withTargetCount(rule: TaskRule, targetCount: number): TaskRule {
  return { ...rule, targetCount };
}

export function getTaskRule(taskId: string, targetCount?: number): TaskRule {
  const rule = TASK_MAP.get(taskId);
  if (!rule) throw new Error(`Unknown task id: ${taskId}`);
  return targetCount == null ? { ...rule } : withTargetCount(rule, targetCount);
}

export function categoryTaskRule(category: CategoryId, targetCount: number): TaskRule {
  return {
    id: `category_${category}`,
    label: CATEGORIES[category].prompt,
    allOf: [category],
    targetCount,
  };
}

function pickTask(ids: string[], targetCount: number, previousTaskId: string | null): TaskRule {
  const candidates = ids.filter((id) => id !== previousTaskId);
  const pool = candidates.length ? candidates : ids;
  const id = pool[Math.floor(Math.random() * pool.length)] ?? ids[0];
  return getTaskRule(id, targetCount);
}

/** 按波次由大类逐步过渡到交集、并集和排除任务。 */
export function endlessTaskRule(
  wave: number,
  targetCount: number,
  previousTaskId: string | null,
): TaskRule {
  if (wave <= 3) {
    return pickTask(['food', 'animal', 'container', 'plant'], targetCount, previousTaskId);
  }
  if (wave <= 6) {
    return pickTask(['fruit', 'vegetable', 'wearable', 'weapon'], targetCount, previousTaskId);
  }
  if (wave <= 9) {
    return pickTask(
      ['wood', 'ceramic', 'metal_jewelry', 'round', 'slender', 'patterned'],
      targetCount,
      previousTaskId,
    );
  }
  if (wave <= 12) {
    return pickTask(
      ['sweet_plants', 'wooden_bridges', 'metal_wearables', 'luminous_fliers'],
      targetCount,
      previousTaskId,
    );
  }

  const rotation = (wave - 13) % 3;
  if (rotation === 0) {
    return pickTask(
      ['sweet_plants', 'wooden_bridges', 'metal_wearables', 'luminous_fliers'],
      targetCount,
      previousTaskId,
    );
  }
  if (rotation === 1) {
    return pickTask(['fruit_or_vegetable', 'animal_or_vehicle'], targetCount, previousTaskId);
  }
  return pickTask(
    ['food_not_sweet', 'sharp_not_weapon', 'bridge_not_wood'],
    targetCount,
    previousTaskId,
  );
}

export function primaryCategoryForTask(rule: TaskRule, fallback: CategoryId): CategoryId {
  const ruleTags: TagId[] = [...(rule.allOf ?? []), ...(rule.anyOf ?? [])];
  return CATEGORY_ORDER.find((category) => ruleTags.includes(category)) ?? fallback;
}
