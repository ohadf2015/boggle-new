# Nightly Intelligence Suite — Phase 0

> Full design + rationale: [`docs/specs/nightly-intelligence-suite.md`](../../../../docs/specs/nightly-intelligence-suite.md)

Phase 0 runs **before** the lanes. It queries every data source **once over direct REST/CLI (no MCP)**,
ranks the opportunities, and writes a brief the lanes consume via the `__BRIEF__` placeholder. Moving data
discovery out of the timed lanes is what removes the #1 nightly failure mode (MCP silent hangs → 35% timeouts).

## Flow

```
run.sh ──▶ run-intel.sh
             ├─ registry.sh ........ SOURCES list (add a line = add a source)
             ├─ collect-*.sh ....... per-source collectors, parallel, each timeout-capped
             │    └─ intel-lib.sh .. emit_signal / intel_write / stale_fallback / with_timeout
             ├─ score-brief.sh ..... DETERMINISTIC ranker → brief.json   (always produced, zero LLM)
             └─ enrich-brief.sh .... brief.md narrative (LLM optional; deterministic fallback)
                                       ▼
            docs/nightly/intel/$DATE/{<source>.json, brief.json, brief.md}   (gitignored, local)
                                       ▼
            headless.sh __BRIEF__ ◀── brief-slice.sh  (per-lane top items, or fallback contract)
```

## Stability guarantees (why this is safe)

- **Per-collector timeout + phase cap.** A hung/slow source costs only its own budget, then `stale_fallback`
  reuses the last-good snapshot (marked `stale` → scorer applies a confidence penalty). A dead source never
  blocks the run.
- **Always a brief.** `score-brief.sh` is pure `jq` — `brief.json` exists even if every source is stale and
  the LLM enrichment is skipped/hung.
- **Gate-immune.** Everything is written under `docs/nightly/intel/` (outside `fe-next/`), so it can never
  fail the lint/test/build gate.
- **Read-only.** Collectors never write to any external service.

## Add a data source (the extensibility contract)

1. Write `collect-<id>.sh` (copy `collect-posthog.sh` — the reference). It must: source `intel-lib.sh`, build
   signals via `emit_signal`, persist via `intel_write`, and on any failure/missing-token call `stale_fallback`
   then `exit 0` (never error). Emit the §3.1 signal schema; set `lane` to route each signal.
2. Add one line to `registry.sh`: `"<id>:collect-<id>.sh:<timeout_sec>"`.
3. TDD: write `test/collect-<id>.test.sh` first (stub the external command on `PATH`; cover happy + degrade).
4. Run `bash scripts/nightly/test/collect-<id>.test.sh` to green. Done — the driver picks it up automatically.

## Optional tokens (unlock sources over REST — `~/.config/lexi-nightly/env`)

| token | unlocks |
|-------|---------|
| `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`, `POSTHOG_HOST` | PostHog (exceptions, CWV, rage clicks) — **already set** |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | feedback reports — **already set** |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG_SLUG`, `SENTRY_PROJECT_SLUG` (`SENTRY_HOST` opt) | Sentry issues over REST |
| `SUPABASE_ACCESS_TOKEN` (mgmt API PAT) | Supabase security/performance advisors |
| `BING_WMT_API_KEY` | Bing keyword-volume enrichment for AI-cited queries |
| `RAILWAY_TOKEN` | (Pass-2) Railway latency/error-rate metrics |

A missing token degrades that source to a `TOKEN_MISSING` stale/empty snapshot — never an error. Run
`jq '._meta' docs/nightly/intel/$DATE/<source>.json` to see each source's health.

## Run / debug

```bash
# Dry smoke (no tokens → everything degrades, brief still produced):
INTEL_ROOT=/tmp/intel INTEL_DIR=/tmp/intel/$(date -u +%F) bash scripts/nightly/lib/intel/run-intel.sh

# Inspect today's brief:
jq '.items[] | {rank, lane, title, score}' docs/nightly/intel/$(date -u +%F)/brief.json
```

## Tests

`test/{intel-lib,registry,score-brief,enrich-brief,run-intel,brief-slice,headless-brief,collect-*}.test.sh` —
run any directly with `bash <file>`. They stub all external commands; no live APIs.
