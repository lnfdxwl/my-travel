---
name: meituan-travel
description: "美团酒旅官方 Skill，您的专属 AI 旅行管家。酒店、机票、火车票、景点门票、度假一站搞定，还能帮你找优惠、比价格、定行程。美团海量真实点评加持，出行每一步都更放心。"

metadata:
  skillhub.creator: "zhangqianyi"
  skillhub.updater: "zhaoyu75"
  skillhub.version: "V33"
  skillhub.source: "FRIDAY Skillhub"
  skillhub.skill_id: "20468"
  skillhub.high_sensitive: "true"
---

## [MANDATORY] SKILLHUB_METRIC_REPORTER_START
执行本 Skill 的任何操作之前，必须先执行 Skill：`skill-metric-reporter`。
按照 `skill-metric-reporter` 的要求完成 `skill_start` 上报后，再去继续本 Skill 正文。
如果 `skill-metric-reporter` 不可用或执行失败，跳过上报，继续执行本 Skill 正文——不得因上报失败而阻塞审阅流程。
本 Skill 全部操作完成后，同样按照 `skill-metric-reporter` 的要求完成 `skill_end` 上报。
## [MANDATORY] SKILLHUB_METRIC_REPORTER_END

# 美团旅行助手 Skill
美团酒旅官方 Skill，您的专属 AI 旅行管家。机票、酒店、火车票、景点门票一站搞定，还能帮你抢优惠券、比价格、定行程。美团海量真实点评加持，出行每一步都更放心。

## Setup

1. **获取 Token** — 打开 [developer.meituan.com/zh/v2/dev/token](https://developer.meituan.com/zh/v2/dev/token)，按页面指引申请并复制你的 API Token（仅保存在本人可信环境，勿截图含完整密钥发到公开渠道）。

2. **提供 Token（推荐环境变量）** — 在 skill 运行环境中配置好该变量；skill 直接读取，不操作任何配置文件，不持久化，不回显完整密钥。

   ```bash
   export MEITUAN_HT_TOKEN=your-token
   ```

3. **验证访问** — 发起一次真实查询确认可用：

   ```bash
   npx @meituan-travel/ht-ai@latest query --query "北京到上海的机票"
   ```

## Security & trust (before production use)

- **Endpoint**：确认请求发往官方域名（`https://mcp-open-cater.meituan.com`），勿在未核实的情况下改用未知域名。
- **Key scope / billing**：向提供方确认 Token 权限、计费与配额，避免误用或超额。
- **External content**：响应来自美团酒旅服务，可能含链接、营销文案或结构化信息；按你方产品策略决定是否展示、是否需过滤或摘要，**不要**假定第三方正文永远无害或永远准确。
- **Invocation**：本技能适合旅行类意图；若平台支持限制自动调用频率或范围，可按合规要求配置。

## 使用方法

**执行前，先确定 Token：** 若 `MEITUAN_HT_TOKEN` 已设置，直接使用；未设置则报错退出（exit 3），不会发起请求。

### 查询

**方式一：npx 免安装（推荐，始终使用最新版）**

```bash
npx @meituan-travel/ht-ai@latest query --query "<用户的自然语言查询>" --origin-query "<用户完整原始输入>" [--city <城市>]
```

**方式二：全局安装后使用 `ht-ai` 命令**

```bash
npm install -g @meituan-travel/ht-ai
ht-ai query --query "<用户的自然语言查询>" --origin-query "<用户完整原始输入>" [--city <城市>]
```

**参数说明**

| 参数 | 必填 | 说明 |
|------|:----:|------|
| `--query` | 是 | 用户的自然语言查询 |
| `--city` | 否 | 城市名称（默认北京） |
| `--origin-query` | 是 | 用户原始查询内容（用于统计，不影响结果）｜

⚠️ --origin-query 为必填参数，每次调用 CLI 时必须传入用户的完整原始输入，不得省略。

**退出码**

| 退出码 | 含义 |
|--------|------|
| 0 | 成功 |
| 1 | 普通错误（参数错误、网络超时等） |
| 3 | 鉴权失败（Token 无效或未配置） |

## 适用场景边界

✅ **使用此 skill：**
- "想去踏青赏花，推荐几个必去的城市"
- "周末两天适合去哪里玩"
- "带小孩去哪里旅游比较好"
- "明天去武汉的火车票"
- "去南方的特价机票"
- "两大一小怎么买上海迪士尼门票"
- "帮我订这周末开封的情侣酒店，预算500内"

❌ **不使用此 skill：**
- 出国签证申请、护照办理流程
- 非旅行相关的外卖、打车等美团其他业务

## 核心执行流程

1. **提取参数** — 识别用户的「当前定位城市」（获取不到默认北京）和「查询需求」。若用户明确指定了出发地，以用户指定为准。
2. **安抚等待** — 该 API 执行耗时较长（约 1-2 分钟），请务必先向用户发送：
   > 🔍 正在连接美团酒旅数据接口为您规划，耗时约 1-2 分钟，请稍候...
3. **执行 CLI** — 使用 npx @meituan-travel/ht-ai@latest 调用 API，传入参数。必须携带 --origin-query（用户完整原始输入），不得省略。
4. **解析与渲染输出** — 严格按照下方的【输出规范】向用户展示最终结果。

## 输出要求

- **零删减**：必须将 CLI 输出的全部内容原样透传给用户，不得合并段落、删减字数，不得省略酒店名、价格、评分、链接等信息。
- **跳转链接**：CLI 返回内容中包含的跳转链接（如 `[查看详情](http://...)`）必须完整保留并透传给用户，禁止去除链接只保留文字。
- **图片**：若终端支持图片渲染，CLI 返回的图片（`![alt](url)`）应内嵌展示；不支持时保留链接即可，禁止直接丢弃。
- **价格原样输出**：CLI 返回的价格字符串必须原样展示，禁止任何转换或补充说明。价格中的占位符（如 `X`、`XX`）是后端脱敏处理，不得自行还原或猜测。

## 🆘 错误处理

| 异常情况 | 应对策略 |
|---------|---------|
| 网络超时（>120s） | "请求超时啦，当前查询人数较多，请换个问法或稍后再试。" |
| 查询失败 | 展示错误信息，建议用户换个问法重试 |
| 城市无法识别 | 停止猜测，主动询问用户确认具体城市 |
| 返回内容为空 | 告知用户暂无相关结果，建议调整查询关键词 |
| exit 3（鉴权失败） | 提示用户检查 `MEITUAN_HT_TOKEN` 是否正确配置 |

## 注意事项

- **响应时间约 1-2 分钟**，调用前必须告知用户耐心等待。
- **query 越具体推荐越精准**，引导用户提供：出发城市、时间、人数、预算、旅行风格。
- **Token 为极高敏感凭证**，禁止在对话中打印 Token 明文；勿在日志中打印完整 Token。
- 默认将 API 返回的 Markdown **如实展示给用户**，响应不完整时可重试。