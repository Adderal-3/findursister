/**
 * compress-images.mjs — ds-act-workflow 模式 9 资源优化脚本
 *
 * 用法：
 *   node compress-images.mjs --project /path/to/project [--image-threshold 300] [--audio-threshold 500] [--video-threshold 3072]
 *
 * 功能：
 *   1. 递归扫描 assets/ 下图片，压缩超阈图片（sharp quality 80，保格式不 resize）
 *   2. 扫描超阈音频/视频，报告但不自动处理（需用户选择压缩参数）
 *   3. 对所有图片计算 SHA-256，报告内容重复
 *   4. 生成 .compress-cache.json
 *
 * 依赖：
 *   npm install sharp  （首次使用需安装）
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// ===== 参数解析 =====
const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i]?.replace(/^--/, '');
  const val = args[i + 1];
  if (key) opts[key] = val;
}

const projectDir = opts.project || process.cwd();
const imageThreshold = parseInt(opts['image-threshold'] || '300') * 1024;
const audioThreshold = parseInt(opts['audio-threshold'] || '500') * 1024;
const videoThreshold = parseInt(opts['video-threshold'] || '3072') * 1024;

console.log(`项目目录: ${projectDir}`);
console.log(`阈值: 图片 ${imageThreshold / 1024}KB / 音频 ${audioThreshold / 1024}KB / 视频 ${videoThreshold / 1024}KB\n`);

// ===== 递归扫描文件（排除依赖/构建目录）=====
const excludeDirs = new Set(['node_modules', 'dist', '.git', 'build', '.worktrees']);
function scanFiles(dir, exts) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && excludeDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanFiles(full, exts));
    } else if (exts.some(ext => entry.name.toLowerCase().endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

const images = scanFiles(projectDir, ['.png', '.jpg', '.jpeg', '.webp']);
const audios = scanFiles(projectDir, ['.mp3', '.wav', '.ogg']);
const videos = scanFiles(projectDir, ['.mp4', '.webm']);

console.log(`找到 ${images.length} 张图片, ${audios.length} 个音频, ${videos.length} 个视频\n`);

// ===== 图片压缩 =====
const oversizedImages = images.filter(f => fs.statSync(f).size > imageThreshold);
console.log(`${oversizedImages.length} 张图片超过阈值，开始压缩...\n`);

const compressed = [];
const skipped = [];

// 读取已有缓存，跳过已压缩的图片
const cachePath = path.join(projectDir, '.compress-cache.json');
const cachedHashes = {};
try {
  const raw = fs.readFileSync(cachePath, 'utf8');
  const parsed = JSON.parse(raw);
  parsed.compressed?.forEach(c => { if (c.hash) cachedHashes[c.file] = c.hash; });
  parsed.skipped?.forEach(c => { if (c.hash) cachedHashes[c.file] = c.hash; });
} catch(e) { /* 无缓存，全部压缩 */ }

for (const file of oversizedImages) {
  const origSize = fs.statSync(file).size;
  const relPath = path.relative(projectDir, file);
  // 缓存去重：计算当前文件 hash，若与缓存一致则跳过
  const currentHash = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (cachedHashes[relPath] === currentHash) {
    skipped.push({ file: relPath, originalSize: origSize, reason: '已压缩（缓存命中）', hash: currentHash });
    console.log(`⏭️ ${path.basename(file)}: 缓存命中，跳过`);
    continue;
  }
  try {
    // 只压质量不 resize，保格式（按扩展名选输出格式）
    const ext = path.extname(file).toLowerCase();
    let buf;
    if (ext === '.png') {
      buf = await sharp(file).png({ quality: 80, compressionLevel: 9 }).toBuffer();
    } else if (ext === '.jpg' || ext === '.jpeg') {
      buf = await sharp(file).jpeg({ quality: 80, progressive: true }).toBuffer();
    } else if (ext === '.webp') {
      buf = await sharp(file).webp({ quality: 80 }).toBuffer();
    } else {
      skipped.push({ file: relPath, originalSize: origSize, reason: '不支持的格式' });
      continue;
    }

    const newSize = buf.length;
    const ratio = ((1 - newSize / origSize) * 100).toFixed(1);

    if (newSize < origSize) {
      fs.writeFileSync(file, buf);
      compressed.push({ file: relPath, originalSize: origSize, compressedSize: newSize, ratio: parseFloat(ratio), hash: crypto.createHash('sha256').update(buf).digest('hex') });
      console.log(`✅ ${path.basename(file)}: ${(origSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB (-${ratio}%)`);
    } else {
      skipped.push({ file: relPath, originalSize: origSize, reason: '已最优', hash: currentHash });
      console.log(`⏭️ ${path.basename(file)}: 已最优，跳过`);
    }
  } catch (e) {
    skipped.push({ file: relPath, originalSize: origSize, reason: e.message });
    console.log(`❌ ${path.basename(file)}: ${e.message}`);
  }
}

