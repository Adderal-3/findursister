import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'public', 'items', 'ancient', 'manifest.json');
const itemsPath = path.join(root, 'src', 'game', 'items.ts');
const tasksPath = path.join(root, 'src', 'game', 'tasks.ts');
const scenePath = path.join(root, 'src', 'game', 'scene.ts');
const levelsPath = path.join(root, '数值表_src', 'levels_100.csv');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const itemsSource = fs.readFileSync(itemsPath, 'utf8');
const tasksSource = fs.readFileSync(tasksPath, 'utf8');
const sceneSource = fs.readFileSync(scenePath, 'utf8');
const levelLines = fs.readFileSync(levelsPath, 'utf8').trim().split(/\r?\n/);

const tagDomains = {
  tags: [
    'instrument', 'written', 'container', 'flying', 'glowing',
    'sharp', 'sweet_food', 'plant', 'vehicle', 'animal',
  ],
  objectTags: [
    'food', 'fruit', 'vegetable', 'weapon', 'wearable', 'bridge',
    'flower', 'insect', 'lighting', 'bottle_jar', 'bowl_dish',
    'clothing', 'accessory', 'headwear',
  ],
  traitTags: [
    'flaming', 'sound_making', 'rideable', 'cross_water', 'winged', 'four_legged',
  ],
  materialTags: [
    'wood', 'metal_jewelry', 'ceramic', 'paper', 'fabric', 'stone', 'gemstone',
  ],
  visualTags: [
    'round', 'slender', 'wide', 'leafy', 'tasseled', 'handled', 'paired', 'patterned',
  ],
};
const allTags = new Set(Object.values(tagDomains).flat());
const expectedCategoryCounts = {
  instrument: 10,
  written: 6,
  container: 19,
  flying: 11,
  glowing: 7,
  sharp: 12,
  sweet_food: 20,
  plant: 27,
  vehicle: 8,
  animal: 10,
};
const expectedObjectCounts = {
  food: 29,
  fruit: 16,
  vegetable: 8,
  weapon: 7,
  wearable: 12,
  bridge: 9,
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pngSize(file) {
  const bytes = fs.readFileSync(file);
  assert(bytes.subarray(1, 4).toString() === 'PNG', `invalid PNG asset: ${file}`);
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function quotedArray(source, field) {
  const match = source.match(new RegExp(`${field}: \\[([^\\]]*)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/'([^']+)'/g)].map((value) => value[1]);
}

function parseItems() {
  return itemsSource.split(/\r?\n/)
    .filter((line) => /^\s*\{ id: '[^']+'/.test(line))
    .map((line) => {
      const id = line.match(/id: '([^']+)'/)?.[1];
      const name = line.match(/name: '([^']+)'/)?.[1];
      const assetId = line.match(/img: asset\('([^']+)'\)/)?.[1];
      assert(id && name && assetId, `malformed item definition: ${line.slice(0, 100)}`);
      const domains = Object.fromEntries(
        Object.keys(tagDomains).map((field) => [field, quotedArray(line, field)]),
      );
      for (const [field, tags] of Object.entries(domains)) {
        const valid = new Set(tagDomains[field]);
        for (const tag of tags) assert(valid.has(tag), `unknown ${field} tag on ${id}: ${tag}`);
      }
      const role = line.match(/role: '([^']+)'/)?.[1] ?? 'item';
      assert(role === 'item' || role === 'landmark', `unknown role on ${id}: ${role}`);
      return {
        id,
        name,
        assetId,
        role,
        domains,
        tagSet: new Set(Object.values(domains).flat()),
      };
    });
}

function parseTasks() {
  return tasksSource.split(/\r?\n/)
    .filter((line) => /^\s*\{ id: '[^']+', label:/.test(line))
    .map((line) => {
      const id = line.match(/id: '([^']+)'/)?.[1];
      const label = line.match(/label: '([^']+)'/)?.[1];
      const targetCount = Number(line.match(/targetCount: (\d+)/)?.[1]);
      assert(id && label && Number.isInteger(targetCount) && targetCount > 0, `malformed task: ${line}`);
      const allOf = quotedArray(line, 'allOf');
      const anyOf = quotedArray(line, 'anyOf');
      const noneOf = quotedArray(line, 'noneOf');
      assert(allOf.length || anyOf.length, `task ${id} needs allOf or anyOf`);
      for (const tag of [...allOf, ...anyOf, ...noneOf]) {
        assert(allTags.has(tag), `unknown task tag on ${id}: ${tag}`);
      }
      return { id, label, targetCount, allOf, anyOf, noneOf };
    });
}

function matchesTask(item, task) {
  return task.allOf.every((tag) => item.tagSet.has(tag))
    && (!task.anyOf.length || task.anyOf.some((tag) => item.tagSet.has(tag)))
    && !task.noneOf.some((tag) => item.tagSet.has(tag));
}

const items = parseItems();
const tasks = parseTasks();
const itemIds = items.map((item) => item.id);
const itemNames = items.map((item) => item.name);
const manifestIds = manifest.map((entry) => entry.id);
const manifestFiles = manifest.map((entry) => entry.file);

assert(items.length === 123, `expected 123 item definitions, got ${items.length}`);
assert(manifest.length === 123, `expected 123 generated sprites, got ${manifest.length}`);
assert(new Set(itemIds).size === itemIds.length, 'item ids must be unique');
assert(new Set(itemNames).size === itemNames.length, 'item names must be unique');
assert(new Set(manifestIds).size === manifestIds.length, 'manifest ids must be unique');
assert(new Set(manifestFiles).size === manifestFiles.length, 'manifest files must be unique');
assert(items.every((item) => item.assetId === item.id), 'item id and asset id must match');
assert(itemIds.every((id) => manifestIds.includes(id)), 'every item needs a generated sprite');
assert(manifestIds.every((id) => itemIds.includes(id)), 'every sprite needs an item definition');
assert(items.filter((item) => item.role === 'landmark').length === 9, 'expected 9 landmarks');

const warmUiAssets = {
  'round-button-warm-v1.png': [507, 512],
  'level-plaque-warm-v1.png': [1200, 240],
  'mission-frame-warm-v1.png': [1600, 307],
};
for (const [name, [expectedWidth, expectedHeight]] of Object.entries(warmUiAssets)) {
  const file = path.join(root, 'public', 'ui', 'qingya', name);
  assert(fs.existsSync(file), `missing warm UI asset: ${name}`);
  const { width, height } = pngSize(file);
  assert(
    width === expectedWidth && height === expectedHeight,
    `${name} should be ${expectedWidth}x${expectedHeight}, got ${width}x${height}`,
  );
}
const packingFactor = Number(
  sceneSource.match(/PACKING_FOOTPRINT_FACTOR\s*=\s*([\d.]+)/)?.[1],
);
assert(
  Number.isFinite(packingFactor) && packingFactor >= 1,
  'scene packing footprint must cover the complete visible item bounds',
);

const spriteHashes = new Map();
for (const entry of manifest) {
  const file = path.join(root, 'public', entry.file.replace(/^\//, ''));
  assert(fs.existsSync(file), `missing sprite: ${entry.file}`);
  const bytes = fs.readFileSync(file);
  assert(bytes.length === entry.bytes, `manifest byte count is stale: ${entry.file}`);
  assert(bytes.length <= 100 * 1024, `sprite exceeds 100 KiB: ${entry.file}`);
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  const duplicate = spriteHashes.get(digest);
  assert(!duplicate, `duplicate sprite content: ${duplicate} and ${entry.file}`);
  spriteHashes.set(digest, entry.file);
}

for (const [tag, expected] of Object.entries(expectedCategoryCounts)) {
  const actual = items.filter((item) => item.domains.tags.includes(tag)).length;
  assert(actual === expected, `${tag} should tag ${expected} items, got ${actual}`);
}
for (const [tag, expected] of Object.entries(expectedObjectCounts)) {
  const actual = items.filter((item) => item.domains.objectTags.includes(tag)).length;
  assert(actual === expected, `${tag} should tag ${expected} items, got ${actual}`);
}

assert(tasks.length >= 20, `expected a reusable task library, got ${tasks.length} tasks`);
assert(new Set(tasks.map((task) => task.id)).size === tasks.length, 'task ids must be unique');
for (const task of tasks) {
  const candidateCount = items.filter((item) => matchesTask(item, task)).length;
  const distractorCount = items.length - candidateCount;
  assert(candidateCount >= task.targetCount, `${task.id} needs ${task.targetCount} candidates, got ${candidateCount}`);
  assert(distractorCount > 0, `${task.id} has no distractor pool`);
}

assert(levelLines.length === 101, `expected header + 100 levels, got ${levelLines.length}`);
const header = levelLines[0].split(',');
const categoryIndex = header.indexOf('category');
const taskIdsIndex = header.indexOf('taskIds');
const targetCountsIndex = header.indexOf('targetCounts');
const timeLimitIndex = header.indexOf('timeLimitSec');
const star3Index = header.indexOf('star3');
assert(categoryIndex >= 0, 'level table is missing category column');
assert(taskIdsIndex >= 0, 'level table is missing taskIds column');
assert(targetCountsIndex >= 0 && timeLimitIndex >= 0 && star3Index >= 0, 'level table is missing score columns');
const levelCategoryCounts = Object.fromEntries(tagDomains.tags.map((id) => [id, 0]));
const knownTaskIds = new Set(tasks.map((task) => task.id));
const taskById = new Map(tasks.map((task) => [task.id, task]));
let combinationLevelCount = 0;
let multiTargetLevelCount = 0;
for (const line of levelLines.slice(1)) {
  const values = line.split(',');
  const category = values[categoryIndex];
  const taskIds = (values[taskIdsIndex] ?? '').split('|').filter(Boolean);
  const targetCounts = (values[targetCountsIndex] ?? '').split('|').map(Number);
  const levelTargetCount = targetCounts.reduce((sum, count) => sum + count, 0);
  const timeLimit = Number(values[timeLimitIndex]);
  const star3 = Number(values[star3Index]);
  assert(category in levelCategoryCounts, `unknown level category: ${category}`);
  assert(taskIds.length >= 1 && taskIds.length <= 3, `each level needs 1-3 task ids: ${line}`);
  assert(taskIds.length === targetCounts.length, `task/count mismatch: ${line}`);
  assert(targetCounts.every((count) => Number.isInteger(count) && count > 0), `invalid target counts: ${line}`);
  assert(taskIds.every((taskId) => knownTaskIds.has(taskId)), `unknown level task id: ${taskIds.join('|')}`);
  for (let left = 0; left < taskIds.length; left += 1) {
    for (let right = left + 1; right < taskIds.length; right += 1) {
      const leftTask = taskById.get(taskIds[left]);
      const rightTask = taskById.get(taskIds[right]);
      const overlap = items.filter((item) => matchesTask(item, leftTask) && matchesTask(item, rightTask));
      assert(
        overlap.length === 0,
        `level goals ${taskIds[left]} and ${taskIds[right]} overlap on ${overlap.map((item) => item.id).join('|')}`,
      );
    }
  }
  const usedItemIds = new Set();
  for (let index = 0; index < taskIds.length; index += 1) {
    const taskId = taskIds[index];
    const requested = targetCounts[index];
    const task = taskById.get(taskId);
    const candidates = items.filter((item) => !usedItemIds.has(item.id) && matchesTask(item, task));
    assert(requested <= candidates.length, `${taskId} level requests ${requested} unique targets, pool has ${candidates.length}`);
    candidates.slice(0, requested).forEach((item) => usedItemIds.add(item.id));
    if (task.anyOf.length || task.noneOf.length || task.allOf.length > 1) combinationLevelCount += 1;
  }
  const theoreticalMax = Array.from({ length: levelTargetCount }, (_, index) => {
    const remaining = Math.max(0, timeLimit - index * 0.4);
    const combo = Math.min(index + 1, 10);
    return remaining * (1 + 0.1 * (combo - 1));
  }).reduce((sum, value) => sum + value, 0);
  assert(star3 <= theoreticalMax, `${taskIds.join('|')} has impossible 3-star line ${star3} > ${theoreticalMax.toFixed(1)}`);
  if (taskIds.length > 1) multiTargetLevelCount += 1;
  levelCategoryCounts[category] += 1;
}
for (const category of tagDomains.tags) {
  assert(levelCategoryCounts[category] === 10, `${category} should appear in 10 legacy levels`);
}
assert(combinationLevelCount >= 40, `expected at least 40 combination levels, got ${combinationLevelCount}`);
assert(multiTargetLevelCount >= 90, `expected at least 90 multi-target levels, got ${multiTargetLevelCount}`);

const totalBytes = manifest.reduce((sum, entry) => sum + entry.bytes, 0);
console.log(
  `content ok: ${items.length} unique items, ${tasks.length} task rules, `
  + `100 levels (${multiTargetLevelCount} multi-target, ${combinationLevelCount} compound goals), `
  + `${(totalBytes / 1024 / 1024).toFixed(2)} MiB`,
);
