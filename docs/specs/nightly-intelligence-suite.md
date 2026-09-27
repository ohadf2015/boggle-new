# Spec — Nightly Intelligence Suite

> **Status:** approved-for-implementation (2026-05-29)
> **Supersedes parts of:** [`nightly-loop.md`](./nightly-loop.md) (lane execution model, data-fetch path)
> **Author:** nightly-evolution pass, validated by advisor

## 1. Problem

The nightly loop ([`scripts/nightly/run.sh`](../../scripts/nightly/run.sh)) runs 8 sequential lanes that each
**independently discover their own data via MCP inside their timed budget**, then try to ship product work in
whatever time remains. Consequences, measured over the 6-night window 05-23…05-28 (`docs/nightly/learnings.md`):

- **35% of lane-runs time out** (16/46). MCP silent hangs are the #1 failure mode — a single hung
  Sentry/Supabase `execute_sql` blocks a lane until its multi-minute ceiling, discarding all work.
- Worst ship rates are exactly the **data-discovery-heavy lanes**: 02-perf 33%, 01-triage 50%, 05-landing 17%.
- Each data source is queried **redundantly** by multiple lanes (PostHog by 1/3/monitor, Supabase by 1/3).
- No **cross-source synthesis** — no single ranked view of "what should we improve tonight, by impact."
- No **outcome attribution** — we ship changes but never measure whether they moved the metric they targeted.
- No **extensibility contract** — adding a data source means editing `run.sh` and a lane prompt by hand.

The user's ask: *"improve our nightly — make it a whole suite of improving our product while keeping it stable,
and base all on data from all data sources… and if needed get more data sources or find ways to improve them over time."*

## 2. Core idea — separate INTELLIGENCE from EXECUTION

Move all data-gathering out of the timed lanes into a dedicated **Phase 0** that runs first, queries every source
**once** over **direct REST/CLI (not MCP)**, and writes a ranked **brief**. Lanes then read a local file (instant,
zero discovery cost) and spend their entire budget on product work.

```
                       ┌─────────────────────── 60-min wall clock ───────────────────────┐
  BEFORE:  [lane01: discover→fix][lane02: discover→fix][lane03: discover→ship] …  (35% die mid-discover)

  AFTER:   [Phase0: collect-all-once → score → brief]  [lane01: read brief→fix][lane02: read→fix] …
           └── ~3–4 min, REST not MCP, hung source = stale fallback ──┘  └── full budget on product ──┘
```

**Why this is the stability win, not a risk** (advisor conditions, all mandatory):

1. **Collectors use direct REST/CLI, not MCP.** This removes the #1 failure mode (MCP silent hangs) from the data
   path entirely. The validated `PostHog REST helper` win (`docs/nightly/learnings.md`) generalizes to every source.
2. **Lanes give the discovery budget back.** When lanes 01/02/03 stop discovering, their timeouts are **cut** (§7).
   Adding Phase 0 without cutting lane budgets would make the run slower and *more* timeout-prone — so the cut is
   not optional.
3. **Phase 0 is hard-capped with cached last-good.** Per-collector timeout AND a phase-level cap. A hung Supabase
   query costs one collector's timeout → falls back to yesterday's snapshot + a `_stale` flag → lanes still run.
   A dead source is **contained**, never blocks the run.
4. **The brief is producible with zero LLM.** A deterministic bash+jq scorer always produces `brief.json`. An
   optional LLM pass enriches `brief.md`; on hang, `brief.md` is a deterministic render of `brief.json` (mirrors
   the existing manager-summary fallback pattern in `run.sh`).

## 3. Architecture overview

```
docs/nightly/intel/
  $DATE/
    sentry.json          ← collect-sentry.sh   (raw + normalized signals[])
    posthog.json         ← collect-posthog.sh
    supabase.json        ← collect-supabase.sh
    search.json          ← collect-search.sh   (GSC + Bing)
    railway.json         ← collect-railway.sh
    feedback.json        ← collect-feedback.sh
    brief.json           ← score-brief.sh       (DETERMINISTIC, always produced)
    brief.md             ← enrich-brief (LLM, optional; deterministic fallback)
  data-sources.md        ← collector health ledger (self-improvement)
  outcomes.md            ← attribution (Pass 2)
  outcomes-ledger.ndjson ← per-shipped-item before/after (Pass 2)

scripts/nightly/lib/intel/
  intel-lib.sh           ← shared: emit_signal(), stale_fallback(), with_timeout()
  registry.sh            ← SOURCES=( "id:script:timeout" … )  ← add a source = add a line
  collect-*.sh           ← one per source (independent, parallelizable)
  score-brief.sh         ← deterministic RICE-ish scorer → brief.json
  enrich-brief.sh        ← LLM narrative → brief.md (fallback = render brief.json)
  attribute-outcomes.sh  ← Pass 2; informational only
  run-intel.sh           ← Phase 0 driver: iterate registry (parallel) → score → enrich
```

