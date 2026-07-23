// .codex-temp/stress-scenes.ts
import fs from "node:fs";

// src/game/items.ts
var CATEGORIES = {
  instrument: {
    name: "\u4E50\u5668",
    prompt: "\u627E\u51FA\u6240\u6709\u4E50\u5668",
    emoji: "\u266A",
    description: "\u542C\u58F0\u8FA8\u5F62\uFF0C\u5BFB\u51FA\u80FD\u594F\u54CD\u65CB\u5F8B\u4E4B\u7269",
    color: "#7c3f58",
    soft: "#f7e8ee",
    bg: "radial-gradient(circle at 18% 20%, rgba(167, 94, 122, .22), transparent 25%), linear-gradient(135deg, #f6eadf 0%, #ead8d9 48%, #f4e8d7 100%)"
  },
  written: {
    name: "\u6709\u5B57\u7684\u7269\u54C1",
    prompt: "\u627E\u51FA\u5E26\u5B57\u7684\u7269\u54C1",
    emoji: "\u6587",
    description: "\u7559\u610F\u9898\u7B7E\u3001\u4E66\u518C\u4E0E\u74F6\u8EAB\u4E0A\u7684\u6587\u5B57",
    color: "#48606f",
    soft: "#e8f0f1",
    bg: "radial-gradient(circle at 82% 18%, rgba(73, 104, 117, .2), transparent 26%), linear-gradient(145deg, #f1ecdf 0%, #dce6e5 55%, #eee3d1 100%)"
  },
  container: {
    name: "\u80FD\u88C5\u4E1C\u897F\u7684\u5BB9\u5668",
    prompt: "\u627E\u51FA\u80FD\u88C5\u4E1C\u897F\u7684\u5BB9\u5668",
    emoji: "\u5668",
    description: "\u74F6\u3001\u58F6\u3001\u7897\u3001\u5323\uFF0C\u90FD\u53EF\u76DB\u653E\u4E07\u7269",
    color: "#9b6635",
    soft: "#f8ecd9",
    bg: "radial-gradient(circle at 20% 75%, rgba(177, 118, 54, .2), transparent 26%), linear-gradient(135deg, #f5ead7 0%, #ead4b6 52%, #f4e8d4 100%)"
  },
  flying: {
    name: "\u4F1A\u98DE\u7684",
    prompt: "\u627E\u51FA\u4F1A\u98DE\u7684\u7269\u54C1",
    emoji: "\u7FBD",
    description: "\u6709\u7FFC\u3001\u6709\u98CE\uFF0C\u6216\u80FD\u5347\u4E0A\u5929\u7A7A",
    color: "#39758a",
    soft: "#e4f3f4",
    bg: "radial-gradient(circle at 76% 22%, rgba(82, 153, 172, .22), transparent 27%), linear-gradient(145deg, #e7f2ee 0%, #cfe4e5 48%, #eee7d4 100%)"
  },
  glowing: {
    name: "\u4F1A\u53D1\u5149\u7684",
    prompt: "\u627E\u51FA\u4F1A\u53D1\u5149\u7684\u7269\u54C1",
    emoji: "\u5149",
    description: "\u706B\u7130\u3001\u706F\u70DB\u4E0E\u591C\u8272\u91CC\u7684\u5FAE\u5149",
    color: "#8b5d24",
    soft: "#fff0cf",
    bg: "radial-gradient(circle at 72% 28%, rgba(244, 174, 64, .35), transparent 25%), linear-gradient(145deg, #e8dfcf 0%, #d7cfbd 45%, #f2dfb6 100%)"
  },
  sharp: {
    name: "\u5C16\u9510\u7684",
    prompt: "\u627E\u51FA\u5C16\u9510\u7684\u7269\u54C1",
    emoji: "\u5203",
    description: "\u5203\u3001\u9488\u3001\u7BAD\u4E0E\u4E00\u5207\u950B\u5229\u4E4B\u7269",
    color: "#5c6670",
    soft: "#e8edef",
    bg: "radial-gradient(circle at 22% 22%, rgba(86, 104, 116, .2), transparent 26%), linear-gradient(135deg, #ede8dc 0%, #d8dedf 50%, #eee3d2 100%)"
  },
  sweet_food: {
    name: "\u751C\u7684\u98DF\u7269",
    prompt: "\u627E\u51FA\u751C\u751C\u7684\u98DF\u7269",
    emoji: "\u751C",
    description: "\u679C\u9999\u4E0E\u7CD5\u70B9\uFF0C\u90FD\u662F\u751C\u871C\u7EBF\u7D22",
    color: "#a45252",
    soft: "#fae9e1",
    bg: "radial-gradient(circle at 78% 72%, rgba(204, 102, 94, .2), transparent 28%), linear-gradient(135deg, #f6e8d7 0%, #f2d9d1 50%, #f4e7cf 100%)"
  },
  plant: {
    name: "\u690D\u7269",
    prompt: "\u627E\u51FA\u5C5E\u4E8E\u690D\u7269\u7684\u7269\u54C1",
    emoji: "\u82B1",
    description: "\u82B1\u3001\u679C\u3001\u679D\u53F6\u7686\u4ECE\u5927\u5730\u751F\u957F",
    color: "#4d7752",
    soft: "#e7f1df",
    bg: "radial-gradient(circle at 18% 78%, rgba(85, 136, 80, .2), transparent 28%), linear-gradient(145deg, #e9efdc 0%, #d5e4cc 48%, #f0e6d2 100%)"
  },
  vehicle: {
    name: "\u5750\u9A91\u4E0E\u4EA4\u901A\u5DE5\u5177",
    prompt: "\u627E\u51FA\u5750\u9A91\u6216\u4EA4\u901A\u5DE5\u5177",
    emoji: "\u884C",
    description: "\u80FD\u8F7D\u4EBA\u8FDC\u884C\uFF0C\u4E5F\u80FD\u7A7F\u57CE\u8D8A\u91CE",
    color: "#8a5735",
    soft: "#f4e6d9",
    bg: "radial-gradient(circle at 78% 24%, rgba(153, 91, 49, .2), transparent 27%), linear-gradient(135deg, #efe2d1 0%, #ddc7b1 50%, #eee4d4 100%)"
  },
  animal: {
    name: "\u52A8\u7269",
    prompt: "\u627E\u51FA\u6240\u6709\u52A8\u7269",
    emoji: "\u517D",
    description: "\u98DE\u79BD\u8D70\u517D\uFF0C\u5404\u6709\u7075\u52A8\u8EAB\u5F71",
    color: "#9a6039",
    soft: "#f7e8d8",
    bg: "radial-gradient(circle at 20% 20%, rgba(180, 107, 57, .2), transparent 27%), linear-gradient(145deg, #f3e7d5 0%, #e7d2bb 50%, #eee7d7 100%)"
  }
};
var asset = (id) => `/items/ancient/${id}.webp`;
var ITEMS = [
  { id: "camel", name: "\u9A86\u9A7C", emoji: "\u{1F42B}", img: asset("camel"), tags: ["vehicle", "animal"], traitTags: ["rideable", "four_legged"] },
  { id: "chili_pepper", name: "\u8FA3\u6912", emoji: "\u{1F336}\uFE0F", img: asset("chili_pepper"), tags: ["plant"], objectTags: ["food", "vegetable"], visualTags: ["leafy"] },
  { id: "golden_pipa", name: "\u91D1\u7EB9\u7435\u7436", emoji: "\u266A", img: asset("golden_pipa"), tags: ["instrument"], traitTags: ["sound_making"], visualTags: ["slender", "tasseled", "patterned"] },
  { id: "grapes", name: "\u8461\u8404", emoji: "\u{1F347}", img: asset("grapes"), tags: ["sweet_food", "plant"], objectTags: ["food", "fruit"], visualTags: ["leafy"] },
  { id: "mooncake", name: "\u6708\u997C", emoji: "\u{1F96E}", img: asset("mooncake"), tags: ["sweet_food"], objectTags: ["food"], visualTags: ["round"] },
  { id: "horse", name: "\u9A8F\u9A6C", emoji: "\u{1F40E}", img: asset("horse"), tags: ["vehicle", "animal"], traitTags: ["rideable", "four_legged"] },
  { id: "bird_ocarina", name: "\u9E1F\u5F62\u9676\u7B1B", emoji: "\u266A", img: asset("bird_ocarina"), tags: ["instrument", "container"], traitTags: ["sound_making"], materialTags: ["ceramic"], visualTags: ["tasseled", "patterned"] },
  { id: "peach", name: "\u4ED9\u6843", emoji: "\u{1F351}", img: asset("peach"), tags: ["sweet_food", "plant"], objectTags: ["food", "fruit"], visualTags: ["round", "leafy"] },
  { id: "sedan_chair", name: "\u82B1\u8F7F", emoji: "\u8F7F", img: asset("sedan_chair"), tags: ["vehicle"], traitTags: ["rideable"], materialTags: ["wood"], visualTags: ["wide", "patterned"] },
  { id: "konghou", name: "\u7B9C\u7BCC", emoji: "\u266A", img: asset("konghou"), tags: ["instrument"], traitTags: ["sound_making"], materialTags: ["wood"], visualTags: ["slender"] },
  { id: "golden_ewer", name: "\u938F\u91D1\u6267\u58F6", emoji: "\u58F6", img: asset("golden_ewer"), tags: ["container"], objectTags: ["bottle_jar"], materialTags: ["metal_jewelry"], visualTags: ["handled", "patterned"] },
  { id: "cat", name: "\u72F8\u82B1\u732B", emoji: "\u{1F408}", img: asset("cat"), tags: ["animal"], traitTags: ["four_legged"] },
  { id: "red_sky_lantern", name: "\u6731\u7EA2\u5B54\u660E\u706F", emoji: "\u{1F3EE}", img: asset("red_sky_lantern"), tags: ["flying", "glowing"], objectTags: ["lighting"], traitTags: ["flaming"], materialTags: ["paper"], visualTags: ["tasseled"] },
  { id: "white_porcelain_vase", name: "\u767D\u74F7\u74F6", emoji: "\u74F6", img: asset("white_porcelain_vase"), tags: ["container"], objectTags: ["bottle_jar"], materialTags: ["ceramic"], visualTags: ["slender"] },
  { id: "lychee", name: "\u8354\u679D", emoji: "\u679C", img: asset("lychee"), tags: ["sweet_food", "plant"], objectTags: ["food", "fruit"], visualTags: ["leafy"] },
  { id: "painted_jar", name: "\u5F69\u9676\u7F50", emoji: "\u7F50", img: asset("painted_jar"), tags: ["container"], objectTags: ["bottle_jar"], materialTags: ["ceramic"], visualTags: ["patterned"] },
  { id: "black_pitcher", name: "\u7384\u7EB9\u58F6", emoji: "\u58F6", img: asset("black_pitcher"), tags: ["container"], objectTags: ["bottle_jar"], materialTags: ["ceramic"], visualTags: ["slender", "handled", "patterned"] },
  { id: "campfire", name: "\u7BDD\u706B", emoji: "\u{1F525}", img: asset("campfire"), tags: ["glowing"], objectTags: ["lighting"], traitTags: ["flaming"], materialTags: ["wood"], visualTags: ["wide"] },
  { id: "bronze_gong", name: "\u94DC\u9523", emoji: "\u9523", img: asset("bronze_gong"), tags: ["instrument"], traitTags: ["sound_making"], materialTags: ["metal_jewelry"], visualTags: ["round"] },
  { id: "fish_hook", name: "\u9C7C\u94A9", emoji: "\u{1FA9D}", img: asset("fish_hook"), tags: ["sharp"], materialTags: ["metal_jewelry"], visualTags: ["slender", "handled"] },
  { id: "torch", name: "\u706B\u628A", emoji: "\u{1F525}", img: asset("torch"), tags: ["glowing"], objectTags: ["lighting"], traitTags: ["flaming"], materialTags: ["wood"], visualTags: ["slender", "handled"] },
  { id: "arrow", name: "\u7FBD\u7BAD", emoji: "\u{1F3F9}", img: asset("arrow"), tags: ["sharp"], objectTags: ["weapon"], materialTags: ["wood"], visualTags: ["slender"] },
  { id: "needle", name: "\u94F6\u9488", emoji: "\u9488", img: asset("needle"), tags: ["sharp"], materialTags: ["metal_jewelry"], visualTags: ["slender"] },
  { id: "flying_fish", name: "\u98DE\u9C7C\u5750\u9A91", emoji: "\u{1F421}", img: asset("flying_fish"), tags: ["vehicle", "animal"], traitTags: ["rideable"] },
  { id: "candied_hawthorn", name: "\u7CD6\u846B\u82A6", emoji: "\u{1F361}", img: asset("candied_hawthorn"), tags: ["sweet_food"], objectTags: ["food"] },
  { id: "lotus_ewer", name: "\u83B2\u82B1\u6267\u58F6", emoji: "\u58F6", img: asset("lotus_ewer"), tags: ["container"], objectTags: ["bottle_jar"], materialTags: ["metal_jewelry"], visualTags: ["handled", "patterned"] },
  { id: "spike_trap", name: "\u5730\u523A", emoji: "\u523A", img: asset("spike_trap"), tags: ["sharp"], objectTags: ["weapon"], materialTags: ["metal_jewelry"] },
  { id: "osmanthus_cake", name: "\u6842\u82B1\u7CD5", emoji: "\u7CD5", img: asset("osmanthus_cake"), tags: ["sweet_food"], objectTags: ["food"] },
  { id: "deer", name: "\u6885\u82B1\u9E7F", emoji: "\u{1F98C}", img: asset("deer"), tags: ["animal"], traitTags: ["four_legged"] },
  { id: "beast_fang", name: "\u517D\u7259", emoji: "\u7259", img: asset("beast_fang"), tags: ["sharp"], visualTags: ["slender"] },
  { id: "waist_drum", name: "\u8170\u9F13", emoji: "\u{1F941}", img: asset("waist_drum"), tags: ["instrument"], traitTags: ["sound_making"], materialTags: ["wood"], visualTags: ["tasseled", "patterned"] },
  { id: "jade_hairpin", name: "\u7FE0\u7389\u7C2A", emoji: "\u7C2A", img: asset("jade_hairpin"), tags: ["sharp"], objectTags: ["wearable", "accessory", "headwear"], materialTags: ["metal_jewelry", "gemstone"], visualTags: ["slender", "tasseled", "patterned"] },
  { id: "black_bottle", name: "\u7384\u94C1\u74F6", emoji: "\u74F6", img: asset("black_bottle"), tags: ["container"], objectTags: ["bottle_jar"] },
  { id: "nine_tailed_fox", name: "\u4E5D\u5C3E\u72D0", emoji: "\u{1F98A}", img: asset("nine_tailed_fox"), tags: ["vehicle", "animal"], traitTags: ["rideable", "four_legged"] },
  { id: "ornate_dagger", name: "\u5947\u95E8\u5315\u9996", emoji: "\u5203", img: asset("ornate_dagger"), tags: ["sharp"], objectTags: ["weapon"], materialTags: ["metal_jewelry"], visualTags: ["slender", "patterned"] },
  { id: "firefly", name: "\u8424\u706B\u866B", emoji: "\u2728", img: asset("firefly"), tags: ["flying", "glowing"], objectTags: ["lighting", "insect"], traitTags: ["winged"] },
  { id: "shuriken", name: "\u98DE\u9556", emoji: "\u5203", img: asset("shuriken"), tags: ["sharp"], objectTags: ["weapon"], materialTags: ["metal_jewelry"] },
  { id: "oil_lamp", name: "\u957F\u660E\u706F", emoji: "\u{1FA94}", img: asset("oil_lamp"), tags: ["container", "glowing"], objectTags: ["lighting"], traitTags: ["flaming"], materialTags: ["metal_jewelry"], visualTags: ["handled"] },
  { id: "red_dates", name: "\u7EA2\u67A3", emoji: "\u67A3", img: asset("red_dates"), tags: ["container", "sweet_food", "plant"], objectTags: ["food", "fruit", "bowl_dish"], visualTags: ["round", "leafy"] },
  { id: "inscribed_music_stand", name: "\u9898\u5B57\u7434\u67B6", emoji: "\u6587", img: asset("inscribed_music_stand"), tags: ["written"] },
  { id: "dandelion", name: "\u84B2\u516C\u82F1", emoji: "\u{1F33C}", img: asset("dandelion"), tags: ["flying"], objectTags: ["flower"], visualTags: ["leafy"] },
  { id: "vinegar_jar", name: "\u918B\u575B", emoji: "\u918B", img: asset("vinegar_jar"), tags: ["written"], objectTags: ["bottle_jar"], materialTags: ["ceramic"], visualTags: ["patterned"] },
  { id: "lucky_raccoon", name: "\u62DB\u8D22\u72F8", emoji: "\u{1F99D}", img: asset("lucky_raccoon"), tags: ["animal"], traitTags: ["four_legged"] },
  { id: "rattle_drum", name: "\u62E8\u6D6A\u9F13", emoji: "\u{1F941}", img: asset("rattle_drum"), tags: ["instrument"], traitTags: ["sound_making"], materialTags: ["wood"], visualTags: ["slender", "handled", "patterned"] },
  { id: "wooden_pipa", name: "\u6728\u7435\u7436", emoji: "\u266A", img: asset("wooden_pipa"), tags: ["instrument"], traitTags: ["sound_making"], materialTags: ["wood"], visualTags: ["slender", "patterned"] },
  { id: "swallow", name: "\u6625\u71D5", emoji: "\u{1F426}", img: asset("swallow"), tags: ["flying"], traitTags: ["winged"] },
  { id: "painted_vase", name: "\u5F69\u7ED8\u82B1\u74F6", emoji: "\u74F6", img: asset("painted_vase"), tags: ["container"], objectTags: ["bottle_jar"], materialTags: ["ceramic"], visualTags: ["patterned"] },
  { id: "phoenix", name: "\u91D1\u7FBD\u51E4\u51F0", emoji: "\u51E4", img: asset("phoenix"), tags: ["flying"], traitTags: ["winged"] },
  { id: "dragonfly", name: "\u873B\u8713", emoji: "\u866B", img: asset("dragonfly"), tags: ["flying"], objectTags: ["insect"], traitTags: ["winged"], visualTags: ["slender"] },
  { id: "fire_wheels", name: "\u98CE\u706B\u8F6E", emoji: "\u8F6E", img: asset("fire_wheels"), tags: ["vehicle"], objectTags: ["weapon"], traitTags: ["flaming", "rideable"], visualTags: ["round", "wide", "paired"] },
  { id: "chrysanthemum", name: "\u91D1\u83CA", emoji: "\u{1F33C}", img: asset("chrysanthemum"), tags: ["plant"], objectTags: ["flower"], visualTags: ["leafy"] },
  { id: "tangyuan", name: "\u6C64\u5706", emoji: "\u{1F963}", img: asset("tangyuan"), tags: ["container", "sweet_food"], objectTags: ["food", "bowl_dish"], materialTags: ["ceramic"], visualTags: ["round"] },
  { id: "hulusi", name: "\u846B\u82A6\u4E1D", emoji: "\u266A", img: asset("hulusi"), tags: ["instrument"], traitTags: ["sound_making"], visualTags: ["slender", "handled", "patterned"] },
  { id: "inscribed_papers", name: "\u9898\u5B57\u7EB8\u9875", emoji: "\u{1F4DC}", img: asset("inscribed_papers"), tags: ["written"], materialTags: ["paper"] },
  { id: "icicle", name: "\u51B0\u9525", emoji: "\u51B0", img: asset("icicle"), tags: ["sharp"], visualTags: ["slender"] },
  { id: "golden_bowl", name: "\u938F\u91D1\u94B5", emoji: "\u94B5", img: asset("golden_bowl"), tags: ["container"], objectTags: ["bowl_dish"], materialTags: ["metal_jewelry"], visualTags: ["round", "patterned"] },
  { id: "ancient_book", name: "\u53E4\u7C4D", emoji: "\u{1F4D6}", img: asset("ancient_book"), tags: ["written"], materialTags: ["paper"], visualTags: ["patterned"] },
  { id: "watermelon", name: "\u897F\u74DC", emoji: "\u{1F349}", img: asset("watermelon"), tags: ["sweet_food", "plant"], objectTags: ["food", "fruit"], visualTags: ["round", "leafy"] },
  { id: "guqin", name: "\u53E4\u7434", emoji: "\u7434", img: asset("guqin"), tags: ["instrument"], traitTags: ["sound_making"], materialTags: ["wood"], visualTags: ["slender", "tasseled", "patterned"] },
  { id: "orange_sky_lantern", name: "\u6A59\u8272\u5B54\u660E\u706F", emoji: "\u{1F3EE}", img: asset("orange_sky_lantern"), tags: ["flying", "glowing"], objectTags: ["lighting"], traitTags: ["flaming"], materialTags: ["paper"], visualTags: ["tasseled"] },
  { id: "penguin", name: "\u4F01\u9E45", emoji: "\u{1F427}", img: asset("penguin"), tags: ["animal"] },
  { id: "incense_burner", name: "\u9999\u7089", emoji: "\u7089", img: asset("incense_burner"), tags: ["container"], objectTags: ["bowl_dish"], visualTags: ["patterned"] },
  { id: "cotton", name: "\u68C9\u82B1", emoji: "\u82B1", img: asset("cotton"), tags: ["plant"], objectTags: ["flower"], visualTags: ["leafy"] },
  { id: "eggplant", name: "\u8304\u5B50", emoji: "\u{1F346}", img: asset("eggplant"), tags: ["plant"], objectTags: ["food", "vegetable"], visualTags: ["leafy"] },
  { id: "crossed_swords", name: "\u53CC\u5251", emoji: "\u2694\uFE0F", img: asset("crossed_swords"), tags: ["sharp"], objectTags: ["weapon"], materialTags: ["metal_jewelry"], visualTags: ["wide", "paired"] },
  { id: "hand_drum", name: "\u624B\u9F13", emoji: "\u{1F941}", img: asset("hand_drum"), tags: ["instrument"], traitTags: ["sound_making"], materialTags: ["wood"], visualTags: ["patterned"] },
  { id: "floral_hairpin", name: "\u82B1\u7C2A", emoji: "\u7C2A", img: asset("floral_hairpin"), tags: ["sharp"], objectTags: ["wearable", "accessory", "headwear"], materialTags: ["metal_jewelry", "gemstone"], visualTags: ["slender", "tasseled", "patterned"] },
  { id: "patterned_vase", name: "\u7F20\u679D\u74F6", emoji: "\u74F6", img: asset("patterned_vase"), tags: ["container"], objectTags: ["bottle_jar"], materialTags: ["ceramic"], visualTags: ["patterned"] },
  { id: "jewelry_box", name: "\u9996\u9970\u5323", emoji: "\u5323", img: asset("jewelry_box"), tags: ["container"], visualTags: ["patterned"] },
  { id: "medicine_bottle", name: "\u836F\u74F6", emoji: "\u836F", img: asset("medicine_bottle"), tags: ["written"], objectTags: ["bottle_jar"], materialTags: ["ceramic"] },
  { id: "carriage", name: "\u9A6C\u8F66", emoji: "\u8F66", img: asset("carriage"), tags: ["vehicle"], traitTags: ["rideable"], materialTags: ["wood"], visualTags: ["wide"] },
  { id: "butterfly", name: "\u8774\u8776", emoji: "\u{1F98B}", img: asset("butterfly"), tags: ["flying"], objectTags: ["insect"], traitTags: ["winged"] },
  { id: "sword", name: "\u5B9D\u5251", emoji: "\u{1F5E1}\uFE0F", img: asset("sword"), tags: ["sharp"], objectTags: ["weapon"], materialTags: ["metal_jewelry"], visualTags: ["slender"] },
  { id: "clay_jar", name: "\u9676\u7F50", emoji: "\u7F50", img: asset("clay_jar"), tags: ["container"], objectTags: ["bottle_jar"], materialTags: ["ceramic"] },
  { id: "candle", name: "\u8721\u70DB", emoji: "\u{1F56F}\uFE0F", img: asset("candle"), tags: ["glowing"], objectTags: ["lighting"], traitTags: ["flaming"], visualTags: ["slender"] },
  { id: "treasure_ship", name: "\u697C\u8239", emoji: "\u26F5", img: asset("treasure_ship"), tags: ["vehicle"], traitTags: ["rideable", "cross_water"], materialTags: ["wood"], visualTags: ["wide"] },
  { id: "lidded_bowl", name: "\u91D1\u76D6\u7897", emoji: "\u7897", img: asset("lidded_bowl"), tags: ["container"], objectTags: ["bowl_dish"], visualTags: ["round"] },
  { id: "dog", name: "\u67F4\u72AC", emoji: "\u{1F415}", img: asset("dog"), tags: ["animal"], traitTags: ["four_legged"] },
  { id: "rabbit", name: "\u7389\u5154", emoji: "\u{1F407}", img: asset("rabbit"), tags: ["animal"], traitTags: ["four_legged"] },
  { id: "blue_book", name: "\u84DD\u76AE\u53E4\u7C4D", emoji: "\u{1F4D8}", img: asset("blue_book"), tags: ["written"], materialTags: ["paper"], visualTags: ["patterned"] },
  { id: "zongzi", name: "\u7CBD\u5B50", emoji: "\u7CBD", img: asset("zongzi"), tags: ["sweet_food"], objectTags: ["food"] },
  { id: "kite", name: "\u7EB8\u9E22", emoji: "\u{1FA81}", img: asset("kite"), tags: ["flying"], materialTags: ["paper"] },
  { id: "partitioned_cauldron", name: "\u4E5D\u683C\u94DC\u9F0E", emoji: "\u9F0E", img: asset("partitioned_cauldron"), tags: ["container"], objectTags: ["bowl_dish"], materialTags: ["metal_jewelry"], visualTags: ["round", "patterned"] },
  { id: "peony", name: "\u7261\u4E39", emoji: "\u{1F33A}", img: asset("peony"), tags: ["plant"], objectTags: ["flower"], visualTags: ["leafy"] },
  { id: "cabinet", name: "\u767E\u5B9D\u67DC", emoji: "\u67DC", img: asset("cabinet"), tags: ["container"], materialTags: ["wood"] },
  { id: "feather", name: "\u7FBD\u6BDB", emoji: "\u{1FAB6}", img: asset("feather"), tags: ["flying"], visualTags: ["slender"] },
  { id: "paper_crane", name: "\u7EB8\u9E64", emoji: "\u9E64", img: asset("paper_crane"), tags: ["flying"], traitTags: ["winged"], materialTags: ["paper"] },
  // download (11).zip 新增：11 种水果、6 种蔬菜、10 件穿戴物和 9 座桥梁。
  { id: "apple", name: "\u82F9\u679C", emoji: "\u{1F34E}", img: asset("apple"), tags: ["sweet_food", "plant"], objectTags: ["food", "fruit"], visualTags: ["round", "leafy"] },
  { id: "banana", name: "\u9999\u8549", emoji: "\u{1F34C}", img: asset("banana"), tags: ["sweet_food", "plant"], objectTags: ["food", "fruit"] },
  { id: "orange", name: "\u6A59\u5B50", emoji: "\u{1F34A}", img: asset("orange"), tags: ["sweet_food", "plant"], objectTags: ["food", "fruit"], visualTags: ["round", "leafy"] },
  { id: "strawberry", name: "\u8349\u8393", emoji: "\u{1F353}", img: asset("strawberry"), tags: ["sweet_food", "plant"], objectTags: ["food", "fruit"], visualTags: ["leafy"] },
  { id: "mango", name: "\u8292\u679C", emoji: "\u{1F96D}", img: asset("mango"), tags: ["sweet_food", "plant"], objectTags: ["food", "fruit"], visualTags: ["leafy"] },
  { id: "pear", name: "\u68A8", emoji: "\u{1F350}", img: asset("pear"), tags: ["sweet_food", "plant"], objectTags: ["food", "fruit"], visualTags: ["leafy"] },
  { id: "pineapple", name: "\u83E0\u841D", emoji: "\u{1F34D}", img: asset("pineapple"), tags: ["sweet_food", "plant"], objectTags: ["food", "fruit"], visualTags: ["leafy"] },
  { id: "kiwi", name: "\u7315\u7334\u6843", emoji: "\u{1F95D}", img: asset("kiwi"), tags: ["sweet_food", "plant"], objectTags: ["food", "fruit"], visualTags: ["round"] },
  { id: "lemon", name: "\u67E0\u6AAC", emoji: "\u{1F34B}", img: asset("lemon"), tags: ["plant"], objectTags: ["food", "fruit"], visualTags: ["round", "leafy"] },
  { id: "melon", name: "\u751C\u74DC", emoji: "\u{1F348}", img: asset("melon"), tags: ["sweet_food", "plant"], objectTags: ["food", "fruit"], visualTags: ["round", "leafy"] },
  { id: "dragon_fruit", name: "\u706B\u9F99\u679C", emoji: "\u679C", img: asset("dragon_fruit"), tags: ["sweet_food", "plant"], objectTags: ["food", "fruit"], visualTags: ["leafy"] },
  { id: "coriander", name: "\u9999\u83DC", emoji: "\u{1F33F}", img: asset("coriander"), tags: ["plant"], objectTags: ["food", "vegetable"], visualTags: ["leafy"] },
  { id: "scallion", name: "\u9752\u8471", emoji: "\u8471", img: asset("scallion"), tags: ["plant"], objectTags: ["food", "vegetable"], visualTags: ["slender", "leafy"] },
  { id: "bitter_melon", name: "\u82E6\u74DC", emoji: "\u74DC", img: asset("bitter_melon"), tags: ["plant"], objectTags: ["food", "vegetable"], visualTags: ["leafy"] },
  { id: "broccoli", name: "\u897F\u5170\u82B1", emoji: "\u{1F966}", img: asset("broccoli"), tags: ["plant"], objectTags: ["food", "vegetable"], visualTags: ["leafy"] },
  { id: "edamame", name: "\u6BDB\u8C46", emoji: "\u8C46", img: asset("edamame"), tags: ["plant"], objectTags: ["food", "vegetable"], visualTags: ["leafy"] },
  { id: "celery", name: "\u82B9\u83DC", emoji: "\u83DC", img: asset("celery"), tags: ["plant"], objectTags: ["food", "vegetable"], visualTags: ["slender", "leafy"] },
  { id: "jeweled_belt", name: "\u5B9D\u77F3\u8170\u9970", emoji: "\u9970", img: asset("jeweled_belt"), tags: [], objectTags: ["wearable", "accessory"], materialTags: ["metal_jewelry", "gemstone"], visualTags: ["wide", "patterned"] },
  { id: "silver_armor", name: "\u94F6\u7EB9\u94E0\u7532", emoji: "\u7532", img: asset("silver_armor"), tags: [], objectTags: ["wearable", "clothing"], materialTags: ["metal_jewelry"], visualTags: ["patterned"] },
  { id: "red_tunic", name: "\u8D64\u7EB9\u4E0A\u8863", emoji: "\u8863", img: asset("red_tunic"), tags: [], objectTags: ["wearable", "clothing"], materialTags: ["fabric"], visualTags: ["patterned"] },
  { id: "tasseled_shawl", name: "\u6D41\u82CF\u62AB\u80A9", emoji: "\u8863", img: asset("tasseled_shawl"), tags: [], objectTags: ["wearable", "clothing"], materialTags: ["fabric"], visualTags: ["tasseled", "patterned"] },
  { id: "phoenix_crown", name: "\u51E4\u7EB9\u5934\u51A0", emoji: "\u51A0", img: asset("phoenix_crown"), tags: [], objectTags: ["wearable", "accessory", "headwear"], materialTags: ["metal_jewelry", "gemstone"], visualTags: ["tasseled", "patterned"] },
  { id: "embroidered_trousers", name: "\u7EE3\u82B1\u88E4\u88C5", emoji: "\u8863", img: asset("embroidered_trousers"), tags: [], objectTags: ["wearable", "clothing"], materialTags: ["fabric"], visualTags: ["tasseled", "patterned"] },
  { id: "jade_earrings", name: "\u7389\u5760\u8033\u73AF", emoji: "\u9970", img: asset("jade_earrings"), tags: [], objectTags: ["wearable", "accessory"], materialTags: ["metal_jewelry", "gemstone"], visualTags: ["paired", "patterned"] },
  { id: "fox_mask", name: "\u72D0\u72F8\u9762\u5177", emoji: "\u9762", img: asset("fox_mask"), tags: [], objectTags: ["wearable", "accessory", "headwear"], visualTags: ["tasseled", "patterned"] },
  { id: "gauze_veil", name: "\u8F7B\u7EB1\u9762\u5E18", emoji: "\u7EB1", img: asset("gauze_veil"), tags: [], objectTags: ["wearable", "clothing", "accessory", "headwear"], materialTags: ["fabric"], visualTags: ["tasseled", "patterned"] },
  { id: "bamboo_hat", name: "\u7AF9\u7F16\u6597\u7B20", emoji: "\u7B20", img: asset("bamboo_hat"), tags: [], objectTags: ["wearable", "accessory", "headwear"] },
  { id: "plain_stone_arch_bridge", name: "\u7D20\u9762\u77F3\u62F1\u6865", emoji: "\u6865", img: asset("plain_stone_arch_bridge"), tags: [], objectTags: ["bridge"], traitTags: ["cross_water"], materialTags: ["stone"], visualTags: ["wide"], role: "landmark" },
  { id: "wooden_arch_bridge", name: "\u6728\u62F1\u6865", emoji: "\u6865", img: asset("wooden_arch_bridge"), tags: [], objectTags: ["bridge"], traitTags: ["cross_water"], materialTags: ["wood"], visualTags: ["wide"], role: "landmark" },
  { id: "covered_bridge", name: "\u98CE\u96E8\u5ECA\u6865", emoji: "\u6865", img: asset("covered_bridge"), tags: [], objectTags: ["bridge"], traitTags: ["cross_water"], materialTags: ["wood"], visualTags: ["wide"], role: "landmark" },
  { id: "floating_dock", name: "\u6D6E\u6728\u7801\u5934", emoji: "\u6865", img: asset("floating_dock"), tags: [], objectTags: ["bridge"], traitTags: ["cross_water"], materialTags: ["wood"], visualTags: ["wide"], role: "landmark" },
  { id: "lotus_boardwalk", name: "\u8377\u5858\u6808\u9053", emoji: "\u6865", img: asset("lotus_boardwalk"), tags: [], objectTags: ["bridge"], traitTags: ["cross_water"], materialTags: ["wood"], visualTags: ["wide"], role: "landmark" },
  { id: "stone_water_bridge", name: "\u77F3\u62F1\u6C34\u6865", emoji: "\u6865", img: asset("stone_water_bridge"), tags: [], objectTags: ["bridge"], traitTags: ["cross_water"], materialTags: ["stone"], visualTags: ["wide"], role: "landmark" },
  { id: "stone_slab_bridge", name: "\u77F3\u677F\u6865", emoji: "\u6865", img: asset("stone_slab_bridge"), tags: [], objectTags: ["bridge"], traitTags: ["cross_water"], materialTags: ["stone"], visualTags: ["wide"], role: "landmark" },
  { id: "rope_bridge", name: "\u540A\u7D22\u6865", emoji: "\u6865", img: asset("rope_bridge"), tags: [], objectTags: ["bridge"], traitTags: ["cross_water"], materialTags: ["wood"], visualTags: ["wide"], role: "landmark" },
  { id: "red_arch_bridge", name: "\u6731\u6F06\u62F1\u6865", emoji: "\u6865", img: asset("red_arch_bridge"), tags: [], objectTags: ["bridge"], traitTags: ["cross_water"], materialTags: ["wood"], visualTags: ["wide"], role: "landmark" }
];
var COLLECTIBLE_ITEMS = ITEMS.filter((item) => !item.distractorOnly);
var ITEM_MAP = new Map(ITEMS.map((item) => [item.id, item]));
function getItemTags(item) {
  return [.../* @__PURE__ */ new Set([
    ...item.tags,
    ...item.objectTags ?? [],
    ...item.traitTags ?? [],
    ...item.materialTags ?? [],
    ...item.visualTags ?? []
  ])];
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
  "paper_crane": { width: 0.875, height: 0.8008 },
  "apple": { width: 0.7852, height: 0.875 },
  "banana": { width: 0.875, height: 0.793 },
  "orange": { width: 0.875, height: 0.832 },
  "strawberry": { width: 0.7812, height: 0.8711 },
  "mango": { width: 0.8398, height: 0.875 },
  "pear": { width: 0.6719, height: 0.875 },
  "pineapple": { width: 0.4883, height: 0.875 },
  "kiwi": { width: 0.875, height: 0.7227 },
  "lemon": { width: 0.875, height: 0.7344 },
  "melon": { width: 0.875, height: 0.8008 },
  "dragon_fruit": { width: 0.875, height: 0.7852 },
  "coriander": { width: 0.6992, height: 0.875 },
  "scallion": { width: 0.832, height: 0.875 },
  "bitter_melon": { width: 0.8281, height: 0.875 },
  "broccoli": { width: 0.8203, height: 0.875 },
  "edamame": { width: 0.875, height: 0.6914 },
  "celery": { width: 0.875, height: 0.8672 },
  "silver_armor": { width: 0.6914, height: 0.875 },
  "red_tunic": { width: 0.875, height: 0.7266 },
  "tasseled_shawl": { width: 0.8672, height: 0.8711 },
  "phoenix_crown": { width: 0.875, height: 0.8281 },
  "embroidered_trousers": { width: 0.6289, height: 0.875 },
  "jade_earrings": { width: 0.5547, height: 0.875 },
  "fox_mask": { width: 0.875, height: 0.8164 },
  "gauze_veil": { width: 0.6406, height: 0.875 },
  "bamboo_hat": { width: 0.875, height: 0.7422 },
  "wooden_arch_bridge": { width: 0.875, height: 0.6133 },
  "covered_bridge": { width: 0.875, height: 0.7422 },
  "floating_dock": { width: 0.875, height: 0.5938 },
  "lotus_boardwalk": { width: 0.875, height: 0.6328 },
  "stone_water_bridge": { width: 0.875, height: 0.5508 },
  "stone_slab_bridge": { width: 0.875, height: 0.5508 },
  "rope_bridge": { width: 0.875, height: 0.6719 },
  "red_arch_bridge": { width: 0.875, height: 0.6445 },
  "jeweled_belt": { width: 0.875, height: 0.4375 },
  "plain_stone_arch_bridge": { width: 0.875, height: 0.6094 }
};

