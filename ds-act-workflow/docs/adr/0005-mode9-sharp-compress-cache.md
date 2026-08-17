# Mode 9 资源优化：sharp 压缩 + 内容 hash 去重 cache 进 git

mode 9 用 sharp（本地 npm 包，免费离线）压缩图片，只压质量不 resize 保持原格式；内容 hash 去重（`.compress-cache.json`）避免重复压缩累积质量损失；cache 进 git 团队共享（区别 `.skill-cache.json` gitignore）。压缩后仍超阈接受+告知不重压。架构定位见 ADR-0004。

## Considered Options

- **sharp vs tinypng vs vite 插件**：选 sharp。本地免费离线（网易内网友好），直接压源文件（vite 插件压产物不匹配）；tinypng 付费+网络。
- **转 webp vs 保持原格式**：选保持原格式。大神 App WebView 版本不确定，保 png/jpeg/gif 兼容性零风险。
- **resize vs 不 resize**：选不 resize。合适尺寸难定，破坏运营设计意图（排行榜头图设计尺寸有意）。
- **cache gitignore vs 进 git**：选进 git。`.skill-cache.json` 是本地环境状态（机器装没装 skill）gitignore 合理；`.compress-cache.json` 是项目资源处理状态，gitignore 会导致跨人重复压缩（累积质量损失）。
- **重压 vs 接受+告知**：选接受+告知。重压不断降质量会压糊，300KB 是软门禁阈值不是硬律。

## Consequences

- 引入 sharp native 依赖（C++ binding，预编译 binary 大部分平台 OK，极端环境可能要编译）
- `.compress-cache.json` 进 git，能力提交含 cache 更新（无额外噪音，和压缩后的图同一提交）
- png 大图可能压完仍超阈（>300KB），走 deploy 软门禁"接受+告知"路径，不阻断
