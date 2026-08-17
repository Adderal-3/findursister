/**
 * 生成「任务规则 ↔ 物品图片」对照审核页 + 分类一致性审计。
 *
 * 产物：tools/item-task-mapping.html（浏览器直接打开，图片走相对路径）
 * 数据源：tools/regression/.gen/scene-bundle.mjs（先跑 build-scene-bundle.mjs）
 *
 * 审计启发式：按物品名推断「期望包含/不应包含」的标签，与实际标签比对，
 * 输出候选不一致项供人工确认（图片在页内可直接目检）。
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = await import(pathToFileURL(join(root, 'tools', 'regression', '.gen', 'scene-bundle.mjs')).href);
const { ITEMS, TASK_RULES, itemMatchesTask } = bundle;

const TAG_LABELS = {
  instrument: '乐器', written: '有字', container: '容器', flying: '会飞',
  glowing: '发光', sharp: '尖锐', sweet_food: '甜食', plant: '植物',
  vehicle: '载具/坐骑', animal: '动物',
  food: '食物', fruit: '水果', vegetable: '蔬菜', weapon: '兵器',
  wearable: '穿戴物', bridge: '桥梁', flower: '花卉', insect: '昆虫',
  lighting: '照明物', bottle_jar: '瓶/罐', bowl_dish: '碗/盘',
  clothing: '衣物', accessory: '配饰', headwear: '头饰',
  flaming: '有火焰', sound_making: '可发声', rideable: '可骑乘',
  cross_water: '可渡水', winged: '有翅膀', four_legged: '四足',
  wood: '木制', metal_jewelry: '金属/珠宝', ceramic: '陶瓷',
  paper: '纸制', fabric: '布料', stone: '石制', gemstone: '宝石',
  round: '圆形', slender: '细长', wide: '宽大', leafy: '有叶片',
  tasseled: '有流苏', handled: '有把手', paired: '成对', patterned: '有纹样',
};

function allTags(item) {
  return [...new Set([
    ...item.tags,
    ...(item.objectTags ?? []),
    ...(item.traitTags ?? []),
    ...(item.materialTags ?? []),
    ...(item.visualTags ?? []),
  ])];
}

/** 名称 → 期望标签的严格启发式（只匹配明显语义，避免「花轿≠花」这类误报）。 */
const NAME_RULES = [
  { pattern: /坛$|瓶$|罐$|钵$|鼎$|匣$|柜$|篮$/, expect: 'container', reason: '名称是容器' },
  { pattern: /蒲公英|菊花$|牡丹$|荷花|莲蓬|棉花$/, expect: 'plant', reason: '名称是植物' },
  { pattern: /灯$|烛$|篝火$|火把$|孔明灯$/, expect: 'glowing', reason: '名称是照明物' },
  { pattern: /燕$|蝶$|蜻蜓$|鸢$|风筝$|凤凰$|鹤$/, expect: 'flying', reason: '名称是会飞的生灵/物件' },
  { pattern: /琴$|鼓$|笛$|琵琶$|箜篌$|锣$|箫$|丝$/, expect: 'instrument', reason: '名称是乐器' },
  { pattern: /书$|古籍$|卷轴$|纸页$/, expect: 'written', reason: '名称带文字' },
  { pattern: /剑$|刃$|钩$|针$|镖$|刺$|匕$|牙$|锥$/, expect: 'sharp', reason: '名称带尖锐物' },
  { pattern: /糖|甜|糕$|粽$|枣$|饼$/, expect: 'sweet_food', reason: '名称是甜食' },
  { pattern: /轿$|车$|船$/, expect: 'vehicle', reason: '名称是载具' },
];

/** 人工精选的存疑项（需目检图片确认，带置信度）。 */
const CURATED = [
  { id: 'jade_hairpin', type: 'extra', tag: 'sharp', confidence: '中', reason: '簪子算尖锐物偏勉强' },
  { id: 'floral_hairpin', type: 'extra', tag: 'sharp', confidence: '中', reason: '同上' },
  { id: 'feather', type: 'extra', tag: 'flying', confidence: '低', reason: '羽毛「会飞」语义偏弱' },
  { id: 'fire_wheels', type: 'missing', tag: 'glowing', confidence: '低', reason: '有火焰意象但未算发光；「找发光」任务玩家可能点它' },
  { id: 'shuriken', type: 'missing', tag: 'flying', confidence: '低', reason: '「飞镖」的飞是否算会飞，看设计意图' },
  { id: 'inscribed_music_stand', type: 'missing', tag: 'instrument', confidence: '低', reason: '琴架本身是家具而非乐器——确认是否有意排除出「找乐器」' },
  // 已确认维持现状（从审计中移除）：
  //   飞鱼坐骑 = 载具+动物（不加会飞）；红枣/汤圆 = 盘/碗装，保留容器；
  //   鸟形陶笛 = 已去掉容器；蒲公英 = 已加植物；醋坛/药瓶 = 已加容器。
];

