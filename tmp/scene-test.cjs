var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/game/scene.ts
var scene_exports = {};
__export(scene_exports, {
  SCENE_ITEM_FRACTION: () => SCENE_ITEM_FRACTION,
  SCENE_SCALE: () => SCENE_SCALE,
  generateScene: () => generateScene
});
module.exports = __toCommonJS(scene_exports);

// src/game/items.ts
var asset = (id) => `/items/ancient/${id}.webp`;
var ITEMS = [
  { id: "camel", name: "\u9A86\u9A7C", emoji: "\u{1F42B}", img: asset("camel"), tags: ["vehicle", "animal"] },
  { id: "chili_pepper", name: "\u8FA3\u6912", emoji: "\u{1F336}\uFE0F", img: asset("chili_pepper"), tags: ["plant"] },
  { id: "golden_pipa", name: "\u91D1\u7EB9\u7435\u7436", emoji: "\u266A", img: asset("golden_pipa"), tags: ["instrument"] },
  { id: "grapes", name: "\u8461\u8404", emoji: "\u{1F347}", img: asset("grapes"), tags: ["sweet_food", "plant"] },
  { id: "mooncake", name: "\u6708\u997C", emoji: "\u{1F96E}", img: asset("mooncake"), tags: ["sweet_food"] },
  { id: "horse", name: "\u9A8F\u9A6C", emoji: "\u{1F40E}", img: asset("horse"), tags: ["vehicle", "animal"] },
  { id: "bird_ocarina", name: "\u9E1F\u5F62\u9676\u7B1B", emoji: "\u266A", img: asset("bird_ocarina"), tags: ["instrument", "container"] },
  { id: "peach", name: "\u4ED9\u6843", emoji: "\u{1F351}", img: asset("peach"), tags: ["sweet_food", "plant"] },
  { id: "sedan_chair", name: "\u82B1\u8F7F", emoji: "\u8F7F", img: asset("sedan_chair"), tags: ["vehicle"] },
  { id: "konghou", name: "\u7B9C\u7BCC", emoji: "\u266A", img: asset("konghou"), tags: ["instrument"] },
  { id: "golden_ewer", name: "\u938F\u91D1\u6267\u58F6", emoji: "\u58F6", img: asset("golden_ewer"), tags: ["container"] },
  { id: "cat", name: "\u72F8\u82B1\u732B", emoji: "\u{1F408}", img: asset("cat"), tags: ["animal"] },
  { id: "red_sky_lantern", name: "\u6731\u7EA2\u5B54\u660E\u706F", emoji: "\u{1F3EE}", img: asset("red_sky_lantern"), tags: ["flying", "glowing"] },
  { id: "white_porcelain_vase", name: "\u767D\u74F7\u74F6", emoji: "\u74F6", img: asset("white_porcelain_vase"), tags: ["container"] },
  { id: "lychee", name: "\u8354\u679D", emoji: "\u679C", img: asset("lychee"), tags: ["sweet_food", "plant"] },
  { id: "painted_jar", name: "\u5F69\u9676\u7F50", emoji: "\u7F50", img: asset("painted_jar"), tags: ["container"] },
  { id: "black_pitcher", name: "\u7384\u7EB9\u58F6", emoji: "\u58F6", img: asset("black_pitcher"), tags: ["container"] },
  { id: "campfire", name: "\u7BDD\u706B", emoji: "\u{1F525}", img: asset("campfire"), tags: ["glowing"] },
  { id: "bronze_gong", name: "\u94DC\u9523", emoji: "\u9523", img: asset("bronze_gong"), tags: ["instrument"] },
  { id: "fish_hook", name: "\u9C7C\u94A9", emoji: "\u{1FA9D}", img: asset("fish_hook"), tags: ["sharp"] },
  { id: "torch", name: "\u706B\u628A", emoji: "\u{1F525}", img: asset("torch"), tags: ["glowing"] },
  { id: "arrow", name: "\u7FBD\u7BAD", emoji: "\u{1F3F9}", img: asset("arrow"), tags: ["sharp"] },
  { id: "needle", name: "\u94F6\u9488", emoji: "\u9488", img: asset("needle"), tags: ["sharp"] },
  { id: "flying_fish", name: "\u98DE\u9C7C\u5750\u9A91", emoji: "\u{1F421}", img: asset("flying_fish"), tags: ["vehicle", "animal"] },
  { id: "candied_hawthorn", name: "\u7CD6\u846B\u82A6", emoji: "\u{1F361}", img: asset("candied_hawthorn"), tags: ["sweet_food"] },
  { id: "lotus_ewer", name: "\u83B2\u82B1\u6267\u58F6", emoji: "\u58F6", img: asset("lotus_ewer"), tags: ["container"] },
  { id: "spike_trap", name: "\u5730\u523A", emoji: "\u523A", img: asset("spike_trap"), tags: ["sharp"] },
  { id: "osmanthus_cake", name: "\u6842\u82B1\u7CD5", emoji: "\u7CD5", img: asset("osmanthus_cake"), tags: ["sweet_food"] },
  { id: "deer", name: "\u6885\u82B1\u9E7F", emoji: "\u{1F98C}", img: asset("deer"), tags: ["animal"] },
  { id: "beast_fang", name: "\u517D\u7259", emoji: "\u7259", img: asset("beast_fang"), tags: ["sharp"] },
  { id: "waist_drum", name: "\u8170\u9F13", emoji: "\u{1F941}", img: asset("waist_drum"), tags: ["instrument"] },
  { id: "jade_hairpin", name: "\u7FE0\u7389\u7C2A", emoji: "\u7C2A", img: asset("jade_hairpin"), tags: ["sharp"] },
  { id: "black_bottle", name: "\u7384\u94C1\u74F6", emoji: "\u74F6", img: asset("black_bottle"), tags: ["container"] },
  { id: "nine_tailed_fox", name: "\u4E5D\u5C3E\u72D0", emoji: "\u{1F98A}", img: asset("nine_tailed_fox"), tags: ["vehicle", "animal"] },
  { id: "ornate_dagger", name: "\u5947\u95E8\u5315\u9996", emoji: "\u5203", img: asset("ornate_dagger"), tags: ["sharp"] },
  { id: "firefly", name: "\u8424\u706B\u866B", emoji: "\u2728", img: asset("firefly"), tags: ["flying", "glowing"] },
  { id: "shuriken", name: "\u98DE\u9556", emoji: "\u5203", img: asset("shuriken"), tags: ["sharp"] },
  { id: "oil_lamp", name: "\u957F\u660E\u706F", emoji: "\u{1FA94}", img: asset("oil_lamp"), tags: ["container", "glowing"] },
  { id: "red_dates", name: "\u7EA2\u67A3", emoji: "\u67A3", img: asset("red_dates"), tags: ["container", "sweet_food", "plant"] },
  { id: "inscribed_music_stand", name: "\u9898\u5B57\u7434\u67B6", emoji: "\u6587", img: asset("inscribed_music_stand"), tags: ["written"] },
  { id: "dandelion", name: "\u84B2\u516C\u82F1", emoji: "\u{1F33C}", img: asset("dandelion"), tags: ["flying"] },
  { id: "vinegar_jar", name: "\u918B\u575B", emoji: "\u918B", img: asset("vinegar_jar"), tags: ["written"] },
  { id: "lucky_raccoon", name: "\u62DB\u8D22\u72F8", emoji: "\u{1F99D}", img: asset("lucky_raccoon"), tags: ["animal"] },
  { id: "rattle_drum", name: "\u62E8\u6D6A\u9F13", emoji: "\u{1F941}", img: asset("rattle_drum"), tags: ["instrument"] },
  { id: "wooden_pipa", name: "\u6728\u7435\u7436", emoji: "\u266A", img: asset("wooden_pipa"), tags: ["instrument"] },
  { id: "swallow", name: "\u6625\u71D5", emoji: "\u{1F426}", img: asset("swallow"), tags: ["flying"] },
  { id: "painted_vase", name: "\u5F69\u7ED8\u82B1\u74F6", emoji: "\u74F6", img: asset("painted_vase"), tags: ["container"] },
  { id: "phoenix", name: "\u91D1\u7FBD\u51E4\u51F0", emoji: "\u51E4", img: asset("phoenix"), tags: ["flying"] },
  { id: "dragonfly", name: "\u873B\u8713", emoji: "\u866B", img: asset("dragonfly"), tags: ["flying"] },
  { id: "fire_wheels", name: "\u98CE\u706B\u8F6E", emoji: "\u8F6E", img: asset("fire_wheels"), tags: ["vehicle"] },
  { id: "chrysanthemum", name: "\u91D1\u83CA", emoji: "\u{1F33C}", img: asset("chrysanthemum"), tags: ["plant"] },
  { id: "tangyuan", name: "\u6C64\u5706", emoji: "\u{1F963}", img: asset("tangyuan"), tags: ["container", "sweet_food"] },
  { id: "hulusi", name: "\u846B\u82A6\u4E1D", emoji: "\u266A", img: asset("hulusi"), tags: ["instrument"] },
  { id: "inscribed_papers", name: "\u9898\u5B57\u7EB8\u9875", emoji: "\u{1F4DC}", img: asset("inscribed_papers"), tags: ["written"] },
  { id: "icicle", name: "\u51B0\u9525", emoji: "\u51B0", img: asset("icicle"), tags: ["sharp"] },
  { id: "golden_bowl", name: "\u938F\u91D1\u94B5", emoji: "\u94B5", img: asset("golden_bowl"), tags: ["container"] },
  { id: "ancient_book", name: "\u53E4\u7C4D", emoji: "\u{1F4D6}", img: asset("ancient_book"), tags: ["written"] },
  { id: "watermelon", name: "\u897F\u74DC", emoji: "\u{1F349}", img: asset("watermelon"), tags: ["sweet_food", "plant"] },
  { id: "guqin", name: "\u53E4\u7434", emoji: "\u7434", img: asset("guqin"), tags: ["instrument"] },
  { id: "orange_sky_lantern", name: "\u6A59\u8272\u5B54\u660E\u706F", emoji: "\u{1F3EE}", img: asset("orange_sky_lantern"), tags: ["flying", "glowing"] },
  { id: "penguin", name: "\u4F01\u9E45", emoji: "\u{1F427}", img: asset("penguin"), tags: ["animal"] },
  { id: "incense_burner", name: "\u9999\u7089", emoji: "\u7089", img: asset("incense_burner"), tags: ["container"] },
  { id: "cotton", name: "\u68C9\u82B1", emoji: "\u82B1", img: asset("cotton"), tags: ["plant"] },
  { id: "eggplant", name: "\u8304\u5B50", emoji: "\u{1F346}", img: asset("eggplant"), tags: ["plant"] },
  { id: "crossed_swords", name: "\u53CC\u5251", emoji: "\u2694\uFE0F", img: asset("crossed_swords"), tags: ["sharp"] },
  { id: "hand_drum", name: "\u624B\u9F13", emoji: "\u{1F941}", img: asset("hand_drum"), tags: ["instrument"] },
  { id: "floral_hairpin", name: "\u82B1\u7C2A", emoji: "\u7C2A", img: asset("floral_hairpin"), tags: ["sharp"] },
  { id: "patterned_vase", name: "\u7F20\u679D\u74F6", emoji: "\u74F6", img: asset("patterned_vase"), tags: ["container"] },
  { id: "jewelry_box", name: "\u9996\u9970\u5323", emoji: "\u5323", img: asset("jewelry_box"), tags: ["container"] },
  { id: "medicine_bottle", name: "\u836F\u74F6", emoji: "\u836F", img: asset("medicine_bottle"), tags: ["written"] },
  { id: "carriage", name: "\u9A6C\u8F66", emoji: "\u8F66", img: asset("carriage"), tags: ["vehicle"] },
  { id: "butterfly", name: "\u8774\u8776", emoji: "\u{1F98B}", img: asset("butterfly"), tags: ["flying"] },
  { id: "sword", name: "\u5B9D\u5251", emoji: "\u{1F5E1}\uFE0F", img: asset("sword"), tags: ["sharp"] },
  { id: "clay_jar", name: "\u9676\u7F50", emoji: "\u7F50", img: asset("clay_jar"), tags: ["container"] },
  { id: "candle", name: "\u8721\u70DB", emoji: "\u{1F56F}\uFE0F", img: asset("candle"), tags: ["glowing"] },
  { id: "treasure_ship", name: "\u697C\u8239", emoji: "\u26F5", img: asset("treasure_ship"), tags: ["vehicle"] },
  { id: "lidded_bowl", name: "\u91D1\u76D6\u7897", emoji: "\u7897", img: asset("lidded_bowl"), tags: ["container"] },
  { id: "dog", name: "\u67F4\u72AC", emoji: "\u{1F415}", img: asset("dog"), tags: ["animal"] },
  { id: "rabbit", name: "\u7389\u5154", emoji: "\u{1F407}", img: asset("rabbit"), tags: ["animal"] },
  { id: "blue_book", name: "\u84DD\u76AE\u53E4\u7C4D", emoji: "\u{1F4D8}", img: asset("blue_book"), tags: ["written"] },
  { id: "zongzi", name: "\u7CBD\u5B50", emoji: "\u7CBD", img: asset("zongzi"), tags: ["sweet_food"] },
  { id: "kite", name: "\u7EB8\u9E22", emoji: "\u{1FA81}", img: asset("kite"), tags: ["flying"] },
  { id: "partitioned_cauldron", name: "\u4E5D\u683C\u94DC\u9F0E", emoji: "\u9F0E", img: asset("partitioned_cauldron"), tags: ["container"] },
  { id: "peony", name: "\u7261\u4E39", emoji: "\u{1F33A}", img: asset("peony"), tags: ["plant"] },
  { id: "cabinet", name: "\u767E\u5B9D\u67DC", emoji: "\u67DC", img: asset("cabinet"), tags: ["container"] },
  { id: "feather", name: "\u7FBD\u6BDB", emoji: "\u{1FAB6}", img: asset("feather"), tags: ["flying"] },
  { id: "paper_crane", name: "\u7EB8\u9E64", emoji: "\u9E64", img: asset("paper_crane"), tags: ["flying"] }
];
var COLLECTIBLE_ITEMS = ITEMS.filter((item) => !item.distractorOnly);
var ITEM_MAP = new Map(ITEMS.map((item) => [item.id, item]));
function itemsByCategory(categoryId) {
  return ITEMS.filter((item) => !item.distractorOnly && item.tags.includes(categoryId));
}