### 3.1 Normalized signal schema (source-agnostic)

Every collector emits `signals[]` in a common shape so the scorer never special-cases a source:

```jsonc
{
  "source": "sentry",                  // collector id
  "kind": "error",                     // error | perf | funnel | retention | search | feedback | advisor
  "title": "TypeError in WordTowerCrane",
  "metric": "events_24h",              // the named metric this signal moves
  "magnitude": 412,                    // raw value (event count, drop-off %, ms, impressions…)
  "reach": 38,                         // users/sessions affected (0 if unknown)
  "severity": 0.8,                     // 0–1 normalized within source (collector-assigned)
  "lane": "01-triage",                 // routing hint (which lane should act)
  "target_metric": "sentry:events_24h:ISSUE-1234",  // for Pass 2 attribution
  "evidence": "https://sentry.io/…/ISSUE-1234",      // link/sql/query for the lane to verify
  "effort": "S",                       // S|M|L estimate (collector-assigned heuristic)
  "fingerprint": "sentry:ISSUE-1234"   // stable id for dedup + anti-repetition + attribution
}
```

`_meta` per file: `{ "collected_at": "ISO", "stale": false, "stale_since": null, "source_ok": true }`.

### 3.2 Deterministic score (transparent, no LLM)

`score-brief.sh` reads all `signals[]`, dedups by `fingerprint`, scores each:

```
score = (reach_norm × severity × confidence) / effort_weight
  reach_norm   = log1p(reach) / log1p(maxReachInRun)   # 0–1, dampens outliers
  confidence   = 1.0 fresh | 0.6 stale (penalize yesterday's data)
  effort_weight = { S:1, M:2, L:4 }[effort]
```

Output `brief.json` = signals sorted by `score` desc, each carrying its computed `score` and `rank`. Items are
also bucketed by `lane`. **No source magnitude is compared across sources directly** — `severity` is normalized
*within* each collector first (an error count of 400 and a 40% funnel drop are both ~0.8 severity, not 400 vs 40).

## 4. Collectors (Pass 1) — direct REST/CLI

All reuse existing auth/endpoint patterns already in `scripts/nightly/lib/` and keys already exported in
`run.sh:67-79`. Each: own timeout (`with_timeout`), writes `$DATE/<id>.json`, on fail → `stale_fallback` from most
recent prior `intel/*/<id>.json`. Read-only. **No writes to any service.**

| id | script | source | API (no MCP) | reuses |
|----|--------|--------|--------------|--------|
| `sentry` | collect-sentry.sh | Sentry | REST `/api/0/projects/.../issues/?statsPeriod=24h&query=is:unresolved level:error` sorted by `freq` | new (token in env) |
| `posthog` | collect-posthog.sh | PostHog | HogQL REST `/api/projects/$id/query` — funnel drop-off, retention curve, top `$exception`, rage/dead-click counts | `lib/posthog-query.sh` |
| `supabase` | collect-supabase.sh | Supabase | REST advisors snapshot + `pg_stat_statements` top-15 via service-role SQL endpoint | `lib/feedback-digest.sh` auth |
| `search` | collect-search.sh | GSC + Bing | reuse `seo-daily` JSON output if present that night; else light GSC/Bing REST CTR-gap pull | `lib/bing-ai-perf-scrape.sh`, `06-seo` |
| `railway` | collect-railway.sh | Railway | CLI/GraphQL: http error rate, p50/p75/p95 latency, deploy status | `lib/railway-deploy-check.sh` |
| `feedback` | collect-feedback.sh | PostHog+Supabase+TG | wraps existing digest into signal schema | `lib/feedback-digest.sh`, `feedback-poll.sh` |

**PostHog deepening** (advisor: under-mined connected source): beyond funnels, collect **retention curve**
(D1/D7 cohort), **path analysis** (top exit paths), and **session-replay rage/dead-click counts**. These are the
highest-leverage *new* signals and need no new integration — same API.

### 4.1 Auth availability — prefer REST, degrade cleanly

Not every source has a REST token configured today. The system must be **correct in every auth state** and unlock
wins **progressively** as tokens land — correctness is never conditional on configuration.