const items = ITEMS.map((item) => {
  const tags = allTags(item);
  const matchedTasks = TASK_RULES.filter((rule) => itemMatchesTask(item, rule));
  const suspicions = [];
  for (const curated of CURATED) {
    if (curated.id !== item.id) continue;
    const present = tags.includes(curated.tag);
    if ((curated.type === 'missing' && !present) || (curated.type === 'extra' && present)) {
      suspicions.push({ type: curated.type, tag: curated.tag, confidence: curated.confidence, reason: curated.reason });
    }
  }
  for (const rule of NAME_RULES) {
    if (!rule.pattern.test(item.name) || tags.includes(rule.expect)) continue;
    if (suspicions.some((s) => s.type === 'missing' && s.tag === rule.expect)) continue; // 与精选项重复则跳过
    suspicions.push({ type: 'missing', tag: rule.expect, confidence: '高', reason: `${rule.reason}，但未标记「${TAG_LABELS[rule.expect]}」` });
  }
  return { item, tags, matchedTasks, suspicions };
});

const tasksData = TASK_RULES.map((rule) => {
  const matched = items.filter(({ item }) => itemMatchesTask(item, rule));
  return {
    rule,
    matched: matched.map((m) => m.item),
    poolNote: matched.length < rule.targetCount
      ? `⚠️ 匹配池 ${matched.length} < 目标数 ${rule.targetCount}，生成时会被截断`
      : null,
  };
});

const suspiciousItems = items.filter((i) => i.suspicions.length > 0);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const imgOf = (id) => `../src/assets/items/ancient/${id}.webp`;

const itemCard = (item) => `
  <div class="card">
    <img loading="lazy" src="${imgOf(item.id)}" alt="${esc(item.name)}" />
    <div class="card-name">${esc(item.name)}</div>
  </div>`;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>任务规则 ↔ 物品图片对照表</title>
