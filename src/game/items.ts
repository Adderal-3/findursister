// ============================================================
// 百物寻踪 —— 古风物品与属性库
// ============================================================

import type { CategoryId, ItemDef, TagId } from './types';

// 由 Vite 打包接管：eager 导入 src/assets/items/ancient 下全部 webp，
// 生成 { 文件名: 带 hash 的最终 URL } 映射，确保大神平台构建管线正确处理。
const ITEM_ASSETS = import.meta.glob<string>(
  '../assets/items/ancient/*.webp',
  { eager: true, query: '?url', import: 'default' },
);

function itemAssetUrl(id: string): string {
  const url = ITEM_ASSETS[`../assets/items/ancient/${id}.webp`];
  if (!url) throw new Error(`缺少物品素材：${id}.webp`);
  return url;
}

export interface CategoryInfo {
  name: string;
  prompt: string;
  emoji: string;
  description: string;
  color: string;
  soft: string;
  bg: string;
}

export const CATEGORIES: Record<CategoryId, CategoryInfo> = {
  instrument: {
    name: '乐器', prompt: '找出所有乐器', emoji: '♪', description: '听声辨形，寻出能奏响旋律之物',
    color: '#7c3f58', soft: '#f7e8ee',
    bg: 'radial-gradient(circle at 18% 20%, rgba(167, 94, 122, .22), transparent 25%), linear-gradient(135deg, #f6eadf 0%, #ead8d9 48%, #f4e8d7 100%)',
  },
  written: {
    name: '有字的物品', prompt: '找出带字的物品', emoji: '文', description: '留意题签、书册与瓶身上的文字',
    color: '#48606f', soft: '#e8f0f1',
    bg: 'radial-gradient(circle at 82% 18%, rgba(73, 104, 117, .2), transparent 26%), linear-gradient(145deg, #f1ecdf 0%, #dce6e5 55%, #eee3d1 100%)',
  },
  container: {
    name: '能装东西的容器', prompt: '找出能装东西的容器', emoji: '器', description: '瓶、壶、碗、匣，都可盛放万物',
    color: '#9b6635', soft: '#f8ecd9',
    bg: 'radial-gradient(circle at 20% 75%, rgba(177, 118, 54, .2), transparent 26%), linear-gradient(135deg, #f5ead7 0%, #ead4b6 52%, #f4e8d4 100%)',
  },
  flying: {
    name: '会飞的', prompt: '找出会飞的物品', emoji: '羽', description: '有翼、有风，或能升上天空',
    color: '#39758a', soft: '#e4f3f4',
    bg: 'radial-gradient(circle at 76% 22%, rgba(82, 153, 172, .22), transparent 27%), linear-gradient(145deg, #e7f2ee 0%, #cfe4e5 48%, #eee7d4 100%)',
  },
  glowing: {
    name: '会发光的', prompt: '找出会发光的物品', emoji: '光', description: '火焰、灯烛与夜色里的微光',
    color: '#8b5d24', soft: '#fff0cf',
    bg: 'radial-gradient(circle at 72% 28%, rgba(244, 174, 64, .35), transparent 25%), linear-gradient(145deg, #e8dfcf 0%, #d7cfbd 45%, #f2dfb6 100%)',
  },
  sharp: {
    name: '尖锐的', prompt: '找出尖锐的物品', emoji: '刃', description: '刃、针、箭与一切锋利之物',
    color: '#5c6670', soft: '#e8edef',
    bg: 'radial-gradient(circle at 22% 22%, rgba(86, 104, 116, .2), transparent 26%), linear-gradient(135deg, #ede8dc 0%, #d8dedf 50%, #eee3d2 100%)',
  },
  sweet_food: {
    name: '甜的食物', prompt: '找出甜甜的食物', emoji: '甜', description: '果香与糕点，都是甜蜜线索',
    color: '#a45252', soft: '#fae9e1',
    bg: 'radial-gradient(circle at 78% 72%, rgba(204, 102, 94, .2), transparent 28%), linear-gradient(135deg, #f6e8d7 0%, #f2d9d1 50%, #f4e7cf 100%)',
  },
  plant: {
    name: '植物', prompt: '找出属于植物的物品', emoji: '花', description: '花、果、枝叶皆从大地生长',
    color: '#4d7752', soft: '#e7f1df',
    bg: 'radial-gradient(circle at 18% 78%, rgba(85, 136, 80, .2), transparent 28%), linear-gradient(145deg, #e9efdc 0%, #d5e4cc 48%, #f0e6d2 100%)',
  },
  vehicle: {
    name: '坐骑与交通工具', prompt: '找出坐骑或交通工具', emoji: '行', description: '能载人远行，也能穿城越野',
    color: '#8a5735', soft: '#f4e6d9',
    bg: 'radial-gradient(circle at 78% 24%, rgba(153, 91, 49, .2), transparent 27%), linear-gradient(135deg, #efe2d1 0%, #ddc7b1 50%, #eee4d4 100%)',
  },
  animal: {
    name: '动物', prompt: '找出所有动物', emoji: '兽', description: '飞禽走兽，各有灵动身影',
    color: '#9a6039', soft: '#f7e8d8',
    bg: 'radial-gradient(circle at 20% 20%, rgba(180, 107, 57, .2), transparent 27%), linear-gradient(145deg, #f3e7d5 0%, #e7d2bb 50%, #eee7d7 100%)',
  },
};

