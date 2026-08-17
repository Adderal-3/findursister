/**
 * 静态回归检查（无需浏览器）：
 *  1. manifest 全部素材文件存在且字节数与记录一致（含 8 件重绘件）
 *  2. ITEM_GEOMETRY 覆盖全部素材且数值合法；8 件重绘件几何与 manifest 一致
 *  3. dist/index.html SDK 版本已升级（0.3.1 / 0.2.1），无旧版本残留
 *  4. 关卡表 200 关、任务 ID 均存在于任务库
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: Boolean(ok), detail: String(detail) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

// 1. manifest 与文件
const manifest = JSON.parse(readFileSync(join(root, 'src', 'assets', 'items', 'ancient', 'manifest.json'), 'utf8'));
const manifestMap = new Map(manifest.map((entry) => [entry.id, entry]));
check('manifest 素材数量 123', manifest.length === 123, `实际 ${manifest.length}`);

const missingFiles = [];
const sizeMismatch = [];
for (const entry of manifest) {
  const file = join(root, 'src', 'assets', 'items', 'ancient', `${entry.id}.webp`);
  if (!existsSync(file)) { missingFiles.push(entry.id); continue; }
  const size = statSync(file).size;
  if (size !== entry.bytes) sizeMismatch.push(`${entry.id}(${size} vs ${entry.bytes})`);
}
check('全部素材文件存在', missingFiles.length === 0, missingFiles.join(',') || 'ok');
check('素材字节数与 manifest 一致', sizeMismatch.length === 0, sizeMismatch.slice(0, 5).join(',') || 'ok');

// 2. 几何数据（与 scene-bundle 同源的 itemGeometry.ts）
const bundle = await import(pathToFileURL(join(root, 'tools', 'regression', '.gen', 'scene-bundle.mjs')).href);
const { ITEM_GEOMETRY } = bundle;
const noGeometry = manifest.filter((entry) => !ITEM_GEOMETRY[entry.id]).map((entry) => entry.id);
check('全部素材有几何数据', noGeometry.length === 0, noGeometry.join(',') || 'ok');

const badGeometry = manifest.filter((entry) => {
  const geometry = ITEM_GEOMETRY[entry.id];
  return !geometry || geometry.width <= 0 || geometry.width > 1
    || geometry.height <= 0 || geometry.height > 1;
});
check('几何数值合法（0,1]', badGeometry.length === 0, badGeometry.map((e) => e.id).join(',') || 'ok');

// 8 件重绘件：几何应与 manifest visibleWidth/visibleHeight 一致
const REDRAWN = ['ancient_book', 'mooncake', 'lidded_bowl', 'embroidered_trousers',
  'jade_earrings', 'fox_mask', 'gauze_veil', 'bamboo_hat'];
const geometryMismatch = REDRAWN.filter((id) => {
  const entry = manifestMap.get(id);
  const geometry = ITEM_GEOMETRY[id];
  return !entry || !geometry
    || Math.abs(geometry.width - entry.visibleWidth) > 1e-4
    || Math.abs(geometry.height - entry.visibleHeight) > 1e-4;
});
check('8 件重绘件几何与 manifest 一致', geometryMismatch.length === 0,
  geometryMismatch.length
    ? geometryMismatch.map((id) => `${id}: 几何=${JSON.stringify(ITEM_GEOMETRY[id])} manifest=${JSON.stringify(manifestMap.get(id) && { w: manifestMap.get(id).visibleWidth, h: manifestMap.get(id).visibleHeight })}`).join('; ')
    : '全部一致');

// 3. dist/index.html SDK 版本
const distHtml = readFileSync(join(root, 'dist', 'index.html'), 'utf8');
check('dist 引入 ds-act-sdk 0.3.1', distHtml.includes('ds-act-sdk/0.3.1/'));
check('dist 引入 mini-game-data-sdk 0.2.1', distHtml.includes('mini-game-data-sdk/0.2.1/'));
check('dist 无旧版 SDK 残留（0.1.5 / 0.2.0）', !distHtml.includes('ds-act-sdk/0.1.5') && !distHtml.includes('mini-game-data-sdk/0.2.0/'));
check('dist 无 Cocos 占位符残留（!false 已替换）',
  !distHtml.includes('!{IS_COCOS}') && !distHtml.includes('if ({IS_COCOS}'),
  distHtml.includes('!false &&') ? '功能位为 !false' : '未找到 !false 守卫');

// 4. 关卡表与任务库
const csv = readFileSync(join(root, '数值表_src', 'levels_200.csv'), 'utf8').trim();
const lines = csv.split(/\r?\n/).slice(1);
check('关卡表 200 关', lines.length === 200, `实际 ${lines.length}`);

const taskRuleIds = new Set(bundle.TASK_RULES.map((rule) => rule.id));
const unknownTasks = [];
const malformedGoals = [];
for (const line of lines) {
  const values = line.split(',');
  if (values.length < 2) continue;
  const taskIdCol = values[values.length - 1] ?? '';
  const countCol = values[4] ?? '';
  const taskIds = taskIdCol.split('|').filter(Boolean);
  const counts = countCol.split('|').filter(Boolean);
  for (const id of taskIds) if (!taskRuleIds.has(id)) unknownTasks.push(`${values[0]}:${id}`);
  if (taskIds.length !== counts.length || taskIds.length === 0) malformedGoals.push(values[0]);
}
check('关卡任务 ID 全部存在于任务库', unknownTasks.length === 0, unknownTasks.slice(0, 5).join(',') || 'ok');
check('关卡目标数量格式正确', malformedGoals.length === 0, malformedGoals.slice(0, 5).join(',') || 'ok');

const fails = results.filter((r) => !r.ok);
console.log(`\n静态检查: ${results.length - fails.length} PASS / ${fails.length} FAIL`);
process.exit(fails.length ? 1 : 0);
