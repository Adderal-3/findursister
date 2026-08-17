#!/usr/bin/env node
'use strict';
/*
 * ⚠️ VENDORED 文件 — 请勿随意手改
 * 来源：.claude/skills/datahub-table-designer/datahub-table-designer/scripts/validate.js
 * 同步时间：2026-07-07
 * 说明：datahub-table-designer 由服务端团队维护，本文件是其校验器的自有副本。
 *       与 IndexMatchChecker 语义等价，用于公共表设计阶段的索引覆盖硬门禁。
 *       外部规则若更新，需人工比对同步。
 *
 * datahub-table-designer 校验器（零依赖）
 * 用法: node validate.cjs <table-config.json> [queries.json]
 *
 * 两类检查：
 *  1. 结构校验：fieldKey/tableKey 格式、fieldType 枚举、fieldMeta↔type 匹配、ENUM 必有 enumRules、
 *     索引字段引用存在、direction 合法、字段/索引数量上限、内置字段不被用户重复声明。
 *  2. 索引覆盖校验：对 queries.json 每条查询，用 IndexMatchChecker 等价算法判断是否命中某索引；
 *     命中报命中哪个+是否全eq覆盖(可走缓存)，未命中报错并列失败原因。
 *
 * 退出码：0=全绿；1=有错误。
 */

const fs = require('fs');
const path = require('path');

// ---------- 常量 ----------
const TABLE_KEY_RE = /^[a-zA-Z0-9_-]{1,64}$/;
const FIELD_KEY_RE = /^[a-zA-Z0-9_]{1,64}$/;
const FIELD_TYPES = ['STRING', 'NUMBER', 'BOOLEAN', 'NULL', 'STRING_LIST', 'NUMBER_LIST', 'BOOLEAN_LIST', 'ENUM'];
const DIRECTIONS = ['ASC', 'DESC'];
const OPS = ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in'];
const BUILTIN_FIELDS = {
  '__create_time': 'NUMBER',
  '__update_time': 'NUMBER',
  '__delete_time': 'NUMBER',
  '__create_uid': 'STRING',
  '__delete_uid': 'STRING',
  '__under_review': 'BOOLEAN',
};
const MAX_FIELDS = 64;
const MAX_INDEXES = 32;
const MAX_PAGE_SIZE = 50;
const MAX_OFFSET = 50000;

// 类型 -> 允许的 fieldMeta 子规则 key
const TYPE_RULE_MAP = {
  STRING: ['stringRules'],
  NUMBER: ['numberRules'],
  BOOLEAN: [],
  NULL: [],
  STRING_LIST: ['listRules'],
  NUMBER_LIST: ['listRules'],
  BOOLEAN_LIST: ['listRules'],
  ENUM: ['enumRules'],
};
const ALL_RULE_KEYS = ['stringRules', 'numberRules', 'listRules', 'enumRules', 'booleanRules'];

// ---------- 工具 ----------
let errors = [];
let warnings = [];
let infos = [];

function err(msg) { errors.push(msg); }
function warn(msg) { warnings.push(msg); }
function info(msg) { infos.push(msg); }

function isObj(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }

function readJson(p) {
  if (!p) return null;
  const raw = fs.readFileSync(p, 'utf8');
  try { return JSON.parse(raw); }
  catch (e) { throw new Error(`无法解析 JSON: ${p}\n${e.message}`); }
}

