# Nightly job: gap fix — brief starvation, lane timeouts, Reddit access

Date: 2026-05-30 · Owner: nightly loop maintenance

## Problem (evidence-backed)

Three gaps, diagnosed from stream-json forensics (`~/logs/lexi-nightly/`) + live token tests.

### G1 — Lane timeout regression (01/02/03 healthy 05-28 → mass-timeout 05-29/30)
Timeline analysis of the 05-30 sidecars: **no lane died from an MCP hang.** MCP was ≤10% of
wall-clock in 01/02, 0% in 03/05/06. Lanes are **work-to-wall-clock bound** — 30–50 broad
`grep -r`/`find` discovery sweeps over the large `fe-next/` tree, hitting 90–98% of budget,
killed mid-generation (`stop_reason: null`).

Root cause of the *regression*: Phase-0 collectors for **Sentry** and **Supabase** gate on env
tokens that are **not set** (`~/.config/lexi-nightly/env` has only PostHog/Telegram/Supabase-
service-role). They degrade to `TOKEN_MISSING` → the intel **brief is empty** for those sources →
lanes' "brief-first, don't re-scan" contract has nothing to act on → they fall back to expensive
broad rediscovery → blow the budget.

The working tokens already exist on the same machine in `~/.claude.json`
(`mcpServers.sentry.env.SENTRY_ACCESS_TOKEN`, `mcpServers.supabase.env.SUPABASE_ACCESS_TOKEN`).
Verified live: both authenticate against the collector REST endpoints
(Sentry org=`lexiclash`, project=`javascript-nextjs`; Supabase advisors API returns lints).

### G2 — Every lane boots ~23 MCP servers
`headless.sh` runs `claude -p --allowedTools '*'` with no `--strict-mcp-config`, so every lane
boots the full global+plugin MCP set (sentry, supabase, posthog, vercel, railway, atlassian,
figma, rive, mcp-image, context7, ahrefs, fal-ai, …). Lanes 04/06/07/08 need **zero** MCP; the
data lanes need 1–3. Boot is only ~3% of budget (NOT the timeout cause) but unused HTTP/SSE
servers are a latent hang surface. Reversible trim.

### G3 — Reddit access dead (3 consecutive nights)
UA-only `curl` to `www.reddit.com/*.json` now returns **HTTP 403 + HTML** for all UA variants
(verified live today: 403, 189 KB HTML block page). The OAuth token endpoint
`www.reddit.com/api/v1/access_token` is reachable (HTTP 401 JSON with no creds — not IP-blocked),
so **OAuth is the viable path**. Playwright is unavailable in the unattended 02:00 run (no
interactive session) — dropped.

## Fix

### F1 — Brief-token backfill  (the real timeout fix; reversible, zero blast radius)
New `lib/intel/backfill-tokens.sh`, sourced by `run.sh` before Phase 0. For each collector token,
if the env value is empty, backfill from `~/.claude.json`:
- `SUPABASE_ACCESS_TOKEN` ← `.mcpServers.supabase.env.SUPABASE_ACCESS_TOKEN`
- `SENTRY_AUTH_TOKEN` ← `.mcpServers.sentry.env.SENTRY_ACCESS_TOKEN`
- `SENTRY_ORG_SLUG` ← parsed from `.mcpServers.sentry.args[]` (`--organization-slug=`), fallback `lexiclash`
- `SENTRY_PROJECT_SLUG` ← env, else single-project auto-discovery via Sentry REST (one 20 s call), else unset
- `SUPABASE_URL` is already exported; collector derives ref from it.

Pure helper; if `~/.claude.json`/`jq` absent or a key missing → no-op (collector stays stale,
exactly as today). Never errors, never overrides an already-set env value.

