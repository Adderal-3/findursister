import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire('C:/Users/N33034/Desktop/findur0727/findursister0727/findursister/package.json');
const { PNG } = require('pngjs');
const crypto = require('crypto');

const dir = '逆水寒07小游戏素材-页面 1';
const files = fs.readdirSync(dir).filter(f => /^容器 \d+.*\.png$/.test(f));

const hashMap = new Map();
const sizeMap = new Map();
for (const f of files) {
  const png = PNG.sync.read(fs.readFileSync(dir + '/' + f));
  const hash = crypto.createHash('sha256').update(png.data).digest('hex').slice(0, 16);
  const num = Number(f.match(/^容器 (\d+)/)[1]);
  hashMap.set(num, hash);
  sizeMap.set(num, png.width + 'x' + png.height);
}

// 反向：hash -> [nums]
const byHash = new Map();
for (const [num, hash] of hashMap) {
  if (!byHash.has(hash)) byHash.set(hash, []);
  byHash.get(hash).push(num);
}
console.log('容器 PNG 总数:', files.length);
console.log('像素级唯一图:', byHash.size);
console.log('重复组:');
for (const [hash, nums] of byHash) {
  if (nums.length > 1) console.log('  ', nums.map(n => '容器' + n).join(' = '), '(hash', hash + ')');
}
fs.writeFileSync('C:/Users/N33034/AppData/Local/Temp/png_dedup.json',
  JSON.stringify({ byNum: Object.fromEntries(hashMap), groups: Object.fromEntries(byHash), sizes: Object.fromEntries(sizeMap) }, null, 2));
console.log('映射已保存到 Temp/png_dedup.json');
