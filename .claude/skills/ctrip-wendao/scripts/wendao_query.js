// wendao_query.js — 携程问道 API 查询脚本
// 依赖：Node.js v18+（内置 fetch）
// 用法：
//   $env:WENDAO_API_KEY="your_token"; node wendao_query.js "查询内容"
//   或: WENDAO_API_KEY=xxx WENDAO_QUERY="查询内容" node wendao_query.js
//
// token 来源：process.env.WENDAO_API_KEY
// query 优先级：命令行第一个参数 > 环境变量 WENDAO_QUERY

const TOKEN = (process.env.WENDAO_API_KEY || "").trim();
const USER_QUERY = (process.argv[2] || process.env.WENDAO_QUERY || "").trim();

const API_URL = "https://externalcallback.ctrip.com/skills/api/crew/qclaw/searchInfo";

async function callWendao(token, query) {
  if (!token) {
    console.error("错误：缺少 API Key。请设置环境变量 WENDAO_API_KEY。");
    console.error("  获取方式：https://you.ctrip.com/AIService 注册获取 API Key");
    process.exit(1);
  }
  if (!query) {
    console.error(
      '错误：缺少查询内容。请传入查询参数：\n' +
      '  node wendao_query.js "2026年6月1日北京到上海的航班"\n' +
      '  或设置环境变量 WENDAO_QUERY'
    );
    process.exit(1);
  }

  const payload = {
    inputs: {
      token: token,
      query: query
    }
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // 解析响应：提取 result 字段中的 content
    let result = data.result || data;
    let content = result;

    if (typeof result === 'object' && result !== null) {
      content = result.content || JSON.stringify(result, null, 2);
    }

    console.log(content);
  } catch (error) {
    console.error("请求失败:", error.message || error);
    process.exit(1);
  }
}

callWendao(TOKEN, USER_QUERY);
