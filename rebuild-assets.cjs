/**
 * 逆水寒07小游戏素材重构脚本
 * 输入: json.txt(设计稿导出) + 逆水寒07小游戏素材-页面 1/(PNG 素材)
 * 输出: 逆水寒07小游戏素材-重构/
 *   ├── items/item_001.png ...   去重后的物品图(140 张)
 *   ├── icons/*.png              16 个分类图标
 *   ├── assets.json              游戏可用结构(分类 -> 物品,物品 -> 多分类标签)
 *   └── 对照表.csv               人工核对表
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC_DIR = '逆水寒07小游戏素材-页面 1';
const OUT_DIR = '逆水寒07小游戏素材-重构';
const JSON_FILE = 'json.txt';

// 分类 id(拼音) 映射,顺序 = 画布从上到下
const CATS = [
  ['乐器', 'yueqi'],
  ['有字的物品', 'youzi_wupin'],
  ['容器', 'rongqi'],
  ['会飞的', 'huifeide'],
  ['会发光的', 'huifaguangde'],
  ['尖锐的', 'jianruide'],
  ['甜的食物', 'tianshi'],
  ['植物', 'zhiwu'],
  ['坐骑/交通工具', 'zuoqi'],
  ['动物', 'dongwu'],
  ['有火焰', 'youhuoyan'],
  ['食物', 'shiwu'],
  ['水果', 'shuiguo'],
  ['蔬菜', 'shucai'],
  ['穿戴的服饰/配饰', 'fushi_peishi'],
  ['桥', 'qiao'],
];

const md5 = (file) => crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
const pngDims = (file) => {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};

const j = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
const data = j.data;

// 1. 分类锚点: TEXT 节点的 y 坐标
const labels = data
  .filter((n) => n.type === 'TEXT')
  .map((n) => ({ name: n.name, y: n.absoluteBoundingBox.y }))
  .sort((a, b) => a.y - b.y);
if (labels.length !== CATS.length) throw new Error('分类数量不符: ' + labels.length);
const catOrder = new Map(labels.map((l, i) => [l.name, i]));

function categoryOf(node) {
  const b = node.absoluteBoundingBox;
  let best = null, bd = Infinity;
  for (const l of labels) {
    const d = Math.abs(b.y - l.y);
    if (d < bd) { bd = d; best = l.name; }
  }
  return bd < 600 ? best : null;
}

// 2. 收集素材节点(FRAME / RECTANGLE)
const nodes = data
  .filter((n) => n.type === 'FRAME' || n.type === 'RECTANGLE')
  .map((n) => {
    const b = n.absoluteBoundingBox;
    return {
      nodeId: n.id,
      name: n.name,
      category: categoryOf(n),
      x: Math.round(b.x), y: Math.round(b.y),
      w: Math.round(b.width), h: Math.round(b.height),
    };
  });

// 3. 文件归属: 一般按名字;两个「图片」节点按尺寸区分(导出的 PNG 484x499 属于 16:004)
for (const nd of nodes) {
  const file = nd.name + '-1x.png.png';
  const full = path.join(SRC_DIR, file);
  if (nd.name === '图片') {
    if (fs.existsSync(full) && pngDims(full).w === nd.w && pngDims(full).h === nd.h) {
      nd.file = file; nd.hash = md5(full);
    } else {
      nd.file = null; nd.hash = 'MISSING:' + nd.nodeId; // 未导出,单独成项
    }
  } else if (fs.existsSync(full)) {
    nd.file = file; nd.hash = md5(full);
  } else {
    throw new Error('缺文件: ' + file);
  }
}

// 4. 按内容哈希分组 → 唯一物品
const groups = new Map(); // hash -> nodes[]
for (const nd of nodes) {
  if (!groups.has(nd.hash)) groups.set(nd.hash, []);
  groups.get(nd.hash).push(nd);
}

// 5. 每个物品: 主分类 = 画布上最先出现的分类;代表节点 = 该分类行内的节点
const items = [];
for (const [hash, nds] of groups) {
  nds.sort((a, b) => catOrder.get(a.category) - catOrder.get(b.category) || a.x - b.x);
  const rep = nds[0];
  const cats = [...new Set(nds.map((n) => n.category))]
    .sort((a, b) => catOrder.get(a) - catOrder.get(b));
  items.push({
    hash, rep, cats,
    missing: hash.startsWith('MISSING:'),
    nodes: nds,
  });
}

// 6. 排序并编号: 主分类(画布序) → 代表节点 x
items.sort((a, b) => catOrder.get(a.rep.category) - catOrder.get(b.rep.category) || a.rep.x - b.rep.x);

// 7. 输出目录
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT_DIR, 'items'), { recursive: true });
fs.mkdirSync(path.join(OUT_DIR, 'icons'), { recursive: true });

const itemsJson = items.map((it, i) => {
  const id = 'item_' + String(i + 1).padStart(3, '0');
  let file = null;
  if (!it.missing) {
    file = 'items/' + id + '.png';
    fs.copyFileSync(path.join(SRC_DIR, it.rep.file), path.join(OUT_DIR, file));
  }
  return {
    id,
    file,
    missing: it.missing || undefined,
    note: it.missing
      ? `设计节点「图片」(${it.rep.nodeId}, ${it.rep.w}x${it.rep.h})未导出 PNG：与节点 16:004 重名,导出时被覆盖。请从设计工具重新导出补入。`
      : undefined,
    primaryCategory: it.rep.category,
    categories: it.cats,
    size: { w: it.rep.w, h: it.rep.h },
    sourceNodes: it.nodes.map((n) => ({ name: n.name, id: n.nodeId, category: n.category, x: n.x, y: n.y })),
  };
});

// 8. 分类(含图标拷贝 + 物品 id 列表,按行内 x 排序)
const catsJson = CATS.map(([name, cid]) => {
  const iconSrc = path.join(SRC_DIR, name + '-1x.png.png');
  const iconOut = 'icons/' + name.replace(/\//g, '_') + '.png';
  if (!fs.existsSync(iconSrc)) throw new Error('缺图标: ' + iconSrc);
  fs.copyFileSync(iconSrc, path.join(OUT_DIR, iconOut));
  const catItems = itemsJson
    .filter((it) => it.categories.includes(name))
    .sort((a, b) => {
      const ax = a.sourceNodes.find((n) => n.category === name).x;
      const bx = b.sourceNodes.find((n) => n.category === name).x;
      return ax - bx;
    })
    .map((it) => it.id);
  return { id: cid, name, icon: iconOut, itemCount: catItems.length, items: catItems };
});

// 9. assets.json
const assets = {
  name: '逆水寒07小游戏素材',
  generated: new Date().toISOString().slice(0, 10),
  source: { designJson: JSON_FILE, imagesDir: SRC_DIR },
  stats: {
    categories: catsJson.length,
    items: itemsJson.length,
    exportedImages: itemsJson.filter((i) => !i.missing).length,
    missingImages: itemsJson.filter((i) => i.missing).length,
    sourceNodes: nodes.length,
  },
  categories: catsJson,
  items: itemsJson,
};
fs.writeFileSync(path.join(OUT_DIR, 'assets.json'), JSON.stringify(assets, null, 2));

// 10. 对照表.csv(带 BOM,Excel 友好)
const esc = (s) => '"' + String(s).replace(/"/g, '""') + '"';
const rows = [['item_id', '文件', '主分类', '全部分类', '来源节点(画布)', '宽', '高', '缺失'].join(',')];
for (const it of itemsJson) {
  rows.push([
    it.id,
    it.file || '',
    it.primaryCategory,
    it.categories.join(';'),
    it.sourceNodes.map((n) => `${n.name}(${n.id})[${n.category}]`).join(';'),
    it.size.w, it.size.h,
    it.missing ? '是' : '',
  ].map(esc).join(','));
}
fs.writeFileSync(path.join(OUT_DIR, '对照表.csv'), '﻿' + rows.join('\r\n'));

console.log('完成:', OUT_DIR);
console.log('物品:', assets.stats.items, '(导出', assets.stats.exportedImages, '/缺失', assets.stats.missingImages, ')');
console.log('分类:', catsJson.map((c) => `${c.name}:${c.itemCount}`).join('  '));
