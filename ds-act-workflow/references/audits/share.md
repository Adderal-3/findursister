# 分享块

- [ ] `IS_COCOS` 变量存在于 `[DS:CONFIG:START]` 块中（缺失则视为 `false`）
- [ ] `isGodlike` 双分支都存在（缺任一分支报错）
- [ ] Godlike 分支：`ds.ready()` 在 `onUpdateShareMenu` 之前
- [ ] `title` / `desc` / `imgUrl` / `link` 四字段存在且非空
- [ ] `imgUrl` 以 `https://` 开头
- [ ] `squareId` 在 Godlike 分支中存在
- [ ] **IF `IS_COCOS = false`：** 非 Godlike 分支有 `onMobileShareReady` 兜底（缺则阻断）
- [ ] **IF `IS_COCOS = true`：** `initShare` 中非 Godlike / 非小程序分支为 no-op（直接 return 或 `else if (!IS_COCOS)` 跳过 MobileShare）；遍历所有含 DS Marker 的 HTML 文件，SDK-LOADER 未加载 `mobile-share.min.js`（若检测到 mobile-share 注入则阻断：会污染 `window.wx` 导致 Cocos 引擎误判为微信小游戏）
