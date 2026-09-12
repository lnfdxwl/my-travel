#!/usr/bin/env node
/**
 * 把 Google 的餐厅照片下载到本地 images/，这样 GitHub Pages 自己托管图片，
 * 无需梯子即可查看，也不怕 Google 的图片 URL 过期。
 *
 * 用法：node trips/switzerland-2026/localize-photos.js
 * 需要能访问 lh3.googleusercontent.com（下载时需要，下载完就不需要了）
 *
 * 产出：images/<key>.jpg（缩略图 200px）、images/<key>@2x.jpg（大图 1200px）
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname);
const IMG = path.join(DIR, 'images');
const PH = JSON.parse(fs.readFileSync(path.join(DIR, 'data/photos.json'), 'utf8'));

/** 改写 Google 图片 URL 的尺寸后缀 */
const sized = (url, w, h) => url.replace(/=s\d+(-w\d+)?(-h\d+)?$/, `=s${Math.max(w, h)}-w${w}-h${h}`);

async function dl(url, dest) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 1024) throw new Error('文件过小，可能不是图片');
  fs.writeFileSync(dest, buf);
  return buf.length;
}

(async () => {
  fs.mkdirSync(IMG, { recursive: true });
  const keys = Object.keys(PH).filter(k => PH[k] && PH[k].uri);
  let ok = 0, fail = 0, bytes = 0;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const base = PH[k].uri;
    process.stdout.write(`\r下载 ${i + 1}/${keys.length} ${k}`.padEnd(46));
    try {
      bytes += await dl(sized(base, 200, 150), path.join(IMG, `${k}.jpg`));
      bytes += await dl(PH[k].full || sized(base, 1200, 900), path.join(IMG, `${k}@2x.jpg`));
      ok++;
    } catch (e) {
      console.log(`\n⚠️  ${k}: ${e.message}`);
      fail++;
    }
  }
  console.log(`\n✅ 本地化完成：${ok} 家成功${fail ? `，${fail} 家失败` : ''}，共 ${(bytes / 1048576).toFixed(1)} MB`);
  console.log('   下一步：node trips/switzerland-2026/build.js');
})();
