# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Sample caveat (2026-05-27):** 7 data nights in window (05-21 thru 05-27). Fleet ship rate: 33/54 lane-runs (61%); 16 timed out (30%); 0 cap-reverted; 1 skipped. Tier: 04 = 100% (7/7); 06 = 86% (6/7, first fail 05-27); 07 = 83% (5/6); 08 = 80% (4/5); 01/03 = 50% (3/6); 02 = 33% (2/6); 05 = 17% (1/6, only real ship = 05-24).

## What works (validated this week)
- **Direct-to-master, single end-of-run commit** — one rollback target, one Railway deploy. Held 8 nights. (kept)
- **WIP-safe scoped revert** — per-lane revert never flushes concurrent founder work. Proven 7 nights including 05-27 2-lane revert. (kept)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across all runs. Lane 1 reads route.ts; lane 6 confirms GSC position. (kept)
- **`npm run build:fast` gate** — 3x faster, same correctness signal. No false negatives in 8 nights. (kept)
- **Autonomy matrix for reversible fixes** — lane 01 shipped 3 security fixes autonomously on 05-27 (pathTrace null guard, search_path hardening, REVOKE on 6 anon RPCs). All reversible, 0 blast radius. Validated pattern: if reversible + small blast → ship; if policy/auth/irreversible → queue. Proven 05-21, 05-23, 05-26, 05-27. (promoted from "security-adjacent = queue")
- **PostHog REST helper** (`eefb0d52e`) — PostHog MCP hangs eliminated. Validated 4 nights (05-24 thru 05-27). (kept)
- **MCP outage graceful degrade** (`3da3f4407`) — preflight abort→retry+degrade. Validated 4 nights. (kept)
- **File caps removed** (`4b59a9a35`) — zero cap-reverts since 05-24 (4 nights clean). (validated)
- **Isolated worktree gate** (`c79e116f5`) — build validation can't race a dev server. (kept)
- **Reddit curl + UA helper** (`311af3d19`) — lane 4 gets real subreddit data. Validated 4 nights. (kept)
- **Failure digest on kill/abort** — Telegram notifies even when the run doesn't ship. Validated 05-25 thru 05-27. (kept)
- **Anti-repetition idea ledger** (`3154c643a`) — lane 4 stopped re-pitching passed ideas. Validated 3 nights. (kept)
- **Per-MCP-call timeout** (`2a08d07844`, `MCP_TOOL_TIMEOUT=60000`) — 2nd CONFIRMATION: lane 01 shipped 05-26 (321s) AND 05-27 (clean). Was timing out 05-24+05-25 before this. Claude client-side watchdog. (confirmed — 2 clean nights)
- **Stream-json tool timeline** (`6cc98a3d7`) — hung MCP call attributable by name. 05-26+05-27 confirmed. (kept)
- **Idea Telegram card loop** (`d6fd55f1e`) — first `idea:build` tap received 05-26 (Survival Rounds). Loop works. (kept)
- **Lightweight lanes dominate** — 04 (100%), 06 (86%), 07/08 (80%+). MCP dependency = failure predictor. (kept)

## What to avoid (failed this week)
- **MCP silent hangs still #1 failure mode (~30%).** MCP_TOOL_TIMEOUT clips at 60s. 2 confirmation nights. Target <10% timeout rate — not there yet.
- **Lane 05 (landing) = 1/6 ships (17%).** Worst lane. Sonnet/600s downgrade attempted 05-27 — STILL timed out. Options exhausted: opus/1500s times out, sonnet/600s times out. Scope cut is the only remaining lever.
- **Lane 02 (perf) = 2/6 (33%).** Supabase execute_sql hangs suspected. When it ships, output high-value (CLS fix 05-24, LCP opacity fix 05-27).
- **Lane 06 first failure (05-27)** — broke 100% streak (6/7 now). Exit 124 timeout. Investigate: was it GSC MCP or IndexNow fetch? Lane 06 has been lightest — one timeout may be transient.
- Per-lane commits — still banned. (kept)
- Auto-rollback on KPI dip — Railway deploy lag = false positives. (kept)
- Headless Claude creating realtime tables — hard-ban per Supabase perf rule. (kept)
- Demoting `logger.warn -> debug` to clean Sentry — root-cause or queue, never silence. (kept)