// src/game/itemGeometry.ts
var ITEM_GEOMETRY = {
  "camel": { width: 0.875, height: 0.707 },
  "chili_pepper": { width: 0.875, height: 0.8398 },
  "golden_pipa": { width: 0.6562, height: 0.875 },
  "grapes": { width: 0.875, height: 0.6289 },
  "mooncake": { width: 0.875, height: 0.6562 },
  "horse": { width: 0.875, height: 0.75 },
  "bird_ocarina": { width: 0.8438, height: 0.875 },
  "peach": { width: 0.875, height: 0.5586 },
  "sedan_chair": { width: 0.875, height: 0.4766 },
  "konghou": { width: 0.8359, height: 0.875 },
  "golden_ewer": { width: 0.5391, height: 0.875 },
  "cat": { width: 0.875, height: 0.6523 },
  "red_sky_lantern": { width: 0.625, height: 0.875 },
  "white_porcelain_vase": { width: 0.4531, height: 0.875 },
  "lychee": { width: 0.875, height: 0.6016 },
  "painted_jar": { width: 0.7773, height: 0.875 },
  "black_pitcher": { width: 0.6914, height: 0.875 },
  "campfire": { width: 0.875, height: 0.6758 },
  "bronze_gong": { width: 0.875, height: 0.8047 },
  "fish_hook": { width: 0.5859, height: 0.875 },
  "torch": { width: 0.5898, height: 0.875 },
  "arrow": { width: 0.875, height: 0.6211 },
  "needle": { width: 0.5898, height: 0.875 },
  "flying_fish": { width: 0.875, height: 0.6406 },
  "candied_hawthorn": { width: 0.6797, height: 0.875 },
  "lotus_ewer": { width: 0.6523, height: 0.875 },
  "spike_trap": { width: 0.875, height: 0.832 },
  "osmanthus_cake": { width: 0.875, height: 0.4219 },
  "deer": { width: 0.6719, height: 0.875 },
  "beast_fang": { width: 0.7266, height: 0.875 },
  "waist_drum": { width: 0.7617, height: 0.875 },
  "jade_hairpin": { width: 0.7578, height: 0.875 },
  "black_bottle": { width: 0.5938, height: 0.875 },
  "nine_tailed_fox": { width: 0.875, height: 0.6328 },
  "ornate_dagger": { width: 0.832, height: 0.875 },
  "firefly": { width: 0.875, height: 0.6523 },
  "shuriken": { width: 0.875, height: 0.7148 },
  "oil_lamp": { width: 0.875, height: 0.5039 },
  "red_dates": { width: 0.875, height: 0.5039 },
  "inscribed_music_stand": { width: 0.6211, height: 0.875 },
  "dandelion": { width: 0.875, height: 0.7148 },
  "vinegar_jar": { width: 0.875, height: 0.8477 },
  "lucky_raccoon": { width: 0.6797, height: 0.875 },
  "rattle_drum": { width: 0.8398, height: 0.875 },
  "wooden_pipa": { width: 0.6758, height: 0.875 },
  "swallow": { width: 0.875, height: 0.8398 },
  "painted_vase": { width: 0.6836, height: 0.875 },
  "phoenix": { width: 0.875, height: 0.7812 },
  "dragonfly": { width: 0.875, height: 0.7148 },
  "fire_wheels": { width: 0.875, height: 0.4375 },
  "chrysanthemum": { width: 0.8086, height: 0.875 },
  "tangyuan": { width: 0.875, height: 0.5586 },
  "hulusi": { width: 0.8125, height: 0.875 },
  "inscribed_papers": { width: 0.875, height: 0.7617 },
  "icicle": { width: 0.875, height: 0.4492 },
  "golden_bowl": { width: 0.875, height: 0.4883 },
  "ancient_book": { width: 0.8281, height: 0.875 },
  "watermelon": { width: 0.875, height: 0.8516 },
  "guqin": { width: 0.8281, height: 0.875 },
  "orange_sky_lantern": { width: 0.7461, height: 0.875 },
  "penguin": { width: 0.8086, height: 0.875 },
  "incense_burner": { width: 0.7539, height: 0.875 },
  "cotton": { width: 0.8516, height: 0.875 },
  "eggplant": { width: 0.875, height: 0.7891 },
  "crossed_swords": { width: 0.8711, height: 0.875 },
  "hand_drum": { width: 0.5508, height: 0.875 },
  "floral_hairpin": { width: 0.875, height: 0.8125 },
  "patterned_vase": { width: 0.4688, height: 0.875 },
  "jewelry_box": { width: 0.875, height: 0.8086 },
  "medicine_bottle": { width: 0.6523, height: 0.875 },
  "carriage": { width: 0.875, height: 0.5586 },
  "butterfly": { width: 0.875, height: 0.7422 },
  "sword": { width: 0.8594, height: 0.875 },
  "clay_jar": { width: 0.6328, height: 0.875 },
  "candle": { width: 0.3789, height: 0.875 },
  "treasure_ship": { width: 0.875, height: 0.6875 },
  "lidded_bowl": { width: 0.875, height: 0.8672 },
  "dog": { width: 0.875, height: 0.7422 },
  "rabbit": { width: 0.6953, height: 0.875 },
  "blue_book": { width: 0.875, height: 0.8516 },
  "zongzi": { width: 0.875, height: 0.7188 },
  "kite": { width: 0.875, height: 0.8047 },
  "partitioned_cauldron": { width: 0.875, height: 0.8203 },
  "peony": { width: 0.875, height: 0.7812 },
  "cabinet": { width: 0.7695, height: 0.875 },
  "feather": { width: 0.8086, height: 0.875 },
  "paper_crane": { width: 0.875, height: 0.8008 }
};

