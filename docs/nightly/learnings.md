# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Sample caveat (2026-05-26):** 6 data nights in window (05-21 full, 05-22 partial, 05-23 salvage, 05-24 partial, 05-25 worst, 05-26 recovery). Fleet ship rate: 28/47 lane-runs (60%); 15 timed out (32%); 0 cap-reverted (caps removed 05-24); 1 skipped (2%). Clear tier: lanes 04/06 = 100%; 07 = 67%; 08 = 60%; 01 = 50%; 02/03 = 33%; 05 = 0%.

## What works (validated this week)
- **Direct-to-master, single end-of-run commit** — one rollback target, one Railway deploy. Held 7 nights. (kept)
- **WIP-safe scoped revert** — per-lane revert never flushes concurrent founder work. Proven 6 nights including 05-25 4-lane + 05-26 2-lane reverts. (kept)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across all runs. Lane 1 reads route.ts; lane 6 confirms query position. (kept)
- **`npm run build:fast` gate** — 3x faster, same correctness signal. No false negatives in 7 nights. (kept)
- **Security-adjacent = queue, never touch at 03:00** — lane 1 queued sync_coins anon-RPC + function_search_path for human. Validated 05-21, 05-23, 05-26. (kept)
- **PostHog REST helper** (`eefb0d52e`) — PostHog MCP hangs eliminated. Validated 3 nights (05-24, 05-25, 05-26). (kept)
- **MCP outage graceful degrade** (`3da3f4407`) — preflight abort→retry+degrade. Validated 3 nights. (kept)
- **File caps removed** (`4b59a9a35`) — zero cap-reverts since 05-24 (3 nights clean). (validated)
- **Isolated worktree gate** (`c79e116f5`) — build validation can't race a dev server. (kept)
- **Reddit curl + UA helper** (`311af3d19`) — lane 4 gets real subreddit data. Validated 3 nights. (kept)
- **Failure digest on kill/abort** — Telegram notifies even when the run doesn't ship. Validated 05-25, 05-26. (kept)
- **Anti-repetition idea ledger** (`3154c643a`) — lane 4 stopped re-pitching passed ideas. Validated 05-25, 05-26. (kept)
- **Per-MCP-call timeout** (`2a08d07844`, `MCP_TOOL_TIMEOUT=60000`) — FIRST SIGNAL: lane 01 shipped 05-26 (321s, rc=0) after timing out 05-24+05-25. Not a shell gtimeout (impossible); Claude client-side watchdog. (new — awaiting 2nd confirmation night)
- **Stream-json tool timeline** (`6cc98a3d7`) — hung MCP call now attributable by name in run log. 05-26 confirmed: last `>` with no `✓` = the culprit. (new)
- **Idea Telegram card loop** (`d6fd55f1e`) — unpublished mode ideas get Telegram cards for founder verdict. (new)
- **Lightweight lanes dominate** — lanes 04/06 (no heavy MCP, <=7m avg) = 100% ship rate. MCP dependency = failure predictor. (kept)

## What to avoid (failed this week)
- **MCP silent hangs still #1 failure mode (~30%).** MCP_TOOL_TIMEOUT now clips them at 60s instead of stalling 20+min. First positive signal (lane 01 05-26). Watch: target <10% timeout rate.
- **Lane 05 (landing) = 0/6 ships.** Worst lane. Opus/1500s budget burns fully on every timeout. Zero value delivered in 6 nights. Intervention required: model downgrade OR scope cut.
- **Lane 02 (perf) = 2/6.** Supabase execute_sql hangs suspected (stream-timeline will confirm). When it ships, output is high-value (CLS fix 05-24, sync_coins 05-21).
- **Lane 03 (engagement) = 2/6 but improving.** Shipped 05-23 (funnel instrumentation) + 05-26 (replay CTA experiment). PostHog REST pre-fetch would stabilize.
- Per-lane commits — still banned. (kept)
- Auto-rollback on KPI dip — Railway deploy lag = false positives. (kept)
- Headless Claude creating realtime tables — hard-ban per Supabase perf rule. (kept)
- Demoting `logger.warn -> debug` to clean Sentry — root-cause or queue, never silence. (kept)

## Open watches (carry forward)
- **MCP_TOOL_TIMEOUT validation** — 05-26 lane 01 shipped (first signal). Need 2+ more clean nights to confirm. If legit queries get clipped, raise to 90s. If clean, lower to 30s.
- **Stream-timeline read-back** — grep `stream-*.ndjson` for last `>` before exit-124 lanes. THEN targeted fix on PROVEN culprit (suspects: Sentry `analyze_issue_with_seer`, Supabase `execute_sql`).
- **Lane 05 intervention** — 0/6 = unacceptable. Options: (a) downgrade opus→sonnet/720s, (b) skip when no page >=200 sessions (gate already exists but threshold too low), (c) reduce scope to title/CTA-only (no full variant).
- **Lane 03 REST pre-fetch** — funnel data via PostHog REST before dispatch. Would eliminate main hang vector. Proposed 3 nights.
- **Trim nightly MCP server set** — 20 servers spawn per lane; many unused (figma, atlassian, rive, ahrefs). Lanes need only sentry/supabase/posthog (+gsc for lane 06). Fewer = less startup + smaller hang surface.
- **Spanish SEO window** — ES Scrabble queries +840-6667% (Google indexing burst). Lane 06 keeps targeting es pages. Time-sensitive.
- **sync_coins anon-callable RPC** — URGENT security finding 05-26. Queued for human REVOKE.
- **`/en/multiplayer` LCP p75 ~4228-5806ms (POOR)** — n=11-29. Game-client hydration suspected.
- **Admin-session CLS/LCP noise** — `/he/daily` CLS 0.882, `/ja` LCP 8775ms = admin-only. Filter admin player_ids from perf HogQL. First noticed 05-22.
- **`show-signup-after-first-win` flag** — ACTIVE 56d, 42 exposures, no linked experiment. Wire or retire.
- **WAL parser DB CPU** — trending down, publication empty, auto-remediation working. Deferred to human.
- **Telegram feedback near-zero** — 7 taps in 7 nights (5 smoke-test + 1 real + 1 idea:pass). Poller works, users don't tap.

## Telegram-button feedback (last 7d)
- `night:good`x2, `night:meh`x1 — ALL smoke-test from 05-19.
- `idea:pass:41b1c6b6`x1 — 05-23 (real: "games actually finish" concept passed).
- `test:works`x2 — infra smoke from 05-19.
- **No `reddit:*`, `mode:*`, `idea:build` taps.** Engagement near-zero. `meh >=3` self-critique threshold unreachable.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging`, `code-review` | shipped 3/6; MCP timeout = failure mode not skill gap |
| 02 perf | `superpowers:systematic-debugging` | shipped 2/6; dropped `code-review` (no evidence of invocation) |
| 03 engagement | none yet | shipped 2/6; both successes were prompt-driven, no skill invoked |
| 04 competitor | `humanizer` | shipped 6/6; humanizer applied 05-24 reddit draft |
| 05 landing | `frontend-design`, `impeccable:craft` (mandatory) | shipped 0/6; skills never get to run (timeout kills lane first) |
| 06 seo | `seo-daily` (mandatory) | shipped 6/6; 100% reliability |
| 07 self-learn | none — prompt-only | shipped 4/6 |
| 08 adsense | `humanizer` | shipped 3/5; humanizer on 05-21 copy |

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
