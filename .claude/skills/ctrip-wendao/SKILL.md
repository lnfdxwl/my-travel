---
name: ctrip-wendao
description: "Query real-time travel information via Ctrip Wendao (携程问道) API. Use this skill whenever the user needs to look up flights, trains, hotels, scenic spots, or any travel-related information that requires accurate, real-time data. This includes: checking flight schedules/prices/status between cities on specific dates, querying train timetables and ticket prices, searching hotel availability and rates, looking up tourist attractions and travel tips. Trigger when the user mentions specific dates with travel plans, asks about departure/arrival times, wants to compare flight or train options, needs hotel recommendations for a destination, or is planning any trip itinerary that requires current schedule data. Also trigger when verifying existing travel information for accuracy (e.g. confirming a flight time is correct). Keywords: 航班, 机票, 火车, 高铁, 酒店, 民宿, 景点, 旅行, 出行, 行程, flight, train, hotel, travel, schedule, timetable, booking, 携程, ctrip."

metadata:
  skillhub.creator: "zhangchi78"
  skillhub.updater: "zhangchi78"
  skillhub.version: "V1"
  skillhub.source: "FRIDAY Skillhub"
  skillhub.skill_id: "70195"
---

# 携程问道 (Ctrip Wendao) — 实时旅行信息查询

通过携程问道 API 查询实时航班、火车、酒店、景点等旅行信息。该 API 基于携程的海量实时数据，能够返回准确的航班时刻、价格、火车车次、酒店报价等信息。

## 何时使用

当你需要获取以下任何一种信息时，应该使用此 skill：

- 某天某条航线的航班时刻、价格、航空公司信息
- 火车/高铁车次的发车时间、到达时间、票价
- 某个目的地的酒店价格和可用情况
- 景点门票信息、开放时间
- 旅行路线规划中需要确认的实时交通信息
- 验证已有行程中航班/火车时间是否准确

核心优势是**实时性**——不依赖训练数据中的历史信息，而是每次查询都能获取最新的航班动态和价格。

## API 配置

| 项目 | 值 |
|------|-----|
| Endpoint | `https://externalcallback.ctrip.com/skills/api/crew/qclaw/searchInfo` |
| Method | POST |
| Content-Type | application/json |
| API Key 环境变量 | `WENDAO_API_KEY` |
| API Key | `e55daf2030f64fbf882e8da9736d3fdb` |

## 使用方式

### 方式一：通过脚本调用（推荐）

Skill 内置了查询脚本，位于 `scripts/wendao_query.js`，需要 Node.js v18+。

在 PowerShell 中执行：
```powershell
cd <skill-path>\scripts
$env:WENDAO_API_KEY="e55daf2030f64fbf882e8da9736d3fdb"
node wendao_query.js "你的查询问题"
```

如果用户的 workspace 中有 `scripts/wendao_query.js` 的副本，也可以直接使用那个。

### 方式二：直接 HTTP 调用

如果环境不方便使用 Node.js 脚本，也可以直接构造 HTTP 请求：

```javascript
const response = await fetch("https://externalcallback.ctrip.com/skills/api/crew/qclaw/searchInfo", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    inputs: {
      token: "e55daf2030f64fbf882e8da9736d3fdb",
      query: "你的查询问题"
    }
  })
});
const data = await response.json();
// 结果在 data.result.content 中
```

## 查询技巧

为了获得最准确的结果，查询时应该包含以下关键信息：

### 航班查询
- 明确日期：`2026年5月28日`
- 明确城市/机场：`天津到乌鲁木齐`
- 如果知道航班号更好：`GS7578航班`
- 示例：`"2026年5月28日GS7578航班天津到乌鲁木齐的起飞和到达时间"`

### 火车查询
- 明确日期和车次：`2026年5月30日Z6512`
- 或者指定出发到达城市：`伊宁到乌鲁木齐的火车`
- 示例：`"2026年5月30日Z6512列车伊宁到乌鲁木齐的发车和到达时间"`

### 酒店查询
- 明确目的地和入住日期：`伊宁 5月29日入住`
- 可以指定类型/价位：`经济型`、`五星级`
- 示例：`"2026年5月29日伊宁市区酒店推荐，2人入住1晚"`

### 景点查询
- 明确景点名称或目的地：`喀拉峻草原门票`
- 示例：`"喀拉峻草原景区门票价格和开放时间"`

## 响应解析

API 返回 JSON，关键字段结构为：
```json
{
  "result": {
    "content": "... 格式化的查询结果文本 ..."
  }
}
```

`content` 字段包含 Markdown 格式的结果文本，通常包括：
- 航班/车次的具体时刻
- 价格信息
- 航空公司/列车类型
- 携程深链接（可忽略）

## 注意事项

1. **查询语言**：使用中文自然语言提问，就像对旅行顾问说话一样
2. **日期格式**：建议使用 `YYYY年M月D日` 格式，避免歧义
3. **结果时效**：查询结果反映当时的实时信息，航班价格和余票可能随时变化
4. **频率限制**：避免短时间内发送大量请求，正常使用频率即可
5. **错误处理**：如果返回 HTTP 错误或空结果，可以稍后重试或换一种问法
6. **API Key**：当前使用用户注册的 API Key，如过期需要重新获取

## 典型工作流

在规划旅行行程时的典型使用流程：

1. 用户提出旅行需求（如：计划5月底去新疆）
2. 根据目的地查询可用航班/火车选项
3. 比较不同日期/时间的价格和时刻
4. 查询目的地酒店
5. 查询景点门票信息
6. 整合所有信息，生成准确的行程方案

每一步都通过此 API 查询实时数据，确保行程中所有时间和价格信息的准确性。
