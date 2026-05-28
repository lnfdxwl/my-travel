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
