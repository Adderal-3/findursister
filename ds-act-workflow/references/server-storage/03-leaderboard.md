# 第 4 步：榜单 UI 生成

> 目标：一键生成完整的排行榜组件（HTML + CSS + JS），用户不写一行 UI 代码。
> 触发条件：第 1 步字段表中存在「进排行榜」的字段。
> 输入：字段表中的排行榜字段 + 第 3 步生成的 `ServerStorage.loadLeaderboard()`。

---

## 4.1 最少必要询问

进入此步骤时，只问以下 4 项（其他全部默认）：

```
你的排行榜字段已识别：[字段名]

需要确认几个信息：

  1. billboardId（测试环境和正式环境各一个）
     测试环境 billboardId：_____
     正式环境 billboardId（可以先跳过）：_____

     → 还没有？请到后台创建榜单并获取：
       测试环境：https://god-cms-test.gameyw.netease.com/cms/
       正式环境：https://god-cms.gameyw.netease.com/cms/
       路径：活动 → 小游戏管理 → 选择游戏 → 数值管理 → 榜单配置 → 新建榜单 → 复制榜单 ID

     → 先跳过？代码里会用占位符，后续在第 4 步配置榜单后补充

  2. 榜单显示前几名？（默认 10）：_____

  3. 分数单位叫什么？（如「分」「次」「元」，默认「分」）：_____

  4. 是否需要「我的排名」展示？（默认是）[Y/n]
```

**billboardId 处理逻辑：**

| 用户提供情况 | BILLBOARD_CONFIG 中的值 |
|-------------|------------------------|
| 测试 `aaa`，正式 `bbb` | `devBillboardId: 'aaa'`，`proBillboardId: 'bbb'` |
| 只有测试 `aaa` | `devBillboardId: 'aaa'`，`proBillboardId: '__PRO_BILLBOARD_ID__'` |
| 都没有 / 先跳过 | `devBillboardId: '__DEV_BILLBOARD_ID__'`，`proBillboardId: '__PRO_BILLBOARD_ID__'` |

其余样式（颜色、字体、位置）全部用默认值，生成后再问是否调整。

---

## 4.2 是否已有榜单容器

遍历所有含 DS Marker 的 HTML 文件，判断两种情况：

**情况 A：检测到现有榜单容器**（如 `#rankList`、`#leaderboard`、`.rank-panel` 等）

```
检测到现有榜单容器：#rankList
是否复用这个容器渲染榜单数据？[Y/n]
```

选 Y → 只生成渲染逻辑（JS 函数），不生成 HTML 结构。
选 N → 按情况 B 流程，生成全新组件。

**情况 B：无现有容器**

生成完整组件：固定入口按钮 + 弹层面板（见 4.3）。

---

## 4.3 生成完整榜单组件

### HTML 结构（插入到 `</body>` 前）

```html
<!-- 榜单入口按钮（右下角固定） -->
<button id="leaderboard-trigger" onclick="openLeaderboard()" style="
  position: fixed; right: 16px; bottom: 80px; z-index: 9999;
  width: 52px; height: 52px; border-radius: 50%; border: none;
  background: linear-gradient(135deg, #FFD700, #FFA500);
  color: white; font-size: 22px; cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
">🏆</button>

<!-- 榜单遮罩 + 面板 -->
<div id="leaderboard-overlay" style="
  display: none; position: fixed; inset: 0; z-index: 9998;
  background: rgba(0,0,0,0.6); align-items: center; justify-content: center;
">
  <div id="leaderboard-panel" style="
    width: 90%; max-width: 360px; max-height: 80vh;
    background: #1a1a2e; border-radius: 16px; overflow: hidden;
    display: flex; flex-direction: column;
  ">
    <!-- 头部 -->
    <div style="
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 20px; background: linear-gradient(135deg, #16213e, #0f3460);
    ">
      <span style="color: #FFD700; font-size: 18px; font-weight: bold;">🏆 排行榜</span>
      <button onclick="closeLeaderboard()" style="
        background: none; border: none; color: #aaa; font-size: 20px; cursor: pointer;
      ">✕</button>
    </div>

    <!-- 我的排名（如需要） -->
    <div id="leaderboard-my-rank" style="
      padding: 12px 20px; background: #0d1b2a; border-bottom: 1px solid #2a2a4a;
      color: #ccc; font-size: 14px; display: none;
    "></div>

    <!-- 榜单列表 -->
    <ul id="leaderboard-list" style="
      list-style: none; margin: 0; padding: 0;
      overflow-y: auto; flex: 1;
    "></ul>
  </div>
</div>
```

### CSS（插入到 `<style>` 或 CSS 文件中）

```css
#leaderboard-list li {
  display: flex;
  align-items: center;
  padding: 10px 20px;
  border-bottom: 1px solid #2a2a4a;
  color: #ddd;
  font-size: 14px;
  gap: 12px;
}
#leaderboard-list li:last-child { border-bottom: none; }
#leaderboard-list .rank-num {
  width: 24px; text-align: center; font-weight: bold; flex-shrink: 0;
}
#leaderboard-list .top-1 .rank-num { color: #FFD700; }
#leaderboard-list .top-2 .rank-num { color: #C0C0C0; }
#leaderboard-list .top-3 .rank-num { color: #CD7F32; }
#leaderboard-list .avatar {
  width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0;
}
#leaderboard-list .nick { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#leaderboard-list .score { color: #FFD700; font-weight: bold; flex-shrink: 0; }
#leaderboard-list .highlight { background: rgba(255, 215, 0, 0.1); }
#leaderboard-list .loading,
#leaderboard-list .error {
  justify-content: center; color: #888; padding: 20px;
}
```

