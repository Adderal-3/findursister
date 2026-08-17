# VENDORED 示例 — 请勿随意手改

- `table_config.example.json`
- `queries.example.json`

来源：`.claude/skills/datahub-table-designer/datahub-table-designer/examples/`
同步时间：2026-07-07

说明：datahub-table-designer 由服务端团队维护，本目录是其示例的自有副本。
JSON 文件本身不能承载注释，故用本文件记录来源。外部示例若更新，需人工比对同步。

校验方式：

```
node references/server-storage/common-table/scripts/validate.cjs \
  references/server-storage/common-table/examples/table_config.example.json \
  references/server-storage/common-table/examples/queries.example.json
```

预期：`===== ✅ 全部通过 =====`