// ===== 音频/视频报告（不自动处理） =====
const oversizedAudio = audios.filter(f => fs.statSync(f).size > audioThreshold);
const oversizedVideo = videos.filter(f => fs.statSync(f).size > videoThreshold);

if (oversizedAudio.length > 0) {
  console.log('\n⚠️ 超阈音频（需用户选择压缩参数，不自动处理）：');
  oversizedAudio.forEach(f => {
    const size = fs.statSync(f).size;
    console.log(`  ${path.relative(projectDir, f)}: ${(size / 1024).toFixed(0)}KB`);
  });
}
if (oversizedVideo.length > 0) {
  console.log('\n⚠️ 超阈视频（需用户选择压缩参数，不自动处理）：');
  oversizedVideo.forEach(f => {
    const size = fs.statSync(f).size;
    console.log(`  ${path.relative(projectDir, f)}: ${(size / 1024).toFixed(0)}KB`);
  });
}

// ===== hash 去重 =====
console.log('\n计算内容哈希检查重复...');
const hashes = {};
const duplicates = [];
for (const file of images) {
  const data = fs.readFileSync(file);
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  const relPath = path.relative(projectDir, file);
  if (hashes[hash]) {
    duplicates.push({ file: relPath, duplicateOf: path.relative(projectDir, hashes[hash]), hash: hash.substring(0, 16) });
    console.log(`🔄 重复: ${path.basename(file)} = ${path.basename(hashes[hash])}`);
  } else {
    hashes[hash] = file;
  }
}
if (duplicates.length === 0) console.log('无重复图片');

// ===== 生成 .compress-cache.json =====
const cache = {
  timestamp: new Date().toISOString(),
  thresholds: { image: imageThreshold, audio: audioThreshold, video: videoThreshold },
  compressed,
  skipped,
  oversizedAudio: oversizedAudio.map(f => ({ file: path.relative(projectDir, f), size: fs.statSync(f).size })),
  oversizedVideo: oversizedVideo.map(f => ({ file: path.relative(projectDir, f), size: fs.statSync(f).size })),
  duplicates
};
fs.writeFileSync(path.join(projectDir, '.compress-cache.json'), JSON.stringify(cache, null, 2));

// ===== 汇总 =====
const totalOrig = compressed.reduce((s, r) => s + r.originalSize, 0);
const totalNew = compressed.reduce((s, r) => s + r.compressedSize, 0);
const saved = totalOrig - totalNew;
console.log(`\n📊 图片压缩汇总: ${(totalOrig / 1024 / 1024).toFixed(1)}MB → ${(totalNew / 1024 / 1024).toFixed(1)}MB (节省 ${(saved / 1024 / 1024).toFixed(1)}MB, ${totalOrig > 0 ? ((saved / totalOrig) * 100).toFixed(1) : 0}%)`);
console.log(`重复图片: ${duplicates.length} 个`);
console.log(`报告已保存: .compress-cache.json`);
