import fs from 'node:fs';
import { generateScene } from '../src/game/scene';
import { categoryTaskRule, getTaskRule } from '../src/game/tasks';
import type { CategoryId } from '../src/game/types';

const lines = fs.readFileSync('数值表_src/levels_100.csv', 'utf8').trim().split(/\r?\n/);
const headers = lines[0].split(',');
const rows = lines.slice(1).map((line) => {
  const values = line.split(',');
  return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
});

let minimumPlaced = Number.POSITIVE_INFINITY;
let maximumPlaced = 0;
let totalPlaced = 0;
let generated = 0;

for (const row of rows) {
  for (let trial = 0; trial < 6; trial += 1) {
    const targetCount = Number(row.targetCount);
    const rule = row.taskId
      ? getTaskRule(row.taskId, targetCount)
      : categoryTaskRule(row.category as CategoryId, targetCount);
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
  averagePlaced: Number((totalPlaced / generated).toFixed(2)),
}));
