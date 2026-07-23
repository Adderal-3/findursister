import fs from 'node:fs';
import { generateScene } from '../src/game/scene';
import { categoryTaskRule, getTaskRule } from '../src/game/tasks';
import type { CategoryId } from '../src/game/types';

const csv = fs.readFileSync(new URL('../数值表_src/levels_100.csv', import.meta.url), 'utf8').trim();
const [headerLine, ...lines] = csv.split(/\r?\n/);
const headers = headerLine.split(',');

let generated = 0;
let maxSkippedDistractors = 0;
for (const line of lines) {
  const values = line.split(',');
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  const targetCount = Number(row.targetCount);
  const distractors = Number(row.distractors);
  const rule = row.taskId
    ? getTaskRule(row.taskId, targetCount)
    : categoryTaskRule(row.category as CategoryId, targetCount);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    let scene;
    try {
      scene = generateScene({ rule, distractors });
    } catch (error) {
      throw new Error(`level ${row.level}, attempt ${attempt + 1}: ${String(error)}`);
    }
    if (scene.targets[0]?.total !== targetCount) {
      throw new Error(`level ${row.level} expected ${targetCount} targets, got ${scene.targets[0]?.total}`);
    }
    maxSkippedDistractors = Math.max(maxSkippedDistractors, targetCount + distractors - scene.items.length);
    generated += 1;
  }
}

console.log(`scene stress ok: ${generated} formal scenes, max skipped distractors ${maxSkippedDistractors}`);