| source | REST today? | needs (optional) | behavior if token absent |
|--------|-------------|------------------|--------------------------|
| posthog | ✅ (proven helper) | — | full brief immediately |
| feedback | ✅ (proven) | — | full |
| railway | ✅ CLI (deploy status) | `RAILWAY_TOKEN` for metrics | deploy status only; metrics stale |
| search | ✅ Bing scrape + seo-daily md | `BING_WMT_API_KEY` (keyword stats) | reuse existing artifacts; keyword-stats skipped |
| sentry | ⚠️ needs token | `SENTRY_AUTH_TOKEN` + org/project slug | empty/stale + ledger note "configure SENTRY_AUTH_TOKEN" |
| supabase | ⚠️ advisors need mgmt token | `SUPABASE_ACCESS_TOKEN` (mgmt API advisors) | feedback-only; advisors empty/stale + ledger note |

A collector with a missing token does **not** error — it writes an empty `signals[]` with `_meta.source_ok:false`
and a human-readable `_meta.note`, and `data-sources.md` surfaces "TOKEN_MISSING → add X to unlock." New optional
tokens get added to `run.sh`'s env-export block (alongside `POSTHOG_*`) and documented in `setup.sh`.

## 5. Phase 0 driver — `run-intel.sh`

1. Source `registry.sh` → `SOURCES`.
2. Run collectors **in parallel** (different services, read-only, distinct output files → safe), each under
   `with_timeout $COLLECTOR_TIMEOUT` (default 90s, env-overridable). A collector that exceeds its timeout is
   killed; its `stale_fallback` runs.
3. Phase-level cap `INTEL_PHASE_TIMEOUT` (default 240s) wraps the whole parallel batch as a backstop.
4. `score-brief.sh` → `brief.json` (always).
5. `enrich-brief.sh` → `brief.md` (LLM, timeout-hardened; fallback renders `brief.json` to markdown).
6. Update `data-sources.md` health ledger: per source `last_success`, `stale`, `n_signals`.
7. Export `BRIEF_FILE=$DATE/brief.md`, `BRIEF_JSON_FILE=$DATE/brief.json` for the lane loop.

Phase 0 writes **only under `docs/nightly/intel/`** (outside `fe-next/`) → never gate-fails, always shippable as an
artifact even if every lane later times out.

## 6. Lane integration — `__BRIEF__` placeholder

`headless.sh` (substitution block `:92-110`) gains a `__BRIEF__` placeholder, fed a **per-lane slice** of the
brief (items where `lane == <lane_id>`, top N by score), read from `BRIEF_FILE`/`BRIEF_JSON_FILE`. Mirrors the
existing `__FEEDBACK_SUMMARY__` mechanism exactly; empty → `"No brief items for this lane. Proceed with standard scan."`.