// ---------- 结构校验 ----------
function validateTable(tbl, idx) {
  const prefix = `表#${idx}`;
  if (!isObj(tbl)) { err(`${prefix}: 不是对象`); return null; }

  const tableKey = tbl.tableKey;
  if (typeof tableKey !== 'string' || !TABLE_KEY_RE.test(tableKey)) {
    err(`${prefix}: tableKey "${tableKey}" 不合法，需匹配 ${TABLE_KEY_RE}`);
  }

  if (typeof tbl.displayName !== 'string' || tbl.displayName.length < 1 || tbl.displayName.length > 64) {
    err(`${prefix} (${tableKey}): displayName 必填且 1-64 字符`);
  }
  if (tbl.description != null && (typeof tbl.description !== 'string' || tbl.description.length > 512)) {
    err(`${prefix} (${tableKey}): description 需为字符串且 ≤512 字符`);
  }

  for (const k of ['creatorOnlyRead', 'creatorOnlyModify', 'creatorOnlyDelete']) {
    if (tbl[k] != null && typeof tbl[k] !== 'boolean') {
      err(`${prefix} (${tableKey}): ${k} 需为 boolean`);
    }
  }

  // fields
  const fields = tbl.fields;
  if (!Array.isArray(fields) || fields.length < 1) {
    err(`${prefix} (${tableKey}): fields 至少 1 个`);
    return { tableKey, fieldTypes: {}, userFieldKeys: new Set(), indexes: [] };
  }
  if (fields.length > MAX_FIELDS) {
    err(`${prefix} (${tableKey}): fields 超过 ${MAX_FIELDS}`);
  }

  const fieldTypes = {};      // fieldKey -> fieldType（含内置）
  const userFieldKeys = new Set();
  for (const [fk, ft] of Object.entries(BUILTIN_FIELDS)) fieldTypes[fk] = ft;

  const seenFieldKeys = new Set();
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const fp = `${prefix} (${tableKey}) field#${i}`;
    if (!isObj(f)) { err(`${fp}: 不是对象`); continue; }

    const fk = f.fieldKey;
    if (typeof fk !== 'string' || !FIELD_KEY_RE.test(fk)) {
      err(`${fp}: fieldKey "${fk}" 不合法，需匹配 ${FIELD_KEY_RE}`);
    } else if (fk.startsWith('__')) {
      err(`${fp}: fieldKey "${fk}" 不能以 __ 开头（系统保留），内置字段由系统自动加，不要声明`);
    } else if (seenFieldKeys.has(fk)) {
      err(`${fp}: fieldKey "${fk}" 重复`);
    } else {
      seenFieldKeys.add(fk);
      userFieldKeys.add(fk);
    }

    const ft = f.fieldType;
    if (!FIELD_TYPES.includes(ft)) {
      err(`${fp}: fieldType "${ft}" 不是合法枚举 (${FIELD_TYPES.join('/')})`);
    } else {
      fieldTypes[fk] = ft;
    }

    if (typeof f.fieldDisplayName !== 'string' || f.fieldDisplayName.length < 1 || f.fieldDisplayName.length > 64) {
      err(`${fp}: fieldDisplayName 必填且 1-64 字符`);
    }
    if (f.nullable != null && typeof f.nullable !== 'boolean') {
      err(`${fp}: nullable 需为 boolean`);
    }

    // fieldMeta ↔ type 匹配
    validateFieldMeta(f, ft, fp);
  }

  // indexes
  const indexes = Array.isArray(tbl.indexes) ? tbl.indexes : [];
  if (tbl.indexes != null && !Array.isArray(indexes)) {
    err(`${prefix} (${tableKey}): indexes 需为数组`);
  }
  if (indexes.length > MAX_INDEXES) {
    err(`${prefix} (${tableKey}): indexes 超过 ${MAX_INDEXES}`);
  }

  const validatedIndexes = [];
  const indexSigs = new Set();
  for (let i = 0; i < indexes.length; i++) {
    const ix = indexes[i];
    const ip = `${prefix} (${tableKey}) index#${i}`;
    if (!isObj(ix)) { err(`${ip}: 不是对象`); continue; }
    const ixFlds = ix.fields;
    if (!Array.isArray(ixFlds) || ixFlds.length < 1) {
      err(`${ip}: fields 至少 1 个`); continue;
    }
    const fieldsOk = [];
    let bad = false;
    for (let j = 0; j < ixFlds.length; j++) {
      const ifd = ixFlds[j];
      const jp = `${ip} field#${j}`;
      if (!isObj(ifd)) { err(`${jp}: 不是对象`); bad = true; continue; }
      const ifk = ifd.fieldKey;
      if (typeof ifk !== 'string' || !(ifk in fieldTypes)) {
        err(`${jp}: fieldKey "${ifk}" 未在表字段(含内置)中定义`); bad = true;
      }
      const dir = ifd.direction;
      if (!DIRECTIONS.includes(dir)) {
        err(`${jp}: direction "${dir}" 需为 ASC/DESC`); bad = true;
      }
      fieldsOk.push({ fieldKey: ifk, direction: dir });
    }
    if (bad) continue;

    if (ix.unique != null && typeof ix.unique !== 'boolean') {
      err(`${ip}: unique 需为 boolean`);
    }
    // 注意：__delete_time 由 DDL 自动追加，不参与用户索引签名去重判断
    const sig = fieldsOk.map(f => `${f.fieldKey}:${f.direction}`).join('|') + (ix.unique ? '|u' : '');
    if (indexSigs.has(sig)) {
      err(`${ip}: 与已有索引字段组合完全重复`);
    } else {
      indexSigs.add(sig);
    }
    validatedIndexes.push({ fields: fieldsOk, unique: !!ix.unique, description: ix.description, _label: `index#${i}` });
  }

  if (!tbl.description) {
    warn(`${prefix} (${tableKey}): 缺 description，强烈建议写清存什么+查询场景，便于维护`);
  }
  return { tableKey, fieldTypes, userFieldKeys, indexes: validatedIndexes };
}