// src/game/scene.ts
var SCENE_SCALE = { w: 1.7, h: 1 };
var SCENE_ITEM_FRACTION = 0.19;
var BASE_X_PERCENT = SCENE_ITEM_FRACTION / SCENE_SCALE.w * 100;
var BASE_Y_PERCENT = SCENE_ITEM_FRACTION * 100;
var EDGE_SAFE_X = 1.4;
var EDGE_SAFE_Y = 1.3;
var HUD_SAFE_TOP = 23;
var ACTION_SAFE_BOTTOM = 11;
var GAP_X = 0.08;
var GAP_Y = 0.22;
var PACKING_FOOTPRINT_FACTOR = 0.68;
var VIEWPORT_WIDTH_PERCENT = 100 / SCENE_SCALE.w;
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
    width: BASE_X_PERCENT * scale * (geometry.width * cos + geometry.height * sin) * PACKING_FOOTPRINT_FACTOR,
    height: BASE_Y_PERCENT * scale * (geometry.width * sin + geometry.height * cos) * PACKING_FOOTPRINT_FACTOR
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
function crossesViewportSeam(x, scale) {
  const safeHalfWidth = BASE_X_PERCENT * scale / 2 + 1.5;
  return Math.abs(x - VIEWPORT_WIDTH_PERCENT) < safeHalfWidth;
}
function overlapsStartActionZone(x, y, scale) {
  const canvasHalfX = BASE_X_PERCENT * scale / 2;
  const canvasHalfY = BASE_Y_PERCENT * scale / 2;
  return y + canvasHalfY > 78 && x - canvasHalfX < 12;
}
function pickInRounds(pool, count) {
  const output = [];
  while (output.length < count) {
    output.push(...shuffle(pool).slice(0, count - output.length));
  }
  return output;
}
function itemMatchesTask(item, rule) {
  const tags = new Set(getItemTags(item));
  const satisfiesAll = (rule.allOf ?? []).every((tag) => tags.has(tag));
  const satisfiesAny = !rule.anyOf?.length || rule.anyOf.some((tag) => tags.has(tag));
  const satisfiesNone = !(rule.noneOf ?? []).some((tag) => tags.has(tag));
  return satisfiesAll && satisfiesAny && satisfiesNone;
}
function generateScene(spec) {
  const targetPool = ITEMS.filter(
    (item) => !item.distractorOnly && itemMatchesTask(item, spec.rule)
  );
  const taskUsesLandmarks = targetPool.some((item) => item.role === "landmark");
  const distractorPool = ITEMS.filter(
    (item) => (taskUsesLandmarks || item.role !== "landmark") && (item.distractorOnly || !itemMatchesTask(item, spec.rule))
  );
  if (!targetPool.length || !distractorPool.length) {
    throw new Error(`\u4EFB\u52A1 ${spec.rule.id} \u7F3A\u5C11\u76EE\u6807\u6216\u5E72\u6270\u7269\u7D20\u6750`);
  }
  const targetCount = Math.min(Math.max(1, Math.trunc(spec.rule.targetCount)), targetPool.length);
  const targetDefs = shuffle(targetPool).slice(0, targetCount);
  const distractorDefs = pickInRounds(distractorPool, spec.distractors);
  const spawnList = shuffle([
    ...targetDefs.map((def) => ({ def, isTarget: true })),
    ...distractorDefs.map((def) => ({ def, isTarget: false }))
  ]);
  const landmarkCount = spawnList.filter((entry) => entry.def.role === "landmark").length;
  let landmarkIndex = 0;
  const prepared = spawnList.map((entry) => {
    const isLandmark = entry.def.role === "landmark";
    const scale = isLandmark ? rand(1, 1.25) : rand(0.9, 1.26);
    const rot = isLandmark ? 0 : rand(-17, 17);
    const size = footprint(entry.def, scale, rot);
    return {
      ...entry,
      scale,
      rot,
      area: size.width * size.height,
      landmarkIndex: isLandmark ? landmarkIndex++ : void 0,
      landmarkCount: isLandmark ? landmarkCount : void 0
    };
  }).sort((a, b) => Number(b.isTarget) - Number(a.isTarget) || Number(b.landmarkIndex != null) - Number(a.landmarkIndex != null) || b.area - a.area);
  const clusterCount = Math.max(5, Math.round(spawnList.length / 11));
  const clusters = Array.from({ length: clusterCount }, (_, index) => ({
    x: (index + rand(0.18, 0.82)) / clusterCount * 100,
    y: rand(HUD_SAFE_TOP + 5, 100 - ACTION_SAFE_BOTTOM - 5)
  }));
  const packedRects = [];
  const placed = [];
  for (const entry of prepared) {
    let scale = entry.scale;
    const minimumScale = entry.landmarkIndex != null ? 0.9 : 0.82;
    let position = null;
    if (entry.landmarkIndex != null && entry.landmarkCount) {
      const size = footprint(entry.def, scale, 0);
      const x = (entry.landmarkIndex + 0.75) / (entry.landmarkCount + 0.5) * 100;
      const y = entry.landmarkIndex % 2 === 0 ? 76 : 84;
      const rect = paddedRect(x, y, size.width, size.height);
      if (!collides(rect, packedRects) && !crossesViewportSeam(x, scale) && !overlapsStartActionZone(x, y, scale)) {
        position = { x, y, rect };
      }
    }
    for (let shrinkRound = 0; shrinkRound < 9 && !position; shrinkRound += 1) {
      const size = footprint(entry.def, scale, entry.rot);
      const canvasHalfX = BASE_X_PERCENT * scale / 2;
      const canvasHalfY = BASE_Y_PERCENT * scale / 2;
      const minX = Math.max(size.width / 2 + EDGE_SAFE_X, canvasHalfX + EDGE_SAFE_X);
      const maxX = Math.min(100 - size.width / 2 - EDGE_SAFE_X, 100 - canvasHalfX - EDGE_SAFE_X);
      const minY = Math.max(HUD_SAFE_TOP, size.height / 2 + EDGE_SAFE_Y, canvasHalfY + EDGE_SAFE_Y);
      const maxY = Math.min(100 - ACTION_SAFE_BOTTOM, 100 - size.height / 2 - EDGE_SAFE_Y, 100 - canvasHalfY - EDGE_SAFE_Y);
      for (let attempt = 0; attempt < 900; attempt += 1) {
        let x;
        let y;
        if (entry.landmarkIndex != null) {
          x = rand(minX, maxX);
          y = rand(Math.max(minY, 68), maxY);
        } else if (Math.random() < 0.68) {
          const cluster = clusters[Math.floor(rand(0, clusters.length))];
          x = cluster.x + (Math.random() + Math.random() - 1) * 8;
          y = cluster.y + (Math.random() + Math.random() - 1) * 20;
        } else {
          x = rand(minX, maxX);
          y = rand(minY, maxY);
        }
        x = Math.max(minX, Math.min(maxX, x));
        y = Math.max(minY, Math.min(maxY, y));
        const rect = paddedRect(x, y, size.width, size.height);
        if (!collides(rect, packedRects) && !crossesViewportSeam(x, scale) && !overlapsStartActionZone(x, y, scale)) {
          position = { x, y, rect };
        }
        if (position) break;
      }
      if (!position) {
        const nextScale = Math.max(minimumScale, scale * 0.95);
        if (nextScale === scale) break;
        scale = nextScale;
      }
    }
    if (!position) {
      if (!entry.isTarget) continue;
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
    targets: [{
      taskId: spec.rule.id,
      label: spec.rule.label,
      allOf: spec.rule.allOf,
      anyOf: spec.rule.anyOf,
      noneOf: spec.rule.noneOf,
      remaining: targetCount,
      total: targetCount
    }]
  };
}

// src/game/tasks.ts
var TASK_RULES = [
  { id: "instrument", label: "\u627E\u51FA\u6240\u6709\u4E50\u5668", allOf: ["instrument"], targetCount: 8 },
  { id: "written", label: "\u627E\u51FA\u6240\u6709\u6587\u5B57\u7269\u54C1", allOf: ["written"], targetCount: 6 },
  { id: "flying", label: "\u627E\u51FA\u6240\u6709\u4F1A\u98DE\u7684\u7269\u54C1", allOf: ["flying"], targetCount: 8 },
  { id: "glowing", label: "\u627E\u51FA\u6240\u6709\u4F1A\u53D1\u5149\u7684\u7269\u54C1", allOf: ["glowing"], targetCount: 7 },
  { id: "sharp", label: "\u627E\u51FA\u6240\u6709\u5C16\u9510\u7269\u54C1", allOf: ["sharp"], targetCount: 8 },
  { id: "sweet_food", label: "\u627E\u51FA\u6240\u6709\u751C\u98DF", allOf: ["sweet_food"], targetCount: 8 },
  { id: "vehicle", label: "\u627E\u51FA\u6240\u6709\u8F7D\u5177\u4E0E\u5750\u9A91", allOf: ["vehicle"], targetCount: 8 },
  { id: "food", label: "\u627E\u51FA\u6240\u6709\u98DF\u7269", allOf: ["food"], targetCount: 8 },
  { id: "animal", label: "\u627E\u51FA\u6240\u6709\u52A8\u7269", allOf: ["animal"], targetCount: 7 },
  { id: "container", label: "\u627E\u51FA\u80FD\u88C5\u4E1C\u897F\u7684\u5BB9\u5668", allOf: ["container"], targetCount: 8 },
  { id: "plant", label: "\u627E\u51FA\u5C5E\u4E8E\u690D\u7269\u7684\u7269\u54C1", allOf: ["plant"], targetCount: 8 },
  { id: "fruit", label: "\u627E\u51FA\u6240\u6709\u6C34\u679C", allOf: ["fruit"], targetCount: 7 },
  { id: "vegetable", label: "\u627E\u51FA\u6240\u6709\u852C\u83DC", allOf: ["vegetable"], targetCount: 6 },
  { id: "wearable", label: "\u627E\u51FA\u6240\u6709\u7A7F\u6234\u7269", allOf: ["wearable"], targetCount: 6 },
  { id: "weapon", label: "\u627E\u51FA\u6240\u6709\u5175\u5668", allOf: ["weapon"], targetCount: 5 },
  { id: "wood", label: "\u627E\u51FA\u6728\u5236\u7269\u54C1", allOf: ["wood"], targetCount: 7 },
  { id: "ceramic", label: "\u627E\u51FA\u9676\u74F7\u7269\u54C1", allOf: ["ceramic"], targetCount: 6 },
  { id: "metal_jewelry", label: "\u627E\u51FA\u91D1\u5C5E\u6216\u73E0\u5B9D\u7269\u54C1", allOf: ["metal_jewelry"], targetCount: 7 },
  { id: "round", label: "\u627E\u51FA\u5706\u5F62\u8F6E\u5ED3\u7684\u7269\u54C1", allOf: ["round"], targetCount: 7 },
  { id: "slender", label: "\u627E\u51FA\u7EC6\u957F\u8F6E\u5ED3\u7684\u7269\u54C1", allOf: ["slender"], targetCount: 7 },
  { id: "patterned", label: "\u627E\u51FA\u7EB9\u6837\u660E\u663E\u7684\u7269\u54C1", allOf: ["patterned"], targetCount: 7 },
  { id: "sweet_plants", label: "\u627E\u51FA\u65E2\u662F\u690D\u7269\u53C8\u662F\u751C\u98DF\u7684\u7269\u54C1", allOf: ["plant", "sweet_food"], targetCount: 6 },
  { id: "wooden_bridges", label: "\u627E\u51FA\u6728\u5236\u7684\u6865", allOf: ["bridge", "wood"], targetCount: 5 },
  { id: "metal_wearables", label: "\u627E\u51FA\u91D1\u5C5E\u6216\u73E0\u5B9D\u5236\u7684\u7A7F\u6234\u7269", allOf: ["wearable", "metal_jewelry"], targetCount: 5 },
  { id: "luminous_fliers", label: "\u627E\u51FA\u4F1A\u98DE\u53C8\u4F1A\u53D1\u5149\u7684\u7269\u54C1", allOf: ["flying", "glowing"], targetCount: 3 },
  { id: "fruit_or_vegetable", label: "\u627E\u51FA\u6C34\u679C\u6216\u852C\u83DC", anyOf: ["fruit", "vegetable"], targetCount: 8 },
  { id: "animal_or_vehicle", label: "\u627E\u51FA\u52A8\u7269\u6216\u5750\u9A91", anyOf: ["animal", "vehicle"], targetCount: 8 },
  { id: "food_not_sweet", label: "\u627E\u51FA\u98DF\u7269\uFF0C\u4F46\u4E0D\u8981\u70B9\u751C\u98DF", allOf: ["food"], noneOf: ["sweet_food"], targetCount: 6 },
  { id: "sharp_not_weapon", label: "\u627E\u51FA\u5C16\u9510\u4F46\u4E0D\u662F\u5175\u5668\u7684\u7269\u54C1", allOf: ["sharp"], noneOf: ["weapon"], targetCount: 5 },
  { id: "bridge_not_wood", label: "\u627E\u51FA\u4E0D\u662F\u6728\u5236\u7684\u6865", allOf: ["bridge"], noneOf: ["wood"], targetCount: 3 }
];
var TASK_MAP = new Map(TASK_RULES.map((task) => [task.id, task]));
function withTargetCount(rule, targetCount) {
  return { ...rule, targetCount };
}
function getTaskRule(taskId, targetCount) {
  const rule = TASK_MAP.get(taskId);
  if (!rule) throw new Error(`Unknown task id: ${taskId}`);
  return targetCount == null ? { ...rule } : withTargetCount(rule, targetCount);
}
function categoryTaskRule(category, targetCount) {
  return {
    id: `category_${category}`,
    label: CATEGORIES[category].prompt,
    allOf: [category],
    targetCount
  };
}

// .codex-temp/stress-scenes.ts
var lines = fs.readFileSync("\u6570\u503C\u8868_src/levels_100.csv", "utf8").trim().split(/\r?\n/);
var headers = lines[0].split(",");
var rows = lines.slice(1).map((line) => {
  const values = line.split(",");
  return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
});
var minimumPlaced = Number.POSITIVE_INFINITY;
var maximumPlaced = 0;
var totalPlaced = 0;
var generated = 0;
for (const row of rows) {
  for (let trial = 0; trial < 6; trial += 1) {
    const targetCount = Number(row.targetCount);
    const rule = row.taskId ? getTaskRule(row.taskId, targetCount) : categoryTaskRule(row.category, targetCount);
    const scene = generateScene({ rule, distractors: Number(row.distractors) });
    minimumPlaced = Math.min(minimumPlaced, scene.items.length);
    maximumPlaced = Math.max(maximumPlaced, scene.items.length);
    totalPlaced += scene.items.length;
    generated += 1;
  }
}
console.log(JSON.stringify({
  generated,
  minimumPlaced,
  maximumPlaced,
  averagePlaced: Number((totalPlaced / generated).toFixed(2))
}));
