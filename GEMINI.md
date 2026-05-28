# Gemini CLI - My Travel Project Instructions

This file contains the foundational mandates for Gemini CLI in the `my-travel` repository. It is adapted from the previous Claude Code configuration to ensure continuity and adherence to project standards.

## Project Overview
A personal travel guide repository using HTML documents to record itineraries. It uses AI to plan trips, check real-time transportation, and generate beautifully formatted guide pages.

## Directory Structure
- `trips/`: Trip folders named `{destination-pinyin/english}-{year}/`.
- `templates/`: HTML templates for guides.
- `docs/`: Reference documentation.
- `GEMINI.md`: This instruction file.

## Core Rules & Conventions

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

## Memory
- Personal/private notes (like temporary tokens) should be stored in `/Users/zhaozeyang/.gemini/tmp/my-travel/memory/MEMORY.md`.
- Existing Claude memory is in `.claude/memory/`.