function validateFieldMeta(f, ft, fp) {
  const meta = f.fieldMeta;
  if (meta == null) {
    if (ft === 'ENUM') {
      err(`${fp}: ENUM 字段必须提供 fieldMeta.enumRules(enabled=true 且 allowedValues 非空)`);
    }
    return;
  }
  if (!isObj(meta)) { err(`${fp}: fieldMeta 需为对象`); return; }

  // 允许的规则 key
  const allowed = TYPE_RULE_MAP[ft] || [];
  for (const k of ALL_RULE_KEYS) {
    if (k in meta && !allowed.includes(k)) {
      err(`${fp}: fieldType=${ft} 不允许出现 ${k}`);
    }
  }

  if (ft === 'STRING' && meta.stringRules) {
    checkStringRules(meta.stringRules, fp);
  }
  if (ft === 'NUMBER' && meta.numberRules) {
    checkNumberRules(meta.numberRules, fp);
  }
  if ((ft === 'STRING_LIST' || ft === 'NUMBER_LIST' || ft === 'BOOLEAN_LIST') && meta.listRules) {
    checkListRules(meta.listRules, fp, ft);
  }
  if (ft === 'ENUM' && meta.enumRules) {
    const er = meta.enumRules;
    if (er.enabled !== true) err(`${fp}: ENUM 的 enumRules.enabled 必须 true`);
    if (!Array.isArray(er.allowedValues) || er.allowedValues.length === 0) {
      err(`${fp}: ENUM 的 allowedValues 必须非空数组`);
    }
  }
}

function checkStringRules(r, fp) {
  if (!isObj(r)) { err(`${fp}: stringRules 需为对象`); return; }
  if (r.enabled != null && typeof r.enabled !== 'boolean') err(`${fp}: stringRules.enabled 需为 boolean`);
  if (r.minLength != null && (typeof r.minLength !== 'number' || r.minLength < 0)) err(`${fp}: stringRules.minLength 需为非负数`);
  if (r.maxLength != null && (typeof r.maxLength !== 'number' || r.maxLength < 0)) err(`${fp}: stringRules.maxLength 需为非负数`);
  if (r.minLength != null && r.maxLength != null && r.minLength > r.maxLength) err(`${fp}: stringRules minLength>maxLength`);
  if (r.sensitiveWordFilter != null && typeof r.sensitiveWordFilter !== 'boolean') err(`${fp}: stringRules.sensitiveWordFilter 需为 boolean`);
  if (r.pattern != null && typeof r.pattern !== 'string') err(`${fp}: stringRules.pattern 需为字符串(Java正则)`);
}

function checkNumberRules(r, fp) {
  if (!isObj(r)) { err(`${fp}: numberRules 需为对象`); return; }
  if (r.enabled != null && typeof r.enabled !== 'boolean') err(`${fp}: numberRules.enabled 需为 boolean`);
  if (r.min != null && typeof r.min !== 'number') err(`${fp}: numberRules.min 需为数值`);
  if (r.max != null && typeof r.max !== 'number') err(`${fp}: numberRules.max 需为数值`);
  if (r.min != null && r.max != null && r.min > r.max) err(`${fp}: numberRules min>max`);
  if (r.step != null && typeof r.step !== 'number') err(`${fp}: numberRules.step 需为数值`);
}

