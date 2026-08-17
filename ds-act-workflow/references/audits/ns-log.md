# NS 日志块

- [ ] `trackEvent` 函数存在
- [ ] `window.ns` 存在性检查在调用前（`typeof window.ns !== 'function'` 早退）
- [ ] `deviceid` 取自 `godlikeInfo['GL-DeviceId']`，**禁止** `ds.getDeviceId()`
- [ ] payload 含标准字段：`game` / `scene` / `deviceid` / `uid` / `time`
- [ ] `eventCategory` / `eventAction` 引用 CONFIG 变量，非硬编码字符串