// src/game/scene.ts
var SCENE_SCALE = { w: 2.6, h: 1 };
var SCENE_ITEM_FRACTION = 0.145;
var BASE_X_PERCENT = SCENE_ITEM_FRACTION / SCENE_SCALE.w * 100;
var BASE_Y_PERCENT = SCENE_ITEM_FRACTION * 100;
var EDGE_CROP_X = 0.75;
var EDGE_CROP_Y = 1.1;
var GAP_X = 0.34;
var GAP_Y = 0.72;
var uidCounter = 1;
function rand(min, max) {
  return min + Math.random() * (max - min);
}
function shuffle(items) {
  const output = [...items];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }
  return output;
}
function footprint(def, scale, rot) {
  const geometry = ITEM_GEOMETRY[def.id] ?? { width: 0.875, height: 0.875 };
  const angle = Math.abs(rot) * (Math.PI / 180);
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  return {
    width: BASE_X_PERCENT * scale * (geometry.width * cos + geometry.height * sin),
    height: BASE_Y_PERCENT * scale * (geometry.width * sin + geometry.height * cos)
  };
}
function paddedRect(x, y, width, height) {
  return {
    left: x - width / 2 - GAP_X,
    right: x + width / 2 + GAP_X,
    top: y - height / 2 - GAP_Y,
    bottom: y + height / 2 + GAP_Y
  };
}
function collides(candidate, placed) {
  return placed.some((other) => !(candidate.right <= other.left || candidate.left >= other.right || candidate.bottom <= other.top || candidate.top >= other.bottom));
}
function pickInRounds(pool, count) {
  const output = [];
  while (output.length < count) {
    output.push(...shuffle(pool).slice(0, count - output.length));
  }
  return output;
}
function generateScene(spec) {
  const targetPool = itemsByCategory(spec.category);
  const distractorPool = ITEMS.filter(
    (item) => item.distractorOnly || !item.tags.includes(spec.category)
  );
  if (!targetPool.length || !distractorPool.length) {
    throw new Error(`\u5206\u7C7B ${spec.category} \u7F3A\u5C11\u76EE\u6807\u6216\u5E72\u6270\u7269\u7D20\u6750`);
  }
  const targetDefs = pickInRounds(targetPool, spec.targetCount);
  const distractorDefs = pickInRounds(distractorPool, spec.distractors);
  const spawnList = shuffle([
    ...targetDefs.map((def) => ({ def, isTarget: true })),
    ...distractorDefs.map((def) => ({ def, isTarget: false }))
  ]);
  const prepared = spawnList.map((entry) => {
    const scale = rand(0.78, 1.22);
    const rot = rand(-17, 17);
    const size = footprint(entry.def, scale, rot);
    return { ...entry, scale, rot, area: size.width * size.height };
  }).sort((a, b) => b.area - a.area);
  const clusterCount = Math.max(7, Math.round(spawnList.length / 9));
  const clusters = Array.from({ length: clusterCount }, (_, index) => ({
    x: (index + rand(0.18, 0.82)) / clusterCount * 100,
    y: rand(10, 90)
  }));
  const packedRects = [];
  const placed = [];
  for (const entry of prepared) {
    let scale = entry.scale;
    let position = null;
    for (let shrinkRound = 0; shrinkRound < 6 && !position; shrinkRound += 1) {
      const size = footprint(entry.def, scale, entry.rot);
      const minX = size.width / 2 - EDGE_CROP_X;
      const maxX = 100 - size.width / 2 + EDGE_CROP_X;
      const minY = size.height / 2 - EDGE_CROP_Y;
      const maxY = 100 - size.height / 2 + EDGE_CROP_Y;
      for (let attempt = 0; attempt < 720; attempt += 1) {
        let x;
        let y;
        if (Math.random() < 0.68) {
          const cluster = clusters[Math.floor(rand(0, clusters.length))];
          x = cluster.x + (Math.random() + Math.random() - 1) * 11;
          y = cluster.y + (Math.random() + Math.random() - 1) * 24;
        } else {
          x = rand(minX, maxX);
          y = rand(minY, maxY);
        }
        x = Math.max(minX, Math.min(maxX, x));
        y = Math.max(minY, Math.min(maxY, y));
        const rect = paddedRect(x, y, size.width, size.height);
        if (!collides(rect, packedRects)) position = { x, y, rect };
        if (position) break;
      }
      if (!position) scale *= 0.93;
    }
    if (!position) {
      throw new Error(`\u573A\u666F\u88C5\u7BB1\u5931\u8D25\uFF1A${entry.def.id}\uFF0C\u8BF7\u964D\u4F4E\u672C\u5173\u5E72\u6270\u7269\u6570\u91CF`);
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
      isTarget: entry.isTarget
    });
  }
  return {
    items: placed,
    targets: [{ categoryId: spec.category, remaining: spec.targetCount, total: spec.targetCount }]
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SCENE_ITEM_FRACTION,
  SCENE_SCALE,
  generateScene
});
