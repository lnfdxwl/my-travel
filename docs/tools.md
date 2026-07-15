# 工具使用指南

> 加载时机：需要查实时交通/酒店/景点数据时读取。

## 携程问道 (ctrip-wendao)

Skill 位置：`.claude/skills/ctrip-wendao/`（项目级）

调用方式：
```bash
cd /Users/zhaozeyang/my-travel/.claude/skills/ctrip-wendao/scripts
WENDAO_API_KEY="e55daf2030f64fbf882e8da9736d3fdb" node wendao_query.js "你的查询"
```

> Key 以 `.claude/skills/ctrip-wendao/SKILL.md` 里记录的为准，这里的仅作示例，如果不一致以 SKILL.md 为准。

查询示例：
- `"2026年6月19日塔什干到撒马尔罕的全部火车班次"`
- `"2026年6月22日布哈拉到塔什干的航班"`
- `"撒马尔罕 2026年6月19日酒店推荐"`

### 可信度说明

| 查询类型 | 可信度 | 说明 |
|---------|--------|------|
| 国际航班 | ✅ 高 | 携程核心业务，数据最全 |
| Afrosiyob 等主力高铁 | ✅ 高 | 乌铁官方合作 |
| 国内航班（如 Silk Avia）| ✅ 高 | |
| 热门酒店价格 | ✅ 中 | 价格有延迟，仅供参考 |
| 境内慢车/包厢车（Express 系列）| ❌ 低 | 经常漏班，不在携程销售体系 |
| 冷门景点门票 | ❌ 低 | 可能过时或缺失 |

**重要**：订票前必须去官方网站核实余票，Wendao 适合"粗查"，不适合"下单前确认"。

常用官方网站：
- 乌兹别克铁路：eticket.railway.uz

## 谷歌地图 MCP (google-maps)

用于查询景点真实开放时间、真实照片、地点坐标、附近搜索等。已作为原生 MCP 工具接入 Claude Code 会话，**直接调用工具即可，不需要走 bash/mcporter 这一层**（`mcporter` 命令行方式已过时，如果发现环境里又变回需要手动调用命令行，说明工具集成方式变了，回来更新本文档）。

可用工具前缀均为 `mcp__google-maps__*`，常用的有 `maps_search_places`、`maps_place_details`、`maps_geocode`、`maps_search_nearby`、`maps_directions`、`maps_distance_matrix`、`maps_weather`、`maps_explore_area` 等，具体参数看工具定义里的 schema 即可。

### 查询景点开放时间 + 真实照片（两步走）

**第一步**：`maps_search_places` 用景点名称搜索，拿到 `place_id`（建议用英文名搜，命中率更高，比如 "Acropolis of Athens" 而不是"雅典卫城"）。

**第二步**：`maps_place_details` 传入 `place_id`，同时可以传 `maxPhotos`（如 1）拿到真实照片 URL。返回结果里：
- `opening_hours.weekday_text` — 每天的开放时间，一行一天
- `photos[].url` — 真实照片直链，可以直接用在攻略的 `<img>` 标签里（见 `guide-spec.md` 景点配图规范）

### 注意事项

- 开放时间以**谷歌地图实时数据为准**，不要凭记忆估算（实测差异可达数小时）
- 部分开放式广场（如广场、集市入口）可能无时间或返回 24 小时
- 查到的时间是本地时间，直接填入攻略即可
- 季节性变化：旺季（5-9月）部分景点延长至晚 22:00，淡季缩短，查询时间靠近出行日期为准
- 同一个景点，中英文名称搜索结果可能不同（比如返回的是附近的同名小地标），拿到结果后核对一下坐标/地址是否真的对得上再用
