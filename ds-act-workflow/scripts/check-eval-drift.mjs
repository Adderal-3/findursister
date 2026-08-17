#!/usr/bin/env node
// eval-drift 守卫：框架注入型 eval 的 expected_output 不得引用 src/ds.js。
// 背景：四层重构后 React/Vue 注入产物改用 hooks(src/hooks/) / composables(src/composables/)，
// 但 evals.json 的 expected_output 曾仍写"生成 src/ds.js"（eval 38/40 漂移）。
// Cocos / 纯 HTML 注入仍用 src/ds.js，不在此规则范围。
// 用法：node scripts/check-eval-drift.mjs [evals.json 路径]   非零退出 = 有漂移
import { readFileSync } from 'node:fs';

const path = process.argv[2] || 'evals/evals.json';
const data = JSON.parse(readFileSync(path, 'utf-8'));
const evals = Array.isArray(data) ? data : (data.evals || data.cases || data);

const INJECT = /接入|注入|生成\s*(src\/)?ds|新建|创建项目|从零|Cocos.*导出|帮我.*接入/i;

const violations = [];
for (const e of evals) {
  const id = e.id ?? e.eval_id;
  const prompt = String(e.prompt || '');
  const expected = String(e.expected_output || '');
  // 规则：React/Vue 注入型 eval 的 expected 不得含 src/ds.js（应用 hooks/composables）
  if (/(React|Vue)/i.test(prompt) && INJECT.test(prompt) && /src\/ds\.js/i.test(expected)) {
    violations.push({
      id,
      rule: 'React/Vue 注入 expected 引用了 src/ds.js（应为 src/hooks/ 或 src/composables/）',
      expected_head: expected.slice(0, 90).replace(/\s+/g, ' '),
    });
  }
}

if (violations.length) {
  console.error(`❌ eval-drift 检出 ${violations.length} 处违规：`);
  for (const v of violations) {
    console.error(`  - eval ${v.id}: ${v.rule}`);
    console.error(`    "${v.expected_head}..."`);
  }
  process.exit(1);
}
console.log(`✅ eval-drift 检查通过（${evals.length} eval，0 处 React/Vue 注入 src/ds.js 漂移）`);
