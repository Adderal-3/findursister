## Context

当前 ds-act-skills 的审查流程（MODE 2: AUDIT）在检查 SDK-LOADER 块时，已验证 `dimension95/96/97` 是否引用了 `window.DA_SQUARE_ID / window.DA_GROUP_ID / window.DA_PROJECT_ID`，但未检测代码中是否对这些变量进行了赋值。

部署平台会在发布时自动注入这三个变量的值到 `window` 上。如果代码中存在 `window.DA_SQUARE_ID = "xxx"` 之类的赋值，会覆盖部署注入的值，导致 NS 日志维度数据异常。

## Goals / Non-Goals

**Goals:**
- 在审查流程中检测代码是否对 `window.DA_SQUARE_ID` / `window.DA_GROUP_ID` / `window.DA_PROJECT_ID` 进行赋值
- 发现赋值时标记为阻断项，要求用户必须删除
- 在审查报告中清晰展示检测结果

**Non-Goals:**
- 不检测 `var/let/const DA_SQUARE_ID` 等局部变量声明（它们不会影响 `window` 上的同名属性）
- 不修改注入模式（MODE 1）的流程
- 不修改部署模式（MODE 3）的流程

## Decisions

### 决策 1：匹配模式仅限 `window.DA_*=`

**选择：** 只匹配 `window\.DA_(SQUARE_ID|GROUP_ID|PROJECT_ID)\s*=` 模式

**理由：** `var DA_SQUARE_ID` / `let DA_SQUARE_ID` / `const DA_SQUARE_ID` 是独立变量，不会覆盖 `window.DA_SQUARE_ID`，无需检测。只有显式对 `window.DA_*` 赋值才会覆盖部署注入的值。

**备选方案：** 同时匹配局部变量声明 → 否决，因为会产生误报且无实际影响。

### 决策 2：检测位置放在步骤 4.5 全局业务代码扫描中

**选择：** 作为 4.5.1 新增子步骤，在全局业务代码扫描阶段执行

**理由：** 该检测需要扫描所有代码文件（不限于 DS 注入文件），与现有的重复逻辑检测和点击预检检查属于同一层级，放在步骤 4.5 最合适。

### 决策 3：严重级别为阻断项

**选择：** 发现赋值时标记为 ❌ 阻断项，必须删除

**理由：** 覆盖部署注入的值会导致 NS 日志 dimension95/96/97 数据异常，属于功能性问题，必须修复。

## Risks / Trade-offs

- [正则匹配可能遗漏间接赋值] → 如 `window["DA_SQUARE_ID"] = xxx` 等动态属性赋值，当前正则无法覆盖。但实际项目中极少出现这种写法，风险可接受。