function checkListRules(r, fp, ft) {
  if (!isObj(r)) { err(`${fp}: listRules 需为对象`); return; }
  if (r.enabled != null && typeof r.enabled !== 'boolean') err(`${fp}: listRules.enabled 需为 boolean`);
  if (r.minItems != null && (typeof r.minItems !== 'number' || r.minItems < 0)) err(`${fp}: listRules.minItems 需为非负整数`);
  if (r.maxItems != null && (typeof r.maxItems !== 'number' || r.maxItems < 0)) err(`${fp}: listRules.maxItems 需为非负整数`);
  if (r.uniqueItems != null && typeof r.uniqueItems !== 'boolean') err(`${fp}: listRules.uniqueItems 需为 boolean`);
  // 子项规则可选，不强制
}

// ---------- IndexMatchChecker 等价实现 ----------
function classifyConditions(conditions) {
  const sEq = new Set(), sRange = new Set(), sIn = new Set(), sNe = new Set();
  if (!Array.isArray(conditions)) return { sEq, sRange, sIn, sNe, bad: false };
  for (const c of conditions) {
    if (!isObj(c) || typeof c.fieldKey !== 'string' || typeof c.op !== 'string') {
      return { sEq, sRange, sIn, sNe, bad: true };
    }
    const op = c.op;
    if (!OPS.includes(op)) return { sEq, sRange, sIn, sNe, bad: true };
    if (op === 'eq') sEq.add(c.fieldKey);
    else if (op === 'ne') sNe.add(c.fieldKey);
    else if (op === 'in') sIn.add(c.fieldKey);
    else sRange.add(c.fieldKey); // gt/lt/gte/lte
  }
  return { sEq, sRange, sIn, sNe, bad: false };
}

// 复刻 matchesOneIndex；返回 {match:boolean, reason:string}
function matchesOneIndex(conditions, sorts, index) {
  const { sEq, sRange, sIn, sNe, bad } = classifyConditions(conditions);
  if (bad) return { match: false, reason: '条件非法(fieldKey/op 缺失或 op 未知)' };

  const indexFields = index.fields;
  if (!indexFields || indexFields.length === 0) return { match: false, reason: '索引无字段' };

  // Rule0: ne 永远不走索引
  if (sNe.size > 0) return { match: false, reason: `含 ne 操作符(字段: ${[...sNe].join(',')}),ne 不走索引前缀` };

  // Rule5: filter+sort 全空 => 全表扫描
  const filterEmpty = !conditions || conditions.length === 0;
  const sortEmpty = !sorts || sorts.length === 0;
  if (filterEmpty && sortEmpty) return { match: false, reason: 'filter+sort 全空,属全表扫描' };

  // Rule1: eq 前缀
  let k = 0;
  for (const f of indexFields) {
    if (sEq.has(f.fieldKey)) k++;
    else break;
  }
  const prefixEq = new Set();
  for (let i = 0; i < k; i++) prefixEq.add(indexFields[i].fieldKey);
  for (const eqField of sEq) {
    if (!prefixEq.has(eqField)) {
      return { match: false, reason: `eq 字段 ${eqField} 不在索引前缀(前 ${k} 位)内,前缀断裂` };
    }
  }

  // Rule2: 单区间位
  const intervalFields = new Set([...sRange, ...sIn]);
  let intervalConsumed = false;
  if (intervalFields.size > 0) {
    if (intervalFields.size > 1) {
      return { match: false, reason: `多个区间字段(${[...intervalFields].join(',')}),双区间不走索引` };
    }
    if (k >= indexFields.length) {
      return { match: false, reason: '索引长度不足以容纳区间位' };
    }
    const intervalField = [...intervalFields][0];
    if (intervalField !== indexFields[k].fieldKey) {
      return { match: false, reason: `区间字段 ${intervalField} 未紧接 eq 前缀(应在位置 ${k+1}=${indexFields[k].fieldKey})` };
    }
    intervalConsumed = true;
  }

  // Rule3: sort 后缀
  const sortStartIdx = intervalConsumed ? k + 1 : k;
  const effectiveSorts = [];
  if (Array.isArray(sorts)) {
    for (const si of sorts) {
      if (!isObj(si) || typeof si.fieldKey !== 'string' || typeof si.direction !== 'string') {
        return { match: false, reason: '排序项 fieldKey/direction 非法' };
      }
      if (sEq.has(si.fieldKey)) continue; // eq 字段排序冗余,剔除
      effectiveSorts.push(si);
    }
  }
  if (effectiveSorts.length > 0) {
    if (sortStartIdx + effectiveSorts.length > indexFields.length) {
      return { match: false, reason: `索引剩余长度不足(需 ${effectiveSorts.length} 位,从 ${sortStartIdx} 起仅剩 ${indexFields.length - sortStartIdx})` };
    }
    let allForward = true, allReversed = true;
    for (let i = 0; i < effectiveSorts.length; i++) {
      const si = effectiveSorts[i];
      const idxField = indexFields[sortStartIdx + i];
      if (si.fieldKey !== idxField.fieldKey) {
        return { match: false, reason: `排序字段 ${si.fieldKey} 与索引位置 ${sortStartIdx + i + 1}(${idxField.fieldKey}) 不匹配` };
      }
      const sortAsc = si.direction === 'ASC';
      const idxAsc = idxField.direction === 'ASC';
      if (sortAsc === idxAsc) allReversed = false;
      else allForward = false;
    }
    if (!allForward && !allReversed) {
      return { match: false, reason: '排序方向与索引方向混合(需全同向或全反向)' };
    }
  }
  return { match: true, reason: '' };
}