### F2 — Per-lane strict MCP config (boot + hang-surface trim)
New `lib/mcp-config.sh: build_lane_mcp_config <lane_id> <out_file>` extracts only the servers a
lane needs from `~/.claude.json` into a minimal `{"mcpServers":{…}}`:
| lane | servers |
|------|---------|
| 01 | sentry, supabase, posthog |
| 02 | supabase, posthog |
| 03 | posthog |
| 05 | posthog, mcp-image |
| 04,06,07,08 | (none → `{}`) |

`headless.sh` passes `--mcp-config "$cfg" --strict-mcp-config`. If the build fails for any reason,
it omits the flags and falls back to today's behavior (never strand a lane). Temp config is
mode-600 and removed after the run.

### F3 — Reddit OAuth in `reddit-fetch.sh`
Acquire a bearer token when creds are present, query `oauth.reddit.com`, cache the token for the
run; fall back to the existing UA `www.reddit.com` curl when creds absent.
- `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` + `REDDIT_USERNAME` + `REDDIT_PASSWORD` → **password
  grant** (script-app, reliable read access).
- creds present but no username/password → `client_credentials` (app-only) attempt.
- no creds → UA curl (today's path; still 403 but graceful, exits 0).

`run.sh` exports `REDDIT_*` so env-file values reach lane 04. Setup documented in
`docs/nightly/reddit-oauth-setup.md`. **Honest scope: cannot be end-to-end verified without creds
— deliverable is "OAuth wired + setup doc + needs 4 env vars," not "Reddit working tonight."**

### F4 — Cheap discovery speedup (all lanes)
Add one line to the mandatory-artifact contract header: prefer `rg` (ripgrep 14, present) over
`grep -r`/`find` for code search. Reduces the dominant per-lane cost (broad tree sweeps).

## Tests (TDD, `scripts/nightly/test/*.test.sh` convention — stubbed, no live API)
- `backfill-tokens.test.sh` — backfills missing from a fixture claude.json; never overrides set
  values; no-op when file/jq/key absent; parses org slug from args.
- `mcp-config.test.sh` — emits correct server subset per lane; empty `{}` for 04/06/07/08; valid
  JSON; missing server name omitted not errored.
- `reddit-fetch.test.sh` — password-grant token exchange (stubbed curl) then oauth.reddit.com
  query; UA fallback when no creds; always exits 0; `{"error":…}` on failure.

## Verification status (honest)
- **F1 — proven live:** with backfilled tokens the Sentry collector emits **10 signals** and
  Supabase **179** (both `0` / `TOKEN_MISSING` before). The brief now populates. The prompts'
  brief-first gate ("do NOT re-run discovery … ONLY if the brief is empty/STALE may you query")
  was read directly and confirmed — so a populated brief routes lanes away from the 30–50 Bash
  rediscovery scans that burned the budget. **Final proof is the next 02:00 run** (timeout rate
  drops). Framing: "restored brief data + the gate now actually engages," not "timeouts fixed."
- **F2 — smoke-tested:** `claude -p … --mcp-config '{"mcpServers":{}}' --strict-mcp-config`
  returns cleanly (rc 0), so the zero-server lanes (04/06/07/08) launch fine. Per-lane scoping
  verified live against the real `~/.claude.json` (01→sentry+supabase+posthog with auth intact;
  06→`{}`). Falls back to the full set on any build failure.
- **F3 — built + unit-tested, NOT live-verified:** OAuth path is correct under stubbed curl
  (13/13). Cannot be end-to-end verified without a Reddit app — needs the 4 env vars from
  `docs/nightly/reddit-oauth-setup.md`. Until then lane 04 stays on WebSearch.
- Tests: 3 new suites (backfill 5, mcp-config 12, reddit-fetch 13), full nightly suite **28/28**.

## Out of scope / deferred
- Lane 05/06 are WebSearch/Edit-bound (work-to-budget, not data-starved); F1 doesn't help them.
  Leave timeouts as-is this pass; revisit with scope guards if they regress after F1/F4.
- Playwright/browser Reddit path (no unattended session).