## Open watches (carry forward)
- **MCP_TOOL_TIMEOUT tuning** — 2 clean nights at 60s. If no legit clipping by 05-29, try lowering to 30s. If lanes start failing mid-query, raise to 90s.
- **Stream-timeline read-back** — grep `stream-*.ndjson` for last `>` before exit-124 lanes. Identify PROVEN culprit tool. Suspects: Sentry `analyze_issue_with_seer`, Supabase `execute_sql`.
- **Lane 05 scope cut needed** — model downgrade failed (still times out). Next: reduce to title/meta/CTA-only (no full page variant). Or skip entirely if no page >=200 sessions/14d.
- **Lane 06 first timeout (05-27)** — NEW. Monitor 05-28. If repeats, check GSC MCP health or add REST fallback like PostHog.
- **Lane 03 REST pre-fetch** — funnel data via PostHog REST before dispatch. Would eliminate main hang vector. Proposed 4 nights, still unshipped.
- **Trim nightly MCP server set** — 20 servers spawn per lane; many unused (figma, atlassian, rive, ahrefs). Fewer = less startup + smaller hang surface.
- **Spanish SEO window** — ES Scrabble queries +840-6667% (Google indexing burst). Lane 06 targeting es pages. Time-sensitive, now 3 nights active.
- **`/en/multiplayer` LCP p75 ~3165-5806ms (POOR)** — game-client hydration. Skeleton SSR approach needed. Trending slight improvement.
- **`/he/word-tower` CLS 0.280→0.797** — first noticed 05-27. Data predates crane commit; inconclusive. Re-check after 72h window rolls past crane deploy.
- **Admin-session CLS/LCP noise** — `/he/daily` CLS 0.882, `/ja` LCP 8775ms = admin-only. Filter admin player_ids from perf HogQL. First noticed 05-22.
- **`show-signup-after-first-win` flag** — ACTIVE 59d, 43 exposures, no linked experiment. Wire or retire.
- **WAL parser DB CPU** — trending down, publication empty, auto-remediation working. Deferred to human/Supabase support.
- **Telegram feedback still sparse** — 8 taps in 8 nights (5 smoke-test + 2 idea + 1 meh). First `idea:build` 05-26 = positive signal but sample too small.
- **sync_coins anon-callable RPC** — FIXED 05-27 (REVOKE shipped in lane 01 migration). CLOSING this watch.
- **`/en/about` LCP 10218ms** — FIXED 05-27 (opacity:0 removed from LegalPageLayout). Verify improvement in 05-28 perf baseline.
- **`results_viewed` instrumentation blackhole** — FIXED 05-27 (event now fires on SP results mount). Verify PostHog events flowing 05-28.

## Telegram-button feedback (last 7d)
- `night:good`x2, `night:meh`x1 — smoke-test from 05-19.
- `idea:pass:41b1c6b6`x1 — 05-23 (real: "games actually finish" concept passed).
- `idea:build:b30c7fe0`x1 — 05-26 (real: "Survival Rounds" last-word-standing elimination — FIRST BUILD TAP).
- `test:works`x2 — infra smoke from 05-19.
- **No `reddit:*`, `mode:*` taps.** First `idea:build` = positive signal. `meh >=3` self-critique threshold still unreachable.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging`, `code-review` | shipped 4/7; autonomy matrix approach more impactful than skills |
| 02 perf | `superpowers:systematic-debugging` | shipped 2/6; timeout not skill gap |
| 03 engagement | none yet | shipped 3/6 (improving); prompt-driven, no skill invoked |
| 04 competitor | `humanizer` | shipped 7/7; humanizer on reddit drafts |
| 05 landing | `frontend-design`, `impeccable:craft` (mandatory) | shipped 1/6; skills can't run if lane times out |
| 06 seo | `seo-daily` (mandatory) | shipped 6/7; first timeout 05-27 |
| 07 self-learn | none — prompt-only | shipped 5/6 |
| 08 adsense | `humanizer` | shipped 4/5; copy quality when it runs |

**Rules for lane 7 updating this table:**
- Add a skill if invoking it correlated with a shipped (not reverted) outcome in >=2 nights.
- Remove a skill if its lane reverted >=2 of last 3 nights *with that skill in the recipe* (timeout-reverts don't count).
- Cap each row at 4 skills; drop lowest-evidence first.
- Lane 5 ALWAYS keeps `frontend-design` or `impeccable:craft`. Lane 6 ALWAYS keeps `seo-daily`.

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when it's the genuine best answer (e.g. "free browser word game, no signup, multiplayer Hebrew/English support").
- Skip subreddits with strict self-promo rules (r/AskReddit, r/woahdude, etc.). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble (read rules first), r/languagelearning (high bar — only mention if vocab-training fit).
- Two drafts per thread: (a) pure-value comment, (b) value-first comment + one-line product mention as alternative. User picks.
- Use throwaway / older account, not a fresh one with 0 karma — flagged as spam instantly.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
