import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const itemsSource = fs.readFileSync(path.join(root, 'src', 'game', 'items.ts'), 'utf8');
const tasksSource = fs.readFileSync(path.join(root, 'src', 'game', 'tasks.ts'), 'utf8');
const outputPath = path.join(root, 'public', 'item-relations.html');

const domainLabels = {
  tags: '基础分类',
  objectTags: '物品种类',
  traitTags: '能力状态',
  materialTags: '材质',
  visualTags: '外观',
};

const tagLabels = {
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

function quotedArray(source, field) {
  const match = source.match(new RegExp(`${field}: \\[([^\\]]*)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((value) => value[1]);
}

const items = itemsSource
  .split(/\r?\n/)
  .filter((line) => /^\s*\{ id: '[^']+'/.test(line))
  .map((line) => {
    const id = line.match(/id: '([^']+)'/)?.[1];
    const name = line.match(/name: '([^']+)'/)?.[1];
    const domains = Object.fromEntries(
      Object.keys(domainLabels).map((field) => [field, quotedArray(line, field)]),
    );
    return {
      id,
      name,
      img: `./items/ancient/${id}.webp`,
      role: line.match(/role: '([^']+)'/)?.[1] ?? 'item',
      distractorOnly: /distractorOnly: true/.test(line),
      domains,
      tags: [...new Set(Object.values(domains).flat())],
    };
  });

const tasks = tasksSource
  .split(/\r?\n/)
  .filter((line) => /^\s*\{ id: '[^']+', label:/.test(line))
  .map((line) => ({
    id: line.match(/id: '([^']+)'/)?.[1],
    label: line.match(/label: '([^']+)'/)?.[1],
    allOf: quotedArray(line, 'allOf'),
    anyOf: quotedArray(line, 'anyOf'),
    noneOf: quotedArray(line, 'noneOf'),
  }));

function matchesTask(item, task) {
  const tags = new Set(item.tags);
  return task.allOf.every((tag) => tags.has(tag))
    && (!task.anyOf.length || task.anyOf.some((tag) => tags.has(tag)))
    && !task.noneOf.some((tag) => tags.has(tag));
}

for (const item of items) {
  item.tasks = tasks.filter((task) => matchesTask(item, task)).map(({ id, label }) => ({ id, label }));
}

const tagCounts = {};
for (const item of items) {
  for (const tag of item.tags) tagCounts[tag] = (tagCounts[tag] ?? 0) + 1;
}

const data = JSON.stringify({ items, tasks, domainLabels, tagLabels, tagCounts })
  .replaceAll('</script', '<\\/script');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>百物寻踪 · 123件物品属性关系表</title>
  <style>
    :root { color-scheme: light; --ink:#194f4b; --muted:#66847f; --line:#c9ddd6; --jade:#2f837a; --paper:#f2f7ef; --gold:#b66f41; }
    * { box-sizing:border-box; }
    body { margin:0; min-height:100vh; color:var(--ink); font:14px/1.55 "Microsoft YaHei","PingFang SC",sans-serif;
      background:linear-gradient(rgba(249,244,228,.88),rgba(240,232,210,.9)),url("./backgrounds/qingya-courtyard-warm-v3.webp") center/cover fixed; }
    header { padding:32px 20px 22px; text-align:center; }
    h1 { margin:0; font-family:STKaiti,KaiTi,serif; font-size:clamp(28px,5vw,46px); letter-spacing:.16em; }
    header p { margin:8px 0 0; color:var(--muted); }
    .shell { width:min(1440px,calc(100% - 24px)); margin:0 auto 42px; }
    .toolbar,.legend,.table-wrap { border:1px solid rgba(255,255,255,.88); background:rgba(246,249,241,.86); box-shadow:0 14px 42px rgba(29,91,83,.13); backdrop-filter:blur(13px); }
    .toolbar { display:grid; grid-template-columns:1fr 180px 180px auto; gap:10px; padding:14px; border-radius:22px; position:sticky; top:8px; z-index:5; }
    input,select,button { min-height:42px; border:1px solid var(--line); border-radius:13px; background:#fffdf5; color:var(--ink); padding:0 13px; font:inherit; }
    button { cursor:pointer; font-weight:800; }
    .summary { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0; }
    .summary span,.chip { display:inline-flex; align-items:center; border:1px solid rgba(67,130,120,.2); border-radius:999px; background:rgba(255,255,255,.72); padding:5px 10px; }
    .summary strong { color:var(--gold); margin:0 3px; }
    .legend { border-radius:18px; margin-bottom:14px; padding:12px 14px; }
    .legend summary { cursor:pointer; font-weight:900; }
    #legendContent { display:flex; flex-wrap:wrap; gap:7px; padding-top:12px; }
    .table-wrap { overflow:auto; border-radius:22px; }
    table { width:100%; min-width:1120px; border-collapse:collapse; }
    th { position:sticky; top:0; z-index:2; background:#dcece5; color:#285e58; text-align:left; white-space:nowrap; }
    th,td { padding:11px 10px; border-bottom:1px solid rgba(80,126,119,.13); vertical-align:top; }
    tbody tr:hover { background:rgba(255,255,255,.5); }
    .index { color:#76918c; width:44px; }
    .item-cell { display:flex; align-items:center; gap:10px; min-width:172px; }
    .item-cell img { width:58px; height:58px; object-fit:contain; filter:drop-shadow(0 4px 3px rgba(40,66,59,.18)); }
    .name { font-weight:900; font-size:15px; }
    code { color:#607d78; font-size:11px; }
    .chips { display:flex; flex-wrap:wrap; gap:5px; max-width:230px; }
    .chip { padding:2px 7px; font-size:12px; white-space:nowrap; }
    .chip.tags { background:#e8f3df; }.chip.objectTags { background:#f8ecda; }.chip.traitTags { background:#e5f0f4; }
    .chip.materialTags { background:#eee9f5; }.chip.visualTags { background:#f7e5e1; }
    .tasks { max-width:320px; color:#4b6f69; font-size:12px; }
    .empty { padding:38px;text-align:center;color:var(--muted); }
    @media (max-width:780px) { .toolbar { grid-template-columns:1fr 1fr; }.toolbar input { grid-column:1/-1; } header { padding-top:22px; } }
  </style>
</head>
<body>
  <header>
    <h1>百物寻踪 · 物品属性关系表</h1>
    <p>123 件素材、5 类属性域，以及每件物品可命中的组合任务</p>
  </header>
  <main class="shell">
    <section class="toolbar">
      <input id="search" type="search" placeholder="搜索物品名、英文 ID、标签或任务…" />
      <select id="domain"><option value="">全部属性域</option></select>
      <select id="tag"><option value="">全部标签</option></select>
      <button id="reset" type="button">清空筛选</button>
    </section>
    <div class="summary" id="summary"></div>
    <details class="legend">
      <summary>标签字典与物品数量</summary>
      <div id="legendContent"></div>
    </details>
    <section class="table-wrap">
      <table>
        <thead><tr><th>#</th><th>物品</th><th>角色</th><th>基础分类</th><th>物品种类</th><th>能力状态</th><th>材质</th><th>外观</th><th>可命中任务</th></tr></thead>
        <tbody id="rows"></tbody>
      </table>
      <div id="empty" class="empty" hidden>没有符合当前条件的物品</div>
    </section>
  </main>
  <script>window.CATALOG_DATA=${data};</script>
  <script>
    const D=window.CATALOG_DATA,$=id=>document.getElementById(id);
    const search=$('search'),domain=$('domain'),tag=$('tag'),rows=$('rows'),empty=$('empty');
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const label=t=>D.tagLabels[t]||t;
    const chips=(values,kind)=>values.length?'<div class="chips">'+values.map(t=>'<span class="chip '+kind+'" title="'+esc(t)+'">'+esc(label(t))+'</span>').join('')+'</div>':'—';
    Object.entries(D.domainLabels).forEach(([value,text])=>domain.add(new Option(text,value)));
    function fillTags(){
      const current=tag.value; tag.length=1;
      const pool=new Set();
      D.items.forEach(item=>(domain.value?item.domains[domain.value]:item.tags).forEach(t=>pool.add(t)));
      [...pool].sort((a,b)=>label(a).localeCompare(label(b),'zh-CN')).forEach(t=>tag.add(new Option(label(t)+' · '+D.tagCounts[t]+'件',t)));
      if([...pool].includes(current)) tag.value=current;
    }
    function render(){
      const q=search.value.trim().toLowerCase(),selectedTag=tag.value;
      const filtered=D.items.filter(item=>{
        if(selectedTag && !(domain.value?item.domains[domain.value]:item.tags).includes(selectedTag)) return false;
        const hay=[item.name,item.id,item.role,...item.tags,...item.tasks.flatMap(t=>[t.id,t.label])].join(' ').toLowerCase();
        return !q||hay.includes(q);
      });
      rows.innerHTML=filtered.map((item,index)=>'<tr><td class="index">'+(index+1)+'</td><td><div class="item-cell"><img loading="lazy" src="'+esc(item.img)+'" alt=""><div><div class="name">'+esc(item.name)+'</div><code>'+esc(item.id)+'</code></div></div></td><td>'+(item.role==='landmark'?'大型地标':'普通物品')+'</td>'+Object.keys(D.domainLabels).map(k=>'<td>'+chips(item.domains[k],k)+'</td>').join('')+'<td class="tasks">'+(item.tasks.length?item.tasks.map(t=>esc(t.label)+' <code>'+esc(t.id)+'</code>').join('<br>'):'—')+'</td></tr>').join('');
      empty.hidden=filtered.length>0;
      $('summary').innerHTML='<span>总素材 <strong>'+D.items.length+'</strong> 件</span><span>当前显示 <strong>'+filtered.length+'</strong> 件</span><span>组合任务 <strong>'+D.tasks.length+'</strong> 条</span><span>大型地标 <strong>'+D.items.filter(i=>i.role==='landmark').length+'</strong> 件</span>';
    }
    $('legendContent').innerHTML=Object.entries(D.tagCounts).sort((a,b)=>b[1]-a[1]).map(([t,n])=>'<span class="chip" title="'+esc(t)+'">'+esc(label(t))+' · '+n+'件</span>').join('');
    search.addEventListener('input',render); domain.addEventListener('change',()=>{fillTags();render()}); tag.addEventListener('change',render);
    $('reset').addEventListener('click',()=>{search.value='';domain.value='';fillTags();tag.value='';render()});
    fillTags();render();
  </script>
</body>
</html>
`;

fs.writeFileSync(outputPath, html, 'utf8');
console.log(`generated ${items.length} items and ${tasks.length} tasks -> ${outputPath}`);
