# 攻略规范

> 加载时机：新建行程、修改攻略结构时读取。

## 文件命名

- 文件夹：`trips/{目的地拼音/英文}-{年份}/`，如 `uzbekistan-2026`
- 攻略文件：`{目的地}-trip-guide.html`
- 模板位置：`templates/trip-guide-template.html`

## 版本规则

攻略文件名加版本后缀：`{目的地}-trip-guide-v1.html`、`v2.html`…

**版本升级原则**：
- 不确定时主动问主人，不自作主张
- 通常触发升版本的情况：行程结构变化（城市增减、天数调整、主要交通方式变更、整体重排）
- 通常不升版本的情况：时间微调、价格更新、补充说明、错别字修正

同一目的地多个版本并存于同一文件夹，方便回溯对比。

## 攻略 HTML 内容结构

参考 `templates/trip-guide-template.html`，标准章节顺序：

1. Hero 头图（目的地、日期、人数、出发地）
2. 行程概览（交通时刻卡片 + 城市游览顺序）
3. 每日行程（按 Day 分块，含时间轴）
4. 酒店推荐
5. 餐饮推荐
6. 交通订票指南（订票步骤 + 备选班次对比表）
7. 实用信息（货币、通讯、天气、打车）
8. 出行前准备清单
9. 决策记录（可选，记录行程取舍过程）

## 发布流程

攻略完成后 push 到 GitHub，自动发布：

```bash
git add . && git commit -m "更新攻略" && git push
```

1-2 分钟后访问：`https://lnfdxwl.github.io/my-travel/trips/{目的地}-{年份}/{文件}.html`

## 谷歌地图链接规范

攻略中所有**景点、酒店、火车站、机场**都必须附带谷歌地图链接，方便直接导航。

**链接格式**（统一样式）：
```html
<a href="https://maps.google.com/?q={地点名称+城市}" target="_blank" style="color:#2563a8;text-decoration:none;font-size:13px;">📍地图</a>
```

⚠️ **必须用地点名称，不能用坐标**：`?q=lat,lng` 格式在地图上只会显示经纬度数字，不显示地点名称；`?q=Registan+Samarkand` 格式会直接搜索并显示景点名称。

示例：
```html
<!-- ✅ 正确 -->
<a href="https://maps.google.com/?q=Registan+Samarkand" ...>📍地图</a>
<a href="https://maps.google.com/?q=Shah-i-Zinda+Samarkand" ...>📍地图</a>
<a href="https://maps.google.com/?q=Ark+of+Bukhara" ...>📍地图</a>

<!-- ❌ 错误 -->
<a href="https://maps.google.com/?q=39.6546466,66.9757669" ...>📍地图</a>
```

**加链接的位置**：
- 每日行程的 `.activity` 里，紧跟地点名称后
- 酒店详情卡片的 `.name` 里
- 实用信息的交通章节里

## 景点开放时间规范

每个景点活动后必须标注开放时间，**必须从谷歌地图实时查询，禁止凭记忆估算**。

**格式**（绿色小字，放在景点描述末尾）：
```html
<br><small style="color:#27ae60;font-size:12px;">🕐 开放时间：9:00–18:00（每日）</small>
```

特殊情况写法：
```html
<!-- 周一休息 -->
<br><small style="color:#27ae60;font-size:12px;">🕐 开放时间：7:00–19:00（周一休息）</small>
<!-- 工作日/周末不同 -->
<br><small style="color:#27ae60;font-size:12px;">🕐 开放时间：7:00–22:00（周一至五），9:00–22:00（周六日）</small>
<!-- 开放式广场/全天 -->
<br><small style="color:#27ae60;font-size:12px;">🕐 开放时间：8:00–24:00（每日至午夜，开放式广场）</small>
```

**查询流程**（使用 `google-maps` MCP，见 `docs/tools.md`）：
1. `maps_search_places` — 用景点名称搜索，获取 `place_id`
2. `maps_place_details` — 用 `place_id` 获取 `opening_hours.weekday_text`
3. 将每天的时间写入攻略；如各天一致写"每日"，如有例外逐一标注

## 打车指南规范

每份攻略的"实用信息"章节必须包含**打车完全指南**，内容包括：

1. 当地主流打车 App（如 Yandex Go、Grab、Bolt、Uber 等）
2. iOS/安卓安装方式（出发前在国内安装）
3. 注册方式（支持中国 +86 手机号）
4. 本行程所有关键路线的费用参考表
5. 注意事项（网络先行、不拦路边车、核对车牌等）

模板已包含完整结构，新建攻略时替换 App 名称和费用即可。

## 餐厅预订规范

攻略中每家**推荐餐厅**都需标注预订建议，尤其旺季出行：

- 用携程问道（`ctrip-wendao` skill）查询该餐厅旺季是否需要预订
- 需要预订的餐厅，在 `.desc` 里加 `⚠️ 建议/必须提前 X 天电话预订`，并附电话号码
- 每日行程中涉及该餐厅的 `.activity` 也同步加预订提醒

## 景点间交通规范

每日行程中相邻活动之间，在 `.activity` 末尾加一行交通说明：

```html
<small style="color:#888;">🚶 步行约 X 分钟（X km）</small>
<!-- 或 -->
<small style="color:#888;">🚕 打车约 X 分钟（X km）</small>
```

距离数据通过携程问道或谷歌地图 MCP 查询，不要凭感觉估算。

## HTML 设计风格

- 配色：主色 `#2563a8`（蓝）、辅色 `#d4a574`（金）、警示 `#c0392b`（红）
- 背景：`#f5f1e8`（米色）
- 组件：transport-item 卡片、day 块、time-block 时间轴、tip/warn/info 标注框、place-card 地点卡、checklist 清单
- 完整 CSS 见模板文件，不要自行修改风格，保持统一
