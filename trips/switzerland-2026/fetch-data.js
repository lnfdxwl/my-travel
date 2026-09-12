#!/usr/bin/env node
/**
 * 从 Google Places API 抓取餐厅数据 + 照片（缩略图 & 大图）
 * 需要环境变量 GOOGLE_MAPS_API_KEY（见项目根目录 .env）
 * 用法：bash trips/switzerland-2026/refresh-data.sh
 */
const fs = require('fs');
const path = require('path');
const KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!KEY || KEY.startsWith('your_')) {
  console.error('❌ 未设置 GOOGLE_MAPS_API_KEY，请检查项目根目录的 .env');
  process.exit(1);
}
const OUT = path.join(__dirname, 'data');

const QUERIES = [
  ['barrel-oak', 'Barrel Oak Irish Pub Montreux Switzerland'],
  ['le-safran', 'Le Safran MONA Montreux Switzerland'],
  ['whymper', 'Whymper Stube Zermatt Switzerland'],
  ['schaeferstube', 'Restaurant Schäferstube Hotel Julen Zermatt'],
  ['kulm3100', '3100 Kulmhotel Gornergrat Zermatt'],
  ['migros-spiez', 'Migros Restaurant Spiez Terminus'],
  ['krone-spiez', 'Restaurant Krone Spiez Switzerland'],
  ['mia-spiez', 'Mia Osteria Pizzeria Spiez'],
  ['baeren', 'Alpenkräuter Hotel Bären Wengen'],
  ['r1903', 'Restaurant 1903 Hotel Schönegg Wengen'],
  ['aletsch', 'Aletsch Self Service Restaurant Jungfraujoch'],
  ['bollywood', 'Bollywood Restaurant Jungfraujoch'],
  ['crystal', 'Restaurant Crystal Jungfraujoch'],
  ['dasina', 'Ristorante Da Sina Wengen'],
  ['caprice', 'Maya Caprice Boutique Hotel Wengen'],
  ['chezmeyers', "Chez Meyer's Hotel Regina Wengen"],
  ['tham', 'Tham Chinese Restaurant Mürren'],
  ['staeger', 'Restaurant Stägerstübli Mürren'],
  ['eigergh', 'Eiger Guesthouse Mürren'],
  ['galliker', 'Wirtshaus Galliker Schützenstrasse Luzern'],
  ['bolero', 'BOLERO Restaurante Bundesplatz Luzern'],
  ['sternen', 'Sternen Grill Bellevue Zürich'],
  ['zeughaus', 'Zeughauskeller Bahnhofstrasse Zürich'],
  ['swisschuchi', 'Swiss Chuchi Hotel Adler Rosengasse Zürich'],
  ['adler-vaduz', 'Restaurant Adler Vaduz Liechtenstein'],
  ['madeinitaly', 'Made in Italy Vaduz Liechtenstein'],
  ['torkel', 'Restaurant Torkel Hintergasse Vaduz'],
  ['williams', 'Williams ButchersTable am Bellevue Zürich'],
  ['thali', 'Thali House Indian Restaurant Langstrasse Zürich'],
  ['manzoni', 'Manzoni Bar Hotel St Gotthard Zürich'],
  ['fonduebeizli', 'Fondue Beizli Brühlgasse St Gallen'],
  ['bistro-sg', 'Bistro St.Gallen Switzerland'],
  ['schloessli', 'Schlössli Wörth Neuhausen am Rheinfall'],
  ['rheinfels', 'Hotel Restaurant Rheinfels Stein am Rhein'],
  ['hohenklingen', 'Burg Hohenklingen Stein am Rhein'],
  ['lipp', 'Brasserie Lipp Geneva Switzerland'],
  ['ducentre', 'Café du Centre Geneva Switzerland'],
  ['mullers', "Muller's Factory Geneva Switzerland"],
];

const FIELDS = ['places.displayName', 'places.formattedAddress', 'places.rating', 'places.userRatingCount',
  'places.internationalPhoneNumber', 'places.websiteUri', 'places.regularOpeningHours.weekdayDescriptions',
  'places.googleMapsUri', 'places.businessStatus', 'places.photos'].join(',');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function photoUri(name, w, h) {
  const r = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=${w}&maxHeightPx=${h}&skipHttpRedirect=true&key=${KEY}`);
  const j = await r.json();
  return j.photoUri || null;
}

(async () => {
  const places = {}, photos = {};
  let n = 0;
  for (const [k, q] of QUERIES) {
    process.stdout.write(`\r抓取 ${++n}/${QUERIES.length} ${k}`.padEnd(48));
    try {
      const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': FIELDS },
        body: JSON.stringify({ textQuery: q, maxResultCount: 1 }),
      });
      const j = await r.json();
      const v = j.places && j.places[0];
      if (!v) { console.log(`\n⚠️  ${k}: 无结果`); continue; }
      places[k] = {
        name: v.displayName && v.displayName.text, addr: v.formattedAddress,
        rating: v.rating, reviews: v.userRatingCount,
        phone: v.internationalPhoneNumber, web: v.websiteUri,
        maps: v.googleMapsUri, status: v.businessStatus,
        hours: (v.regularOpeningHours && v.regularOpeningHours.weekdayDescriptions) || null,
      };
      if (v.photos && v.photos.length) {
        const p = v.photos[0];
        const [thumb, full] = await Promise.all([photoUri(p.name, 640, 360), photoUri(p.name, 1600, 1200)]);
        photos[k] = { uri: thumb, full,
          attr: (p.authorAttributions && p.authorAttributions[0] && p.authorAttributions[0].displayName) || null };
      }
    } catch (e) { console.log(`\n⚠️  ${k}: ${e.message}`); }
    await sleep(120);
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'places.json'), JSON.stringify(places, null, 1));
  fs.writeFileSync(path.join(OUT, 'photos.json'), JSON.stringify(photos, null, 1));
  console.log(`\n✅ ${Object.keys(places).length} 家餐厅 · ${Object.values(photos).filter(p => p.full).length} 张大图`);
})();
