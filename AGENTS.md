# QClaw Agent Instructions — my-travel

Personal travel guide repository. Uses AI to plan trips, query real-time transportation, and generate beautifully formatted HTML guide pages.

## Setup (First Time)

1. Copy `.env.example` to `.env` and fill in your API keys:
   ```bash
   cp .env.example .env
   # Edit .env: set WENDAO_API_KEY and GOOGLE_MAPS_API_KEY
   ```

2. Node.js v18+ is required for skill scripts.

3. Install Google Maps MCP (`mcporter`) for geocoding and map links:
   ```bash
   npm install -g mcporter
   mcporter config add grounding-lite \
     --url https://mapstools.googleapis.com/mcp \
     --header "X-Goog-Api-Key=$GOOGLE_MAPS_API_KEY" \
     --system
   ```

## Directory Structure

```
my-travel/
├── trips/{destination}-{year}/       # One folder per trip
│   └── {destination}-trip-guide-v{N}.html
├── templates/trip-guide-template.html
├── docs/
│   ├── guide-spec.md                 # Load when creating/editing guides
│   ├── tools.md                      # Load when querying transportation
│   └── planning-principles.md        # Load when starting new trip plan
├── .claude/skills/                   # Local skills
│   ├── ctrip-wendao/                 # Real-time travel data
│   ├── google-maps-grounding-lite-mcp/  # Maps MCP (needs mcporter)
│   └── travel-manager/               # Trip planning framework
├── .env.example                      # API key template
└── index.html                        # Homepage listing all trips
```

## Core Rules

### Versioning
- Filename: `{destination}-trip-guide-v{N}.html`
- **Always ask before incrementing version number — never do it autonomously**
- Bump version for: structural changes (cities added/removed, major transport change, overall reorder)
- Don't bump for: price updates, typos, minor notes

### HTML Design
- Strictly follow `templates/trip-guide-template.html`
- Primary: `#2563a8` (blue) | Secondary: `#d4a574` (gold) | Background: `#f5f1e8` (beige)
- Standard components: `transport-item`, `day-block`, `time-block`, `place-card`, `checklist`

### Index Page
- Every time a new destination guide is created, update `index.html` in the same turn

### Document Loading Triggers
| Document | When to load |
|----------|-------------|
| `docs/guide-spec.md` | Creating or modifying guide structure |
| `docs/tools.md` | Querying real-time flights/trains/hotels |
| `docs/planning-principles.md` | Starting a new trip plan |

### Google Maps Links
All attractions, hotels, stations, and airports must have a Google Maps link:
```html
<a href="https://maps.google.com/?q={lat},{lng}" target="_blank" style="color:#2563a8;text-decoration:none;font-size:13px;">📍地图</a>
```
Use Google Maps MCP (`maps_batch_geocode`) to get coordinates in bulk (up to 50 places at once).

### Commit Style
`feat: add {destination} guide v{N}` or `style: enhance {section}`

## Skills & Tools

### Ctrip Wendao — Real-time Transportation
Query flights, trains, hotels with live data. Load `docs/tools.md` for full usage.

**Trigger**: flights, trains, hotels, ticket prices, departure/arrival times, 航班/火车/高铁/酒店

```bash
source .env
node .claude/skills/ctrip-wendao/scripts/wendao_query.js "2026年6月1日北京到成都的高铁"
```

Or call the API directly:
```javascript
const res = await fetch("https://externalcallback.ctrip.com/skills/api/crew/qclaw/searchInfo", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ inputs: { token: process.env.WENDAO_API_KEY, query: "your query" } })
});
const data = await res.json();
// Result is in data.result.content
```

Query tips:
- Flights: `"2026年6月1日北京到成都的航班时刻和价格"`
- Trains: `"2026年6月2日G308次列车北京到西安发车到达时间"`
- Hotels: `"2026年6月1日成都市区酒店推荐，2人入住1晚"`
- Attractions: `"峨眉山景区门票价格和开放时间"`

### Google Maps Grounding MCP — Location & Geocoding
Get coordinates, search places, check routes. Requires `mcporter` installed and configured.

**Trigger**: 地图链接, 坐标, 导航, geocode, map link

```bash
mcporter call grounding-lite.search_places textQuery="成都宽窄巷子"
mcporter call grounding-lite.maps_batch_geocode addresses='["峨眉山金顶","成都双流国际机场"]'
mcporter call grounding-lite.lookup_weather location='{"address":"成都,四川"}'
mcporter call grounding-lite.compute_routes origin="成都火车站" destination="峨眉山"
```

### Travel Manager — Trip Planning Framework
Comprehensive planning for international trips, multi-destination itineraries, family travel.

**Trigger**: plan a trip, itinerary, multi-destination, family travel, 规划行程, 旅行计划

References in `.claude/skills/travel-manager/references/`:
- `family-travel-checklist.md`
- `travel-documents.md`

## Planning Principles

### Elder-Friendly (适老化)
- Don't assume poor fitness — offer "compact" and "relaxed" options in v1
- Always include cable car, sightseeing bus, boat options; mark them explicitly in the guide
- Recommend soft, easy-to-chew dishes for dining

### Culinary Depth (餐饮深度)
Every restaurant must include:
1. Cultural background / specialty
2. Ordering logic
3. Taste details

## Publishing

```bash
git add . && git commit -m "更新攻略" && git push
```

Live at: `https://lnfdxwl.github.io/my-travel/trips/{destination}-{year}/{file}.html`