`test/headless` gains an assertion that `__BRIEF__` substitutes (advisor: don't edit a tested file without a test).

## 7. Lane prompt + timeout changes (the budget give-back)

**Data-discovery lanes — brief-first with a bounded fallback. Timeouts cut (moderately, given partial auth):**

| lane | before | after | rationale |
|------|--------|-------|-----------|
| 01-triage | 1200s | **900s** | brief carries Sentry/Supabase/PostHog errors *when tokens configured*; until then one quick MCP fallback allowed |
| 02-perf | 720s | **600s** | brief has CWV + retention + slow queries (PostHog REST today); fixes, minimal discovery |
| 03-engagement | 1500s | **900s** | brief has funnel drop-off (PostHog REST today, full now); wires one experiment at the worst step |

**Lane contract (brief-first, bounded fallback)** — prepended to 01/02/03:
> "Your targets are in the BRIEF below; the data was already collected this run. Act on the top brief items for your
> lane FIRST. Do NOT re-run broad discovery. **Only if your lane's brief slice is empty or stale** may you do ONE
> quick targeted MCP query for your primary source, then act. Use MCP to *apply* a fix (migration), not to re-explore."

Cuts are deliberately **moderate, not aggressive** — they reclaim the discovery budget the brief eliminates while
leaving headroom for the single fallback so a lane is never starved when a token is unconfigured. As REST tokens
land (§4.1) the briefs fill, fallbacks stop firing, and the cuts can tighten further (tracked in learnings).

**Generative lanes — brief supplies DIRECTION, not a replacement. Timeouts ~unchanged:**

- 04-competitor: brief's feedback/retention signals inform *which* gaps to research; still runs WebSearch/Reddit.
- 05-landing: brief's search CTR gaps + funnel data inform *which* page/variant; still runs frontend-design.
- 06-seo: brief's `search.json` seeds targets; still runs `seo-daily` skill.

> Do NOT over-claim "lanes do zero discovery" — false for generative lanes. The interface for them is *direction*.

**Net budget:** Phase 0 ≈ 3–4 min (parallel). Lanes 01/02/03 give back ~1740s worst-case. Run nets more headroom
and fewer timeouts — the stability claim holds *because* of the give-back, not despite Phase 0.

## 8. Pass 2 — outcome attribution (informational only)

`attribute-outcomes.sh`: for each brief item shipped 3–7 days ago (lagging, to respect deploy-lag), re-read its
`target_metric` from today's collector snapshot, compute before/after delta, append to `outcomes-ledger.ndjson`
and summarize in `outcomes.md`. **Never gates, never reverts** — "auto-rollback on KPI dip" is in the avoids list.
Feeds lane 07 self-learn so the suite learns *which* improvements actually move metrics.

## 9. Pass 3 — new product lanes (one at a time, data-gated)

Added later, each in its own commit, each **data-gated** (if the brief has no qualifying item, the lane writes a
"no signal tonight" artifact and exits clean — no wasted budget, no blast radius). Candidates by leverage:

1. **retention/funnel-fix** — PostHog funnel drop-off ≥ threshold → ship the UX fix at the worst step.
2. **first-run/onboarding** — leverages `hooks/useFirstRunSeen.ts`; biggest retention lever.
3. **a11y/i18n quality** — 5 langs incl. Hebrew RTL; contrast (`contrast-fixer`), RTL bugs, missing keys.
4. **economy/monetization** — coins/ads balance (`ccgs-economy-designer`).

## 10. Self-improvement of the data layer (the "over time" ask)

- **Collector-registry pattern**: adding a source = drop `collect-<id>.sh` + add one line to `registry.sh`. Low
  blast radius, independently testable.
- **`data-sources.md` ledger**: per source — `last_success`, staleness streak, `n_signals`, and (via Pass 2)
  `shipped_value` (count of shipped items this source originated). 
- **Lane 07 self-learn mandate expanded**: review `data-sources.md` + `outcomes.md`; (a) propose new collectors
  (GA4, app-store reviews, Discord, deeper session-replay) as Telegram idea-cards; (b) flag collectors with zero
  shipped-value over N weeks for removal; (c) propose better queries for under-performing collectors. All as
  *proposals* surfaced to the founder (existing idea-card approval loop), never auto-added.

## 11. Safety model — unchanged (keep the strong parts)

Isolated worktree gate → drop-and-re-gate → docs-only salvage → `ship_nightly_commit` invariant
(local==origin every run) are **untouched**. Phase 0 artifacts live in `docs/` so they're gate-immune. New code is
bash under `scripts/nightly/` (not shipped to the app, not in `fe-next/`) — it runs on the founder's Mac, never
deploys. The app blast radius of Pass 1 is **zero**; the only product code changes come from lanes acting on the
brief, which pass the same gate as today.

## 12. Test plan (strict TDD — bash test per unit, before implementation)

Existing 12 suites in `scripts/nightly/test/` MUST stay green. New tests:

| test | proves |
|------|--------|
| `intel-lib.test.sh` | `emit_signal` shape valid; `stale_fallback` copies last-good + sets `_stale`; `with_timeout` kills + returns nonzero |
| `collect-<id>.test.sh` (×6) | given a fixture API response → emits valid `signals[]`; on simulated timeout → stale fallback; never writes to the service |
| `score-brief.test.sh` | fixture signals → deterministic ranking matches expected; dedup by fingerprint; stale confidence penalty applied; **zero LLM** |
| `enrich-brief.test.sh` | LLM-hang → `brief.md` falls back to deterministic render of `brief.json` |
| `run-intel.test.sh` | one dead collector does NOT block the phase; phase cap enforced; `brief.json` always produced |
| `headless.test.sh` (extend) | `__BRIEF__` substitutes per-lane slice; empty brief → graceful default |
| `registry.test.sh` | adding a registry line is picked up; malformed line skipped not fatal |

## 13. Implementation phases (commit boundaries — ask before each `git commit`)

- **P1a** `intel-lib.sh` + `registry.sh` + `score-brief.sh` + tests (the deterministic core; no live APIs). `chore`
- **P1b** 6 collectors + tests (parallelizable; fixture-driven). `feat`
- **P1c** `run-intel.sh` driver + `enrich-brief.sh` + Phase 0 wiring into `run.sh` + env exports + tests. `feat`
- **P1d** `__BRIEF__` in `headless.sh` + headless test + rewrite prompts 01/02/03 + cut their timeouts. `feat`
- **P2** `attribute-outcomes.sh` + `outcomes.md` + self-learn ledger mandate. `feat` (separate session ok)
- **P3** new product lanes, one commit each, data-gated. `feat` (separate sessions)

Pass 1 (P1a–P1d) is this session's deliverable and the stability foundation. Ship gate for Pass 1: all existing 12
bash suites green + all new intel tests green + a `--dry-run` end-to-end producing a real `brief.json`.