export const CATEGORY_ORDER: CategoryId[] = [
  'instrument', 'written', 'container', 'flying', 'glowing',
  'sharp', 'sweet_food', 'plant', 'vehicle', 'animal',
];

const asset = (id: string) => itemAssetUrl(id);

export const ITEMS: ItemDef[] = [
  { id: 'camel', name: '骆驼', emoji: '🐫', img: asset('camel'), tags: ['vehicle', 'animal'], traitTags: ['rideable', 'four_legged'] },
  { id: 'chili_pepper', name: '辣椒', emoji: '🌶️', img: asset('chili_pepper'), tags: ['plant'], objectTags: ['food', 'vegetable'], visualTags: ['leafy'] },
  { id: 'golden_pipa', name: '金纹琵琶', emoji: '♪', img: asset('golden_pipa'), tags: ['instrument'], traitTags: ['sound_making'], visualTags: ['slender', 'tasseled', 'patterned'] },
  { id: 'grapes', name: '葡萄', emoji: '🍇', img: asset('grapes'), tags: ['sweet_food', 'plant'], objectTags: ['food', 'fruit'], visualTags: ['leafy'] },
  { id: 'mooncake', name: '月饼', emoji: '🥮', img: asset('mooncake'), tags: ['sweet_food'], objectTags: ['food'], visualTags: ['round'] },
  { id: 'horse', name: '骏马', emoji: '🐎', img: asset('horse'), tags: ['vehicle', 'animal'], traitTags: ['rideable', 'four_legged'] },
  { id: 'bird_ocarina', name: '鸟形陶笛', emoji: '♪', img: asset('bird_ocarina'), tags: ['instrument'], traitTags: ['sound_making'], materialTags: ['ceramic'], visualTags: ['tasseled', 'patterned'] },
  { id: 'peach', name: '仙桃', emoji: '🍑', img: asset('peach'), tags: ['sweet_food', 'plant'], objectTags: ['food', 'fruit'], visualTags: ['round', 'leafy'] },
  { id: 'sedan_chair', name: '花轿', emoji: '轿', img: asset('sedan_chair'), tags: ['vehicle'], traitTags: ['rideable'], materialTags: ['wood'], visualTags: ['wide', 'patterned'] },
  { id: 'konghou', name: '箜篌', emoji: '♪', img: asset('konghou'), tags: ['instrument'], traitTags: ['sound_making'], materialTags: ['wood'], visualTags: ['slender'] },
  { id: 'golden_ewer', name: '鎏金执壶', emoji: '壶', img: asset('golden_ewer'), tags: ['container'], objectTags: ['bottle_jar'], materialTags: ['metal_jewelry'], visualTags: ['handled', 'patterned'] },
  { id: 'cat', name: '狸花猫', emoji: '🐈', img: asset('cat'), tags: ['animal'], traitTags: ['four_legged'] },
  { id: 'red_sky_lantern', name: '朱红孔明灯', emoji: '🏮', img: asset('red_sky_lantern'), tags: ['flying', 'glowing'], objectTags: ['lighting'], traitTags: ['flaming'], materialTags: ['paper'], visualTags: ['tasseled'] },
  { id: 'white_porcelain_vase', name: '白瓷瓶', emoji: '瓶', img: asset('white_porcelain_vase'), tags: ['container'], objectTags: ['bottle_jar'], materialTags: ['ceramic'], visualTags: ['slender'] },
  { id: 'lychee', name: '荔枝', emoji: '果', img: asset('lychee'), tags: ['sweet_food', 'plant'], objectTags: ['food', 'fruit'], visualTags: ['leafy'] },
  { id: 'painted_jar', name: '彩陶罐', emoji: '罐', img: asset('painted_jar'), tags: ['container'], objectTags: ['bottle_jar'], materialTags: ['ceramic'], visualTags: ['patterned'] },
  { id: 'black_pitcher', name: '玄纹壶', emoji: '壶', img: asset('black_pitcher'), tags: ['container'], objectTags: ['bottle_jar'], materialTags: ['ceramic'], visualTags: ['slender', 'handled', 'patterned'] },
  { id: 'campfire', name: '篝火', emoji: '🔥', img: asset('campfire'), tags: ['glowing'], objectTags: ['lighting'], traitTags: ['flaming'], materialTags: ['wood'], visualTags: ['wide'] },
  { id: 'bronze_gong', name: '铜锣', emoji: '锣', img: asset('bronze_gong'), tags: ['instrument'], traitTags: ['sound_making'], materialTags: ['metal_jewelry'], visualTags: ['round'] },
  { id: 'fish_hook', name: '鱼钩', emoji: '🪝', img: asset('fish_hook'), tags: ['sharp'], materialTags: ['metal_jewelry'], visualTags: ['slender', 'handled'] },
  { id: 'torch', name: '火把', emoji: '🔥', img: asset('torch'), tags: ['glowing'], objectTags: ['lighting'], traitTags: ['flaming'], materialTags: ['wood'], visualTags: ['slender', 'handled'] },
  { id: 'arrow', name: '羽箭', emoji: '🏹', img: asset('arrow'), tags: ['sharp'], objectTags: ['weapon'], materialTags: ['wood'], visualTags: ['slender'] },
  { id: 'needle', name: '银针', emoji: '针', img: asset('needle'), tags: ['sharp'], materialTags: ['metal_jewelry'], visualTags: ['slender'] },
  { id: 'flying_fish', name: '飞鱼坐骑', emoji: '🐡', img: asset('flying_fish'), tags: ['vehicle', 'animal'], traitTags: ['rideable'] },
  { id: 'candied_hawthorn', name: '糖葫芦', emoji: '🍡', img: asset('candied_hawthorn'), tags: ['sweet_food'], objectTags: ['food'] },
  { id: 'lotus_ewer', name: '莲花执壶', emoji: '壶', img: asset('lotus_ewer'), tags: ['container'], objectTags: ['bottle_jar'], materialTags: ['metal_jewelry'], visualTags: ['handled', 'patterned'] },
  { id: 'spike_trap', name: '地刺', emoji: '刺', img: asset('spike_trap'), tags: ['sharp'], objectTags: ['weapon'], materialTags: ['metal_jewelry'] },
  { id: 'osmanthus_cake', name: '桂花糕', emoji: '糕', img: asset('osmanthus_cake'), tags: ['sweet_food'], objectTags: ['food'] },
  { id: 'deer', name: '梅花鹿', emoji: '🦌', img: asset('deer'), tags: ['animal'], traitTags: ['four_legged'] },
  { id: 'beast_fang', name: '兽牙', emoji: '牙', img: asset('beast_fang'), tags: ['sharp'], visualTags: ['slender'] },
  { id: 'waist_drum', name: '腰鼓', emoji: '🥁', img: asset('waist_drum'), tags: ['instrument'], traitTags: ['sound_making'], materialTags: ['wood'], visualTags: ['tasseled', 'patterned'] },
  { id: 'jade_hairpin', name: '翠玉簪', emoji: '簪', img: asset('jade_hairpin'), tags: ['sharp'], objectTags: ['wearable', 'accessory', 'headwear'], materialTags: ['metal_jewelry', 'gemstone'], visualTags: ['slender', 'tasseled', 'patterned'] },
  { id: 'black_bottle', name: '玄铁瓶', emoji: '瓶', img: asset('black_bottle'), tags: ['container'], objectTags: ['bottle_jar'] },
  { id: 'nine_tailed_fox', name: '九尾狐', emoji: '🦊', img: asset('nine_tailed_fox'), tags: ['vehicle', 'animal'], traitTags: ['rideable', 'four_legged'] },
  { id: 'ornate_dagger', name: '奇门匕首', emoji: '刃', img: asset('ornate_dagger'), tags: ['sharp'], objectTags: ['weapon'], materialTags: ['metal_jewelry'], visualTags: ['slender', 'patterned'] },
  { id: 'firefly', name: '萤火虫', emoji: '✨', img: asset('firefly'), tags: ['flying', 'glowing'], objectTags: ['lighting', 'insect'], traitTags: ['winged'] },
  { id: 'shuriken', name: '飞镖', emoji: '刃', img: asset('shuriken'), tags: ['sharp'], objectTags: ['weapon'], materialTags: ['metal_jewelry'] },
  { id: 'oil_lamp', name: '长明灯', emoji: '🪔', img: asset('oil_lamp'), tags: ['container', 'glowing'], objectTags: ['lighting'], traitTags: ['flaming'], materialTags: ['metal_jewelry'], visualTags: ['handled'] },
  { id: 'red_dates', name: '红枣', emoji: '枣', img: asset('red_dates'), tags: ['container', 'sweet_food', 'plant'], objectTags: ['food', 'fruit', 'bowl_dish'], visualTags: ['round', 'leafy'] },
  { id: 'inscribed_music_stand', name: '题字琴架', emoji: '文', img: asset('inscribed_music_stand'), tags: ['written'] },
  { id: 'dandelion', name: '蒲公英', emoji: '🌼', img: asset('dandelion'), tags: ['flying', 'plant'], objectTags: ['flower'], visualTags: ['leafy'] },
  { id: 'vinegar_jar', name: '醋坛', emoji: '醋', img: asset('vinegar_jar'), tags: ['written', 'container'], objectTags: ['bottle_jar'], materialTags: ['ceramic'], visualTags: ['patterned'] },
  { id: 'lucky_raccoon', name: '招财狸', emoji: '🦝', img: asset('lucky_raccoon'), tags: ['animal'], traitTags: ['four_legged'] },
  { id: 'rattle_drum', name: '拨浪鼓', emoji: '🥁', img: asset('rattle_drum'), tags: ['instrument'], traitTags: ['sound_making'], materialTags: ['wood'], visualTags: ['slender', 'handled', 'patterned'] },
  { id: 'wooden_pipa', name: '木琵琶', emoji: '♪', img: asset('wooden_pipa'), tags: ['instrument'], traitTags: ['sound_making'], materialTags: ['wood'], visualTags: ['slender', 'patterned'] },
  { id: 'swallow', name: '春燕', emoji: '🐦', img: asset('swallow'), tags: ['flying'], traitTags: ['winged'] },
  { id: 'painted_vase', name: '彩绘花瓶', emoji: '瓶', img: asset('painted_vase'), tags: ['container'], objectTags: ['bottle_jar'], materialTags: ['ceramic'], visualTags: ['patterned'] },
  { id: 'phoenix', name: '金羽凤凰', emoji: '凤', img: asset('phoenix'), tags: ['flying'], traitTags: ['winged'] },
  { id: 'dragonfly', name: '蜻蜓', emoji: '虫', img: asset('dragonfly'), tags: ['flying'], objectTags: ['insect'], traitTags: ['winged'], visualTags: ['slender'] },
  { id: 'fire_wheels', name: '风火轮', emoji: '轮', img: asset('fire_wheels'), tags: ['vehicle', 'glowing'], objectTags: ['weapon'], traitTags: ['flaming', 'rideable'], visualTags: ['round', 'wide', 'paired'] },
  { id: 'chrysanthemum', name: '金菊', emoji: '🌼', img: asset('chrysanthemum'), tags: ['plant'], objectTags: ['flower'], visualTags: ['leafy'] },
  { id: 'tangyuan', name: '汤圆', emoji: '🥣', img: asset('tangyuan'), tags: ['container', 'sweet_food'], objectTags: ['food', 'bowl_dish'], materialTags: ['ceramic'], visualTags: ['round'] },
  { id: 'hulusi', name: '葫芦丝', emoji: '♪', img: asset('hulusi'), tags: ['instrument'], traitTags: ['sound_making'], visualTags: ['slender', 'handled', 'patterned'] },
  { id: 'inscribed_papers', name: '题字纸页', emoji: '📜', img: asset('inscribed_papers'), tags: ['written'], materialTags: ['paper'] },
  { id: 'icicle', name: '冰锥', emoji: '冰', img: asset('icicle'), tags: ['sharp'], visualTags: ['slender'] },
  { id: 'golden_bowl', name: '鎏金钵', emoji: '钵', img: asset('golden_bowl'), tags: ['container'], objectTags: ['bowl_dish'], materialTags: ['metal_jewelry'], visualTags: ['round', 'patterned'] },
  { id: 'ancient_book', name: '古籍', emoji: '📖', img: asset('ancient_book'), tags: ['written'], materialTags: ['paper'], visualTags: ['patterned'] },
  { id: 'watermelon', name: '西瓜', emoji: '🍉', img: asset('watermelon'), tags: ['sweet_food', 'plant'], objectTags: ['food', 'fruit'], visualTags: ['round', 'leafy'] },
  { id: 'guqin', name: '古琴', emoji: '琴', img: asset('guqin'), tags: ['instrument'], traitTags: ['sound_making'], materialTags: ['wood'], visualTags: ['slender', 'tasseled', 'patterned'] },
  { id: 'orange_sky_lantern', name: '橙色孔明灯', emoji: '🏮', img: asset('orange_sky_lantern'), tags: ['flying', 'glowing'], objectTags: ['lighting'], traitTags: ['flaming'], materialTags: ['paper'], visualTags: ['tasseled'] },
  { id: 'penguin', name: '企鹅', emoji: '🐧', img: asset('penguin'), tags: ['animal'] },
  { id: 'incense_burner', name: '香炉', emoji: '炉', img: asset('incense_burner'), tags: ['container'], objectTags: ['bowl_dish'], visualTags: ['patterned'] },
  { id: 'cotton', name: '棉花', emoji: '花', img: asset('cotton'), tags: ['plant'], objectTags: ['flower'], visualTags: ['leafy'] },
  { id: 'eggplant', name: '茄子', emoji: '🍆', img: asset('eggplant'), tags: ['plant'], objectTags: ['food', 'vegetable'], visualTags: ['leafy'] },
  { id: 'crossed_swords', name: '双剑', emoji: '⚔️', img: asset('crossed_swords'), tags: ['sharp'], objectTags: ['weapon'], materialTags: ['metal_jewelry'], visualTags: ['wide', 'paired'] },
  { id: 'hand_drum', name: '手鼓', emoji: '🥁', img: asset('hand_drum'), tags: ['instrument'], traitTags: ['sound_making'], materialTags: ['wood'], visualTags: ['patterned'] },
  { id: 'floral_hairpin', name: '花簪', emoji: '簪', img: asset('floral_hairpin'), tags: ['sharp'], objectTags: ['wearable', 'accessory', 'headwear'], materialTags: ['metal_jewelry', 'gemstone'], visualTags: ['slender', 'tasseled', 'patterned'] },
  { id: 'patterned_vase', name: '缠枝瓶', emoji: '瓶', img: asset('patterned_vase'), tags: ['container'], objectTags: ['bottle_jar'], materialTags: ['ceramic'], visualTags: ['patterned'] },
  { id: 'jewelry_box', name: '首饰匣', emoji: '匣', img: asset('jewelry_box'), tags: ['container'], visualTags: ['patterned'] },
  { id: 'medicine_bottle', name: '药瓶', emoji: '药', img: asset('medicine_bottle'), tags: ['written', 'container'], objectTags: ['bottle_jar'], materialTags: ['ceramic'] },
  { id: 'carriage', name: '马车', emoji: '车', img: asset('carriage'), tags: ['vehicle'], traitTags: ['rideable'], materialTags: ['wood'], visualTags: ['wide'] },
  { id: 'butterfly', name: '蝴蝶', emoji: '🦋', img: asset('butterfly'), tags: ['flying'], objectTags: ['insect'], traitTags: ['winged'] },
  { id: 'sword', name: '宝剑', emoji: '🗡️', img: asset('sword'), tags: ['sharp'], objectTags: ['weapon'], materialTags: ['metal_jewelry'], visualTags: ['slender'] },
  { id: 'clay_jar', name: '陶罐', emoji: '罐', img: asset('clay_jar'), tags: ['container'], objectTags: ['bottle_jar'], materialTags: ['ceramic'] },
  { id: 'candle', name: '蜡烛', emoji: '🕯️', img: asset('candle'), tags: ['glowing'], objectTags: ['lighting'], traitTags: ['flaming'], visualTags: ['slender'] },
  { id: 'treasure_ship', name: '楼船', emoji: '⛵', img: asset('treasure_ship'), tags: ['vehicle'], traitTags: ['rideable', 'cross_water'], materialTags: ['wood'], visualTags: ['wide'] },
  { id: 'lidded_bowl', name: '金盖碗', emoji: '碗', img: asset('lidded_bowl'), tags: ['container'], objectTags: ['bowl_dish'], visualTags: ['round'] },
  { id: 'dog', name: '柴犬', emoji: '🐕', img: asset('dog'), tags: ['animal'], traitTags: ['four_legged'] },
  { id: 'rabbit', name: '玉兔', emoji: '🐇', img: asset('rabbit'), tags: ['animal'], traitTags: ['four_legged'] },
  { id: 'blue_book', name: '蓝皮古籍', emoji: '📘', img: asset('blue_book'), tags: ['written'], materialTags: ['paper'], visualTags: ['patterned'] },
  { id: 'zongzi', name: '粽子', emoji: '粽', img: asset('zongzi'), tags: ['sweet_food'], objectTags: ['food'] },
  { id: 'kite', name: '纸鸢', emoji: '🪁', img: asset('kite'), tags: ['flying'], materialTags: ['paper'] },
  { id: 'partitioned_cauldron', name: '九格铜鼎', emoji: '鼎', img: asset('partitioned_cauldron'), tags: ['container'], objectTags: ['bowl_dish'], materialTags: ['metal_jewelry'], visualTags: ['round', 'patterned'] },
  { id: 'peony', name: '牡丹', emoji: '🌺', img: asset('peony'), tags: ['plant'], objectTags: ['flower'], visualTags: ['leafy'] },
  { id: 'cabinet', name: '百宝柜', emoji: '柜', img: asset('cabinet'), tags: ['container'], materialTags: ['wood'] },
  { id: 'feather', name: '羽毛', emoji: '🪶', img: asset('feather'), tags: ['flying'], visualTags: ['slender'] },
  { id: 'paper_crane', name: '纸鹤', emoji: '鹤', img: asset('paper_crane'), tags: ['flying'], traitTags: ['winged'], materialTags: ['paper'] },

  // download (11).zip 新增：11 种水果、6 种蔬菜、10 件穿戴物和 9 座桥梁。
  { id: 'apple', name: '苹果', emoji: '🍎', img: asset('apple'), tags: ['sweet_food', 'plant'], objectTags: ['food', 'fruit'], visualTags: ['round', 'leafy'] },
  { id: 'banana', name: '香蕉', emoji: '🍌', img: asset('banana'), tags: ['sweet_food', 'plant'], objectTags: ['food', 'fruit'] },
  { id: 'orange', name: '橙子', emoji: '🍊', img: asset('orange'), tags: ['sweet_food', 'plant'], objectTags: ['food', 'fruit'], visualTags: ['round', 'leafy'] },
  { id: 'strawberry', name: '草莓', emoji: '🍓', img: asset('strawberry'), tags: ['sweet_food', 'plant'], objectTags: ['food', 'fruit'], visualTags: ['leafy'] },
  { id: 'mango', name: '芒果', emoji: '🥭', img: asset('mango'), tags: ['sweet_food', 'plant'], objectTags: ['food', 'fruit'], visualTags: ['leafy'] },
  { id: 'pear', name: '梨', emoji: '🍐', img: asset('pear'), tags: ['sweet_food', 'plant'], objectTags: ['food', 'fruit'], visualTags: ['leafy'] },
  { id: 'pineapple', name: '菠萝', emoji: '🍍', img: asset('pineapple'), tags: ['sweet_food', 'plant'], objectTags: ['food', 'fruit'], visualTags: ['leafy'] },
  { id: 'kiwi', name: '猕猴桃', emoji: '🥝', img: asset('kiwi'), tags: ['sweet_food', 'plant'], objectTags: ['food', 'fruit'], visualTags: ['round'] },
  { id: 'lemon', name: '柠檬', emoji: '🍋', img: asset('lemon'), tags: ['plant'], objectTags: ['food', 'fruit'], visualTags: ['round', 'leafy'] },
  { id: 'melon', name: '甜瓜', emoji: '🍈', img: asset('melon'), tags: ['sweet_food', 'plant'], objectTags: ['food', 'fruit'], visualTags: ['round', 'leafy'] },
  { id: 'dragon_fruit', name: '火龙果', emoji: '果', img: asset('dragon_fruit'), tags: ['sweet_food', 'plant'], objectTags: ['food', 'fruit'], visualTags: ['leafy'] },
  { id: 'coriander', name: '香菜', emoji: '🌿', img: asset('coriander'), tags: ['plant'], objectTags: ['food', 'vegetable'], visualTags: ['leafy'] },
  { id: 'scallion', name: '青葱', emoji: '葱', img: asset('scallion'), tags: ['plant'], objectTags: ['food', 'vegetable'], visualTags: ['slender', 'leafy'] },
  { id: 'bitter_melon', name: '苦瓜', emoji: '瓜', img: asset('bitter_melon'), tags: ['plant'], objectTags: ['food', 'vegetable'], visualTags: ['leafy'] },
  { id: 'broccoli', name: '西兰花', emoji: '🥦', img: asset('broccoli'), tags: ['plant'], objectTags: ['food', 'vegetable'], visualTags: ['leafy'] },
  { id: 'edamame', name: '毛豆', emoji: '豆', img: asset('edamame'), tags: ['plant'], objectTags: ['food', 'vegetable'], visualTags: ['leafy'] },
  { id: 'celery', name: '芹菜', emoji: '菜', img: asset('celery'), tags: ['plant'], objectTags: ['food', 'vegetable'], visualTags: ['slender', 'leafy'] },
  { id: 'jeweled_belt', name: '宝石腰饰', emoji: '饰', img: asset('jeweled_belt'), tags: [], objectTags: ['wearable', 'accessory'], materialTags: ['metal_jewelry', 'gemstone'], visualTags: ['wide', 'patterned'] },
  { id: 'silver_armor', name: '银纹铠甲', emoji: '甲', img: asset('silver_armor'), tags: [], objectTags: ['wearable', 'clothing'], materialTags: ['metal_jewelry'], visualTags: ['patterned'] },
  { id: 'red_tunic', name: '赤纹上衣', emoji: '衣', img: asset('red_tunic'), tags: [], objectTags: ['wearable', 'clothing'], materialTags: ['fabric'], visualTags: ['patterned'] },
  { id: 'tasseled_shawl', name: '流苏披肩', emoji: '衣', img: asset('tasseled_shawl'), tags: [], objectTags: ['wearable', 'clothing'], materialTags: ['fabric'], visualTags: ['tasseled', 'patterned'] },
  { id: 'phoenix_crown', name: '凤纹头冠', emoji: '冠', img: asset('phoenix_crown'), tags: [], objectTags: ['wearable', 'accessory', 'headwear'], materialTags: ['metal_jewelry', 'gemstone'], visualTags: ['tasseled', 'patterned'] },
  { id: 'embroidered_trousers', name: '绣花裤装', emoji: '衣', img: asset('embroidered_trousers'), tags: [], objectTags: ['wearable', 'clothing'], materialTags: ['fabric'], visualTags: ['tasseled', 'patterned'] },
  { id: 'jade_earrings', name: '玉坠耳环', emoji: '饰', img: asset('jade_earrings'), tags: [], objectTags: ['wearable', 'accessory'], materialTags: ['metal_jewelry', 'gemstone'], visualTags: ['paired', 'patterned'] },
  { id: 'fox_mask', name: '狐狸面具', emoji: '面', img: asset('fox_mask'), tags: [], objectTags: ['wearable', 'accessory', 'headwear'], visualTags: ['tasseled', 'patterned'] },
  { id: 'gauze_veil', name: '轻纱面帘', emoji: '纱', img: asset('gauze_veil'), tags: [], objectTags: ['wearable', 'clothing', 'accessory', 'headwear'], materialTags: ['fabric'], visualTags: ['tasseled', 'patterned'] },
  { id: 'bamboo_hat', name: '竹编斗笠', emoji: '笠', img: asset('bamboo_hat'), tags: [], objectTags: ['wearable', 'accessory', 'headwear'] },
  { id: 'plain_stone_arch_bridge', name: '素面石拱桥', emoji: '桥', img: asset('plain_stone_arch_bridge'), tags: [], objectTags: ['bridge'], traitTags: ['cross_water'], materialTags: ['stone'], visualTags: ['wide'], role: 'landmark' },
  { id: 'wooden_arch_bridge', name: '木拱桥', emoji: '桥', img: asset('wooden_arch_bridge'), tags: [], objectTags: ['bridge'], traitTags: ['cross_water'], materialTags: ['wood'], visualTags: ['wide'], role: 'landmark' },
  { id: 'covered_bridge', name: '风雨廊桥', emoji: '桥', img: asset('covered_bridge'), tags: [], objectTags: ['bridge'], traitTags: ['cross_water'], materialTags: ['wood'], visualTags: ['wide'], role: 'landmark' },
  { id: 'floating_dock', name: '浮木码头', emoji: '桥', img: asset('floating_dock'), tags: [], objectTags: ['bridge'], traitTags: ['cross_water'], materialTags: ['wood'], visualTags: ['wide'], role: 'landmark' },
  { id: 'lotus_boardwalk', name: '荷塘栈道', emoji: '桥', img: asset('lotus_boardwalk'), tags: [], objectTags: ['bridge'], traitTags: ['cross_water'], materialTags: ['wood'], visualTags: ['wide'], role: 'landmark' },
  { id: 'stone_water_bridge', name: '石拱水桥', emoji: '桥', img: asset('stone_water_bridge'), tags: [], objectTags: ['bridge'], traitTags: ['cross_water'], materialTags: ['stone'], visualTags: ['wide'], role: 'landmark' },
  { id: 'stone_slab_bridge', name: '石板桥', emoji: '桥', img: asset('stone_slab_bridge'), tags: [], objectTags: ['bridge'], traitTags: ['cross_water'], materialTags: ['stone'], visualTags: ['wide'], role: 'landmark' },
  { id: 'rope_bridge', name: '吊索桥', emoji: '桥', img: asset('rope_bridge'), tags: [], objectTags: ['bridge'], traitTags: ['cross_water'], materialTags: ['wood'], visualTags: ['wide'], role: 'landmark' },
  { id: 'red_arch_bridge', name: '朱漆拱桥', emoji: '桥', img: asset('red_arch_bridge'), tags: [], objectTags: ['bridge'], traitTags: ['cross_water'], materialTags: ['wood'], visualTags: ['wide'], role: 'landmark' },
];

/** 后续可向 ITEMS 添加 tags: []、distractorOnly: true 的专属干扰物。 */
export const COLLECTIBLE_ITEMS = ITEMS.filter((item) => !item.distractorOnly);

const ITEM_MAP = new Map(ITEMS.map((item) => [item.id, item]));

export function getItem(id: string): ItemDef {
  const item = ITEM_MAP.get(id);
  if (!item) throw new Error(`Unknown item id: ${id}`);
  return item;
}

export function itemsByCategory(categoryId: CategoryId): ItemDef[] {
  return ITEMS.filter((item) => !item.distractorOnly && item.tags.includes(categoryId));
}

export function getItemTags(item: ItemDef): TagId[] {
  return [...new Set<TagId>([
    ...item.tags,
    ...(item.objectTags ?? []),
    ...(item.traitTags ?? []),
    ...(item.materialTags ?? []),
    ...(item.visualTags ?? []),
  ])];
}

export function getCategory(categoryId: CategoryId): CategoryInfo {
  return CATEGORIES[categoryId];
}
