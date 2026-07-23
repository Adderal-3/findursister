import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, SpreadsheetFile } from '@oai/artifact-tool';

const projectRoot = path.resolve('../..');
const sourcePath = path.join(projectRoot, '数值表.xlsx');
const outputDir = path.resolve('output');
await fs.mkdir(outputDir, { recursive: true });

const input = await FileBlob.load(sourcePath);
const workbook = await SpreadsheetFile.importXlsx(input);
const mode = process.argv[2] ?? 'inspect';

if (mode === 'inspect') {
  const overview = await workbook.inspect({
    kind: 'sheet,table',
    include: 'id,name,values,formulas',
    maxChars: 6000,
    tableMaxRows: 8,
    tableMaxCols: 8,
  });
  console.log(overview.ndjson);
  for (const [sheetId, range] of [['道具经济表', 'B1:K8'], ['数值决议', 'B1:D28'], ['封面', 'B1:C22']]) {
    const detail = await workbook.inspect({ kind: 'table', sheetId, range, include: 'values,formulas', tableMaxRows: 30, tableMaxCols: 12, maxChars: 12000 });
    console.log(detail.ndjson);
  }
  const preview = await workbook.render({
    sheetName: '数值决议',
    autoCrop: 'all',
    scale: 1,
    format: 'png',
  });
  await fs.writeFile(path.join(outputDir, 'before-decisions.png'), new Uint8Array(await preview.arrayBuffer()));
  process.exit(0);
}

const cover = workbook.worksheets.getItem('封面');
cover.getRange('B2').values = [['《找你妹大作战》数值表 v2.5']];
cover.getRange('B3').values = [['配套《玩法设计文档 v2.5》· 谜字坊规则本地化 · 供关卡 / 系统 / 数值开发使用']];
cover.getRange('B6:C6').values = [['主线关卡', '100 关（5 篇章 / 10 小章）']];
cover.getRange('B20:C20').values = [['数值决议', '全组统一的数值口径决议 D1~D27（开发必读）']];

const levelSheet = workbook.worksheets.getItem('关卡参数表');
levelSheet.getRange('C4').values = [['小章']];

const partners = workbook.worksheets.getItem('伙伴招募条件');
partners.getRange('B3').values = [['每位 +1.25%、满 8 人 +10%；仅终身榜/赛季榜/无尽榜生效，日榜不吃加成。完整规则见 partners_spec.md']];

const props = workbook.worksheets.getItem('道具经济表');
props.getRange('B3').values = [['测算口径：无视频玩家中心 40 关/日；看视频玩家中心 65 关/日（模型 55~75，运营目标 60~75）。全部道具无尽禁用；视频规则见 D16/D23/D24']];
props.getRange('E5').values = [['每局免费1次（不计存量）；小章通关奖励+3个（10小章共30个一次性）；卡关时看30s站内视频换+1（D16入口③）']];
props.getRange('C6').values = [['免看视频立即加时：剩余时间固定+15秒（与视频加时同值，满格截断）']];
props.getRange('K6').values = [['视频加时与沙漏合计每关≤3次；观看视频期间暂停计时与输入；加时超本关总时长时截断；每关首次三星奖励按关卡ID终身一次；无尽模式禁用（D6）']];