<style>
:root{color-scheme:light;--ink:#4f382d;--jade:#3d776e;--orange:#c77847;--paper:#fffaf0;--line:#dcc9aa;--muted:#8c7766}
*{box-sizing:border-box}body{margin:0;color:var(--ink);font:14px/1.55 "Microsoft YaHei","PingFang SC",sans-serif;background:#eee5d2}
.page{width:min(1480px,calc(100% - 24px));margin:0 auto 48px}
header{padding:28px 12px 18px;text-align:center}h1{margin:0;font:900 clamp(26px,4vw,44px)/1.2 STKaiti,KaiTi,serif;letter-spacing:.12em}
header p{margin:8px auto 0;max-width:860px;color:var(--muted)}
h2{font:900 26px/1.3 STKaiti,KaiTi,serif;margin:32px 8px 12px;color:var(--ink)}
.note{margin:0 8px 16px;color:var(--muted);font-size:13px}
.task{background:#fff8;border:1px solid var(--line);border-radius:18px;padding:14px 16px;margin:0 0 14px;box-shadow:0 4px 14px #6d513012}
.task-head{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:10px}
.task-title{font:900 18px/1.2 STKaiti,KaiTi,serif;color:var(--jade)}
.task-meta{color:var(--muted);font-size:12px}
.task-warn{color:#b45309;font-size:12px;font-weight:700}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}
.card{background:#fffdf7;border:1px solid #e6d8bf;border-radius:12px;padding:8px 4px;text-align:center}
.card img{width:64px;height:64px;object-fit:contain;display:block;margin:0 auto;filter:drop-shadow(0 3px 3px #47362530)}
.card-name{font-size:12px;font-weight:700;margin-top:4px}
.suspect{background:#fff3e0;border:1px solid #e6b484;border-radius:18px;padding:14px 16px;margin:0 0 12px}
.suspect-row{display:flex;gap:14px;align-items:center}
.suspect-row img{width:84px;height:84px;object-fit:contain;flex-shrink:0}
.suspect-name{font:900 20px/1.2 STKaiti,KaiTi,serif}
.suspect-tag{display:inline-block;background:#fde4c8;border-radius:99px;padding:2px 10px;margin:2px 4px 2px 0;font-size:12px;font-weight:700}
.suspect-tag.missing{background:#dbeafe}
.suspect-tag.conf{background:#e5e0d8;color:#7a6a5a;font-weight:400}
.suspect-reason{color:#8c5a2b;font-size:13px;margin-top:6px}
.chips{margin-top:6px}.chip{display:inline-block;background:#eef2ec;border-radius:8px;padding:1px 7px;margin:2px 3px 2px 0;font-size:11px;color:#4f6b58}
table{width:100%;border-collapse:collapse;background:#fffdf7;border-radius:14px;overflow:hidden}
th,td{padding:8px 10px;border-bottom:1px solid #eee2cc;text-align:left;font-size:13px;vertical-align:top}
th{background:#f4ead7;position:sticky;top:0}
tr:hover{background:#fff8}
td img{width:48px;height:48px;object-fit:contain}
.legend{display:flex;gap:16px;flex-wrap:wrap;margin:0 8px 12px;font-size:12px;color:var(--muted)}
.legend span{display:inline-flex;align-items:center;gap:4px}
.legend i{display:inline-block;width:12px;height:12px;border-radius:4px}
</style>
</head>
<body>
<div class="page">
<header>
  <h1>任务规则 ↔ 物品图片对照表</h1>
  <p>数据来源：src/game/items.ts（123 件）+ tasks.ts（30 条任务规则）。生成于本次回归。玩家实际体验就是「任务 → 哪些图片算对」，此表即该映射。</p>
</header>

<h2>① 可疑分类（审计候选，共 ${suspiciousItems.length} 项）</h2>
<p class="note">规则：按名称启发式比对标签。「缺」= 名称暗示应有但标签没有；「多」= 名称明显不符合但标签有。图片可直接目检确认。</p>
${suspiciousItems.map(({ item, tags, suspicions }) => `
<div class="suspect">
  <div class="suspect-row">
    <img src="${imgOf(item.id)}" alt="${esc(item.name)}" />
    <div style="flex:1">
      <div class="suspect-name">${esc(item.name)} <code style="font-size:12px;color:var(--muted)">${esc(item.id)}</code></div>
      <div class="chips">现有标签：${tags.map((t) => `<span class="chip">${esc(TAG_LABELS[t] ?? t)}</span>`).join('') || '—'}</div>
      <div>${suspicions.map((s) => `<div class="suspect-reason"><span class="suspect-tag ${s.type}">${s.type === 'missing' ? '缺' : '多'}</span><span class="suspect-tag conf">${s.confidence}置信</span>${esc(s.reason)}</div>`).join('')}</div>
    </div>
  </div>
</div>`).join('')}

<h2>② 任务规则 → 匹配图片（30 条）</h2>
<p class="note">「命中池」= 该任务下所有会被判为正确的物品图片。任务目标数 = 关卡要求找到的件数。</p>
${tasksData.map(({ rule, matched, poolNote }) => `
<div class="task">
  <div class="task-head">
    <span class="task-title">${esc(rule.label)}</span>
    <span class="task-meta">命中池 <strong>${matched.length}</strong> 件 · 任务目标 ${rule.targetCount} 件</span>
    ${poolNote ? `<span class="task-warn">${esc(poolNote)}</span>` : ''}
  </div>
  <div class="grid">${matched.map(itemCard).join('')}</div>
</div>`).join('')}

<h2>③ 全物件总表（123 件 → 所属任务）</h2>
<table>
<thead><tr><th>图片</th><th>名称 / id</th><th>全部标签</th><th>命中任务</th></tr></thead>
<tbody>
${items.map(({ item, tags, matchedTasks }) => `
<tr>
  <td><img loading="lazy" src="${imgOf(item.id)}" alt="" /></td>
  <td><strong>${esc(item.name)}</strong><br><code>${esc(item.id)}</code></td>
  <td>${tags.map((t) => `<span class="chip">${esc(TAG_LABELS[t] ?? t)}</span>`).join('') || '—'}</td>
  <td>${matchedTasks.length ? matchedTasks.map((t) => esc(t.label)).join('；') : '<span style="color:var(--muted)">—</span>'}</td>
</tr>`).join('')}
</tbody>
</table>
</div>
</body>
</html>`;

const out = join(root, 'tools', 'item-task-mapping.html');
writeFileSync(out, html, 'utf8');
console.log(`generated -> ${out}`);
console.log(`可疑分类: ${suspiciousItems.length} 项`);
for (const { item, suspicions } of suspiciousItems) {
  console.log(`  ${item.name}(${item.id}): ${suspicions.map((s) => `${s.type === 'missing' ? '缺' : '多'}[${TAG_LABELS[s.tag]}](${s.confidence}) ${s.reason}`).join('；')}`);
}
console.log('\n任务池充足性检查:');
let poolWarnings = 0;
for (const { rule, matched } of tasksData) {
  if (matched.length < rule.targetCount) {
    poolWarnings += 1;
    console.log(`  ⚠️ ${rule.label}: 池 ${matched.length} < 目标 ${rule.targetCount}`);
  }
}
if (!poolWarnings) console.log('  全部 30 条任务规则的命中池均 ≥ 目标数');
