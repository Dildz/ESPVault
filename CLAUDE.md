# CLAUDE.md

Guidance for Claude Code working in this repo. Project architecture, stack, and
conventions live in **[AGENTS.md](./AGENTS.md)** — read it first; this file only
adds what's specific to working here.

## Fork & branch workflow

This is a fork of `thelastoutpostworkshop/ESPVault`.

- `origin` → `Dildz/ESPVault` (this fork) · `upstream` → original repo
- `main` is a clean mirror of upstream — **never commit to it directly**
- All work happens on **`ESPVault-Custom`**
- Sync upstream: `git checkout main && git fetch upstream && git merge --ff-only upstream/main && git push origin main`, then `git checkout ESPVault-Custom && git merge main`

## Commit style

Short, concise messages. No body, no author/co-author trailers. Confirm before
pushing or opening PRs.

## Verify before committing

```bash
npm run typecheck      # vue-tsc + tsc, must be clean
npm test               # vitest unit suite
npm run test:visual    # Playwright against the browser harness
```

Visual tests can show cold-start flakes (vite compiling the large pages exceeds
the 5s harness banner timeout). They pass on retry: `npx playwright test --retries=2`.
Playwright browsers: `npx playwright install chromium` if missing.

## Dashboard refactor (done)

`DashboardPage.vue` was decomposed from a ~3,900-line god component into
per-domain composables under `src/renderer/composables/dashboard/`. The pattern,
if you add another insight panel:

- Move a domain's pure data computeds + helpers into `use<Domain>Insights.ts`,
  taking store refs as args and returning the computeds the panel needs.
- Leave template and Chart.js render functions in the SFC; they consume the
  returned refs by the same names.
- Each extraction is behavior-preserving, independently committable, and gets a
  unit test (the payoff: logic that was untestable in the SFC now is).

All domains are extracted: activity-heatmap, scan-freshness, partition,
chip-family, memory, board-state, projects, lab-organization, recent-activity.
Shared date helper lives in `utils/dateValue.ts`.