const decisions = workbook.worksheets.getItem('数值决议');
decisions.getRange('B2').values = [['数值口径决议 D1~D27（开发必读）']];
decisions.getRange('B3').values = [['D1~D8 为基础口径；D9~D20 为 v2.4 修复；D21~D27 为 v2.5 开发级收口']];
const existingDecisionTable = decisions.tables.items[0];
const decisionTableName = existingDecisionTable?.name ?? 'DecisionTable';
const decisionTableStyle = existingDecisionTable?.style;
if (existingDecisionTable) existingDecisionTable.delete();
decisions.getRange('B5:D31').values = [
  ['D1', '连击倍率上限 = 1.9（10 连击封顶）', '第 10 击起不再增长'],
  ['D2', '关卡类型占比 = 标准55 / 集簇10 / 迷踪10 / 夜航10 / 极速5 / Boss10', '100关比例固定'],
  ['D3', '通用数值舍入使用 half-up', '禁止依赖语言默认银行家舍入'],
  ['D4', '星级线 = floor(StarBase×55%/75%, 0.1)', '实现时 +1e-6 防浮点误差'],
  ['D5', '终身榜/赛季榜存基础分，加成读取时实时重算', '历史成绩无需重玩即可吃当前系数'],
  ['D6', '无尽模式禁用全部4种道具', '无尽榜差异来自操作与收集加成'],
  ['D7', 'Boss/高压波同屏物品最高约163件', '上线门槛要求压力场景平均≥50FPS'],
  ['D8', '伙伴检查点 = settle/signin/collect/onlineTick/launch', '失败闯关和UGC不触发settle伙伴判定'],
  ['D9', '连击无时间窗口，仅点错清零；无尽跨波保留', '记忆背板与快速连续命中是合法打法'],
  ['D10', '星级锚 = T×M(n)−0.4×h(n)', '极限速点模型'],
  ['D11', '体力在线每3分钟+1；体力视频单次+5', '完整约束见D24'],
  ['D12', '每集齐1主题图鉴，全局加成+2%，满+12%', '仅终身榜/赛季榜/无尽榜生效'],
  ['D13', '日榜=当日各关最高基础分之和', '每关每日仅取最好成绩，不吃任何加成'],
  ['D14', '终身/赛季总榜同分按对应基础分达到时间', '系数变化不刷新时间戳'],
  ['D15', '永久进度不绑定自然日累计', '每日上限只用于消耗品防刷'],
  ['D16', '视频三入口：体力+5 / 加时固定+15s / 放大镜+1', '加时与沙漏共享每关≤3次'],
  ['D17', '伙伴阈值沿用v2.4重标值', '预计天数是玩家画像，不是时间锁'],
  ['D18', 'Boss类型系数0.9：L10=213s，L20+=300s', 'Boss长局控制在约5分钟'],
  ['D19', 'UGC隔离：1体力/次，不计榜单/伙伴/图鉴', '时长30~300s、物品≤130、目标≤已摆放实例'],
  ['D20', '沙漏免视频固定+15s，与视频加时共享每关≤3次', '满格截断'],
  ['D21', '层级=5篇章×20关 / 10小章×10关', 'CSV chapter指小章；星门解锁篇章'],
  ['D22', '剩余时间下截0.1s→单物品得分half-up 0.1→逐项求和', '压线事件按服务端时间排序'],
  ['D23', '视频期间暂停计时/输入，完播验签后幂等发奖', '加时固定+15s；rewardId防重复'],
  ['D24', '体力上限/初始20；每日补到20；视频+5每日≤4次', '所有恢复不溢出'],
  ['D25', '终身总榜不重置；赛季榜独立记录当季各关最好成绩', '赛季榜按赛季基础分达到时间破同分；奖励只绑定赛季榜'],
  ['D26', 'UGC奖励以另一有效账号首次完成作为条件', '作者/同设备/重复完成不计，日限3'],
  ['D27', '每主题28普通/8稀有/4史诗；首槽优先未点亮', '其余槽按70%/25%/5%权重'],
];
const decisionTable = decisions.tables.add('B4:D31', true, decisionTableName);
if (decisionTableStyle) decisionTable.style = decisionTableStyle;

decisions.getRange('B5:B31').format = { font: { bold: true, color: '#1479C9' }, horizontalAlignment: 'center' };
decisions.getRange('C5:C31').format = { font: { color: '#1479C9' }, wrapText: true };
decisions.getRange('D5:D31').format = { wrapText: true };
decisions.getRange('B2:D31').format.autofitRows();

const inspect = await workbook.inspect({
  kind: 'table',
  sheetId: '数值决议',
  range: 'B2:D31',
  include: 'values,formulas',
  tableMaxRows: 30,
  tableMaxCols: 3,
  maxChars: 10000,
});
console.log(inspect.ndjson);

const errors = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 300 },
  summary: 'final formula error scan',
});
console.log(errors.ndjson);

for (const sheetName of ['封面', '关卡参数表', '星锚系数表', '伙伴招募条件', '无尽难度曲线', '道具经济表', '数值决议']) {
  const preview = await workbook.render({ sheetName, autoCrop: 'all', scale: 0.8, format: 'png' });
  await fs.writeFile(path.join(outputDir, `after-${sheetName}.png`), new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(path.join(outputDir, '数值表-v2.5.xlsx'));
