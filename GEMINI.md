# Gemini CLI - My Travel Project Instructions

This file contains the foundational mandates for Gemini CLI in the `my-travel` repository. It is adapted from the previous Claude Code configuration to ensure continuity and adherence to project standards.

## Project Overview
A personal travel guide repository using HTML documents to record itineraries. It uses AI to plan trips, check real-time transportation, and generate beautifully formatted guide pages.

**Foundational Manual**: This project was originally designed for Claude Code. All operational logic must align with `CLAUDE.md` in the root directory.

## Core Rules & Conventions

### Operations (from CLAUDE.md)
- **Skill Installation**: Always install skills locally to `.claude/skills/` (e.g., `skillhub install <name> --dir .claude/skills`). NEVER install globally.
- **Document Loading Triggers**:
    - Load `docs/guide-spec.md` when creating/modifying guide structures.
    - Load `docs/tools.md` when querying real-time transportation/hotels.
    - Load `docs/planning-principles.md` when starting a new trip plan.
- **Commit Style**: Keep commit messages concise, e.g., "更新攻略" or "feat: add {destination} guide v{N}".

### Guide Versioning
- Filename format: `{destination}-trip-guide-v{N}.html`.
- **Always ask before incrementing the version number.**
- Increment version for structural changes (adding/removing cities, major transport changes, overall re-ordering).
- Do not increment for minor updates (price updates, typos, extra notes).
- Refer to `docs/guide-spec.md` for details.

### HTML Design & Style
- **Strictly adhere to the design style in `templates/trip-guide-template.html`.**
- Primary Color: `#2563a8` (Blue).
- Secondary Color: `#d4a574` (Gold).
- Background: `#f5f1e8` (Beige).
- Use standard components: `transport-item`, `day-block`, `time-block`, `place-card`, `checklist`.

### Skills & Tools
This project uses several local scripts as "skills". You can invoke them via `run_shell_command`.

#### Ctrip Wendao (Transportation Queries)
Used for real-time flight, train, and hotel info.
- Location: `.claude/skills/ctrip-wendao/scripts/wendao_query.js`
- Usage: `WENDAO_API_KEY="a22b18cd04124d5289fb7376ca283e15" node .claude/skills/ctrip-wendao/scripts/wendao_query.js "query"`

#### Feishu Publication
Used to publish completed guides to Feishu.
- Location: `.claude/skills/feishu-publish/scripts/publish.js`
- Usage: `FEISHU_APP_ID="cli_a9e2164af4395bc4" FEISHU_APP_SECRET="wQZSbyBhlVmGhZfLyhOP2gjXwMBEYtP7" node .claude/skills/feishu-publish/scripts/publish.js <file_path> [doc_token]`
- Detailed rules in `docs/guide-spec.md` regarding conversion and permissions.

## On-Demand Documentation
Load these files when performing specific tasks:
- `docs/guide-spec.md`: When creating or modifying guide structure.
- `docs/tools.md`: When querying real-time transportation/hotels.
- `docs/planning-principles.md`: When starting a new trip plan.

### 适老化规划 (Elder-Friendly)
- **动态平衡**：不要默认长辈“体力极差”，应在第一版计划中提供“紧凑”与“松散”两种选项供用户选择。
- **硬性减负**：强制包含索道、观光车、游船等选项，并在攻略中明确标注“建议乘坐索道”等字样。
- **点餐关怀**：推荐菜品时需考虑长辈牙口，多推荐软烂、清淡的“软菜”。

### 餐饮深度标准 (Culinary Depth)
- **拒绝敷衍**：严禁只列出餐厅名和1-2个菜名。
- **三要素原则**：每家餐厅必须包含：
    1. **文化背景/特色**（如：百年老字号、鲁菜大师创办、怀旧风）。
    2. **点餐逻辑**（如：一硬+一软+一主食的平衡）。
    3. **口感细节**（如：九转大肠的“五味俱全”、锅贴底部的“金黄酥脆”）。

### 首页索引规范
- **同步更新**：每当创建新的目的地攻略时，必须在同一 Turn 或紧接着的 Turn 中更新根目录的 `index.html`。
