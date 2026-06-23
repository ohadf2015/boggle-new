You are running the nightly TELEMETRY COVERAGE-HEALTH lane for LexiClash. Today: __TODAY__. Working dir: /Users/ohadfisher/git/boggle-new.

═══ LEARNINGS FROM PRIOR RUNS ═══
__LEARNINGS__

═══ PLAYER FEEDBACK (recent) ═══
__FEEDBACK_SUMMARY__

═══ Tonight's intelligence brief ═══
__BRIEF__

═══ WHAT THIS LANE IS (and is NOT) ═══
You guard the EXISTING analytics contract: every event the code claims to fire vs what PostHog
actually receives. You are NOT lane 03 — do NOT add experiments, manage flags, or instrument
brand-new funnel steps. Your job: find events that SHOULD fire but DON'T, and fix the most
valuable one tonight.

The full standing analysis lives in `docs/telemetry-audit-2026-06-23.md` — read it first; it has
the backlog (§1b) and the per-mode completion holes (§2). Drain it incrementally, one item/night.

═══ HARD RULES ═══
- **PostHog data ONLY via the REST helper** `scripts/nightly/lib/posthog-query.sh hogql "<HogQL>"`.
  DO NOT call the posthog MCP tools — it flaps and HANGS the lane to a timeout. The helper is the
  ONLY PostHog path.
- **NO event renaming** — emit a NEW event name, never reshape an existing one (poisons historical
  funnels). To fix a label mismatch, correct the EMITTER to send the agreed name, don't rename the
  event in PostHog.
- **NO new realtime tables**, **NO new `auth.getUser()` calls** in API routes.
- New events must be members of the `GrowthEvent` union in `fe-next/utils/growthTracking.ts`
  (most P1 backlog events ALREADY are — you only add the call site). Any new user-facing string in
  5 locales (en/he/sv/ja/es), Hebrew RTL-safe.
- TDD: a wired event gets a test asserting `trackGrowthEvent` (or the engagement helper) is called
  with the right name + payload on the triggering action.

═══ STEP 1 — Run the coverage audit (deterministic helpers, ~1 min) ═══
```bash
. scripts/nightly/lib/posthog-coverage.sh
TMP=$(mktemp -d)
nightly_extract_growth_events fe-next/utils/growthTracking.ts > "$TMP/code.txt"
bash scripts/nightly/lib/posthog-query.sh hogql \
  "SELECT event, countIf(timestamp > now() - INTERVAL 7 DAY) AS d7, countIf(timestamp <= now() - INTERVAL 7 DAY AND timestamp > now() - INTERVAL 14 DAY) AS prev7 FROM events WHERE timestamp > now() - INTERVAL 14 DAY GROUP BY event LIMIT 500" \
  | jq -r '.results[] | [.[0],(.[1]|tostring),(.[2]|tostring)] | @tsv' > "$TMP/live.tsv"
nightly_coverage_classify "$TMP/code.txt" "$TMP/live.tsv"   # → DEAD + CRATERED markdown table
```
Then per-mode completion (the §2 hole):
```bash
bash scripts/nightly/lib/posthog-query.sh hogql \
  "SELECT event, coalesce(properties.mode, properties.gameMode, 'none') AS m, count() AS c FROM events WHERE event IN ('game_started','game_completed') AND timestamp > now() - INTERVAL 14 DAY GROUP BY event, m ORDER BY m, event LIMIT 100"
```

═══ STEP 2 — Triage (judgment — do NOT dump the raw list) ═══
Bucket every flagged event:
- **WIRED-BUT-SILENT** (a call site exists in code, 0 volume): for each, grep the call site
  (`grep -rE "(trackGrowthEvent|capture)\(['\"]<event>['\"]" fe-next --include='*.ts' --include='*.tsx' | grep -vE '\.test\.|growthTracking\.ts'`).
  If a real fire site exists but volume is 0, it's a likely REGRESSION (deploy broke it) or an
  unreachable branch → this is the priority to FIX.
- **NEVER-WIRED** (0 call sites): backlog item from §1b → wire ONE P1 event tonight if in scope.
- **LOW-TRAFFIC-BY-CONTEXT** (`cg_*` with no CrazyGames traffic, `school_lead_*`, `iap_*`): NOT
  bugs — note and skip. Do not chase zeros that are legitimately context-gated.
- **CRATERED**: confirm w/w drop is real (not a reporting artifact); if a real emitter break, fix it.
- **NEWLY-DEAD vs the last report**: an event that fired last week and is DEAD this week is the
  strongest regression signal — prioritise it above everything.

═══ STEP 3 — Fix ONE high-value item ═══
Pick the single highest-leverage fix (priority: newly-dead regression > wired-but-silent > P1
never-wired social/monetization > per-mode completion hole). Implement it TDD. Keep the diff
focused and self-contained (only your own files). If a wired-but-silent event is unreachable by
design, just document it — don't force a fire.

If the chosen item is a per-mode completion hole (e.g. `random`/`adventure` emit no
`game_completed`): wire the mode's end-of-game path to call the existing completion tracker with
the correct `mode`, mirroring a HEALTHY mode (word-wheel/survival) for the payload shape.

DO NOT COMMIT. DO NOT PUSH.

═══ STEP 4 — Report ═══
Append to `docs/nightly/reports/__TODAY__.md`:
```
### Lane 12 — Telemetry coverage health
- Registry events: <N total> · DEAD <n> · CRATERED <n> · per-mode completion holes <list>
- Newly-dead since last run: <events or "none">
- Fixed this run: <event> (<wired-but-silent | never-wired | mode-completion>) — <file:line>
- Backlog remaining (§1b): <count> — next: <event>
```
Also send a Telegram card directly (guaranteed delivery — the orchestrator doesn't auto-scrape
this lane):
```bash
"scripts/nightly/lib/telegram.sh" msg "📊 *Telemetry coverage* __TODAY__
DEAD: <n> · CRATERED: <n> · newly-dead: <list>
Fixed: <event> (<file>)
Top mode hole: <mode> <started>→<completed>"
```
If you found a likely regression (newly-dead high-traffic event) but could NOT safely fix it,
`"scripts/nightly/lib/telegram.sh" alert "<event> stopped firing — needs human look"` instead.
