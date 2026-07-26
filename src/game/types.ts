// ============================================================
// 百物寻踪 —— 核心类型定义
// ============================================================

/** 物品可拥有多个属性；关卡目标按属性而不是按单个物品生成。 */
export type CategoryId =
  | 'instrument'
  | 'written'
  | 'container'
  | 'flying'
  | 'glowing'
  | 'sharp'
  | 'sweet_food'
  | 'plant'
  | 'vehicle'
  | 'animal';

/** 物品是什么。旧十分类继续放在 tags，这里补充可组合的细分类。 */
export type ObjectTag =
  | 'food'
  | 'fruit'
  | 'vegetable'
  | 'weapon'
  | 'wearable'
  | 'bridge'
  | 'flower'
  | 'insect'
  | 'lighting'
  | 'bottle_jar'
  | 'bowl_dish'
  | 'clothing'
  | 'accessory'
  | 'headwear';

/** 能力、状态或可执行的行为。 */
export type TraitTag =
  | 'flaming'
  | 'sound_making'
  | 'rideable'
  | 'cross_water'
  | 'winged'
  | 'four_legged';

export type MaterialTag =
  | 'wood'
  | 'metal_jewelry'
  | 'ceramic'
  | 'paper'
  | 'fabric'
  | 'stone'
  | 'gemstone';

export type VisualTag =
  | 'round'
  | 'slender'
  | 'wide'
  | 'leafy'
  | 'tasseled'
  | 'handled'
  | 'paired'
  | 'patterned';

export type ItemRole = 'item' | 'landmark';

export type TagId = CategoryId | ObjectTag | TraitTag | MaterialTag | VisualTag;

export type GameMode = 'levels' | 'endless';

export type GamePhase = 'menu' | 'playing' | 'levelClear' | 'gameOver';

export interface ItemDef {
  /** 稳定英文 ID，同时也是素材文件名。 */
  id: string;
  name: string;
  /** 图片加载失败时的兜底符号。 */
  emoji: string;
  img: string;
  /** 一件物品可以同时属于多个属性，例如孔明灯既会飞也会发光。 */
  tags: CategoryId[];
  objectTags?: ObjectTag[];
  traitTags?: TraitTag[];
  materialTags?: MaterialTag[];
  visualTags?: VisualTag[];
  /** 大型地标固定摆放、保持水平；未填写时视为普通物品。 */
  role?: ItemRole;
  /** 只作为干扰项出现，不会被抽成目标，也不进入隐藏首次发现记录。 */
  distractorOnly?: boolean;
}

export interface PlacedItem {
  uid: number;
  itemId: string;
  /** 相对虚拟大场景的百分比坐标。 */
  x: number;
  y: number;
  scale: number;
  rot: number;
  found: boolean;
  /** 是否满足本轮属性目标。 */
  isTarget: boolean;
  /** 该物件分别属于哪些寻找目标；多目标关卡只扣减匹配的目标。 */
  targetTaskIds: string[];
}

export interface TaskRule {
  id: string;
  label: string;
  allOf?: TagId[];
  anyOf?: TagId[];
  noneOf?: TagId[];
  targetCount: number;
}

/** 运行中的任务快照；total 可能因候选池不足而低于规则目标数。 */
export interface TargetTask extends Omit<TaskRule, 'id' | 'targetCount'> {
  taskId: string;
  remaining: number;
  total: number;
}

export interface FloatText {
  id: number;
  x: number;
  y: number;
  text: string;
  kind: 'score' | 'penalty' | 'bonus' | 'combo';
}

export interface ParticleBurst {
  id: number;
  x: number;
  y: number;
  emoji: string;
}