// 全 eq 覆盖判断(决定是否走缓存)
function isFullEqCovered(conditions, index) {
  if (!Array.isArray(conditions)) return false;
  const eqByField = new Set();
  for (const c of conditions) {
    if (!isObj(c) || typeof c.op !== 'string') return false;
    if (c.op !== 'eq') return false; // 含任何非 eq
    eqByField.add(c.fieldKey);
  }
  const indexFields = index.fields;
  for (const f of indexFields) {
    if (!eqByField.has(f.fieldKey)) return false; // 索引某字段未被 eq 覆盖
  }
  if (eqByField.size !== indexFields.length) return false; // 多余 eq 字段
  return true;
}

// 对一条查询,遍历所有索引找命中
function matchQuery(conditions, sorts, indexes) {
  let firstPassed = null;
  // 全不命中时,收集每个索引的失败原因,挑信息量最大的报给用户(优先 rule0/rule5 这类"查询本身有问题"的原因)
  const failReasons = [];
  for (const ix of indexes) {
    const r = matchesOneIndex(conditions, sorts, ix);
    if (r.match) {
      if (!firstPassed) firstPassed = ix;
      if (isFullEqCovered(conditions, ix)) {
        return { matched: ix, fullEq: true, reason: '全eq覆盖(走缓存)' };
      }
    } else if (r.reason) {
      failReasons.push(`[${ix._label} ${ix.fields.map(f => f.fieldKey + ':' + f.direction).join(',')}] ${r.reason}`);
    }
  }
  if (firstPassed) return { matched: firstPassed, fullEq: false, reason: '命中但非全eq(穿透Mongo)' };
  if (failReasons.length === 0) return { matched: null, fullEq: false, reason: '表无索引' };
  // 优先级:ne/全表扫描这类"查询本身的问题"排前;否则取第一个
  const selfProblem = failReasons.find(r => r.includes('ne') || r.includes('全表扫描') || r.includes('双区间'));
  return { matched: null, fullEq: false, reason: (selfProblem || failReasons[0]) + ` (共试 ${failReasons.length} 个索引均失败)` };
}

