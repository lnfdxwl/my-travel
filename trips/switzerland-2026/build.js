#!/usr/bin/env node
/**
 * 瑞士 10 日游「每日吃什么」攻略 —— 生成器
 *
 * 数据来源：
 *   data/places.json  Google Places API（评分/地址/电话/官网/营业时间）
 *   data/photos.json  Google Places Photos（缩略图 URL）
 * 刷新数据：bash trips/switzerland-2026/refresh-data.sh
 *
 * 编辑内容（推荐理由、价格、交通备注）写在本文件的 DAYS / BOOKING 里。
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const P = JSON.parse(fs.readFileSync(path.join(DIR, 'data/places.json'), 'utf8'));
const PH = JSON.parse(fs.readFileSync(path.join(DIR, 'data/photos.json'), 'utf8'));

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 把 Google 的英文营业时间转成中文简写 */
function hoursCN(key) {
  const h = P[key] && P[key].hours;
  if (!h) return null;
  const DAY = { Monday: '一', Tuesday: '二', Wednesday: '三', Thursday: '四', Friday: '五', Saturday: '六', Sunday: '日' };
  const norm = s => s
    .replace(/(\d{1,2}):(\d{2})\s*AM/g, (_, a, b) => `${String(+a).padStart(2, '0')}:${b}`)
    .replace(/(\d{1,2}):(\d{2})\s*PM/g, (_, a, b) => `${(+a % 12) + 12}:${b}`)
    .replace(/\s*–\s*/g, '–').replace(/Closed/i, '休');
  const rows = h.map(x => {
    const [d, ...rest] = x.split(': ');
    return { d: DAY[d.trim()] || d, t: norm(rest.join(': ')).trim() };
  });
  // 合并连续相同时间
  const groups = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (last && last.t === r.t) last.days.push(r.d);
    else groups.push({ t: r.t, days: [r.d] });
  }
  return groups.map(g => {
    const d = g.days.length >= 3 ? `${g.days[0]}–${g.days[g.days.length - 1]}` : g.days.join('');
    return `周${d} ${g.t}`;
  }).join('，');
}

const mapsUrl = key => (P[key] && P[key].maps) || null;
/* 图片：优先用本地文件（images/）—— 无需梯子、不怕 Google URL 过期；
   本地不存在时回退到 Google CDN，两种情况页面都能正常渲染 */
const hasLocal = key => fs.existsSync(path.join(DIR, 'images', `${key}.jpg`));
const photo = key => hasLocal(key) ? `images/${key}.jpg` : ((PH[key] && PH[key].uri) || null);
/** 大图：优先用抓取时存的 full，否则改写 Google 图片 URL 的尺寸后缀 */
const photoFull = key => {
  if (fs.existsSync(path.join(DIR, 'images', `${key}@2x.jpg`))) return `images/${key}@2x.jpg`;
  const p = PH[key];
  if (!p) return null;
  if (p.full) return p.full;
  if (!p.uri) return null;
  return p.uri.replace(/=s\d+(-w\d+)?(-h\d+)?$/, '=s1600-w1600-h1200');
};

/** 小红书搜索关键词（按中文旅行者的实际搜法：中文地名 + 店名）
 *  说明：小红书不开放笔记检索，外部搜索引擎也基本不收录其内容，
 *  因此这里生成的是「站内搜索链接」而非具体笔记链接 —— 点开即是该店的搜索结果页。*/
const XHS = {
  'barrel-oak':'蒙特勒 Barrel Oak', 'le-safran':'蒙特勒 Safran 湖景餐厅',
  'whymper':'采尔马特 Whymper Stube 芝士火锅', 'schaeferstube':'采尔马特 Schäferstube 烤羊排',
  'kulm3100':'戈尔内格拉特 山顶餐厅', 'migros-spiez':'施皮茨 Migros 自助餐',
  'krone-spiez':'施皮茨 Krone 餐厅', 'mia-spiez':'施皮茨 意餐',
  'baeren':'翁根 Bären 餐厅', 'r1903':'翁根 Schönegg 1903',
  'aletsch':'少女峰 山顶餐厅', 'bollywood':'少女峰 印度餐厅', 'crystal':'少女峰 Crystal 餐厅',
  'dasina':'翁根 Da Sina 披萨', 'caprice':'翁根 Caprice 餐厅', 'chezmeyers':'翁根 Chez Meyers 米其林',
  'tham':'米伦 Tham 中餐厅', 'staeger':'米伦 Stägerstübli', 'eigergh':'米伦 Eiger Guesthouse',
  'galliker':'卢塞恩 Galliker 百年老店', 'bolero':'卢塞恩 Bolero 西班牙餐厅',
  'sternen':'苏黎世 Sternen Grill 烤肠', 'zeughaus':'苏黎世 Zeughauskeller 军械库餐厅',
  'swisschuchi':'苏黎世 Swiss Chuchi 芝士火锅',
  'adler-vaduz':'瓦杜兹 Adler 餐厅', 'madeinitaly':'瓦杜兹 Made in Italy', 'torkel':'瓦杜兹 Torkel',
  'williams':'苏黎世 Williams ButchersTable 牛排', 'thali':'苏黎世 Thali House 印度菜',
  'manzoni':'苏黎世 Manzoni Bar', 'fonduebeizli':'圣加仑 Fondue Beizli 芝士火锅',
  'bistro-sg':'圣加仑 美食推荐', 'schloessli':'莱茵瀑布 Schlössli Wörth',
  'rheinfels':'莱茵河畔施泰因 餐厅', 'hohenklingen':'莱茵河畔施泰因 城堡',
  'lipp':'日内瓦 Brasserie Lipp', 'ducentre':'日内瓦 Café du Centre',
  'mullers':'日内瓦 Mullers Factory 咖啡',
};
const xhsUrl = key => XHS[key]
  ? 'https://www.xiaohongshu.com/search_result?keyword=' + encodeURIComponent(XHS[key])
  : null;


