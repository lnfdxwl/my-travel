# 工具使用指南

> 加载时机：需要查实时交通/酒店/景点数据时读取。

## 携程问道 (ctrip-wendao)

Skill 位置：`.claude/skills/ctrip-wendao/`（项目级）

调用方式：
```bash
cd /Users/zhaozeyang/my-travel/.claude/skills/ctrip-wendao/scripts
WENDAO_API_KEY="a22b18cd04124d5289fb7376ca283e15" node wendao_query.js "你的查询"
```

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

用于查询景点真实开放时间、地点坐标、附近搜索等。已配置在 `~/.claude.json`，Claude Code 会话中可直接使用。

### 调用方式（mcporter）

```bash
PATH="/opt/homebrew/bin:$PATH"
MCPORTER=/Users/zhaozeyang/.npm/_npx/bdbf2deecdd22bc5/node_modules/.bin/mcporter
```

> 注：node 在 `/opt/homebrew/bin/node`，mcporter 需通过完整路径调用。

### 查询景点开放时间（两步走）

**第一步**：用景点名称搜索，获取 `place_id`：
```bash
$MCPORTER call google-maps.maps_search_places query="Shah-i-Zinda Samarkand Uzbekistan"
# 返回数组，取第一条的 place_id
```

**第二步**：用 `place_id` 获取详情（含开放时间）：
```bash
$MCPORTER call google-maps.maps_place_details placeId="ChIJtWrGxqQYTT8R7glw_6oUdmA"
# 返回 opening_hours.weekday_text 数组，每天一行
```

**批量查询示例**（脚本化）：
```bash
PATH="/opt/homebrew/bin:$PATH"
MCPORTER=/Users/zhaozeyang/.npm/_npx/bdbf2deecdd22bc5/node_modules/.bin/mcporter

# 搜索并打印 place_id
$MCPORTER call google-maps.maps_search_places query="Registan Samarkand" 2>&1 | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['place_id'], d[0]['name'])"

# 获取开放时间
$MCPORTER call google-maps.maps_place_details placeId="ChIJN5PlwrcYTT8Rr5LMngOOLFM" 2>&1 | \
  python3 -c "
import json,sys
d=json.load(sys.stdin)
h=d.get('opening_hours') or {}
for t in h.get('weekday_text',[]): print(t)
"
```

### 可用工具（18个）

| 工具 | 用途 |
|------|------|
| `maps_search_places` | 按名称搜索地点，返回 place_id、坐标、评分 |
| `maps_place_details` | 按 place_id 获取详情，含开放时间、电话、地址 |
| `maps_geocode` | 地址转坐标 |
| `maps_batch_geocode` | 批量地址转坐标（最多 50 个） |
| `maps_search_nearby` | 搜索附近 POI |
| `maps_directions` | 路线规划 |
| `maps_distance_matrix` | 多点距离矩阵 |
| `maps_weather` | 查询天气 |
| `maps_explore_area` | 探索区域内热门地点 |

### 注意事项

- 开放时间以**谷歌地图实时数据为准**，不要凭记忆估算（实测差异可达数小时）
- 部分开放式广场（如广场、集市入口）可能无时间或返回 24 小时
- 查到的时间是本地时间，直接填入攻略即可
- 季节性变化：旺季（5-9月）部分景点延长至晚 22:00，淡季缩短，查询时间靠近出行日期为准