// ---------- 查询覆盖校验 ----------
function validateQueries(queriesArr, tables) {
  if (!queriesArr) return;
  if (!Array.isArray(queriesArr)) { err('queries.json 顶层需为数组'); return; }
  const byKey = new Map(tables.filter(Boolean).map(t => [t.tableKey, t]));

  for (let i = 0; i < queriesArr.length; i++) {
    const q = queriesArr[i];
    const qp = `query#${i}`;
    if (!isObj(q) || typeof q.tableKey !== 'string') { err(`${qp}: 需含 tableKey`); continue; }
    const tbl = byKey.get(q.tableKey);
    if (!tbl) { err(`${qp}: tableKey "${q.tableKey}" 在配置中不存在`); continue; }

    const queries = Array.isArray(q.queries) ? q.queries : [];
    if (queries.length === 0) { warn(`${qp} (${q.tableKey}): 无查询场景,索引覆盖无法验证`); continue; }

    for (let j = 0; j < queries.length; j++) {
      const item = queries[j];
      const ip = `${qp} (${q.tableKey}) query"${item.name || j}"`;
      const conditions = item.conditions || [];
      const sorts = item.sorts || [];
      const limit = item.limit;
      const page = item.page, pageSize = item.pageSize;

      // 校验查询自身合法性
      if (Array.isArray(conditions)) {
        for (const c of conditions) {
          if (!isObj(c) || typeof c.fieldKey !== 'string' || !OPS.includes(c.op)) {
            err(`${ip}: 条件非法 ${JSON.stringify(c)}`);
          } else if (!(c.fieldKey in tbl.fieldTypes)) {
            err(`${ip}: 条件字段 ${c.fieldKey} 不存在于表 ${q.tableKey}`);
          }
        }
      }
      if (Array.isArray(sorts)) {
        for (const s of sorts) {
          if (!isObj(s) || typeof s.fieldKey !== 'string' || !DIRECTIONS.includes(s.direction)) {
            err(`${ip}: 排序项非法 ${JSON.stringify(s)}`);
          } else if (!(s.fieldKey in tbl.fieldTypes)) {
            err(`${ip}: 排序字段 ${s.fieldKey} 不存在于表 ${q.tableKey}`);
          }
        }
      }
      // 运行时约束
      if (limit != null && (typeof limit !== 'number' || limit < 1 || limit > 50)) {
        err(`${ip}: limit 需在 1-50`);
      }
      if (page != null || pageSize != null) {
        const p = page || 1, ps = pageSize || 20;
        if (p < 1 || p > 1000) err(`${ip}: page 需 1-1000`);
        if (ps < 1 || ps > MAX_PAGE_SIZE) err(`${ip}: pageSize 需 1-${MAX_PAGE_SIZE}`);
        if (p * ps > MAX_OFFSET) err(`${ip}: page×pageSize=${p * ps} 超过 ${MAX_OFFSET}(深分页上限)`);
      }

      // 索引命中
      const res = matchQuery(conditions, sorts, tbl.indexes);
      if (res.matched) {
        info(`${ip}: ✅ 命中 ${res.matched._label} [${res.matched.fields.map(f => f.fieldKey + ':' + f.direction).join(', ')}]${res.matched.unique ? ' (unique)' : ''} — ${res.reason}`);
      } else {
        err(`${ip}: ❌ 未命中任何索引 — ${res.reason}`);
      }
    }
  }
}

// ---------- 主 ----------
function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('用法: node validate.cjs <table-config.json> [queries.json]');
    process.exit(2);
  }
  const cfgPath = args[0];
  const qPath = args[1];

  let cfg, queries = null;
  try { cfg = readJson(cfgPath); }
  catch (e) { console.error(e.message); process.exit(1); }
  if (qPath) {
    try { queries = readJson(qPath); }
    catch (e) { console.error(e.message); process.exit(1); }
  }

  if (!Array.isArray(cfg)) {
    err('table-config 顶层需为 JSON 数组(每元素一张表)');
    printAndExit();
    return;
  }

  const tables = [];
  const seenKeys = new Set();
  for (let i = 0; i < cfg.length; i++) {
    const t = validateTable(cfg[i], i);
    if (t) {
      if (seenKeys.has(t.tableKey)) err(`表#${i}: tableKey "${t.tableKey}" 重复`);
      else seenKeys.add(t.tableKey);
      tables.push(t);
    }
  }

  if (queries) validateQueries(queries, tables);

  printAndExit();
}

function printAndExit() {
  // 摘要
  const pass = errors.length === 0;
  console.log('===== datahub-table-designer 校验结果 =====');
  if (infos.length) {
    console.log('\n--- 索引覆盖(查询命中) ---');
    infos.forEach(m => console.log('  ' + m));
  }
  if (warnings.length) {
    console.log('\n--- 警告 ---');
    warnings.forEach(m => console.log('  ⚠ ' + m));
  }
  if (errors.length) {
    console.log('\n--- 错误 ---');
    errors.forEach(m => console.log('  ✗ ' + m));
  }
  console.log('\n===== ' + (pass ? '✅ 全部通过' : `❌ ${errors.length} 个错误`) + ' =====');
  process.exit(pass ? 0 : 1);
}

main();
