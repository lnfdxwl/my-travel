#!/usr/bin/env node
/**
 * feishu-publish — 旅行攻略 HTML → 飞书文档
 *
 * 用法：
 *   FEISHU_APP_ID=xxx FEISHU_APP_SECRET=xxx node publish.js <html_path> [doc_token]
 *
 * doc_token 不传则新建文档，传了则覆盖更新。
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP_ID = process.env.FEISHU_APP_ID;
const APP_SECRET = process.env.FEISHU_APP_SECRET;
const HTML_PATH = process.argv[2];
const EXISTING_TOKEN = process.argv[3] || null;

if (!APP_ID || !APP_SECRET) {
  console.error('错误：请设置环境变量 FEISHU_APP_ID 和 FEISHU_APP_SECRET');
  process.exit(1);
}
if (!HTML_PATH) {
  console.error('用法：node publish.js <html_path> [doc_token]');
  process.exit(1);
}
if (!fs.existsSync(HTML_PATH)) {
  console.error(`文件不存在：${HTML_PATH}`);
  process.exit(1);
}

// ─── 1. 认证 ────────────────────────────────────────────────────────────────

async function getToken() {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`获取 token 失败: ${data.msg}`);
  return data.tenant_access_token;
}

// ─── 2. HTML → Markdown（定制解析器，处理项目自定义组件）────────────────────

function htmlToMarkdown(htmlPath) {
  const pyScript = path.join(__dirname, 'html_to_md.py');
  const result = spawnSync('python3', [pyScript, htmlPath], { encoding: 'utf-8' });
  if (result.status !== 0) {
    throw new Error(`HTML 转换失败:\n${result.stderr}`);
  }
  return result.stdout;
}

// ─── 3. 切分内容（按 ## 章节，每段 ≤5000 字符）───────────────────────────────

function splitChunks(content, maxLen = 5000) {
  const sections = content.split(/(?=\n## )/);
  const chunks = [];
  let current = '';
  for (const s of sections) {
    if ((current + s).length < maxLen) {
      current += s;
    } else {
      if (current.trim()) chunks.push(current.trim());
      current = s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

// ─── 4. 飞书 API 工具 ─────────────────────────────────────────────────────────

function removeMergeInfo(blocks) {
  return blocks.map(b => {
    if (b.block_type === 31 && b.table?.property?.merge_info !== undefined) {
      const prop = { ...b.table.property };
      delete prop.merge_info;
      return { ...b, table: { ...b.table, property: prop } };
    }
    return b;
  });
}

function getTopLevelIds(blocks) {
  const childIds = new Set();
  for (const b of blocks) {
    for (const cid of (b.children || [])) childIds.add(cid);
  }
  return blocks.filter(b => !childIds.has(b.block_id)).map(b => b.block_id);
}

async function createDoc(token, title) {
  const res = await fetch('https://open.feishu.cn/open-apis/docx/v1/documents', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  const data = await res.json();
  if (data.code !== 0) throw new Error(`创建文档失败: ${data.msg}`);
  return data.data.document.document_id;
}

async function clearDoc(token, docToken) {
  const res = await fetch(
    `https://open.feishu.cn/open-apis/docx/v1/documents/${docToken}/blocks/${docToken}/children?page_size=500`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  const data = await res.json();
  const count = data.data?.items?.length || 0;
  if (count === 0) return;

  const delRes = await fetch(
    `https://open.feishu.cn/open-apis/docx/v1/documents/${docToken}/blocks/${docToken}/children/batch_delete`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ start_index: 0, end_index: count })
    }
  );
  const delData = await delRes.json();
  if (delData.code !== 0) throw new Error(`清空文档失败: ${delData.msg}`);
  console.log(`  已清空 ${count} 个 block`);
  await sleep(800);
}

async function convertAndInsert(token, docToken, markdown, insertIndex) {
  // Convert
  const cvtRes = await fetch('https://open.feishu.cn/open-apis/docx/v1/documents/blocks/convert', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ content_type: 'markdown', content: markdown })
  });
  const cvtData = await cvtRes.json();
  if (cvtData.code !== 0) throw new Error(`Convert 失败: ${cvtData.msg}`);

  const blocks = removeMergeInfo(cvtData.data.blocks);
  const topIds = getTopLevelIds(blocks);
  const tableCount = blocks.filter(b => b.block_type === 31).length;

  // Insert via descendant API
  const insRes = await fetch(
    `https://open.feishu.cn/open-apis/docx/v1/documents/${docToken}/blocks/${docToken}/descendant?document_revision_id=-1`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({
        index: insertIndex,
        children_id: topIds,
        descendants: blocks.map(b => ({
          ...b,
          children: b.children || []
        }))
      })
    }
  );
  const insData = await insRes.json();
  if (insData.code !== 0) throw new Error(`插入失败: ${insData.msg} (code: ${insData.code})`);

  return { topCount: topIds.length, tableCount };
}

async function setPublicPermission(token, docToken) {
  const res = await fetch(
    `https://open.feishu.cn/open-apis/drive/v1/permissions/${docToken}/public?type=docx`,
    {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        external_access_entity: 'anyone',
        link_share_entity: 'anyone_readable'
      })
    }
  );
  const data = await res.json();
  if (data.code !== 0) throw new Error(`设置权限失败: ${data.msg}`);
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── 5. 主流程 ────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📄 飞书发布：${HTML_PATH}`);

  // 提取标题（从 HTML <title> 标签）
  const htmlContent = fs.readFileSync(HTML_PATH, 'utf-8');
  const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i);
  const docTitle = titleMatch ? titleMatch[1].trim() : path.basename(HTML_PATH, '.html');

  console.log(`\n[1/5] 获取访问 token...`);
  const token = await getToken();
  console.log('  ✓ token 获取成功');

  console.log(`\n[2/5] HTML → Markdown 转换...`);
  const markdown = htmlToMarkdown(HTML_PATH);
  const chunks = splitChunks(markdown);
  console.log(`  ✓ 转换完成，${markdown.length} 字符，切分为 ${chunks.length} 段`);

  console.log(`\n[3/5] 准备飞书文档...`);
  let docToken = EXISTING_TOKEN;
  if (!docToken) {
    docToken = await createDoc(token, docTitle);
    console.log(`  ✓ 新建文档：${docToken}`);
  } else {
    console.log(`  更新已有文档：${docToken}`);
    await clearDoc(token, docToken);
  }

  console.log(`\n[4/5] 上传内容（${chunks.length} 段）...`);
  let insertIndex = 0;
  let totalTables = 0;
  for (let i = 0; i < chunks.length; i++) {
    process.stdout.write(`  段 ${i + 1}/${chunks.length}... `);
    const { topCount, tableCount } = await convertAndInsert(token, docToken, chunks[i], insertIndex);
    insertIndex += topCount;
    totalTables += tableCount;
    console.log(`✓ (${topCount} 顶层 blocks, ${tableCount} 表格)`);
    await sleep(400);
  }
  console.log(`  ✓ 共插入 ${insertIndex} 个顶层 blocks，${totalTables} 张表格`);

  console.log(`\n[5/5] 设置公开权限（anyone_readable）...`);
  await setPublicPermission(token, docToken);
  console.log('  ✓ 任何人持有链接可查看（无需登录飞书）');

  const url = `https://feishu.cn/docx/${docToken}`;
  console.log(`\n✅ 发布完成！`);
  console.log(`   飞书文档：${url}`);
  console.log(`   doc_token：${docToken}`);

  // 输出 JSON 供脚本解析
  console.log(`\n__RESULT__:${JSON.stringify({ url, doc_token: docToken, title: docTitle })}`);
}

main().catch(err => {
  console.error(`\n❌ 发布失败：${err.message}`);
  process.exit(1);
});