/** 渲染一个餐厅条目（缩略图 + 名称 + 评分 + 价格 + 标记） */
function entry(o) {
  if (o.raw) {
    return `<div class="rest plain"><div class="rbody"><div class="rname">${esc(o.raw)}</div>` +
      (o.price ? `<div class="price">CHF ${esc(o.price)}</div>` : '') +
      (o.tag ? `<div class="note">${esc(o.tag)}</div>` : '') + `</div></div>`;
  }
  const p = P[o.key] || {};
  const img = photo(o.key);
  const url = mapsUrl(o.key);
  const name = o.name || p.name || o.key;
  const badges =
    (o.book ? '<span class="need-book">需订</span>' : '') +
    (o.verify ? '<span class="verify">待确认</span>' : '') +
    (o.cash ? '<span class="cash">现金</span>' : '');
  return `<div class="rest">` +
    (img ? `<img class="rthumb" src="${esc(img)}" data-full="${esc(photoFull(o.key) || img)}" data-name="${esc(name)}" alt="${esc(name)}" title="点击看大图" loading="lazy" referrerpolicy="no-referrer">` : '') +
    `<div class="rbody">` +
    `<div class="rname">${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(name)}</a>` : esc(name)}${badges}</div>` +
    (p.rating ? `<div class="rrate">★ ${p.rating} <span class="note">(${p.reviews})</span></div>` : '') +
    (o.price ? `<div class="price">CHF ${esc(o.price)}</div>` : '') +
    (o.tag ? `<div class="note">${esc(o.tag)}</div>` : '') +
    (xhsUrl(o.key) ? `<a class="xhs" href="${esc(xhsUrl(o.key))}" target="_blank" rel="noopener">📕 小红书</a>` : '') +
    `</div></div>`;
}

/* ────────────────────────── 编辑内容 ────────────────────────── */

const DAYS = [
{ d: 1, date: '10/3 周六', route: '日内瓦机场 → 蒙特勒（Territet 站）→ 日内瓦湖滨散步 → 西庸城堡（外观）',
  meals: [{ meal: '晚餐',
    rec: [{ key: 'barrel-oak', price: '25–40', tag: '爱尔兰酒吧 · 汉堡/炖肉' }],
    alt: [{ key: 'le-safran', price: '50–70', book: true, tag: '湖景露台 · 地中海菜' },
          { raw: '车站便利店', price: '8–15', tag: 'Coop Pronto / avec' }],
    why: '落地第一晚不折腾。汉堡（配格鲁耶尔芝士+蘑菇）、爱尔兰炖肉、fish &amp; chips 分量足，有 Halal 和素食。<br><strong>注意：Safran 的 Google 评分其实非常高（4.7 / 4100 条），比 Barrel Oak 高不少</strong> —— 只是贵一倍。想第一晚就吃好的，它值这个钱。',
    note: '机场→蒙特勒火车 <strong>1h15 直达</strong>，每小时 2 班。<br><span class="warn">⚠️ 你在 Territet 下车，两家店都在蒙特勒市区</span>：Barrel Oak 在 Av. des Alpes 37（近火车站），Safran 在 Grand-Rue 81（湖边）。沿湖滨大道走 <strong>20–25 分钟</strong>，正好是行程里的「湖滨散步」，或坐一站火车 3 分钟。<br><span class="warn">⚠️ 周六 Coop 17–18 点已关</span>，买水只能靠车站便利店。' }] },

{ d: 2, date: '10/4 周日', route: '蒙特勒 → Visp → 采尔马特 → 戈尔内格拉特 3089m 全景台（<strong>Riffelsee 倒影</strong>）→ 采尔马特（日照金山）',
  meals: [
  { meal: '午餐',
    rec: [{ raw: '采尔马特主街面包房 / 快餐', price: '15–25', tag: 'Bahnhofstrasse 沿街' }],
    alt: [{ key: 'kulm3100', price: '25–40', tag: '海拔 3100m 山顶自助' }],
    why: '12:30 才到站，吃快的，把时间留给下午山景、把钱留给晚上的火锅。<br>3100 Kulmhotel 是阿尔卑斯最高的酒店，评分 4.6，能边吃边正对马特洪峰 —— 贵一点但不坑。',
    note: '蒙特勒→Visp→采尔马特 <strong>约 2.5–3h</strong>（Visp 换乘）。餐厅都在车站外主街上，<strong>出站即是</strong>。齿轨火车 Zermatt→Gornergrat <strong>33 分钟</strong>。<br><span class="warn">⚠️ 周日 Coop 全关</span>，原攻略「主街 Coop 买简餐」当天不成立。' },
  { meal: '晚餐',
    rec: [{ key: 'whymper', price: '35–55', book: true, tag: '🍲 芝士火锅 / 烤芝士' }],
    alt: [{ key: 'schaeferstube', price: '40–65', book: true, tag: '炭烤羊排 · Hotel Julen' }],
    why: '<strong>全程唯一一顿正经芝士火锅就吃这顿。</strong>瓦莱州是 fondue / raclette 的原产地，在采尔马特吃比在苏黎世吃更正宗，<strong>价格反而便宜一截</strong>（苏黎世 Swiss Chuchi 要 50–70）。吃了这顿，后面苏黎世就不用再花这个钱。<br>好消息：Google 显示它<strong>每天 12:00–21:30 营业，周日也开</strong>。',
    note: 'Whymper Stube 在 Bahnhofstrasse 80（Monte Rosa 酒店），<strong>车站步行约 5 分钟</strong>。<br><span class="warn">⚠️ 原攻略推荐的「采尔马特 Hotel Falken」并不存在</span> —— Hotel Falken 在<strong>翁根</strong>（和卢塞恩），采尔马特没有这家店。已替换为真实存在的 Schäferstube（Riedstrasse 2，Hotel Julen 旗下，4.6 分 / 1244 条）。' }] },

{ d: 3, date: '10/5 周一', route: '采尔马特 → Visp → 施皮茨（城堡 + 湖边，行李寄存车站）→ 因特拉肯 → 翁根（住）',
  meals: [
  { meal: '午餐',
    rec: [{ key: 'migros-spiez', price: '15–25', tag: '车站旁自助餐厅' }],
    alt: [{ key: 'krone-spiez', price: '30–45', tag: '瑞士菜 · 离城堡最近' },
          { key: 'mia-spiez', price: '25–40', tag: '意餐 / 披萨' }],
    why: '寄完行李上楼就吃。<strong>瑞士人自己天天吃的那种自助</strong>，热菜现打、有汤有沙拉，CHF 15–25 管饱。晚上翁根有 Bären 那顿好的，中午没必要再花钱。',
    note: '采尔马特→Visp→施皮茨 <strong>约 1.5h</strong>。<br>Migros 在 Bahnhofstrasse <strong>火车站旁，出站即到</strong>；Krone 在 Seestrasse 28，<strong>离施皮茨城堡约 600m</strong>（几家里最近）；Mia Osteria 在 Thunstrasse 6，约 1km。<br>行李用施皮茨站行李柜（大件约 CHF 9–12）。' },
  { meal: '晚餐',
    rec: [{ key: 'baeren', price: '35–55', book: true, verify: true, tag: '翁根村里最高分' }],
    alt: [{ key: 'r1903', price: '40–60', verify: true, tag: '时令菜 + 山景' },
          { raw: 'Coop Wengen 熟食', price: '10–15', tag: '18:30 关门' }],
    why: '<strong>Google 4.8 分（537 条），是翁根村里评价最高的一家</strong>，瑞士菜量大稳定，香草用自家花园的。<br>村子小、餐厅少，<strong>订位同时也等于确认了它 10 月还开着</strong>，一举两得。<br><span class="note">备选 Restaurant 1903 评分只有 4.1（71 条），别抱太高期待。</span>',
    note: '施皮茨→因特拉肯→翁根 <strong>约 1.5h</strong>。Bären 在 Am Acher 1363，<strong>村中心步行约 5 分钟</strong>，<strong>每天 18:00–21:30 只做晚餐</strong>。<br><span class="warn">⚠️ 本日时间风险最大：19:30 前必须到翁根。</span>翁根餐厅厨房 20:00 前后停单、Coop 18:30 关门。施皮茨游览压在 2 小时内，<strong>17:30 前上车</strong>。' }] },

{ d: 4, date: '10/6 周二', route: '翁根 → 小夏戴克 → 少女峰 3454m（观景台 / 冰宫 / 雪原）→ 翁根',
  meals: [
  { meal: '午餐',
    rec: [{ key: 'aletsch', price: '25–40', tag: '瑞士菜自助 · 正对冰川' }],
    alt: [{ key: 'crystal', price: '35–55', tag: '点餐制 · 山顶最高分' },
          { key: 'bollywood', price: '25–40', tag: '印度菜自助 · 素食友好' },
          { raw: '自带三明治', price: '10–15', tag: '前一晚 Coop 买' }],
    why: '三家都在山顶站内。Aletsch 最实在，营业 10:15–15:30。<br><strong>但按 Google 评分，Restaurant Crystal 明显更好（4.6 / 846 条，vs Aletsch 4.2、Bollywood 3.9）</strong> —— 只开 11:00–14:30，想坐下来好好吃就它。<br><strong>最省是前一晚在翁根 Coop 买三明治带上去，一天能省 25–30。</strong>',
    note: '翁根→少女峰登山火车 <strong>约 1.5h</strong>（小夏戴克换乘），下山同样 1.5h，回翁根约 15:00–16:00。三家都在 <strong>Jungfraujoch 站内</strong>，出站沿通道即到。<br><span class="warn">⚠️ 12:00–13:00 排队极长</span>，建议 <strong>11:15 前先吃</strong>再逛观景台冰宫，或 13:30 后吃（注意 Crystal 14:30 就停）。<br><span class="note">原攻略写的「Jochstation 自助餐厅」不存在 —— Jochstation 是车站名。</span>' },
  { meal: '晚餐',
    rec: [{ key: 'dasina', price: '25–40', verify: true, tag: '意餐 / 披萨' }],
    alt: [{ key: 'caprice', price: '50–80', book: true, verify: true, tag: '主厨菜 · Maya Caprice' }],
    why: '上了一天少女峰已经累了 —— 这家<strong>不用订、不用换衣服、吃完就能睡</strong>。<br>Caprice 是翁根最「正经吃一顿」的选择（酒店已更名 <strong>Maya Caprice Boutique Hotel &amp; Spa</strong>，4.5 / 266 条），但 CHF 50–80 在这趟行程里算贵的。',
    note: '两家都在翁根村内，<strong>步行 5 分钟范围</strong>（翁根是无车悬崖小镇，从头走到尾几百米）。<br>Da Sina 在 Im Gruebi，Maya Caprice 在 Schonegg 1333d，离缆车站约 200m。' }] },

{ d: 5, date: '10/7 周三', route: '翁根 → 劳特布伦嫩（施陶巴赫瀑布）→ 米伦（无车悬崖村 + 轻徒步）→ 翁根',
  meals: [
  { meal: '午餐',
    rec: [{ key: 'tham', price: '25–40', cash: true, tag: '中餐 · 五星厨师主理' }],
    alt: [{ key: 'eigergh', price: '20–35', tag: '车站对面 · 全年营业' },
          { key: 'staeger', price: '30–50', tag: '1901 老木屋 · 瑞士传统菜' },
          { raw: '米伦 Coop 三明治', price: '10–15', tag: '带去徒步路上吃' }],
    why: '黑椒牛柳、咕咾鸡分量很足，老板 1997 年开到现在。连吃几天西餐后最好的换口味。<br><strong>Eiger Guesthouse 评分其实更高（4.6 / 536 条）且全年营业</strong>，10 月歇业风险最低，还更便宜 —— 稳妥派选它。<br>Stägerstübli 是本地人爱去那家（芝士火锅、raclette、Spätzli、奶油小牛肉炖菜）。',
    note: '翁根→劳特布伦嫩 <strong>15 分钟</strong>，换缆车 + 小火车上米伦 <strong>约 20 分钟</strong>。<br>Tham 和 Stägerstübli 在主街步行街上，Eiger Guesthouse <strong>正对米伦车站</strong>。<br><span class="warn">⚠️ Tham 只收现金</span>（CHF / EUR / USD），每天 12:00–15:00 / 17:30–20:30。<br><span class="note">米伦非常随意，登山服吃饭完全没问题。</span>' },
  { meal: '晚餐',
    rec: [{ key: 'baeren', price: '35–55', book: true, verify: true, tag: '村里最高分' },
          { key: 'dasina', price: '25–40', verify: true, tag: '更便宜' }],
    alt: [{ key: 'chezmeyers', price: '108–158', book: true, verify: true, tag: '米其林收录法餐' }],
    why: '省钱且稳妥，走了一天徒步不用换衣服直接去。<br><span class="warn">⚠️ Chez Meyer\'s 我要更正之前的说法</span>：① 营业日是 <strong>周三–周六 19:00–22:00</strong>（周日到周二休），Day 5 周三确实能去；② 但<strong>价格是套餐制 —— 3 道 CHF 108、5 道 CHF 158 每人</strong>，远高于我之前估的 60–90；③ 酒店官网挂的是「2026 年 12 月 17 日起重新开业」，<strong>10 月很可能根本不营业</strong>。想去务必先打电话问清楚。',
    note: '米伦→劳特布伦嫩→翁根 <strong>约 40 分钟</strong>。三家都在翁根村内步行范围。<br>Chez Meyer\'s 在 Hotel Regina（Schonegg 中心），有钢琴伴奏和山景，菜单是主厨定的惊喜菜单不能点菜，Google 仅 40 条评价（4.3）。' }] },

{ d: 6, date: '10/8 周四', route: '翁根 → 因特拉肯 → 卢塞恩（卡佩尔廊桥 / 狮子纪念碑 / 冰河公园 / 穆塞格城墙）→ 苏黎世（班霍夫大街）',
  meals: [
  { meal: '午餐',
    rec: [{ key: 'galliker', price: '35–55', book: true, tag: '🥧 1856 年四代家族店' }],
    alt: [{ key: 'bolero', price: '30–50', book: true, tag: '西班牙 tapas + 现做海鲜饭' }],
    why: '<strong>值得花钱的第二顿。</strong>必点当地名菜 <strong>Chögelipastetli</strong>（酥皮盅装小牛肉蘑菇），还有小牛头、牛肚、Läberli 这些老派菜，别处吃不到。<br><strong>关键是它排在中午 —— 午市套餐比晚市便宜近一半，份量一样。</strong>缺点是有点吵，Google 只有 4.3（302 条），冲的是「本地人的百年老店」而不是网红分数。<br>想稳一点选 Bolero：4.6 分、2239 条，卢塞恩评价最好的餐厅之一。',
    note: '翁根→因特拉肯→卢塞恩 <strong>约 2.5–3h</strong>（黄金山口精华段，<strong>建议订座、坐右侧</strong>，3 小时一趟错过很麻烦）。<br>Galliker 在 Schützenstrasse 1（Kasernenplatz），<strong>卢塞恩站步行约 8–10 分钟</strong>；Bolero 在 Bundesplatz 18，站边几分钟，但<span class="warn">在新城不在老城</span>，走到廊桥约 10 分钟 —— 下车先吃再进老城很顺。<br><span class="warn">⚠️ Galliker 只接电话订位</span>，周一周日休，厨房 11:15–14:30。' },
  { meal: '晚餐',
    rec: [{ key: 'sternen', price: '15–25', tag: '圣加仑烤肠夹面包' }],
    alt: [{ key: 'zeughaus', price: '45–60', book: true, tag: '1487 年军械库 · 传统瑞士菜' }],
    why: '当天赶路累。1962 年开在 Bellevue 广场的国民小吃，<strong>站着吃的圣加仑烤肠</strong>，全城最便宜的靠谱一餐，5696 条评价 4.4 分。二楼还有能看苏黎世湖的坐下餐厅。',
    note: '卢塞恩→苏黎世 <strong>50 分钟</strong>，每 30 分钟一班。<br>Sternen Grill 在 Theaterstrasse 22（Bellevue 广场），<strong>苏黎世 HB 坐电车 2–3 站，或步行约 15 分钟</strong>，每天开到 23:45。<br>Zeughauskeller 在 Bahnhofstrasse 28A（近 Paradeplatz），苏黎世 HB 步行 5–8 分钟，<strong>每天 11:30–23:00</strong>，240 个室内座位但从中午就开始满。' }] },

{ d: 7, date: '10/9 周五', route: '苏黎世 → 瓦杜兹（列支敦士登，城堡全景机位）→ 兰德夸特奥莱 → 苏黎世',
  meals: [
  { meal: '午餐',
    rec: [{ key: 'adler-vaduz', price: '30–45', tag: '列支敦士登传统菜' }],
    alt: [{ key: 'madeinitaly', price: '25–40', tag: '柴火披萨 + 手工意面' },
          { key: 'torkel', price: '80–120', book: true, tag: '王室葡萄园酒窖' }],
    why: '正宗列支敦士登本地菜：<strong>Rösti Vaduzerart</strong>、Spätzle、野味季节菜，香草来自自家花园。Google 上它叫 <strong>Adler 1908</strong>，4.5 分（412 条），比 Tripadvisor 的 4.0 高不少。<br>Made in Italy 性价比最高（4.6 / 271）；Torkel 是瓦杜兹最高分（4.8 / 296），16 分 GaultMillau，开在王室 Herawingert 葡萄园里。',
    note: '苏黎世→Sargans 换巴士→瓦杜兹 <strong>约 1.5–2h</strong>（列支敦士登没有火车站）。三家都在<strong>市中心步行范围</strong>（Herrengasse / Hintergass）。<br><span class="warn">⚠️ 三家营业时间都很窄，周五当天：</span>Adler <strong>09:00–17:00</strong>（周六日全休）· Made in Italy <strong>10:00–14:00</strong> · Torkel 午市<strong>只有 12:00–13:30</strong>。别踩空。<br><span class="note">奥莱里也有餐饮但不值得专门吃。瓦杜兹城堡是王室住所不对外开放，只能外观和远景打卡。</span>' },
  { meal: '晚餐',
    rec: [{ key: 'williams', price: '60–80', book: true, tag: '🥩 瑞士第一牛排' }],
    alt: [{ key: 'thali', price: '25–40', tag: '印度菜 · 平价' },
          { key: 'manzoni', price: '25–40', tag: '意式咖啡吧 + 简餐' }],
    why: '<strong>全行程最贵、也最值得的一顿。</strong>Metzgerei（肉铺）和餐厅开在同一屋檐下 —— <strong>进门先在肉柜前自己挑一块</strong>，瑞士 LUMA 肋眼、美国野牛里脊、日本/澳洲和牛都有，挑完现烤。Google 4.7 分（1286 条）。<br>2026 年 <strong>World\'s 101 Best Steak Restaurants 全球第 64 名、瑞士第 1、德奥瑞区第 1</strong>，米其林指南 2025 收录。<br><span class="note">⚠️ 小红书笔记里写的「世界第 51」是往年名次，2026 年榜单是第 64 —— 瑞士第 1 是准确的。参考消费：4 人 CHF 275（约 69/人，含酒水）。<br>想省就选 Thali House（4.7 / 3052 条，比 Manzoni Bar 的 4.1 好得多）。</span>',
    note: '瓦杜兹→苏黎世 <strong>约 1.5–2h</strong>。<br>Williams 在 <strong>Schifflände 6，Bellevue 广场旁老城 Hechtplatz</strong>，苏黎世 HB 电车 2–3 站（和 Sternen Grill 同一片区）。<br><span class="warn">⚠️ 周日休息</span>；周一–周五 11:30–14:00 / 17:00–23:00（热菜供到 21:30）。<strong>官网 Book a table 在线预订</strong>，8 人以上需邮件。<br><span class="note">为什么排在周五：Day 6 到苏黎世已是傍晚偏晚、Day 8 周六最难订，周五最从容。</span>' }] },

{ d: 8, date: '10/10 周六', route: '苏黎世 → 圣加仑（修道院图书馆，世界遗产）→ 阿彭策尔（彩绘老街）→ 苏黎世',
  meals: [
  { meal: '午餐',
    rec: [{ raw: '阿彭策尔主街 Hauptgasse 小馆', price: '30–50', tag: 'Appenzeller 奶酪 / Siedwurst' }],
    alt: [{ key: 'fonduebeizli', price: '35–55', book: true, tag: '约 10 种芝士火锅' },
          { key: 'bistro-sg', price: '30–45', tag: '瑞士 / 法餐' }],
    why: '阿彭策尔比圣加仑更有地方特色。必点 <strong>Appenzeller 奶酪</strong>（瑞士最有个性的硬奶酪之一）、<strong>Siedwurst</strong> 水煮小牛肉肠配洋葱酱、<strong>Chäshörnli</strong> 芝士通心粉配苹果泥。主街彩绘房子里 Gasthaus 密集，挑评分 4.0 以上的即可。<br>Fondue Beizli（全名 <strong>Fondue Beizli「Neueck」</strong>）Google 4.7 分 / 951 条，比预期高很多，是圣加仑很硬的一家。',
    note: '苏黎世→圣加仑 <strong>约 1h</strong>，圣加仑→阿彭策尔 <strong>约 45 分钟</strong>。建议<strong>图书馆看完直接去阿彭策尔吃</strong>，主街离车站步行 3–5 分钟。<br><span class="warn">⚠️ Fondue Beizli 在圣加仑 Brühlgasse 26，不在阿彭策尔</span>（站步行约 8 分钟）；Bistro St.Gallen 在 Wassergasse 7。<br><span class="note">原攻略备注「上午早去，堡内多逛逛」是别的版本留下的 —— 阿彭策尔没有城堡。</span>' },
  { meal: '晚餐',
    rec: [{ key: 'sternen', price: '15–25', tag: '开到 23:45' }],
    alt: [{ key: 'zeughaus', price: '45–60', book: true, tag: '想吃顿传统的' },
          { key: 'manzoni', price: '25–40', tag: '班霍夫大街旁' }],
    why: '平价收尾。<strong>芝士火锅 Day 2 在采尔马特已经吃过更正宗的了</strong>，苏黎世没必要再花 CHF 50–70 吃第二次。<br>从阿彭策尔回来晚，Sternen Grill 开到 23:45 最保险。<br><span class="note">⚠️ Manzoni Bar 的 Google 评分只有 4.1（185 条），明显弱于另外两家，别抱期待 —— 当咖啡+简餐还行。</span>',
    note: '阿彭策尔→苏黎世 <strong>约 1.5–2h</strong>。Manzoni Bar 在 Schützengasse 15，苏黎世 HB 步行 2 分钟。<br><span class="warn">⚠️ 周六是苏黎世餐厅最满的一天</span> —— 要吃 Zeughauskeller 务必订位。<br><span class="note">苏黎世三晚这样铺开不重样：Day 6 烤肠 → Day 7 牛排 → Day 8 烤肠/简餐。</span>' }] },

{ d: 9, date: '10/11 周日', route: '苏黎世 → 莱茵瀑布 → 沙夫豪森 → 莱茵河畔施泰因 → 回苏黎世取行李 → <strong>日内瓦</strong>',
  meals: [
  { meal: '午餐',
    rec: [{ raw: 'Inseli Bistro（瀑布小岛）', price: '15–30', tag: '每天 09:00–18:30 · 免订' }],
    alt: [{ key: 'schloessli', price: '40–60', book: true, tag: '同岛城堡餐厅 · 全景位' },
          { key: 'rheinfels', price: '35–55', tag: '施泰因老城 · 鱼类特色' }],
    why: 'Inseli Bistro 和 Schlössli Wörth <strong>在莱茵瀑布同一座小岛上</strong> —— 景一模一样，价钱只要一半，还不用订位。<br>想坐下来好好吃就选 Schlössli Wörth（12 世纪城堡，六角塔楼里的全景餐厅，<strong>靠窗位要专门指定</strong>），不过 Google 只有 4.2（1041 条），是「位置分」大于「菜分」的典型。<br>施泰因的 Rheinfels 反而评分更高（4.5 / 466），主打鱼。',
    note: '苏黎世→沙夫豪森 <strong>约 40 分钟</strong>，坐到 <strong>Neuhausen Rheinfall 站</strong>，步行一小段到河滨步道。Schlössli Wörth 在 Rheinfallquai 30，周日 11:30–21:30。<br><strong>参考时间线：</strong>苏黎世 08:30 出发 → 莱茵瀑布 09:20–11:30 → 施泰因 12:00–14:30（含午餐）→ 回苏黎世 16:00 取行李 → 17:00 上车。' },
  { meal: '晚餐',
    rec: [{ key: 'lipp', price: '40–60', book: true, tag: '每天 08:00–次日 01:00' }],
    alt: [{ key: 'ducentre', price: '35–55', tag: '周日 11:00–23:00' },
          { raw: 'Cornavin 火车站内', price: '15–35', tag: '周日保底，一定开' }],
    why: '<strong>好消息：这餐比我之前判断的安全得多。</strong>Brasserie Lipp <strong>每天 08:00 开到次日 01:00，周日照常</strong>，4.5 分 / 4376 条 —— 就算 21:00 才到日内瓦也完全来得及坐下来好好吃一顿法式 brasserie。<br>Café du Centre 周日也开到 23:00（4.1 / 2773）。<br>实在赶就 Cornavin 站内 —— 瑞士大车站餐饮<strong>不受周日休业限制</strong>，约开到 21:00。',
    note: '苏黎世→日内瓦 <strong>2h45</strong>，实际抵达约 <strong>20:00–21:00</strong>。Cornavin→机场火车仅 <strong>6 分钟</strong>。<br>Brasserie Lipp 在 Rue de la Confédération 8（Confédération Centre），<strong>Cornavin 站步行约 10 分钟或电车 1–2 站</strong>；Café du Centre 在 Place du Molard 5，再往湖边一点。<br><span class="note">老城名店 Les Armures、Café du Soleil 的芝士火锅几乎永远满座，当天到得晚赶不上 —— 而且 Day 2 已经吃过更正宗的了。</span>' }] },

{ d: 10, date: '10/12 周一', route: '日内瓦 citywalk（老城 / 大喷泉 / 花钟）→ 日内瓦机场 → 13:20 返程',
  meals: [
  { meal: '早餐',
    rec: [{ raw: '酒店早餐', price: '含', tag: '最省事' }],
    alt: [{ key: 'mullers', price: '10–20', tag: '周一 08:30 开门' },
          { raw: 'Cornavin 站内 / 机场面包房', price: '10–20' }],
    why: '9:30 出发去机场，时间很从容 —— 早上完全可以先 citywalk 一小时再走。<br><strong>Muller\'s Factory 的营业时间已确认：周一到周六 08:30–21:00</strong>（之前标的「待确认」可以去掉了），4.4 分 / 1118 条。',
    note: 'Cornavin→机场火车 <strong>仅 6 分钟</strong>，最早 4:00 就有车，班次密集。<br>Muller\'s Factory 在 Place du Cirque 4，离 Cornavin 步行约 12 分钟，在老城方向 —— 和 citywalk 顺路。' },
  { meal: '午餐',
    rec: [{ raw: 'Coop 三明治带上飞机', price: '10–20' }],
    alt: [{ raw: '机场餐饮', price: '25–45' }],
    why: '13:20 起飞，<strong>机上第一餐通常要 14:30 之后</strong>，先垫一下。机场里吃贵不少。',
    note: 'Cornavin 站内和机场公共区都有 Coop。<strong>机场商店每天 06:00–21:00 营业</strong>，周一正常开。' }] },
];

/** 订位清单：key → 补充的预订渠道信息（Google 没有的） */
const BOOKING = [
  { key: 'williams', pri: '必订', day: 'Day 7 · 10/9 周五', adv: '2–3 周',
    email: 'bellevue@butcherstable.ch', online: 'https://www.williamsbutcherstable.ch/en/',
    onlineLabel: '官网 Book a table',
    tip: '瑞士第一牛排、世界第 64 名、米其林 2025 收录，临时走进去基本没位。<strong>周日休息。</strong>8 人以上要发邮件。订不到周五就退周四（Day 6）；周六最难订。' },
  { key: 'galliker', pri: '必订', day: 'Day 6 · 10/8 周四', adv: '1–2 周',
    online: null, onlineLabel: '❌ 不接受网络/邮件',
    tip: '<strong>只接电话订位。</strong>周一、周日全休，厨房 11:15–14:30 / 18:00–00:30。18:30 就被本地人坐满，中午去更稳。' },
  { key: 'whymper', pri: '必订', day: 'Day 2 · 10/4 周日', adv: '2–3 周',
    email: 'info@whymper-stube.ch', online: 'https://bookings.zenchef.com/results?rid=371441&pid=1001',
    onlineLabel: 'Zenchef 在线订位',
    tip: '本行程唯一一顿正经芝士火锅。Google 显示每天 12:00–21:30、周日照开。<span class="warn">⚠️ 10 月属采尔马特两季之间，Monte Rosa 酒店可能歇业，订之前先确认。</span>' },
  { key: 'baeren', pri: '必订', day: 'Day 3 / Day 5', adv: '2–3 周',
    email: 'info@baeren-wengen.ch', online: 'https://www.baeren-wengen.ch/en/contact/', onlineLabel: '官网联系表单',
    tip: '翁根评分最高（4.8 / 537）。每天 18:00–21:30 只做晚餐。村子小、10 月开的餐厅少 —— <strong>订位就是在确认它还开着</strong>。' },
  { key: 'chezmeyers', pri: '先问再说', day: 'Day 5 · 10/7 周三', adv: '2–3 周',
    email: 'reservation@hotelregina.ch', online: 'https://www.hotelregina.ch/en/hotel-with-restaurant-swiss-alps/reserve-a-table',
    onlineLabel: '官网 Reserve a table',
    tip: '<span class="warn">⚠️ 三个坑：</span>① 营业日是<strong>周三–周六 19:00–22:00</strong>；② <strong>套餐 3 道 CHF 108 / 5 道 CHF 158 每人</strong>，远超一般预期；③ 酒店官网写的是「2026/12/17 起重新开业」，<strong>10 月很可能不营业</strong>。也可加 WhatsApp +41 77 937 52 26 问。' },
  { key: 'schloessli', pri: '建议订', day: 'Day 9 · 10/11 周日', adv: '1–2 周',
    online: 'https://erlebnis-rheinfall.ch/de/reservieren', onlineLabel: '官网在线订位',
    tip: '只在选它而不选隔壁 Inseli Bistro 时才需要。<strong>靠窗全景位要专门指定</strong>，不订就只能坐里面看不到瀑布。周日 11:30–21:30。' },
  { key: 'zeughaus', pri: '建议订', day: 'Day 6 或 Day 8', adv: '3–7 天',
    email: 'info@zeughauskeller.ch', online: 'https://www.zeughauskeller.ch/en/contact-opening-hours?c=Onlinereservation',
    onlineLabel: '官网在线订位',
    tip: '只在想在苏黎世吃顿传统瑞士菜时才需要。每天 11:30–23:00，240 室内座 + 90 室外座。<strong>Day 8 是周六，苏黎世最满的一天，别赌。</strong>' },
  { key: 'swisschuchi', pri: '建议订', day: 'Day 6 或 Day 8', adv: '3–7 天',
    email: 'info@swiss-chuchi.ch', online: 'https://hotel-adler.ch/en/swiss-chuchi-restaurant/', onlineLabel: '官网 Book a table',
    tip: 'Zeughauskeller 的同类替代，9 种芝士火锅 + raclette。<strong>但 Day 2 采尔马特已经吃过火锅了</strong>，这家更多是备胎。' },
  { key: 'caprice', pri: '建议订', day: 'Day 4 · 10/6 周二', adv: '2–3 周',
    email: 'hotel@mayacaprice.ch', online: 'https://www.mayacaprice.ch/', onlineLabel: '酒店官网',
    tip: '只在想在翁根吃顿好的时才需要（酒店已更名 Maya Caprice Boutique Hotel &amp; Spa）。顺便确认 10 月营业。' },
  { key: 'le-safran', pri: '建议订', day: 'Day 1 · 10/3 周六', adv: '1 周',
    email: 'safran@mona-montreux.ch', online: 'https://www.mona-montreux.ch/eat/', onlineLabel: 'MONA 官网',
    tip: '湖景露台位要订。Google 4.7 分 / 4100 条，比 Barrel Oak 高不少 —— 想第一晚就吃好的选它。' },
  { key: 'torkel', pri: '建议订', day: 'Day 7 · 10/9 周五', adv: '1–2 周',
    email: 'office@torkel.li', online: 'https://www.torkel.li/', onlineLabel: '官网',
    tip: '瓦杜兹最高分（4.8 / 296），16 分 GaultMillau，王室葡萄园里的历史酒窖。<span class="warn">⚠️ 周五午市只有 12:00–13:30</span>，窗口很窄。' },
  { key: 'fonduebeizli', pri: '建议订', day: 'Day 8 · 10/10 周六', adv: '3–7 天',
    email: 'info@fonduebeizli.ch', online: 'http://www.fonduebeizli.ch/', onlineLabel: '官网',
    tip: '圣加仑少数周六晚也开的传统瑞士餐厅，4.7 分 / 951 条，会满。' },
  { key: 'bolero', pri: '建议订', day: 'Day 6 · 10/8 周四', adv: '3–7 天',
    online: 'https://www.bolero-luzern.ch/en', onlineLabel: '官网在线订位',
    tip: 'Galliker 的备选，4.6 分 / 2239 条。午市套餐性价比高。' },
  { key: 'lipp', pri: '建议订', day: 'Day 9 · 10/11 周日', adv: '3–7 天',
    online: 'https://www.brasserie-lipp.com/', onlineLabel: '官网',
    tip: '<strong>每天 08:00–次日 01:00，周日照开</strong> —— Day 9 晚到日内瓦的最佳解。热门时段建议订，但周日晚走进去通常也有位。' },
  { key: 'schaeferstube', pri: '建议订', day: 'Day 2 · 10/4 周日', adv: '2 周',
    online: 'https://www.julen.ch/de/restaurant-schaeferstube/', onlineLabel: 'Hotel Julen 官网',
    tip: 'Whymper Stube 的备选，炭烤羊排出名，4.6 分 / 1244 条。<strong>替代了原攻略里并不存在的「采尔马特 Hotel Falken」。</strong>' },
];

const NO_BOOK = ['sternen', 'aletsch', 'crystal', 'bollywood', 'kulm3100', 'tham', 'staeger', 'eigergh',
  'dasina', 'migros-spiez', 'krone-spiez', 'mia-spiez', 'adler-vaduz', 'madeinitaly', 'thali',
  'manzoni', 'barrel-oak', 'bistro-sg', 'rheinfels', 'ducentre', 'mullers', 'r1903'];

/* ────────────────────────── 渲染 ────────────────────────── */

function mealRows(day) {
  return day.meals.map((m, i) => {
    const first = i === 0;
    const span = day.meals.length;
    return `<tr${first ? ' class="d-sep"' : ''}>` +
      (first ? `<td class="day" rowspan="${span}">Day ${day.d}<br><span class="note">${esc(day.date)}</span></td>` +
               `<td class="route" rowspan="${span}">${day.route}</td>` : '') +
      `<td class="meal">${esc(m.meal)}</td>` +
      `<td class="cell-rec">${m.rec.map(entry).join('')}</td>` +
      `<td class="cell-alt">${m.alt.map(entry).join('')}</td>` +
      `<td>${m.why}</td>` +
      `<td>${m.note}</td></tr>`;
  }).join('\n');
}

function bookingRows() {
  const cls = p => p === '必订' ? 'warn' : (p === '先问再说' ? 'warn' : '');
  const rows = BOOKING.map(b => {
    const p = P[b.key] || {};
    const h = hoursCN(b.key);
    const img = photo(b.key);
    return `<tr>
  <td><strong class="${cls(b.pri)}">${esc(b.pri)}</strong></td>
  <td class="cell-rec">${entry({ key: b.key })}</td>
  <td class="nowrap">${esc(b.day)}<br><span class="note">提前 ${esc(b.adv)}</span></td>
  <td class="contact">
    ${p.phone ? `<div>☎ <a href="tel:${esc(p.phone.replace(/\s/g, ''))}">${esc(p.phone)}</a></div>` : ''}
    ${b.email ? `<div>✉ <a href="mailto:${esc(b.email)}">${esc(b.email)}</a></div>` : ''}
    ${b.online ? `<div>🔗 <a href="${esc(b.online)}" target="_blank" rel="noopener">${esc(b.onlineLabel)}</a></div>`
               : `<div class="note">${esc(b.onlineLabel || '')}</div>`}
    ${p.web && p.web !== b.online ? `<div class="note">🌐 <a href="${esc(p.web)}" target="_blank" rel="noopener">官网</a></div>` : ''}
  </td>
  <td class="hours">${h ? esc(h) : '<span class="note">—</span>'}</td>
  <td>${b.tip}</td>
