#!/usr/bin/env node
/** 抓取沿途超市（Coop / Migros）的位置与营业时间 —— 重点是周日/周六是否营业 */
const fs=require('fs'), path=require('path');
const KEY=process.env.GOOGLE_MAPS_API_KEY;
if(!KEY||KEY.startsWith('your_')){console.error('❌ 未设置 GOOGLE_MAPS_API_KEY');process.exit(1);}
const Q=[
 ["sm-montreux","Coop Montreux Switzerland supermarket"],
 ["sm-montreux-migros","Migros Montreux Switzerland supermarket"],
 ["sm-zermatt","Coop Zermatt supermarket Bahnhofstrasse"],
 ["sm-spiez","Coop Spiez Switzerland supermarket"],
 ["sm-wengen","Coop Wengen Switzerland"],
 ["sm-lauterbrunnen","Coop Lauterbrunnen Switzerland"],
 ["sm-muerren","Coop Mürren Switzerland"],
 ["sm-interlaken","Coop City Interlaken Switzerland"],
 ["sm-luzern","Coop Luzern Bahnhof railway station supermarket"],
 ["sm-zurichhb","Coop Zürich Hauptbahnhof ShopVille supermarket"],
 ["sm-zurich-migros","Migros Zürich Hauptbahnhof ShopVille"],
 ["sm-vaduz","Coop Vaduz Liechtenstein supermarket"],
 ["sm-stgallen","Coop St. Gallen Bahnhof supermarket"],
 ["sm-appenzell","Coop Appenzell Switzerland"],
 ["sm-schaffhausen","Coop Schaffhausen Bahnhof supermarket"],
 ["sm-geneva","Coop Genève Cornavin gare supermarket"],
 ["sm-gva-airport","Coop Genève Aéroport airport supermarket"],
];
const F=["places.displayName","places.formattedAddress","places.rating","places.userRatingCount",
 "places.regularOpeningHours.weekdayDescriptions","places.googleMapsUri","places.businessStatus"].join(",");
(async()=>{const out={};let n=0;
 for(const [k,q] of Q){ process.stdout.write(`\r抓取 ${++n}/${Q.length} ${k}`.padEnd(44));
  try{const r=await fetch("https://places.googleapis.com/v1/places:searchText",{method:"POST",
    headers:{"Content-Type":"application/json","X-Goog-Api-Key":KEY,"X-Goog-FieldMask":F},
    body:JSON.stringify({textQuery:q,maxResultCount:1})});
   const j=await r.json(); const v=j.places&&j.places[0];
   out[k]=v?{name:v.displayName&&v.displayName.text,addr:v.formattedAddress,rating:v.rating,
     reviews:v.userRatingCount,maps:v.googleMapsUri,status:v.businessStatus,
     hours:(v.regularOpeningHours&&v.regularOpeningHours.weekdayDescriptions)||null}:null;
  }catch(e){console.log(`\n⚠️ ${k}: ${e.message}`); out[k]=null;}
  await new Promise(s=>setTimeout(s,120));
 }
 fs.writeFileSync(path.join(__dirname,'data/shops.json'),JSON.stringify(out,null,1));
 console.log(`\n✅ 超市 ${Object.values(out).filter(Boolean).length} 家`);
})();
