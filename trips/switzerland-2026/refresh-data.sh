#!/usr/bin/env bash
# 刷新 Google Places 数据（评分/营业时间/电话/官网/照片）并重新生成攻略
# 用法：bash trips/switzerland-2026/refresh-data.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
[ -f .env ] || { echo "❌ 缺少 .env（可从 .env.example 复制）"; exit 1; }
set -a; . ./.env; set +a
node trips/switzerland-2026/fetch-data.js
node trips/switzerland-2026/build.js
echo "✅ 数据已刷新并重新生成攻略"
