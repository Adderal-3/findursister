/**
 * 生成机器可读 + 人工可读的「素材—题目—关卡」最终对应关系。
 * 运行前先执行 tools/regression/build-scene-bundle.mjs，保证使用当前源码。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = path.join(root, 'tools', 'regression', '.gen', 'scene-bundle.mjs');
const { ITEMS, TASK_RULES, itemMatchesTask } = await import(pathToFileURL(bundlePath).href);

const levelsPath = path.join(root, '数值表_src', 'levels_200.csv');
const [headerLine, ...levelLines] = fs.readFileSync(levelsPath, 'utf8').trim().split(/\r?\n/);
const headers = headerLine.split(',');
const levelRows = levelLines.map((line) => {
  const values = line.split(',');
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  const taskIds = row.taskIds.split('|').filter(Boolean);
  const targetCounts = row.targetCounts.split('|').map(Number);
  return {
    level: Number(row.level),
    chapter: Number(row.chapter),
    category: row.category,
    type: row.type,
    goals: taskIds.map((taskId, index) => ({ taskId, targetCount: targetCounts[index] })),
  };
});

const taskById = new Map(TASK_RULES.map((task) => [task.id, task]));
const taskPools = TASK_RULES.map((task) => {
  const items = ITEMS.filter((item) => !item.distractorOnly && itemMatchesTask(item, task));
  const levelGoals = levelRows.flatMap((level) => level.goals
    .filter((goal) => goal.taskId === task.id)
    .map((goal) => ({ level: level.level, targetCount: goal.targetCount })));
  const goalCounts = levelGoals.map((goal) => goal.targetCount);
  return {
    id: task.id,
    label: task.label,
    allOf: task.allOf ?? [],
    anyOf: task.anyOf ?? [],
    noneOf: task.noneOf ?? [],
    defaultTargetCount: task.targetCount,
    poolCount: items.length,
    itemIds: items.map((item) => item.id),
    itemNames: items.map((item) => item.name),
    levelUseCount: levelGoals.length,
    usedInLevels: levelGoals.map((goal) => goal.level),
    requestedTargetRange: goalCounts.length
      ? [Math.min(...goalCounts), Math.max(...goalCounts)]
      : null,
  };
});
const poolByTaskId = new Map(taskPools.map((task) => [task.id, task]));

const itemMappings = ITEMS.map((item) => {
  const tasks = taskPools.filter((task) => task.itemIds.includes(item.id));
  return {
    id: item.id,
    name: item.name,
    role: item.role ?? 'item',
    taskIds: tasks.map((task) => task.id),
    taskLabels: tasks.map((task) => task.label),
  };
});

const unknownTaskGoals = [];
const insufficientGoals = [];
const overlappingGoals = [];
for (const level of levelRows) {
  for (const goal of level.goals) {
    const pool = poolByTaskId.get(goal.taskId);
    if (!pool) {
      unknownTaskGoals.push({ level: level.level, taskId: goal.taskId });
    } else if (goal.targetCount > pool.poolCount) {
      insufficientGoals.push({
        level: level.level,
        taskId: goal.taskId,
        requested: goal.targetCount,
        poolCount: pool.poolCount,
      });
    }
  }
  for (let left = 0; left < level.goals.length; left += 1) {
    for (let right = left + 1; right < level.goals.length; right += 1) {
      const leftRule = taskById.get(level.goals[left].taskId);
      const rightRule = taskById.get(level.goals[right].taskId);
      if (!leftRule || !rightRule) continue;
      const overlap = ITEMS.filter((item) => (
        !item.distractorOnly
        && itemMatchesTask(item, leftRule)
        && itemMatchesTask(item, rightRule)
      ));
      if (overlap.length) {
        overlappingGoals.push({
          level: level.level,
          taskIds: [leftRule.id, rightRule.id],
          itemIds: overlap.map((item) => item.id),
          itemNames: overlap.map((item) => item.name),
        });
      }
    }
  }
}

const zeroTaskItems = itemMappings.filter((item) => item.taskIds.length === 0);
const semanticDecisions = [
  { item: '风火轮', decision: '计入「发光」与「载具/坐骑」', reason: '画面有明确火焰，玩家会自然判断为发光；为避免同一关双目标重叠，相关 16 关已将第三题由「载具」换为「穿戴物」。' },
  { item: '动物类题干', decision: '收紧为「动物伙伴」', reason: '当前 animal 池是坐骑、萌宠和灵兽，不含飞鸟与昆虫；收紧题干可以避免玩家把春燕、蝴蝶等自然动物误判为目标。' },
  { item: '木制桥类题干', decision: '明确包含桥梁、栈道和码头', reason: '匹配池包含浮木码头与荷塘栈道，题干已与玩家看到的建筑类型对齐。' },
  { item: '翠玉簪、花簪', decision: '保留「尖锐」', reason: '素材均有清晰长针，适合「尖锐但不是兵器」。' },
  { item: '羽毛', decision: '保留「会飞」', reason: '画面语义是飘飞羽毛，玩家把它归入会飞物品的预期较强。' },
  { item: '飞镖', decision: '不计入「会飞」', reason: '「会飞」按生灵、飞行载具或漂浮物理解；投掷武器只归入尖锐/兵器。' },
  { item: '题字琴架', decision: '不计入「乐器」', reason: '主体是刻字琴架，不是可演奏乐器；保留文字物品分类。' },
];

const audit = {
  generatedAt: new Date().toISOString(),
  summary: {
    itemCount: ITEMS.length,
    taskCount: TASK_RULES.length,
    levelCount: levelRows.length,
    zeroTaskItemCount: zeroTaskItems.length,
    unknownTaskGoalCount: unknownTaskGoals.length,
    insufficientGoalCount: insufficientGoals.length,
    overlappingGoalCount: overlappingGoals.length,
    pass: !unknownTaskGoals.length && !insufficientGoals.length && !overlappingGoals.length,
  },
  semanticDecisions,
  taskPools,
  itemMappings,
  levels: levelRows,
  findings: { unknownTaskGoals, insufficientGoals, overlappingGoals, zeroTaskItems },
};

const toolsDir = path.join(root, 'tools');
const docsDir = path.join(root, 'docs');
fs.mkdirSync(toolsDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(
  path.join(toolsDir, 'content-mapping-audit.json'),
  `${JSON.stringify(audit, null, 2)}\n`,
  'utf8',
);

const escCell = (value) => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const taskRows = taskPools.map((task) => {
  const range = task.requestedTargetRange
    ? `${task.requestedTargetRange[0]}–${task.requestedTargetRange[1]}`
    : '未用于关卡';
  return `| ${task.id} | ${escCell(task.label)} | ${task.poolCount} | ${task.levelUseCount} | ${range} | ${escCell(task.itemNames.join('、'))} |`;
}).join('\n');
const decisionRows = semanticDecisions.map((entry) => (
  `| ${entry.item} | ${entry.decision} | ${entry.reason} |`
)).join('\n');

const markdown = `# 素材—题目—关卡对应关系最终审查

## 最终结论

- 素材：${ITEMS.length} 件；题目规则：${TASK_RULES.length} 条；正式关卡：${levelRows.length} 关。
- 未知题目：${unknownTaskGoals.length}；目标池不足：${insufficientGoals.length}；同关题目语义重叠：${overlappingGoals.length}。
- 机器校验结论：**${audit.summary.pass ? '通过' : '未通过'}**。
- 带图片的完整双向对照见 [任务规则 ↔ 物品图片审核页](../tools/item-task-mapping.html)；机器可读数据见 [content-mapping-audit.json](../tools/content-mapping-audit.json)。

## 本次人工语义结论

| 素材 | 最终归类 | 原因 |
| --- | --- | --- |
${decisionRows}

## 30 条题目 → 最终素材池

“关卡使用次数”统计 200 关的每个目标阶段；“单次要求”来自关卡表，不等于素材池总数。

| 规则 ID | 玩家题目 | 素材池 | 关卡使用次数 | 单次要求 | 会判定为正确的素材 |
| --- | --- | ---: | ---: | --- | --- |
${taskRows}

## 不属于任何题目的素材

${zeroTaskItems.length
    ? zeroTaskItems.map((item) => `- ${item.name}（${item.id}）`).join('\n')
    : '- 无。123 件素材至少命中一条题目规则。'}

这些素材即便不命中某题，也仍可作为其他题目的干扰项；场景生成器会排除当前题目所有正确素材，避免“看起来答对却被当错”的同题干扰。

## 后续怎么修改

1. 改素材名称或分类：编辑 \`src/game/items.ts\` 中对应物件的 tags / objectTags / materialTags / visualTags。
2. 改题目文案、标签组合或默认数量：编辑 \`src/game/tasks.ts\`。
3. 改某一关出现哪些题、每题找几个：编辑 \`数值表_src/levels_200.csv\` 的 \`taskIds\` 与 \`targetCounts\`。
4. 修改后运行 \`npm run audit:content-mapping\`，再运行 \`npm run check\`。如果出现题目池不足或同关题目重叠，校验会直接失败并指出关卡、题目与冲突素材。
5. 图片式人工复核页会重新生成，届时可以继续逐项修改，不会把对应关系写死在 UI 中。
`;

fs.writeFileSync(path.join(docsDir, 'content-mapping-audit.md'), markdown, 'utf8');

console.log(
  `content mapping audit: ${audit.summary.pass ? 'PASS' : 'FAIL'}; `
  + `${ITEMS.length} items, ${TASK_RULES.length} tasks, ${levelRows.length} levels, `
  + `${overlappingGoals.length} overlaps`,
);
if (overlappingGoals.length) console.log(JSON.stringify(overlappingGoals, null, 2));
