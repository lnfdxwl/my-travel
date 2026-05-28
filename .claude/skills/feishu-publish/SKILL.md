---
name: feishu-publish
description: 将旅行攻略 HTML 发布到飞书文档，自动处理格式转换、表格渲染、权限设置。当用户说"发布到飞书"、"上传飞书"、"同步到飞书"、"飞书发布"、"更新飞书文档"时触发。
---

# feishu-publish — 旅行攻略发布到飞书

将 `trips/*/` 下的 HTML 攻略一键发布为格式正确的飞书文档（含表格、时间轴、标注框），并设置公开权限。

## 凭据

飞书应用凭据（已配置）：
- App ID: `cli_a9e2164af4395bc4`
- App Secret: `wQZSbyBhlVmGhZfLyhOP2gjXwMBEYtP7`

调用时通过环境变量传入：
```bash
FEISHU_APP_ID="cli_a9e2164af4395bc4" FEISHU_APP_SECRET="wQZSbyBhlVmGhZfLyhOP2gjXwMBEYtP7" \
  node scripts/publish.js <html_path> [doc_token]
```

## 用法

### 新建文档发布
```bash
# 自动创建新飞书文档并发布
FEISHU_APP_ID="..." FEISHU_APP_SECRET="..." \
  node .claude/skills/feishu-publish/scripts/publish.js \
  trips/uzbekistan-2026/uzbekistan-trip-guide-v1.html
```
输出：新建文档的 URL 和 doc_token，记录到对应行程的 README.md。

### 覆盖更新已有文档
```bash
# 传入 doc_token 则覆盖更新
FEISHU_APP_ID="..." FEISHU_APP_SECRET="..." \
  node .claude/skills/feishu-publish/scripts/publish.js \
  trips/uzbekistan-2026/uzbekistan-trip-guide-v1.html \
  ANHedWMa0onVxvxiIX9cuKtOntJ
```

## 内部流程

```
HTML 文件
  ↓ html_to_md()     解析自定义组件（time-block / transport-item / place-card 等）→ Markdown
  ↓ 按 ## 切分      每段 ≤5000 字符
  ↓ Convert API      POST /docx/v1/documents/blocks/convert  →  飞书 blocks（含表格结构）
  ↓ 删 merge_info    table.property.merge_info 是只读字段，传入会报错
  ↓ Descendant API   POST /docx/v1/documents/{token}/blocks/{token}/descendant  →  插入嵌套 blocks
  ↓ 权限设置         PATCH /drive/v1/permissions/{token}/public?type=docx  →  anyone_readable
  ↓ 输出 URL
```

## 关键 API 说明

| API | 用途 | 注意 |
|-----|------|------|
| `/docx/v1/documents/blocks/convert` | Markdown → 飞书 blocks | 支持表格；不能用自己解析的方式 |
| `/docx/v1/documents/{t}/blocks/{t}/descendant` | 插入嵌套 blocks（表格等） | 必须用这个，不能用 `/children`（报 1770029）|
| `/docx/v1/documents/{t}/blocks/{t}/children/batch_delete` | 清空文档内容 | 先查 children 数量再删 |
| `/drive/v1/permissions/{t}/public?type=docx` | 设置分享权限 | `anyone_readable` = 无需登录；`tenant_readable` = 仅组织内 |

## HTML 组件转换规则

本项目 HTML 使用自定义 CSS 组件，`markdownify` 无法正确识别，必须用定制解析器：

| HTML 组件 | 转换为 Markdown |
|-----------|----------------|
| `.time-block` | `**时间** 活动内容`（同行，加粗时间） |
| `.transport-item` | `### 图标 路线\n时刻\n*备注*\n> 选择理由` |
| `.place-card` | `**名称**　价格\n描述` |
| `.tip/.warn/.info` | `> 内容`（引用块） |
| `.day` | `## Day标题　日期` + 内部 time-block 展开 |
| `.email-block` | ` ``` 代码块 ``` ` |
| `table` | 标准 Markdown 表格 `\| ... \|` |
| `.checklist li` | `- [ ] 内容` |
| `.steps li` | `1. 内容`（有序列表） |

## 依赖

- Node.js v18+（内置 fetch）
- Python 3 + beautifulsoup4（`pip3 install beautifulsoup4`）
