import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const itemsSource = fs.readFileSync(path.join(root, 'src', 'game', 'items.ts'), 'utf8');
const tasksSource = fs.readFileSync(path.join(root, 'src', 'game', 'tasks.ts'), 'utf8');
const outputPath = path.join(root, 'tools', 'item-classification-review.html');

const domainLabels = {
  tags: '基础分类',
  objectTags: '物品种类',
  traitTags: '能力状态',
  materialTags: '材质',
  visualTags: '外观特征',
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
    return {
      id,
      name,
      img: `../src/assets/items/ancient/${id}.webp`,
      domains: Object.fromEntries(
        Object.keys(domainLabels).map((field) => [field, quotedArray(line, field)]),
      ),
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

const domainOptions = Object.fromEntries(
  Object.keys(domainLabels).map((domain) => [
    domain,
    [...new Set(items.flatMap((item) => item.domains[domain]))],
  ]),
);

const data = JSON.stringify({
  items, tasks, domainLabels, tagLabels, domainOptions,
}).replaceAll('</script', '<\\/script');

const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>物品分类调整对照表</title>
  <style>
    :root{color-scheme:light;--ink:#4f382d;--jade:#3d776e;--orange:#c77847;--paper:#fffaf0;--line:#dcc9aa;--muted:#8c7766}
    *{box-sizing:border-box}body{margin:0;color:var(--ink);font:14px/1.55 "Microsoft YaHei","PingFang SC",sans-serif;background:#eee5d2}
    button,input,select,textarea{font:inherit}button{cursor:pointer}.page{width:min(1480px,calc(100% - 24px));margin:0 auto 48px}
    header{padding:28px 12px 18px;text-align:center}h1{margin:0;font:900 clamp(26px,4vw,44px)/1.2 STKaiti,KaiTi,serif;letter-spacing:.12em}
    header p{margin:8px auto 0;max-width:860px;color:var(--muted)}.workflow{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:0 0 14px}
    .workflow div{border:1px solid #fff9;border-radius:16px;background:#fff8;padding:10px 12px;box-shadow:0 4px 14px #6d513018}.workflow b{display:block;color:var(--orange)}
    .toolbar{position:sticky;top:8px;z-index:5;display:grid;grid-template-columns:minmax(220px,1fr) 150px auto auto auto;gap:8px;padding:12px;border:1px solid #fff9;border-radius:18px;background:#fffaf0ee;box-shadow:0 12px 32px #74533125;backdrop-filter:blur(10px)}
    input,select,textarea,.btn{min-height:42px;border:1px solid var(--line);border-radius:12px;background:#fffdf8;color:var(--ink);padding:8px 12px}.btn{font-weight:900}.btn.primary{border-color:#376d65;background:var(--jade);color:white}.btn.warn{border-color:#bb754a;color:#a85d34}
    .summary{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.summary span{border:1px solid #fff9;border-radius:999px;background:#fff9;padding:5px 10px}.summary strong{color:var(--orange)}
    .table-wrap{overflow:auto;border:1px solid #fff9;border-radius:20px;background:#fffaf0d9;box-shadow:0 16px 38px #74533120}
    table{width:100%;min-width:1180px;border-collapse:collapse}th{position:sticky;top:0;z-index:2;background:#e4eee7;text-align:left;white-space:nowrap}th,td{padding:11px;border-bottom:1px solid #dbcaaa80;vertical-align:top}
    tr.changed{background:#fff0d9}tr:hover{background:#fff9}.item{display:flex;align-items:center;gap:10px;min-width:190px}.item img{width:58px;height:58px;object-fit:contain;filter:drop-shadow(0 4px 3px #47362533)}
    .name{font-weight:900;font-size:15px}code{font-size:11px;color:#77877f}.domains{display:grid;gap:5px;min-width:310px}.domain{display:flex;gap:6px}.domain b{width:62px;flex:none;color:#8c725d;font-size:11px}.chips{display:flex;flex-wrap:wrap;gap:4px}
    .chip{border-radius:999px;background:#edf5ed;padding:1px 7px;font-size:11px}.changed .after .chip{background:#ffe0bd}.tasks{max-width:300px;font-size:12px;color:#55756f}.empty{padding:40px;text-align:center;color:var(--muted)}
    dialog{width:min(720px,calc(100% - 24px));max-height:90dvh;border:1px solid #fff;border-radius:24px;background:var(--paper);color:var(--ink);padding:0;box-shadow:0 30px 80px #3d2c2266}dialog::backdrop{background:#33251d99}
    .modal-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:12px;border-bottom:1px solid #dcc9aa;background:#fffaf0;padding:14px 18px}.modal-head img{width:64px;height:64px;object-fit:contain}.modal-head h2{margin:0;font-family:STKaiti,KaiTi,serif}
    .editor{padding:16px 18px}.group{margin-bottom:14px}.group h3{margin:0 0 7px;font-size:13px}.options{display:flex;flex-wrap:wrap;gap:6px}.option{position:relative}.option input{position:absolute;opacity:0;pointer-events:none}.option span{display:block;border:1px solid var(--line);border-radius:999px;background:#fff;padding:6px 10px;font-size:12px}.option input:checked+span{border-color:#39796f;background:#dff1e8;color:#285f57;font-weight:900}
    textarea{width:100%;min-height:78px;resize:vertical}.modal-actions{position:sticky;bottom:0;display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #dcc9aa;background:#fffaf0;padding:12px 18px}
    @media(max-width:900px){.workflow{grid-template-columns:1fr 1fr}.toolbar{grid-template-columns:1fr 1fr}.toolbar input{grid-column:1/-1}}@media(max-width:540px){.workflow{grid-template-columns:1fr}.toolbar{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <header><h1>物品分类调整对照表</h1><p>左侧保留当前分类，右侧显示你的调整草稿；导出 JSON 后交回给 AI，即可批量更新 items.ts、任务候选池、关卡校验和数值表。</p></header>
  <main class="page">
    <section class="workflow">
      <div><b>1 · 搜索检查</b>按名称、ID、标签或任务筛选物品。</div>
      <div><b>2 · 单项编辑</b>点击“调整分类”，勾选正确标签并写备注。</div>
      <div><b>3 · 导出草稿</b>下载 JSON；浏览器也会自动保留本地草稿。</div>
      <div><b>4 · 回传更新</b>把 JSON 发给 AI，统一改代码并重新跑关卡校验。</div>
    </section>
    <section class="toolbar">
      <input id="search" type="search" placeholder="搜索物品名、英文 ID、标签或任务…" />
      <select id="status"><option value="">全部状态</option><option value="changed">只看已调整</option><option value="unchanged">只看未调整</option></select>
      <button id="importBtn" class="btn" type="button">导入 JSON</button>
      <button id="exportCsv" class="btn" type="button">导出 CSV</button>
      <button id="exportJson" class="btn primary" type="button">导出修改 JSON</button>
      <input id="importFile" type="file" accept=".json,application/json" hidden />
    </section>
    <div id="summary" class="summary"></div>
    <section class="table-wrap">
      <table><thead><tr><th>#</th><th>物品</th><th>当前分类</th><th>调整后分类</th><th>任务影响</th><th>操作</th></tr></thead><tbody id="rows"></tbody></table>
      <div id="empty" class="empty" hidden>没有符合当前条件的物品</div>
    </section>
  </main>

  <dialog id="editorDialog">
    <div class="modal-head"><img id="editorImage" alt=""><div><div id="editorId"></div><h2 id="editorName"></h2></div></div>
    <form id="editorForm">
      <div id="editorGroups" class="editor"></div>
      <div class="editor"><label><b>调整备注</b><textarea id="editorNote" placeholder="例如：外观有叶片，但不应该归到基础分类“植物”"></textarea></label></div>
      <div class="modal-actions"><button id="restore" class="btn warn" type="button">恢复原分类</button><button id="cancel" class="btn" type="button">取消</button><button class="btn primary" type="submit">保存草稿</button></div>
    </form>
  </dialog>

  <script>window.REVIEW_DATA=${data};</script>
  <script>
    const D=window.REVIEW_DATA,$=id=>document.getElementById(id),KEY='findursister.classification-review.v1';
    const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const clone=value=>JSON.parse(JSON.stringify(value)); let draft={};try{draft=JSON.parse(localStorage.getItem(KEY)||'{}')}catch{draft={}}
    let editingId=null;const label=t=>D.tagLabels[t]||t;const currentDomains=item=>draft[item.id]?.domains||item.domains;
    const same=(a,b)=>JSON.stringify(Object.fromEntries(Object.keys(D.domainLabels).map(k=>[k,[...(a[k]||[])].sort()])))===JSON.stringify(Object.fromEntries(Object.keys(D.domainLabels).map(k=>[k,[...(b[k]||[])].sort()])));
    const isChanged=item=>Boolean(draft[item.id])&&!same(item.domains,currentDomains(item));
    const allTags=domains=>Object.values(domains).flat();const matches=(domains,task)=>{const tags=new Set(allTags(domains));return task.allOf.every(t=>tags.has(t))&&(!task.anyOf.length||task.anyOf.some(t=>tags.has(t)))&&!task.noneOf.some(t=>tags.has(t))};
    const taskIds=domains=>D.tasks.filter(t=>matches(domains,t)).map(t=>t.id);
    const domainHtml=domains=>'<div class="domains">'+Object.entries(D.domainLabels).map(([k,v])=>'<div class="domain"><b>'+esc(v)+'</b><div class="chips">'+((domains[k]||[]).map(t=>'<span class="chip" title="'+esc(t)+'">'+esc(label(t))+'</span>').join('')||'—')+'</div></div>').join('')+'</div>';
    const taskImpact=item=>{const before=taskIds(item.domains),after=taskIds(currentDomains(item)),added=after.filter(x=>!before.includes(x)),removed=before.filter(x=>!after.includes(x));if(!added.length&&!removed.length)return '无变化';return (added.length?'<div>新增：'+added.map(esc).join('、')+'</div>':'')+(removed.length?'<div>移除：'+removed.map(esc).join('、')+'</div>':'')};
    function persist(){localStorage.setItem(KEY,JSON.stringify(draft))}
    function render(){const q=$('search').value.trim().toLowerCase(),status=$('status').value;const filtered=D.items.filter(item=>{const changed=isChanged(item);if(status==='changed'&&!changed)return false;if(status==='unchanged'&&changed)return false;const domains=currentDomains(item);const hay=[item.name,item.id,...allTags(domains),...taskIds(domains)].join(' ').toLowerCase();return !q||hay.includes(q)});$('rows').innerHTML=filtered.map((item,index)=>'<tr class="'+(isChanged(item)?'changed':'')+'"><td>'+(index+1)+'</td><td><div class="item"><img loading="lazy" src="'+esc(item.img)+'" alt=""><div><div class="name">'+esc(item.name)+'</div><code>'+esc(item.id)+'</code><div>'+(isChanged(item)?'已调整':'未调整')+'</div></div></div></td><td>'+domainHtml(item.domains)+'</td><td class="after">'+domainHtml(currentDomains(item))+'</td><td class="tasks">'+taskImpact(item)+'</td><td><button class="btn edit" data-id="'+esc(item.id)+'" type="button">调整分类</button></td></tr>').join('');$('empty').hidden=filtered.length>0;const changed=D.items.filter(isChanged).length;$('summary').innerHTML='<span>物品 <strong>'+D.items.length+'</strong> 件</span><span>已调整 <strong>'+changed+'</strong> 件</span><span>当前显示 <strong>'+filtered.length+'</strong> 件</span><span>草稿自动保存在本浏览器</span>';document.querySelectorAll('.edit').forEach(button=>button.addEventListener('click',()=>openEditor(button.dataset.id)))}
    function openEditor(id){const item=D.items.find(x=>x.id===id);if(!item)return;editingId=id;$('editorImage').src=item.img;$('editorName').textContent=item.name;$('editorId').innerHTML='<code>'+esc(item.id)+'</code>';const domains=currentDomains(item);$('editorGroups').innerHTML=Object.entries(D.domainLabels).map(([domain,title])=>'<section class="group"><h3>'+esc(title)+'</h3><div class="options">'+D.domainOptions[domain].map(tag=>'<label class="option"><input type="checkbox" name="'+esc(domain)+'" value="'+esc(tag)+'" '+((domains[domain]||[]).includes(tag)?'checked':'')+'><span>'+esc(label(tag))+'</span></label>').join('')+'</div></section>').join('');$('editorNote').value=draft[id]?.note||'';$('editorDialog').showModal()}
    $('editorForm').addEventListener('submit',event=>{event.preventDefault();const item=D.items.find(x=>x.id===editingId);if(!item)return;const form=new FormData(event.currentTarget),domains=Object.fromEntries(Object.keys(D.domainLabels).map(domain=>[domain,form.getAll(domain)]));draft[item.id]={domains,note:$('editorNote').value.trim()};if(same(item.domains,domains)&&!draft[item.id].note)delete draft[item.id];persist();$('editorDialog').close();render()});
    $('restore').addEventListener('click',()=>{if(editingId)delete draft[editingId];persist();$('editorDialog').close();render()});$('cancel').addEventListener('click',()=>$('editorDialog').close());
    const changes=()=>D.items.filter(isChanged).map(item=>({id:item.id,name:item.name,before:item.domains,after:currentDomains(item),note:draft[item.id]?.note||'',taskImpact:{before:taskIds(item.domains),after:taskIds(currentDomains(item))}}));
    function download(name,type,content){const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),0)}
    $('exportJson').addEventListener('click',()=>download('物品分类调整.json','application/json',JSON.stringify({version:1,generatedAt:new Date().toISOString(),changes:changes()},null,2)));
    $('exportCsv').addEventListener('click',()=>{const lines=[['id','name','domain','before','after','note'],...changes().flatMap(change=>Object.keys(D.domainLabels).map(domain=>[change.id,change.name,domain,(change.before[domain]||[]).join('|'),(change.after[domain]||[]).join('|'),change.note]))];download('物品分类调整.csv','text/csv;charset=utf-8','\\ufeff'+lines.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\\n'))});
    $('importBtn').addEventListener('click',()=>$('importFile').click());$('importFile').addEventListener('change',async event=>{const file=event.target.files?.[0];if(!file)return;try{const payload=JSON.parse(await file.text());for(const change of payload.changes||[]){if(D.items.some(item=>item.id===change.id)&&change.after)draft[change.id]={domains:change.after,note:change.note||''}}persist();render()}catch{alert('无法读取这个 JSON，请确认它来自本对照表。')}event.target.value=''});
    $('search').addEventListener('input',render);$('status').addEventListener('change',render);render();
  </script>
</body>
</html>`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html, 'utf8');
console.log(`generated editable review for ${items.length} items -> ${outputPath}`);
