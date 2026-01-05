# SerpApi Diagnostic Workbench

SerpApi Diagnostic Workbench (SDW) is an internal tool for diagnosing SerpApi responses by comparing the **raw upstream HTML** to the **SerpApi JSON**, detecting:

- **Parsing gaps** (content present in HTML but missing in JSON)
- **Upstream blocking** (CAPTCHA / access denied / rate limiting)

It also provides **proactive monitoring** (scheduled/manual scans), **alerts**, and **one-click GitHub issue template generation**.

## Overview

SDW is split into:

- **Dashboard**: run an on-demand diagnostic for a single engine + parameters.
- **Monitoring**: view engine health, recent scan history, and alerts; trigger a manual scan.

Backend services:

- **Deep analysis**: HTML vs JSON section comparison (per engine selectors).
- **Upstream analysis**: blocking detection from raw HTML (or JSON error payload).
- **Monitoring & alerts**: persist scan results and alert on regressions.
- **Ticket generation**: produce a Markdown issue template with repro params and findings.

## Status Model

SDW uses four statuses:

- `STABLE`: no blocking detected and **no missing sections**.
- `FLAKY`: **non-critical** sections are present in HTML but missing in JSON.
- `PARSER_FAIL`: **critical** sections are present in HTML but missing in JSON.
- `UPSTREAM_BLOCK`: upstream HTML fetch indicates blocking (CAPTCHA, denied, etc.) or upstream error response.

Critical vs non-critical is determined in `backend/services/deep-analysis.service.ts`.

## Quick Start (Development)

### 1) Install dependencies

```bash
bun install
```

### 2) Configure environment

```bash
cp .env.example .env
```

Required (validated at boot):

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`

Recommended for local:

- `BETTER_AUTH_SECRET` (min 32 chars)
- `SERPAPI_API_KEY` (required for Monitoring manual scans and scheduler)

See `backend/config/env.ts` for the full list.

### 3) Initialize database schema

```bash
bun run db:push
```

### 4) Run dev servers

```bash
bun run dev
```

Access:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

Dev setup uses Vite proxy so frontend calls `/api/*` automatically route to the backend.

## How It Works

### A) Deep Analysis (HTML vs JSON)

1. Call SerpApi `search.json` with the provided `engine` and parameters.
2. Read `search_metadata.raw_html_file` to get the raw upstream HTML URL.
3. Fetch the HTML and detect "sections" using engine-specific selectors (e.g., `organic_results`, `top_stories`).
4. Check which expected JSON sections are present.
5. Report missing sections (present in HTML but absent from JSON), classify severity, and compute status:
   - critical missing => `PARSER_FAIL`
   - non-critical missing => `FLAKY`

### B) Upstream Analysis (Blocking detection)

1. Fetch the raw HTML URL.
2. Detect content type (HTML vs JSON error vs unknown).
3. If HTML, scan visible text for blocking patterns (captcha, robot checks, denied, rate limit).
4. Output `UPSTREAM_BLOCK` when blocking is detected.

### C) Monitoring & Alerts

Monitoring stores diagnostic runs in the database and surfaces:

- Engine health (last run status, missing counts, blocking flag)
- Recent history
- Alerts

Alert policy (current behavior):

- `parsing_issue` is emitted only when missing **increases** compared to the previous run (regression signal).
- `status_change` is emitted when an engine moves from `STABLE` to a non-`STABLE` status.

Note: a scheduler implementation exists (`backend/services/scheduler.service.ts`), but it must be invoked at startup to run automatically.

## API

All endpoints are served under `/api`.

- Health: `GET /api/health`
- Auth (Better Auth): `/api/auth/*`
- Versioned API: `/api/v1/*`

### Diagnostics

- `POST /api/v1/diagnostics/full`
  - Runs SerpApi call + deep analysis + upstream analysis.

Example request:

```json
{
  "params": { "q": "coffee" },
  "engine": "google",
  "apiKey": "SERPAPI_KEY",
  "runUpstream": true,
  "runDeepAnalysis": true
}
```

- `POST /api/v1/diagnostics/ticket/generate`
  - Builds a GitHub issue template from a `DiagnosticSummary` and repro params.

- `POST /api/v1/diagnostics/deep-analysis`
  - Runs only the HTML vs JSON comparison.

- `POST /api/v1/diagnostics/upstream/analyze`
  - Runs only upstream blocking detection.

### Monitoring

- `GET /api/v1/monitoring/status`
- `GET /api/v1/monitoring/history?limit=50&offset=0&engine=google`
- `GET /api/v1/monitoring/alerts?limit=50&offset=0&status=pending`
- `POST /api/v1/monitoring/trigger` (optional body: `{ "engine": "google" }`)
- `GET /api/v1/monitoring/config`
- `POST /api/v1/monitoring/config`

## Project Layout

```
backend/
  config/                  Environment validation and config
  db/                      Drizzle schema and client
  middleware/              Security, rate limit, logging
  routes/                  Hono routes (/api, /api/v1)
  services/
    serpapi.service.ts     SerpApi HTTP client
    deep-analysis.service.ts  HTML vs JSON comparison
    upstream.service.ts    Blocking detection
    scheduler.service.ts   Scheduled/manual scans
    anomaly.service.ts     Regression detection
    alert.service.ts       Alert persistence
    ticket.service.ts      Issue template generator
frontend/
  pages/                   Dashboard + Monitoring pages
  features/diagnostics/    UI + hooks for diagnostics
shared/
  types/                   Shared TypeScript types
functions/
  api/[[route]].ts         Cloudflare Pages handler (optional)
```

## Development Commands

```bash
bun run typecheck
bun run lint
bun run db:push
bun run db:studio
```

## Deployment

Build:

```bash
bun run build
```

Docker:

```bash
bun run docker:build
```

## Troubleshooting

- Deep Analysis shows `htmlFetched: false`: the SerpApi response may not include `search_metadata.raw_html_file`, or the raw HTML fetch may have failed/timed out. Check `deepAnalysis.htmlComparison.summary` (Dashboard UI or API response) for the exact reason.
- Monitoring shows `STABLE` with missing sections: this can happen for historical runs saved before the status mapping change. Trigger a new scan (`POST /api/v1/monitoring/trigger`) to generate a fresh run; non-critical missing sections should now map to `FLAKY`.
- Missing sections may be non-actionable: section detection is selector-based and can be sensitive to upstream HTML changes and dynamic page composition. Treat `FLAKY` as "needs review"; confirm by opening the raw HTML link (when available) and validating the JSON output.
- Alerts seem "too quiet": `parsing_issue` is emitted only when missing increases compared to the previous run (regression signal). If missing stays constant (e.g., always 2), you will not see repeated `parsing_issue` alerts on every scan.
- Manual scan fails with `SERPAPI_API_KEY not configured`: set `SERPAPI_API_KEY` in the environment used by the backend.
- Monitoring shows `Never scanned`: ensure DB env vars are configured and schema is pushed (`bun run db:push`), then run a manual scan.
- Scheduler is not running automatically: `backend/services/scheduler.service.ts` contains the scheduler implementation, but it must be started at server boot to run periodically.

## Security Notes

- SerpApi API keys are provided per request and are not stored by the frontend.
- Backend includes basic security headers and rate limiting.

## License

Proprietary - internal tool.
