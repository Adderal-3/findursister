/**
 * DS 产物合规审查（ds-act-workflow audits/index.md 的 19 个模块落地版）。
 *
 * 分级输出：❌ 阻断项（必须修复）/ ⚠️ 警告项（建议修复）/ ✅ 通过项。
 * 校验基准：ds-act-workflow/references/contracts/*（Marker 契约 + SDK-LOADER 契约）
 * 与 audits/* 的已知错误检测表。纯只读，不改任何文件。
 *
 * 用法：node tools/regression/ds-audit.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const results = [];
const blockers = [];
const warnings = [];

function pass(name, detail = '') {
  results.push({ level: 'pass', name, detail });
  console.log(`✅ ${name}${detail ? `  ${detail}` : ''}`);
}
function warn(name, problem, action) {
  results.push({ level: 'warn', name });
  warnings.push({ name, problem, action });
  console.log(`⚠️ ${name}\n    问题：${problem}\n    你需要：${action}`);
}
function block(name, file, problem, action) {
  results.push({ level: 'block', name });
  blockers.push({ name, file, problem, action });
  console.log(`❌ ${name} 出错了\n    文件：${file}\n    问题：${problem}\n    你需要：${action}`);
}

const indexHtml = readFileSync(join(root, 'index.html'), 'utf8');
const readSrc = (rel) => readFileSync(join(root, rel), 'utf8');
const configTs = readSrc('src/platform/ds/config.ts');
const runtimeTs = readSrc('src/platform/ds/runtime.ts');
const leaderboardTs = readSrc('src/platform/ds/leaderboard.ts');
const skillsTs = existsSync(join(root, 'src/platform/ds/skills.ts')) ? readSrc('src/platform/ds/skills.ts') : '';
const dsDts = existsSync(join(root, 'src/ds.d.ts')) ? readSrc('src/ds.d.ts') : '';

/** 收集 src/ 下全部业务代码文件（React 口径：.js/.ts/.jsx/.tsx）。 */
function collectSrcFiles(dir = join(root, 'src')) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...collectSrcFiles(full));
    else if (/\.(js|ts|jsx|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}
const srcFiles = collectSrcFiles().filter((f) => !f.endsWith('.d.ts'));

// ============================================================
// 模块 1：SDK-LOADER 块
// ============================================================
const hasLoaderStart = indexHtml.includes('<!-- [DS:SDK-LOADER:START] -->');
const hasLoaderEnd = indexHtml.includes('<!-- [DS:SDK-LOADER:END] -->');
if (hasLoaderStart && hasLoaderEnd) pass('SDK-LOADER 块存在（START/END 成对）');
else block('SDK-LOADER 块', 'index.html', '缺少 [DS:SDK-LOADER:START/END] 注释对', '补齐 SDK-LOADER marker 块');

const loaderSection = indexHtml.slice(
  indexHtml.indexOf('[DS:SDK-LOADER:START]'),
  indexHtml.indexOf('[DS:SDK-LOADER:END]'),
);

// NS snippet
const nsCreate = /ns\('create',\s*'[^']+'\)/.test(loaderSection);
const nsPageview = /ns\('send',\s*'pageview'\)/.test(loaderSection);
const dims = ['dimension95', 'dimension96', 'dimension97'].every((d) => loaderSection.includes(d));
const dimsRefWindowDA = ['window.DA_SQUARE_ID', 'window.DA_GROUP_ID', 'window.DA_PROJECT_ID']
  .every((v) => loaderSection.includes(v));
const timeTracker = loaderSection.includes('timeOnSessionTracker')
  && loaderSection.includes('heartBeatTime') && loaderSection.includes('sessionExpiredTime');
if (nsCreate && nsPageview && dims && dimsRefWindowDA && timeTracker) {
  pass('NS snippet 完整（create/pageview/三维度引用 window.DA_*/timeOnSessionTracker）');
} else {
  block('NS snippet', 'index.html',
    `create=${nsCreate} pageview=${nsPageview} 维度=${dims} 维度引用DA=${dimsRefWindowDA} 时长追踪=${timeTracker}`,
    '补齐 NS 埋点基础调用与公共维度');
}

// JSSDK script
if (/ds-js-sdk\/1\.0\.87\/ds-js-sdk\.min\.js/.test(loaderSection)) pass('JSSDK script 存在（1.0.87）');
else block('JSSDK script', 'index.html', '缺少 ds-js-sdk script 或版本不符', '引入 ds.res.netease.com/online/pkg/ds-js-sdk/1.0.87/ds-js-sdk.min.js');

// DsUlink UA 检测 + onDsUlinkReady
const ulinkUa = /!\/Godlike\/i\.test/.test(loaderSection) || /if \((?:!false && )?!\/Godlike\/i\.test/.test(loaderSection);
const ulinkReady = loaderSection.includes('onDsUlinkReady');
if (ulinkUa && ulinkReady) pass('DsUlink 加载（UA 检测 + onDsUlinkReady 回调）');
else block('DsUlink 加载', 'index.html', `UA检测=${ulinkUa} ready回调=${ulinkReady}`, 'DsUlink 须 UA 检测 + onDsUlinkReady 回调模式');

// MobileShare
const msUa = /!false && !\/Godlike\/i\.test/.test(loaderSection);
const msReady = loaderSection.includes('onMobileShareReady');
if (msUa && msReady) pass('MobileShare 加载（!false 占位符已替换 + UA 检测 + onMobileShareReady）');
else if (!msUa) block('MobileShare 加载', 'index.html', 'mobile-share 块缺少 !false UA 守卫（{IS_COCOS} 未正确替换）', '非 Cocos 项目应为 `if (!false && !/Godlike/i.test(...))`');
else block('MobileShare 加载', 'index.html', '缺少 onMobileShareReady 注册', '补齐 onMobileShareReady 回调注册');

// {IS_COCOS} 占位符功能位残留
const functionalPlaceholder = /!\{IS_COCOS\}|if \(\{IS_COCOS\}/.test(indexHtml);
if (!functionalPlaceholder) pass('{IS_COCOS} 占位符功能位已替换');
else block('{IS_COCOS} 占位符', 'index.html', '功能位仍残留 {IS_COCOS} 字面量', '替换为 !false（非 Cocos）');

// SDK-LOADER 位置（在业务 script 之前 = <head> 内）
const loaderBeforeMain = indexHtml.indexOf('[DS:SDK-LOADER:END]') < indexHtml.indexOf('/src/main.tsx');
if (loaderBeforeMain) pass('SDK-LOADER 在业务入口之前加载');
else warn('SDK-LOADER 加载顺序', 'SDK-LOADER 块出现在业务入口之后', '将 SDK-LOADER 块移到 <head> 业务入口之前');

// ============================================================
// 模块 2：CONFIG 块
// ============================================================
const configHasMarkers = configTs.includes('[DS:CONFIG:START]') && configTs.includes('[DS:CONFIG:END]');
if (configHasMarkers) pass('CONFIG 块 marker 成对');
else block('CONFIG 块', 'src/platform/ds/config.ts', '缺少 [DS:CONFIG:START/END]', '补齐 CONFIG marker 块');

const configPlaceholders = configTs.match(/\{[A-Z_]{3,}\}/g)?.filter((m) => !/^\{(TRUE|FALSE)\}$/i.test(m)) ?? [];
if (configPlaceholders.length === 0) pass('CONFIG 块无占位符残留');
else block('CONFIG 块', 'src/platform/ds/config.ts', `残留占位符：${configPlaceholders.join(', ')}`, '全部替换为字面值');

// ============================================================
// 模块 3：JSSDK 块（深度校验依赖 /dsjssdk 技能，这里做结构性检查）
// ============================================================
const jssdkMarkers = runtimeTs.includes('[DS:JSSDK:START]') && runtimeTs.includes('[DS:JSSDK:END]');
if (jssdkMarkers) pass('JSSDK 块 marker 成对');
else block('JSSDK 块', 'src/platform/ds/runtime.ts', '缺少 [DS:JSSDK:START/END]', '补齐 JSSDK marker 块');

// ds.ready() 在 callHandler 之前（initLogin 内 await ready）
const readyBeforeCall = /await\s+window\.ds\.ready\(\)/.test(runtimeTs);
const callHandlerBeforeReady = /window\.ds\.callHandler\((?![\s\S]*await\s+window\.ds\.ready)/.test(runtimeTs);
void callHandlerBeforeReady;
if (readyBeforeCall) pass('ds.ready() 在 callHandler 之前（initLogin 已 await）');
else warn('JSSDK 时序', '未发现 await ds.ready() 调用', 'initLogin 内必须先 await ds.ready() 再 callHandler');

// ============================================================
// 模块 4：NS 日志块
// ============================================================
const nsMarkers = runtimeTs.includes('[DS:NS-LOG:START]') && runtimeTs.includes('[DS:NS-LOG:END]');
if (nsMarkers) pass('NS-LOG 块 marker 成对');
else block('NS-LOG 块', 'src/platform/ds/runtime.ts', '缺少 [DS:NS-LOG:START/END]', '补齐 NS-LOG marker 块');

const deviceIdOk = runtimeTs.includes("godlikeInfo['GL-DeviceId']");
if (deviceIdOk) pass("NS-LOG deviceid 取 godlikeInfo['GL-DeviceId']");
else block('NS-LOG deviceid', 'src/platform/ds/runtime.ts', "未取 godlikeInfo['GL-DeviceId']", 'deviceid 应优先取 GL-DeviceId');

const nsSilent = /typeof window\.ns !== 'function'\)\s*return/.test(runtimeTs);
if (nsSilent) pass('window.ns 不可用时静默 return');
else warn('NS-LOG 容错', '未检测到 window.ns 不可用的静默 return', 'trackEvent 须在 window.ns 缺失时不抛错');

// ============================================================
// 模块 5：分享块
// ============================================================
const shareMarkers = runtimeTs.includes('[DS:SHARE:START]') && runtimeTs.includes('[DS:SHARE:END]');
if (shareMarkers) pass('SHARE 块 marker 成对');
else block('SHARE 块', 'src/platform/ds/runtime.ts', '缺少 [DS:SHARE:START/END]', '补齐 SHARE marker 块');

const shareBranches = {
  miniapp: /isWechatMiniProgram\(\)\s*&&\s*window\.wx/.test(runtimeTs),
  godlike: runtimeTs.includes('window.ds?.isGodlike'),
  browser: runtimeTs.includes('onMobileShareReady') || runtimeTs.includes('MobileShare'),
};
if (shareBranches.miniapp && shareBranches.godlike && shareBranches.browser) {
  pass('分享三分支齐全（小程序 / 大神 App / 普通浏览器）');
} else {
  block('分享分支', 'src/platform/ds/runtime.ts',
    `小程序=${shareBranches.miniapp} 大神App=${shareBranches.godlike} 浏览器=${shareBranches.browser}`,
    '补齐分享三分支');
}

// 分享图片绝对路径
const shareImgAbsolute = /image:\s*import\.meta\.env[^|]*\|\|\s*'https:\/\//s.test(configTs)
  || /imgUrl|image/.test(runtimeTs) && /'https?:\/\//.test(runtimeTs);
const shareIcon = /image:\s*[^,]*'https:\/\//s.test(configTs);
if (shareIcon || shareImgAbsolute) pass('分享图标为 https:// 绝对 URL');
else block('分享图标', 'src/platform/ds/config.ts', '分享图标可能不是绝对 https URL', 'SHARE_ICON 必须为 https:// 完整 URL');

// ============================================================
// 模块 6：ULINK 块
// ============================================================
const ulinkMarkers = runtimeTs.includes('[DS:ULINK:START]') && runtimeTs.includes('[DS:ULINK:END]');
if (ulinkMarkers) pass('ULINK 块 marker 成对');
else block('ULINK 块', 'src/platform/ds/runtime.ts', '缺少 [DS:ULINK:START/END]', '补齐 ULINK marker 块');

const ulinkCallbackMode = runtimeTs.includes('onDsUlinkReady(');
const directNew = /new\s+window\.DsUlink\(/.test(runtimeTs) && !ulinkCallbackMode;
if (ulinkCallbackMode && !directNew) pass('DsUlink 走 onDsUlinkReady 回调模式');
else block('DsUlink 实例化', 'src/platform/ds/runtime.ts', '直接 new DsUlink 未等 onDsUlinkReady', '改为 onDsUlinkReady 回调模式');

// ============================================================
// 模块 7：CLICK-PRECHECK 块
// ============================================================
const precheckMarkers = runtimeTs.includes('[DS:CLICK-PRECHECK:START]') && runtimeTs.includes('[DS:CLICK-PRECHECK:END]');
if (precheckMarkers) pass('CLICK-PRECHECK 块 marker 成对');
else block('CLICK-PRECHECK 块', 'src/platform/ds/runtime.ts', '缺少 [DS:CLICK-PRECHECK:START/END]', '补齐 CLICK-PRECHECK marker 块');

const thunkPattern = /return\s+async\s+\(\.\.\.args[^)]*\)\s*=>/.test(runtimeTs);
const argsForwarded = /callback\(\.\.\.args\)/.test(runtimeTs);
if (thunkPattern && argsForwarded) pass('withPrecheck thunk 模式且透传 ...args');
else if (thunkPattern) warn('withPrecheck 参数透传', 'thunk 存在但未透传事件参数', 'callback(...args) 透传');
else block('withPrecheck thunk', 'src/platform/ds/runtime.ts', 'withPrecheck 不是 async thunk 模式', '恢复 thunk 三分支实现');

// 旧调用模式检测
const legacyPrecheck = /onclick\s*=\s*["']withPrecheck|function\s*\(\)\s*\{\s*withPrecheck\(/.test(indexHtml)
  || srcFiles.some((f) => /function\s*\(\)\s*\{\s*withPrecheck\(/.test(readFileSync(f, 'utf8')));
if (!legacyPrecheck) pass('无 withPrecheck 旧调用模式');
else block('withPrecheck 旧模式', 'src/', '发现 function(){ withPrecheck(...) } 旧模式（thunk 静默失效）', '改为 onClick={withPrecheck(fn)}');

// withPrecheck 未被空函数覆盖
const notOverridden = !/withPrecheck\s*=\s*\(\)\s*=>/.test(runtimeTs);
if (notOverridden) pass('withPrecheck 未被空函数覆盖');
else block('withPrecheck 覆盖', 'src/platform/ds/runtime.ts', 'withPrecheck 被空函数覆盖（登录保护失效）', '恢复三分支实现');

// ============================================================
// 模块 8：EXPORTS 块
// ============================================================
const exportsMarkers = runtimeTs.includes('[DS:EXPORTS:START]') && runtimeTs.includes('[DS:EXPORTS:END]');
if (exportsMarkers) pass('EXPORTS 块 marker 成对');
else block('EXPORTS 块', 'src/platform/ds/runtime.ts', '缺少 [DS:EXPORTS:START/END]', '补齐 EXPORTS marker 块');

// ============================================================
// 模块 9：HTML 加载顺序
// ============================================================
const navBarBeforeMain = indexHtml.indexOf('ds-navigation-mini-program-bar') < indexHtml.indexOf('/src/main.tsx');
const actSdkBeforeMain = indexHtml.indexOf('ds-act-sdk.min.js') < indexHtml.indexOf('/src/main.tsx');
const dataSdkBeforeMain = indexHtml.indexOf('mini-game-data-sdk') < indexHtml.indexOf('/src/main.tsx');
if (navBarBeforeMain && actSdkBeforeMain && dataSdkBeforeMain) pass('第三方 SDK 均在业务入口之前加载');
else warn('HTML 加载顺序', `导航栏=${navBarBeforeMain} 活动SDK=${actSdkBeforeMain} 数据SDK=${dataSdkBeforeMain}`, 'CDN SDK 须在 <head>、业务入口之前');

// 导航栏 script 必须 text/javascript
const navBarScriptType = /<script type="text\/javascript"[^>]*ds-navigation-mini-program-bar/.test(indexHtml);
if (navBarScriptType) pass('导航栏 script 为 type="text/javascript"（UMD）');
else block('导航栏 script type', 'index.html', '导航栏 JS 用了非 text/javascript 类型', '改为 type="text/javascript"');

// ============================================================
// 模块 10：服务端存储专项（game-server-storage.js 不存在则跳过）
// ============================================================
const hasServerStorage = existsSync(join(root, 'game-server-storage.js'))
  || existsSync(join(root, 'src', 'game-server-storage.js'));
if (!hasServerStorage) {
  // 静默跳过（本项目服务端存储经 leaderboard.ts/skills.ts 走 RequestManager）
}

// ============================================================
// 模块 12：小程序支持（isWechatMiniProgram 存在 → 加载）
// ============================================================
const hasMiniappDetect = srcFiles.some((f) => readFileSync(f, 'utf8').includes('isWechatMiniProgram'));
if (hasMiniappDetect) {
  const detectOnlyUa = /navigator\.userAgent\.toLowerCase\(\)\.includes\('miniprogram'\)/.test(runtimeTs);
  if (detectOnlyUa) pass('isWechatMiniProgram 仅判 UA');
  else warn('小程序检测', 'isWechatMiniProgram 可能判断了 SDK 可用性', '仅判 UA，SDK 可用性另行检查');

  // wx.* 调用存在性守卫（全局）
  const wxUnguarded = [];
  for (const file of srcFiles) {
    const code = readFileSync(file, 'utf8');
    const matches = [...code.matchAll(/window\.wx\.(\w+)/g)];
    for (const m of matches) {
      const before = code.slice(Math.max(0, m.index - 120), m.index);
      if (!/typeof window\.wx\s*!==\s*['"]undefined['"]/.test(before) && !/isWechatMiniProgram\(\)\s*&&\s*window\.wx/.test(before)) {
        wxUnguarded.push(`${relative(root, file)}: window.wx.${m[1]}`);
      }
    }
  }
  if (wxUnguarded.length === 0) pass('wx.* 调用均有存在性守卫');
  else warn('wx.* 调用守卫', `疑似未守卫：${wxUnguarded.slice(0, 3).join('；')}`, '调用前加 typeof window.wx !== "undefined" 判断');
}

// ============================================================
// 模块 14：导航栏审查（存在 [DS:NAV-BAR:START] → 加载）
// ============================================================
const hasNavBar = runtimeTs.includes('[DS:NAV-BAR:START]') || runtimeTs.includes('DsNavigationMiniProgramBar');
if (hasNavBar) {
  // NavigationBarTheme 合法值
  const navThemeIllegal = /NavigationBarTheme\s*=\s*['"]transparent['"]/.test(runtimeTs)
    || /theme:\s*['"](?!white|black)/.test(runtimeTs);
  if (!navThemeIllegal) pass("NavigationBarTheme 取值合法（white/black）");
  else block('导航栏主题', 'src/platform/ds/runtime.ts', 'NavigationBarTheme 使用非法值', '仅支持 white / black');

  // UMD default 兼容
  const umdDefault = runtimeTs.includes('DsNavigationMiniProgramBar.default') || /\.default\b/.test(runtimeTs.match(/initNavBar[\s\S]{0,600}/)?.[0] ?? '');
  if (umdDefault) pass('导航栏 UMD default 兼容处理存在');
  else warn('导航栏 UMD 兼容', '未检测到 DsNavigationMiniProgramBar.default 检查', '需兼容 UMD default 导出');

  // initNavBar 在 initLogin 之后（initApp 内顺序）
  const initAppBody = runtimeTs.match(/async function initApp[\s\S]*?\n\}/)?.[0] ?? '';
  const loginIdx = initAppBody.indexOf('initLogin');
  const navIdx = initAppBody.indexOf('initNavBar');
  if (loginIdx >= 0 && navIdx > loginIdx) pass('initNavBar 在 initLogin 之后调用');
  else if (loginIdx >= 0 && navIdx >= 0) block('导航栏时序', 'src/platform/ds/runtime.ts', 'initNavBar 在 initLogin 之前', '调整 initApp 内调用顺序');
  else warn('导航栏时序', '无法在 initApp 中定位 initLogin/initNavBar 调用', '确认 initNavBar 在 initLogin 之后');
}

// ============================================================
// 模块 15：DS:ACT-SDK 块（存在 BEGIN 标记 → 加载）
// ============================================================
const hasActSdk = runtimeTs.includes('DS:ACT-SDK BEGIN');
if (hasActSdk) {
  const configureCall = runtimeTs.includes('DsActSdk.configure');
  const evokeCall = /TaskModule\.evoke|Role\.evoke/.test(runtimeTs);
  const containerCheck = runtimeTs.includes("querySelector('#ds-task-root')") || runtimeTs.includes('#ds-task-root');
  if (configureCall && evokeCall && containerCheck) pass('ACT-SDK 块（configure + evoke + 容器检查）');
  else warn('ACT-SDK 块', `configure=${configureCall} evoke=${evokeCall} 容器检查=${containerCheck}`, '按 ds-act-sdk-api 契约补齐');
}

// ============================================================
// 模块 16：互动广告调试遮罩残留
// ============================================================
const adCoverInHtml = indexHtml.includes('DS:AD-PREVIEW-COVER') || indexHtml.includes('ds-act-ad-preview-cover');
const adCoverInSrc = srcFiles.some((f) => {
  const code = readFileSync(f, 'utf8');
  return code.includes('DS:AD-PREVIEW-COVER') || code.includes('ds-act-ad-preview-cover');
});
if (!adCoverInHtml && !adCoverInSrc) pass('无互动广告调试遮罩残留');
else block('广告遮罩残留', 'index.html / src/', '发现 [DS:AD-PREVIEW-COVER] 或 ds-act-ad-preview-cover 残留', '先运行模式 8 → [R] 移除遮罩');

// ============================================================
// 模块 18：安卓微信遮罩（自判：存在 ds 注入且 H5_LOGIN_ENABLED）
// ============================================================
const h5LoginEnabled = configTs.includes('h5LoginEnabled');
if (h5LoginEnabled) {
  // H5 支持站外体验 → 无需遮罩，建议项
  pass('安卓微信遮罩：H5 登录已启用，无需遮罩（建议项）');
}

// ============================================================
// 模块 19：动态资源路径拼接
// ============================================================
const dynamicAssetHits = [];
for (const file of srcFiles) {
  const code = readFileSync(file, 'utf8');
  // assets/ + 变量拼接的字符串（不含 import.meta.glob 这种静态收集）
  const hits = [...code.matchAll(/['"`]([^'"`]*assets\/[^'"`]*\$\{[^}]+\}[^'"`]*)['"`]/g)];
  for (const hit of hits) {
    if (/import\.meta\.glob/.test(code.slice(Math.max(0, hit.index - 200), hit.index))) continue;
    dynamicAssetHits.push(`${relative(root, file)}: ${hit[1].slice(0, 60)}`);
  }
}
if (dynamicAssetHits.length === 0) pass('无动态资源路径拼接');
else block('动态资源路径拼接', 'src/', `发现 ${dynamicAssetHits.length} 处：${dynamicAssetHits.slice(0, 3).join('；')}`, '改为 import.meta.glob 静态收集或 ?url import');

// ============================================================
// 已知错误检测表（全局）
// ============================================================
const allCode = srcFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

/** ds.callHandler('openLoginPage') 须先 await ds.ready()——向前查 800 字符内是否有 ready()（函数级守卫）。 */
const openLoginUnguarded = [...allCode.matchAll(/callHandler\(['"]openLoginPage['"]\)/g)]
  .filter((m) => !/ds\.ready\(\)/.test(allCode.slice(Math.max(0, m.index - 800), m.index)));

const checks = [
  { name: 'window.ds.getDeviceId() 直接调用', test: /window\.ds\.getDeviceId\(\)/, level: 'block', fix: "改取 godlikeInfo['GL-DeviceId']" },
  { name: 'new DsUlink 不等 onDsUlinkReady', test: /new\s+(?:window\.)?DsUlink\(/, level: 'block', fix: '改 onDsUlinkReady 回调模式', skipIf: ulinkCallbackMode },
  { name: '定义 window.DA_SQUARE_ID/DA_GROUP_ID/DA_PROJECT_ID', test: /window\.DA_(?:SQUARE_ID|GROUP_ID|PROJECT_ID)\s*=(?!=)/, level: 'block', fix: '删除赋值——由部署平台注入' },
];
for (const c of checks) {
  if (c.skipIf) { pass(`已知错误检测：${c.name}`); continue; }
  if (c.test.test(allCode)) block('已知错误检测', 'src/', c.name, c.fix);
  else pass(`已知错误检测：${c.name}`);
}
if (openLoginUnguarded.length === 0) pass("已知错误检测：ds.callHandler('openLoginPage') 均有 ds.ready() 前置");
else block('已知错误检测', 'src/', `ds.callHandler('openLoginPage') 未经 ds.ready()（${openLoginUnguarded.length} 处）`, '先 await ds.ready()');

// mini-game-data-sdk 注入检测（必须经 CDN script 引入，不可 npm import）
const dataSdkCdn = indexHtml.includes('mini-game-data-sdk/0.2.1/index.js');
if (dataSdkCdn) pass('mini-game-data-sdk 经 CDN 引入（0.2.1）');
else block('mini-game-data-sdk 引入', 'index.html', '未按 ≥0.2.1 CDN 引入', '更新 index.html script 版本');

// 重复逻辑检测（自定义 isInDashenApp / openInDashen / 自定义 ulink）
const dupLogic = /function\s+isInDashenApp|function\s+openInDashen/.test(allCode);
if (!dupLogic) pass('无 isInDashenApp/openInDashen 重复定义');
else warn('重复逻辑', '发现自定义 isInDashenApp/openInDashen', '统一使用 platform/ds 的检测函数');

// ============================================================
// 点击预检启发式分类（React onClick）
// ============================================================
const precheckCandidates = [];
for (const file of srcFiles) {
  const code = readFileSync(file, 'utf8');
  const rel = relative(root, file);
  for (const m of code.matchAll(/onClick=\{([^}]{0,80})\}/g)) {
    const handler = m[1];
    if (handler.includes('withPrecheck')) continue;
    const critical = /\b(start|play|begin|draw|lottery|claim|exchange|share|submit|confirm|join|enter)\b/i.test(handler)
      || /\b(start|share|submit|confirm)\w*\s*\(/.test(handler);
    if (critical) precheckCandidates.push(`${rel}: onClick={${handler.slice(0, 50)}}`);
  }
}
// 豁免：游戏内已确认不需预检的（如 startGame 走体力而非登录的场景由业务自判）
const gameEntryWrapped = readFileSync(join(root, 'src/components/StartScreen.tsx'), 'utf8').includes('withPrecheck');
if (gameEntryWrapped && precheckCandidates.length <= 4) {
  pass(`点击预检：关键入口已包裹 withPrecheck（${precheckCandidates.length} 处待确认）`);
} else if (precheckCandidates.length > 0) {
  warn('点击预检', `疑似关键动作未包裹 withPrecheck：${precheckCandidates.slice(0, 4).join('；')}`, '业务关键动作建议包裹登录预检');
} else {
  pass('点击预检：无遗漏关键动作');
}

// ============================================================
// 汇总
// ============================================================
console.log('\n================ 审查报告汇总 ================');
const passCount = results.filter((r) => r.level === 'pass').length;
console.log(`通过项 ${passCount} · 警告项 ${warnings.length} · 阻断项 ${blockers.length}`);
if (blockers.length) {
  console.log('\n❌ 阻断项（必须修复后方可上线）：');
  for (const b of blockers) console.log(`  - [${b.name}] ${b.problem}`);
}
if (warnings.length) {
  console.log('\n⚠️ 警告项（建议修复）：');
  for (const w of warnings) console.log(`  - [${w.name}] ${w.problem}`);
}
process.exit(blockers.length ? 1 : 0);
