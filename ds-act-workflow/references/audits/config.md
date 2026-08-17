# CONFIG 块

- [ ] `EVENT_ACTION` 非 `'unknown'` 且非空，**且不含 `{` `}` 花括号**（未替换的模板占位符）
- [ ] `EVENT_CATEGORY` 非 `'unknown'` 且非空，**且不含 `{` `}` 花括号**
- [ ] `APP_KEY` 非空，**且不含 `{` `}` 花括号**
- [ ] `SHARE_ICON` 以 `https://` 开头（绝对路径），**且不含 `{` `}` 花括号**
- [ ] `SQUARE_ID` 非空，**且不含 `{` `}` 花括号**
- [ ] `H5_LOGIN_ENABLED` 为 `true` 或 `false`（缺失则视为 `false`，向后兼容）