</tr>`;
  }).join('\n');
  const nb = NO_BOOK.map(k => {
    const p = P[k] || {};
    return `<span class="chip">${esc(p.name || k)}${p.rating ? ` <span class="note">★${p.rating}</span>` : ''}</span>`;
  }).join(' ');
  return rows + `\n<tr><td><strong style="color:#8aa">不用订</strong></td><td colspan="5" class="chips">${nb}
  <div class="note" style="margin-top:8px">以上直接去即可。<strong>米伦 Tham 只收现金</strong>；少女峰山顶三家是自助，不接受订位。</div></td></tr>`;
}

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="referrer" content="no-referrer">
<title>瑞士 10 日游 · 每日吃什么全攻略｜2026.10.03 - 10.12</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    line-height: 1.65; color: #2c3e50; background: #f5f1e8; }
  .container { max-width: 1600px; margin: 0 auto; background: #fff; box-shadow: 0 0 30px rgba(0,0,0,.05); }
  .hero { background: linear-gradient(135deg,#2563a8 0%,#4a90c2 50%,#d4a574 100%); color:#fff; padding:40px 50px; text-align:center; }
  .hero h1 { font-size:28px; margin-bottom:9px; letter-spacing:1px; }
  .hero .subtitle { font-size:15px; opacity:.95; }
  .hero .meta { margin-top:14px; font-size:13px; opacity:.9; }
  .hero .meta span { margin:0 10px; }
  section { padding:30px 50px; border-bottom:1px solid #eee; }
  section:last-child { border-bottom:none; }
  h2 { font-size:21px; color:#2563a8; margin-bottom:14px; padding-bottom:8px; border-bottom:2px solid #d4a574; display:inline-block; }
  p { margin-bottom:9px; }
  ol, ul { margin:7px 0 7px 22px; } li { margin-bottom:4px; }
  a { color:#2563a8; }
  table { width:100%; border-collapse:collapse; margin:12px 0; font-size:13px; }
  th { background:#2563a8; color:#fff; padding:9px 10px; text-align:left; font-size:12.5px; font-weight:600; }
  td { padding:9px 10px; border-bottom:1px solid #eee; vertical-align:top; }
  tr:nth-child(even) td { background:#fbfaf7; }
  .scroll-x { overflow-x:auto; -webkit-overflow-scrolling:touch; margin:12px 0; }
  .scroll-x table { margin:0; }
  table.main { font-size:12.5px; min-width:1400px; }
  table.main th { position:sticky; top:0; z-index:2; }
  table.main td.day { background:#f0f5fb !important; font-weight:700; color:#2563a8; white-space:nowrap; border-right:1px solid #dbe6f2; }
  table.main td.route { background:#fdfaf4 !important; font-size:12px; line-height:1.55; border-right:1px solid #f0e6d2; }
  table.main td.meal { white-space:nowrap; font-weight:600; color:#666; font-size:12px; }
  table.main tr.d-sep td { border-top:2px solid #d4a574; }
  .cell-rec { background:#f7fbf8 !important; }
  /* 餐厅条目 */
  .rest { display:flex; gap:9px; align-items:flex-start; margin-bottom:11px; }
  .rest:last-child { margin-bottom:0; }
  .rest.plain { padding-left:2px; }
  .rthumb { width:74px; height:56px; object-fit:cover; border-radius:5px; flex:0 0 74px; background:#eee;
    border:1px solid #e4ddcd; cursor:zoom-in; transition:transform .12s, box-shadow .12s; }
  .rthumb:hover { transform:scale(1.06); box-shadow:0 2px 10px rgba(0,0,0,.22); }
  /* 大图浮层 */
  #lb { position:fixed; inset:0; background:rgba(18,20,24,.93); display:none; z-index:999;
    align-items:center; justify-content:center; flex-direction:column; padding:28px; cursor:zoom-out; }
  #lb.on { display:flex; }
  #lb img { max-width:min(1200px,94vw); max-height:82vh; border-radius:8px; box-shadow:0 8px 40px rgba(0,0,0,.5); background:#222; }
  #lb .cap { color:#fff; margin-top:14px; font-size:15px; font-weight:600; text-align:center; }
  #lb .sub { color:#aab; margin-top:5px; font-size:12px; }
  #lb .x { position:absolute; top:16px; right:22px; color:#fff; font-size:34px; line-height:1;
    opacity:.75; cursor:pointer; font-family:system-ui; }
  #lb .x:hover { opacity:1; }
  .rbody { min-width:0; }
  .rname { font-weight:600; font-size:12.5px; line-height:1.4; }
  .rname a { text-decoration:none; }
  .rname a:hover { text-decoration:underline; }
  .rrate { font-size:11.5px; color:#b5822f; font-weight:600; }
  .price { color:#b5822f; font-weight:600; font-size:11.5px; white-space:nowrap; }
  .note { font-size:11.5px; color:#888; font-weight:400; }
  .xhs { display:inline-block; margin-top:3px; font-size:10.5px; color:#c0392b; text-decoration:none;
    border:1px solid #f0cfc9; background:#fdf3f1; border-radius:3px; padding:0 5px; line-height:16px; }
  .xhs:hover { background:#f9e2de; }
  .warn { color:#c0392b; font-weight:600; }
  .nowrap { white-space:nowrap; }
  .contact div { margin-bottom:3px; font-size:12px; }
  .hours { font-size:11.5px; color:#555; line-height:1.5; }
  .chips { line-height:2.1; }
  .chip { display:inline-block; background:#f2f0ea; border:1px solid #e4ddcd; border-radius:11px; padding:1px 9px; font-size:11.5px; margin:1px 2px; }
  .need-book,.verify,.cash { display:inline-block; color:#fff; font-size:10px; padding:1px 6px; border-radius:3px;
    margin-left:3px; vertical-align:1px; font-weight:600; white-space:nowrap; }
  .need-book { background:#c0392b; } .verify { background:#d4a574; } .cash { background:#7a8b99; }
  .alert { border-radius:8px; padding:12px 16px; margin:12px 0; font-size:13.5px; }
  .alert.red{background:#fdf0ee;border-left:5px solid #c0392b;} .alert.amber{background:#fdf8ec;border-left:5px solid #d4a574;}
  .alert.blue{background:#f0f5fb;border-left:5px solid #2563a8;} .alert.green{background:#eef7f0;border-left:5px solid #27916a;}
  .alert strong { color:#2563a8; } .alert.red strong { color:#c0392b; } .alert.green strong { color:#27916a; }
  details { border:1px solid #e8dfc8; border-radius:8px; margin:12px 0; background:#fdfcfa; }
  details > summary { padding:12px 18px; cursor:pointer; font-weight:600; color:#2563a8; font-size:14.5px; }
  details[open] > summary { border-bottom:1px solid #e8dfc8; }
  details .inner { padding:4px 18px 16px; }
  footer { background:#2c3e50; color:#cfd8e3; padding:22px 50px; font-size:12px; text-align:center; }
  @media (max-width:860px){ section,.hero,footer{padding-left:16px;padding-right:16px;} th,td{padding:7px 8px;} }
</style>
</head>
<body>
<div class="container">

<div class="hero">
  <h1>🇨🇭 瑞士 10 日游 · 每日吃什么全攻略</h1>
  <div class="subtitle">餐厅逐一核对 · 路线匹配 · 完整订位方式 · 预算规划</div>
  <div class="meta">
    <span>📅 2026.10.03 – 10.12</span>
    <span>💰 推荐路线 CHF 425–755 / 人</span>
    <span>📷 评分照片来自 Google Maps</span>
  </div>
</div>

<section>
  <h2>🗓 一张表看完 10 天吃什么</h2>
  <p class="note">
    <strong>绿色列 = 推荐</strong>，已按「不乱花钱」排过：全程只在三顿上花钱（🍲 Day 2 采尔马特芝士火锅、🥧 Day 6 卢塞恩 Galliker 午市、🥩 Day 7 苏黎世瑞士第一牛排），其余走自助 / 超市 / 平价馆子。想省或想升级都在备选列里。<br>
    <strong>★ 评分和照片来自 Google Maps 实时数据</strong>，点餐厅名可直接跳转地图。价格为每人 CHF，不含酒水。
    <span class="need-book">需订</span> 建议提前预订 · <span class="verify">待确认</span> 10 月是否营业需核实 · <span class="cash">现金</span> 不收卡。<br>
    <span class="note">📱 手机上表格可左右滑动</span>
  </p>
  <div class="scroll-x">
  <table class="main">
    <thead><tr>
      <th style="width:5%">时间</th><th style="width:11%">当天行程</th><th style="width:3%">餐</th>
      <th style="width:14%">推荐餐厅</th><th style="width:15%">备选餐厅</th>
      <th style="width:25%">推荐理由</th><th style="width:27%">备注（怎么过去 / 多久）</th>
    </tr></thead>
    <tbody>
${DAYS.map(mealRows).join('\n')}
    </tbody>
  </table>
  </div>
</section>

<section>
  <h2>⚡ 三条保命提醒</h2>
  <div class="alert red"><strong>① 瑞士超市周日全国关门。</strong>
    Coop / Migros / Aldi / Lidl 周日一律不开（法律规定），周六也只开到 17:00–18:00。唯一例外是<strong>大火车站里面的店</strong>（苏黎世 HB 的 ShopVille、伯尔尼、巴塞尔 SBB、卢塞恩、洛桑、日内瓦 Cornavin 等约 30 个车站），约 8:00–21:00。<br>
    <span class="note">影响：Day 1（周六晚到）、Day 2（周日，采尔马特）、Day 9（周日全天）。</span></div>
  <div class="alert red"><strong>② 山区小镇晚上 8 点前后就打烊。</strong>
    翁根、米伦的餐厅厨房普遍 20:00 前后停单（Bären 21:30、Tham 20:30），村里 Coop <strong>18:30 关门</strong>。<br>
    <span class="note">影响：Day 3 傍晚从施皮茨过来 —— <strong>务必 19:30 前抵达翁根</strong>，原攻略写的末班车 22:38 那个点到就没饭吃了。</span></div>
  <div class="alert red"><strong>③ 10 月初是瑞士「两季之间」，山区餐厅陆续歇业。</strong>
    翁根 / 米伦大约 <strong>10 月 15 日后</strong>大批关门歇业 6–8 周等雪季，我们 10/5–10/8 卡在边缘；采尔马特山上的店 10 月初属夏季尾巴。<br>
    <span class="note">所有标 <span class="verify">待确认</span> 的，出发前 1–2 周挨个确认，顺手把位子订了 —— <strong>订位=确认它还开着</strong>。</span></div>
</section>

<section>
  <h2>🔍 原攻略核对结果</h2>
  <p class="note">按「行程安排＝大本营变化，核心内容＝当天实际玩的地方」复核。<strong>Day 7 瓦杜兹、Day 8 圣加仑、Day 9 沙夫豪森的午餐位置都是对的</strong>。以下是需要改的：</p>
  <div class="scroll-x">
  <table>
    <thead><tr><th style="width:5%">#</th><th style="width:8%">位置</th><th style="width:44%">问题</th><th style="width:43%">修正</th></tr></thead>
    <tbody>
      <tr><td><span class="warn">1</span></td><td><strong>Day 2</strong></td>
        <td><strong class="warn">「采尔马特 Hotel Falken」这家店不存在。</strong>Hotel Falken 在<strong>翁根</strong>（Falken beim Gruebi, 3823 Wengen）和<strong>卢塞恩</strong>，采尔马特没有这家。Google Places 也搜不到。原攻略把它列成了采尔马特的晚餐。</td>
        <td>换成真实存在的 <strong>Restaurant Schäferstube</strong>（Riedstrasse 2，Hotel Julen 旗下，<strong>4.6 分 / 1244 条</strong>），炭烤羊排出名。首推仍是 Whymper Stube。</td></tr>
      <tr><td><span class="warn">2</span></td><td><strong>Day 2</strong></td>
        <td><strong>湖名写错，且午餐餐厅在另一条线上。</strong>原文写「Rottenboden 下车看 <strong>Stellisee</strong> 倒影」，午餐推荐「Buffet Bar Sunnegga」。但采尔马特有两条分居山谷两侧、一天走不完的线：<strong>戈尔内格拉特线</strong>（你订的，齿轨 33 分钟到 3089m，湖叫 <strong>Riffelsee</strong>）和<strong>苏内加线</strong>（缆车+步行 20 分钟才到 <strong>Stellisee</strong>，Sunnegga / Fluhalp / Chez Vrony 都在这条）。</td>
        <td>照原计划走戈尔内格拉特线。<strong>把「Stellisee」改成「Riffelsee」</strong>；午餐改采尔马特村里，或山顶 3100 Kulmhotel 自助（4.6 分）。</td></tr>
      <tr><td><span class="warn">3</span></td><td><strong>Day 2</strong></td>
        <td><strong>午餐时间对不上。</strong>蒙特勒→Visp→采尔马特 约 2.5–3h，加上早上溜达 1 小时，实际抵达 <strong>12:00–13:00</strong>。这个点先上山再找饭吃，会一路饿到下午 2 点多。</td>
        <td>落地<strong>先在村里吃午餐</strong>（12:30–13:30），再上山，下午专心看景等日照金山。芝士火锅放晚餐（Whymper Stube 每天 12:00–21:30，周日也开）。</td></tr>
      <tr><td><span class="warn">4</span></td><td><strong>Day 4</strong></td>
        <td><strong>「Jochstation 自助餐厅」不存在</strong> —— Jochstation 是车站名，不是餐厅名。</td>
        <td>山顶实际三家：<strong>Aletsch Self-Service</strong>（4.2，10:15–15:30）、<strong>Restaurant Crystal</strong>（<strong>4.6 分最高</strong>，点餐制，11:00–14:30）、<strong>Bollywood</strong>（3.9，印度菜自助）。12:00–13:00 排队极长，错峰到 11:15 前或 13:30 后。</td></tr>
      <tr><td><span class="warn">5</span></td><td><strong>Day 5</strong></td>
        <td><strong>Piz Gloria 不在米伦。</strong>它在<strong>雪朗峰山顶 2970m</strong>，从米伦还要坐 Mürren→Birg→Schilthorn 两段缆车，往返 1.5–2h、加价约 CHF 85+。你已确认不上雪朗峰。</td>
        <td>换成米伦<strong>村里</strong>：Tham 中餐（4.5 / 760，<strong>只收现金</strong>）、Eiger Guesthouse（<strong>4.6 / 536，全年营业</strong>）、Stägerstübli（4.3 / 824，1901 老木屋）。<br>省下的时间走 <strong>米伦→格吕奇阿尔卑</strong>平路徒步，约 1.5h，正对艾格/僧侣/少女三峰。</td></tr>
      <tr><td><span class="warn">6</span></td><td><strong>Day 5</strong></td>
        <td><strong class="warn">Chez Meyer's 我之前说错了三处。</strong>之前写「只开周三–周五、CHF 60–90」。</td>
        <td>实际：① <strong>周三–周六 19:00–22:00</strong>（周日–周二休），Day 5 周三确实能去；② 价格是<strong>套餐制 3 道 CHF 108 / 5 道 CHF 158 每人</strong>；③ 酒店官网挂「2026/12/17 起重新开业」，<strong>10 月很可能不营业</strong>。<br>按你们的预算，建议直接跳过，除非打电话确认后还想去。</td></tr>
      <tr><td><span class="warn">7</span></td><td><strong>Day 1</strong></td>
        <td><strong>Coop 买不到东西，而且你在 Territet 下车不是 Montreux。</strong>10/3 周六，16:40 落地，到蒙特勒 18:30–19:00 —— Coop 早关了。</td>
        <td>直接吃餐厅，买水去<strong>车站便利店</strong>。从 Territet <strong>沿湖走 20–25 分钟</strong>到市中心，正好是「湖滨散步」。<br><span class="note">另：Safran 的 Google 评分 4.7 / 4100 条，比 Barrel Oak（4.2）高不少，预算够就选它。</span></td></tr>
      <tr><td>8</td><td><strong>Day 9</strong></td>
        <td><strong>周日 + 晚到日内瓦。</strong>玩完回苏黎世取行李再坐 2h45，实际到 <strong>20:00–21:00</strong>。原推荐的 Spinella / 21 Club / Le Darshana 周日晚都不保险。</td>
        <td><strong class="warn">好消息：比想象的安全。</strong>Brasserie Lipp <strong>每天 08:00 开到次日 01:00、周日照常</strong>（4.5 / 4376），21 点到也能坐下好好吃。Café du Centre 周日开到 23:00。实在赶就 Cornavin 站内（周日不受休业限制）。</td></tr>
      <tr><td>9</td><td><strong>多处</strong></td>
        <td><strong>位置/评分说明需修正</strong>（不影响可行性）。</td>
        <td>· <strong>卢塞恩 BOLERO</strong> 是西班牙 tapas + 海鲜饭，在<strong>新城 Bundesplatz 不在老城</strong>，走到廊桥约 10 分钟<br>
        · <strong>苏黎世 EQUINOX</strong> 在西区 Prime Tower 旁，离老城远，不建议专程<br>
        · <strong>Fondue Beizli</strong> 在<strong>圣加仑市区</strong>（Brühlgasse 26），不在阿彭策尔<br>
        · <strong>Manzoni Bar</strong> Google 只有 4.1 / 185 条，弱于同价位的 Thali House（4.7 / 3052）<br>
        · <strong>瓦杜兹 Adler</strong> 在 Google 上叫 <strong>Adler 1908</strong>，4.5 / 412 条，<strong>周六日全休、平日只到 17:00</strong></td></tr>
    </tbody>
  </table>
  </div>
</section>

<section>
  <h2>📞 订位清单（含完整预订方式）</h2>
  <p class="note">电话可直接点击拨打，邮箱可点击发信，在线订位直达官网页面。建议出发前 <strong>2–3 周</strong>集中处理一次 —— 山区的店，<strong>订位同时也等于确认它 10 月还开着</strong>。</p>
  <div class="scroll-x">
  <table>
    <thead><tr>
      <th style="width:7%">优先级</th><th style="width:16%">餐厅</th><th style="width:10%">Day</th>
      <th style="width:21%">预订方式</th><th style="width:16%">营业时间</th><th style="width:30%">说明</th>
    </tr></thead>
    <tbody>
${bookingRows()}
    </tbody>
  </table>
  </div>
  <p class="note">营业时间来自 Google Maps，为常规时间；<strong>10 月山区可能有季节性调整，以电话确认为准。</strong></p>
</section>

<section>
  <h2>💰 餐饮预算</h2>
  <div class="alert green"><strong>核心思路：全程只「认真吃」三顿，其余按当地人的日常来。</strong>
    瑞士贵的不是食物，是「坐下来被服务」这件事 —— 同样的东西，超市 CHF 8、自助 CHF 20、餐厅 CHF 45。<br>
    <strong>🍲 Day 2 采尔马特芝士火锅</strong>（35–55）· <strong>🥧 Day 6 卢塞恩 Galliker 午市</strong>（35–55，午市比晚市便宜近一半）· <strong>🥩 Day 7 苏黎世瑞士第一牛排</strong>（60–80）</div>
  <div class="scroll-x">
  <table>
    <thead><tr><th style="width:16%">路线</th><th>D1</th><th>D2</th><th>D3</th><th>D4</th><th>D5</th><th>D6</th><th>D7</th><th>D8</th><th>D9</th><th>D10</th><th style="width:12%">10 天合计</th></tr></thead>
    <tbody>
      <tr><td><strong>💸 极省</strong><br><span class="note">午餐全走超市/自助</span></td>
        <td class="price">25</td><td class="price">50</td><td class="price">40</td><td class="price">35</td><td class="price">35</td>
        <td class="price">50</td><td class="price">50</td><td class="price">45</td><td class="price">30</td><td class="price">10</td>
        <td class="price"><strong>370–500</strong></td></tr>
      <tr><td><strong>★ 本文推荐</strong><br><span class="note">只在三顿上花钱</span></td>
        <td class="price">25–40</td><td class="price">50–80</td><td class="price">40–80</td><td class="price">35–55</td><td class="price">35–95</td>
        <td class="price">50–80</td><td class="price"><strong>90–125</strong><br><span class="note">含牛排</span></td><td class="price">45–90</td><td class="price">55–95</td><td class="price">10–20</td>
        <td class="price"><strong>425–755</strong></td></tr>
      <tr><td><strong>全程吃好</strong><br><span class="note">每顿都选备选列</span></td>
        <td class="price">50–70</td><td class="price">75–115</td><td class="price">65–100</td><td class="price">75–120</td><td class="price">140–215</td>
        <td class="price">85–115</td><td class="price">105–160</td><td class="price">75–110</td><td class="price">75–115</td><td class="price">10–35</td>
        <td class="price"><strong>755–1155</strong></td></tr>
    </tbody>
  </table>
  </div>
  <p class="note">每人 CHF，不含酒水。「全程吃好」里 Day 5 的大涨是因为 Chez Meyer's 套餐 CHF 108–158。</p>
  <div class="alert amber"><strong>💧 酒水是隐形大头：</strong>餐厅一杯啤酒或葡萄酒 <strong>CHF 7–10</strong>、一瓶矿泉水 <strong>CHF 5–7</strong>，一天两杯十天就是 <strong>CHF 150</strong>。<br>
    <strong>带个水壶</strong> —— 瑞士自来水可直饮，街头饮水池随便灌。这一项省下的钱差不多够那顿火锅。</div>
  <div class="alert green"><strong>三个最有效的省钱办法：</strong><br>
    <strong>① 吃午市套餐（Mittagsmenü）。</strong>同一家店中午可能只有晚上的一半价钱，份量一样 —— 全瑞士通用。所以「吃好的」都排在中午。<br>
    <strong>② 超市熟食区。</strong>Coop / Migros 三明治 CHF 5–8、沙拉盒 8–12，热食柜台也有现成的。<br>
    <strong>③ 山顶自带干粮。</strong>少女峰、戈尔内格拉特山顶比山下贵 30–50%，前一晚 Coop 备好三明治，一天省 CHF 25–30。</div>
</section>

<section>
  <h2>📖 参考资料</h2>
  <details><summary>🍴 在瑞士吃饭必读（营业时间 / 小费 / 支付 / 必吃清单）</summary><div class="inner">
    <table><tbody>
      <tr><td style="width:16%"><strong>营业时间</strong></td><td>午市 <strong>11:30–14:00</strong>、晚市 <strong>18:00–21:30</strong>，中间大多关门休息，下午 3 点去基本吃不上正餐。<strong>山区 20:00 前后停单</strong>。</td></tr>
      <tr><td><strong>周日 / 周六</strong></td><td><strong>周日超市全国关门</strong>，只有约 30 个大火车站里的店开（约 8:00–21:00）。<strong>周六超市 17:00–18:00 就关</strong>。餐厅周日多半开，但日内瓦、洛桑这些法语区周日晚关得特别多。</td></tr>
      <tr><td><strong>小费</strong></td><td>账单<strong>已含服务费</strong>，不需要给 15%。满意就把零头凑整（47.20 给 50）。</td></tr>
      <tr><td><strong>喝水</strong></td><td>自来水可直饮，街头饮水池也能喝。带水壶显著省钱。餐厅点 tap water 可以问，部分店会婉拒。</td></tr>
      <tr><td><strong>支付</strong></td><td>绝大多数刷卡 / Apple Pay 通行。<strong>例外：米伦 Tham 中餐厅只收现金</strong>（CHF / EUR / USD）。山区小店建议备 CHF 50–100 现金。</td></tr>
      <tr><td><strong>穿着</strong></td><td>山区<strong>非常随意，登山服吃饭完全没问题</strong>。高档店（Torkel、Chez Meyer's、Williams）稍微整齐一点，但不要求正装。</td></tr>
      <tr><td><strong>山顶餐厅</strong></td><td>基本<strong>不接受预订</strong>，先到先得。<strong>12:00–13:00 排队最长</strong>，务必错峰。别吃太久，算好最后一班下山的车。</td></tr>
      <tr><td><strong>必吃清单</strong></td><td>
        🧀 <strong>芝士火锅 Fondue</strong>（Day 2 采尔马特 Whymper Stube ← 本行程安排在这）<br>
        🔥 <strong>烤芝士 Raclette</strong>（瓦莱州招牌，采尔马特最正）<br>
        🥧 <strong>Chögelipastetli</strong>（Day 6 卢塞恩名菜，Galliker 最正宗）<br>
        🥩 <strong>干式熟成牛排</strong>（Day 7 苏黎世 Williams ButchersTable，自己在肉柜挑）<br>
        🌭 <strong>圣加仑烤肠</strong>（Day 6/8 苏黎世 Sternen Grill，站着吃最有感觉）<br>
        🧀 <strong>Appenzeller 奶酪 + Siedwurst</strong>（Day 8 阿彭策尔）<br>
        🍲 <strong>Rösti Vaduzerart</strong>（Day 7 瓦杜兹，列支敦士登版煎土豆饼）</td></tr>
    </tbody></table>
  </div></details>

  <details><summary>✅ 出发前待办清单</summary><div class="inner">
    <p><strong>出发前 2–3 周（一次性做完）：</strong></p>
    <ol>
      <li>给<strong>翁根 3 家</strong>（Bären、Maya Caprice、Chez Meyer's）打电话或发邮件：确认 <strong>10/5–10/8 是否营业</strong>，同时订位。这是 10 月初最大的不确定性。</li>
      <li>确认<strong>采尔马特</strong>的 Monte Rosa（Whymper Stube）<strong>10/4 是否营业</strong>，备选 Schäferstube 一起问。</li>
      <li>打电话订 <strong>Wirtshaus Galliker</strong>（卢塞恩，<strong>只接电话</strong>）。</li>
      <li>官网订 <strong>Williams ButchersTable</strong>（Day 7 周五晚，瑞士第一牛排）。</li>
      <li>如果选 Schlössli Wörth 而非 Inseli Bistro，订<strong>靠窗全景位</strong>。</li>
    </ol>
    <p><strong>出发前 3–7 天：</strong></p>
    <ol start="6">
      <li>想在苏黎世吃传统瑞士菜，订 <strong>Day 8（周六）</strong>的 Zeughauskeller。</li>
      <li>订 <strong>Safran</strong>（蒙特勒，Day 1）湖景位。</li>
      <li>查 <strong>SBB 官网施皮茨站行李柜</strong>规格和价格（Day 3 要用）。</li>
      <li>准备 <strong>CHF 50–100 现金</strong>（米伦 Tham 只收现金 + 山区备用）。</li>
      <li>订 <strong>Day 6 黄金山口列车</strong>（因特拉肯→卢塞恩，建议坐右侧）。</li>
    </ol>
  </div></details>

  <details><summary>📌 数据来源与免责说明</summary><div class="inner">
    <p><strong>评分、地址、电话、官网、营业时间、照片</strong>均来自 <strong>Google Maps Places API</strong>，抓取于 2026 年 9 月。餐厅名称可点击直达 Google Maps。</p>
    <p>榜单、菜品、历史背景等补充信息来自 Michelin Guide、瑞士国家旅游局（MySwitzerland）、Jungfrau Region / Schaffhauserland / Zermatt 等官方旅游网站及餐厅官网。</p>
    <p>价格为每人 CHF 估算，不含酒水，仅供参考。照片版权归 Google Maps 及其贡献者所有。</p>
    <p><strong class="warn">标「待确认」的项目请务必出发前核实</strong> —— 10 月初正值瑞士山区「两季之间」，营业状态变动频繁，官网信息也可能滞后，<strong>直接打电话或发邮件最可靠</strong>。</p>
    <p class="note">本页由 <code>build.js</code> 从 <code>data/places.json</code> 生成。刷新数据：<code>bash trips/switzerland-2026/refresh-data.sh</code></p>
  </div></details>
</section>

<footer>
  瑞士 10 日游 · 每日吃什么全攻略 ｜ 2026.10.03 – 10.12<br>
  <span style="opacity:.7">评分 · 照片 · 营业时间来自 Google Maps ｜ 价格为每人 CHF 估算，不含酒水 ｜ 仅供个人出行参考</span>
</footer>

</div>

<div id="lb" role="dialog" aria-modal="true" aria-label="餐厅大图">
  <span class="x" aria-label="关闭">&times;</span>
  <img id="lbimg" alt="">
  <div class="cap" id="lbcap"></div>
  <div class="sub">点击任意处或按 Esc 关闭 · 图片来自 Google Maps</div>
</div>
<script>
(function(){
  var lb=document.getElementById('lb'), im=document.getElementById('lbimg'), cap=document.getElementById('lbcap');
  function open(t){
    var full=t.getAttribute('data-full')||t.src, thumb=t.src;
    im.onerror=function(){ im.onerror=null; im.src=thumb; };   // 大图失败则退回缩略图
    im.src=full; im.alt=t.getAttribute('data-name')||'';
    cap.textContent=t.getAttribute('data-name')||'';
    lb.classList.add('on'); document.body.style.overflow='hidden';
  }
  function close(){ lb.classList.remove('on'); im.src=''; document.body.style.overflow=''; }
  document.addEventListener('click',function(e){
    var t=e.target;
    if(t.classList&&t.classList.contains('rthumb')){ e.preventDefault(); open(t); return; }
    if(lb.classList.contains('on')) close();
  });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape') close(); });
})();
</script>
</body>
</html>
`;

const OUT = path.join(DIR, 'switzerland-food-guide-v1.html');
fs.writeFileSync(OUT, html);
console.log(`✅ 已生成 ${path.relative(process.cwd(), OUT)}  (${(html.length / 1024).toFixed(1)}KB)`);
console.log(`   餐厅 ${Object.keys(P).length} 家 · 照片 ${Object.values(PH).filter(x => x && x.uri).length} 张 · 订位清单 ${BOOKING.length} 家`);