### JS（根据 3.0 收集的 billboardId 填入，`PAGE_SIZE`、`SCORE_UNIT` 按用户选择）

```javascript
// ========== 榜单配置（SDK 通过 IS_PRODUCTION 自动选择环境）==========
const BILLBOARD_CONFIG = {
  devBillboardId: '__DEV_BILLBOARD_ID__', // 测试环境榜单 ID
  proBillboardId: '__PRO_BILLBOARD_ID__', // 正式环境榜单 ID
};
const BILLBOARD_PAGE_SIZE = 10;  // 显示前 N 名
const SCORE_UNIT = '分';         // 分数单位

async function openLeaderboard() {
  const overlay = document.getElementById('leaderboard-overlay');
  overlay.style.display = 'flex';

  const list = document.getElementById('leaderboard-list');
  const myRankEl = document.getElementById('leaderboard-my-rank');
  list.innerHTML = '<li class="loading">加载中...</li>';

  try {
    // 规则 #13：并行拉取（ServerStorage.loadLeaderboard 已封装 Promise.all）
    // loadLeaderboard 内部使用 BILLBOARD_CONFIG，无需手动传 ID
    const { rankList, myRank } = await ServerStorage.loadLeaderboard();

    // 我的排名
    if (myRankEl) {
      if (myRank && myRank.rank > 0) {
        myRankEl.style.display = 'block';
        myRankEl.innerHTML = `我的排名：第 <strong style="color:#FFD700">${myRank.rank}</strong> 名 · ${myRank.num} ${SCORE_UNIT}`;
      } else {
        myRankEl.style.display = 'block';
        myRankEl.innerHTML = '我的排名：暂未上榜';
      }
    }

    // 榜单列表
    if (!rankList || rankList.length === 0) {
      list.innerHTML = '<li class="loading">暂无数据</li>';
      return;
    }

    const myUid = myRank && myRank.uid;
    list.innerHTML = rankList.slice(0, BILLBOARD_PAGE_SIZE).map(r => `
      <li class="rank-item ${r.rank <= 3 ? 'top-' + r.rank : ''} ${r.uid === myUid ? 'highlight' : ''}">
        <span class="rank-num">${r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank - 1] : r.rank}</span>
        <img class="avatar" src="${r.icon || ''}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2236%22 height=%2236%22><rect width=%2236%22 height=%2236%22 fill=%22%23444%22 rx=%2218%22/></svg>'">
        <span class="nick">${r.nick || '匿名玩家'}</span>
        <span class="score">${r.num} ${SCORE_UNIT}</span>
      </li>
    `).join('');
  } catch (e) {
    list.innerHTML = `<li class="error" onclick="openLeaderboard()" style="cursor:pointer;">加载失败，点击重试</li>`;
  }
}

function closeLeaderboard() {
  document.getElementById('leaderboard-overlay').style.display = 'none';
}

// 内联 onclick 只在 window 上查找函数，必须显式挂载
window.openLeaderboard = openLeaderboard;
window.closeLeaderboard = closeLeaderboard;

// 点击遮罩关闭
document.getElementById('leaderboard-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeLeaderboard();
});
```

---

## 4.4 复用已有容器时（情况 A）

只生成渲染函数，挂到用户自己的入口逻辑：

```javascript
// 渲染榜单到已有容器 #rankList
async function renderLeaderboard() {
  const list = document.getElementById('rankList');
  list.innerHTML = '<div class="loading">加载中...</div>';

  try {
    // loadLeaderboard 内部使用 game-server-storage.js 中的 BILLBOARD_CONFIG
    const { rankList, myRank } = await ServerStorage.loadLeaderboard();
    list.innerHTML = rankList.map(r => `
      <div class="rank-item">
        <span class="rank">${r.rank}</span>
        <img src="${r.icon || ''}" onerror="this.removeAttribute('src')">
        <span class="nick">${r.nick || '匿名玩家'}</span>
        <span class="score">${r.num} ${SCORE_UNIT}</span>
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = '<div class="error">加载失败</div>';
  }
}
```

---

## 4.5 生成后询问样式调整

代码生成完毕后询问：

```
榜单组件已生成！默认样式是深色主题（深蓝背景 + 金色高亮）。

需要调整样式吗？
  · 背景颜色 / 主题色
  · 字体大小
  · 入口按钮位置（当前：右下角）
  · 榜单面板尺寸

直接描述你想要的效果，或回复「不用」继续下一步。
```

---

## 4.6 进入第 5 步

榜单 UI 生成（或跳过）后，进入第 5 步：CMS 字段注册。

> 读取 `{skill_dir}/references/server-storage/04-cms-register.md` 继续执行。
