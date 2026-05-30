# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Sample caveat (2026-05-30):** 6 data nights in window (05-25 thru 05-30). Fleet ship rate: 25/46 lane-runs (54%); 12 timeout-reverted (26%); 8 timeout-partial (17%); 1 in-progress. Tier: 04 = 100% (6/6); 07 = 100% (6/6); 06 = 67% (4/6); 08 = 60% (3/5); 03 = 50% (3/6); 01 = 33% (2/6); 05 = 20% (1/5); 02 = 17% (1/6).

## Active watches (2026-05-30)
- **05-30 was worst night in 7d window** — 1/6 lanes shipped (only 04). 5 timeout-partials. KEEP_TIMEOUT_PARTIALS saved 25 partial files from total loss. Investigate: cumulative MCP staleness? Phase 0 stale sources (search/sentry/supabase 0 signals) now cascading?
- **git-ship preserve+reset** — validated 7 consecutive nights. No stranded commits since `a53d0c3c0`. Stable.
- **KEEP_TIMEOUT_PARTIALS = ON** — 2nd validation night (05-30): 5 lanes kept gate-validated partials. No half-written code broke gate. Upgrade from "new" to "validated."
- **Mandatory-Minimum-Artifact contract** — all lanes produce `docs/nightly/artifacts/lane-NN-<date>.md`. 7 nights confirmed.
- **Phase 0 intelligence brief** — 2nd night (05-30). 11 signals (PostHog 9, Railway 1, feedback 1). Stale: search, sentry, supabase (0 signals both nights). Brief utility proven for lane 04; unclear if other lanes consumed it before timing out.

## What works (validated this week)
- **Direct-to-master, single end-of-run commit** — one rollback target, one Railway deploy. Held 14 nights. (stable)
- **WIP-safe scoped revert** — per-lane revert never flushes concurrent founder work. Proven 12+ nights. (stable)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across all runs. (stable)
- **`npm run build:fast` gate** — 3x faster, same correctness signal. No false negatives in 14 nights. (stable)
- **Autonomy matrix** — reversible + small blast → ship; policy/auth/irreversible → queue. 6 autonomous fixes shipped (search_path, REVOKE, pathTrace null, sync_coins qualify, RLS initplan, WASM build), 0 reverted. (promoted)
- **PostHog REST helper** — PostHog MCP hangs eliminated for data queries. 8 nights stable. (stable)
- **MCP outage graceful degrade** — preflight abort→retry+degrade. 8 nights stable. (stable)
- **Isolated worktree gate** — build validation can't race a dev server. (stable)
- **Failure digest on kill/abort** — Telegram notifies even on no-ship runs. 8 nights. (stable)
- **Anti-repetition idea ledger** — lane 4 stopped re-pitching. 8 nights. (stable)
- **Per-MCP-call timeout 60s** — 7 nights, no false clips. (stable)
- **Lightweight lanes dominate** — 04 (100%), 07 (100%). No MCP dependency = no timeout. (validated)
- **Docs-only salvage path** — recovers docs value when code gate fails. 7 nights. (stable)
- **KEEP_TIMEOUT_PARTIALS** — 2 nights validated. Gate-validated partials retained on timeout. No poisoned files yet. (validated)
- **Phase 0 intel brief** — 2 nights deployed. Injects ranked signals per-lane without live MCP calls. PostHog+Railway healthy; search/sentry/supabase stale both nights. (validating)
- **Founder-directive fast path** — lane 05 shipped 05-29 by skipping PostHog step + detecting founder text in brief. (validated once)

## What to avoid (failed this week)
- **MCP silent hangs still #1 failure mode.** 20/46 lane-runs timed out (43%). 05-30 spike: 5/6 lanes timed out. Per-call 60s clip helps individual calls but cumulative sequential hangs exceed lane budget. Target <25%.
- **Lane 02 perf = 1/6 (17%).** Worst lane. Supabase execute_sql + PostHog queries together exceed budget. When it ships, output is high-value (LCP fix, CLS skeleton). Consider splitting into REST-only fast path.
- **Lane 05 landing = 1/5 (20%).** Only shipped when founder directive provided pre-built code (sealed bid). Normal scope (new page from scratch) exceeds budget 4/5 times.
- **Lane 01 triage = 2/6 (33%).** Sentry+Supabase MCP hang. When it ships, output is highest-value (6 autonomous security fixes in 2 nights). KEEP_TIMEOUT_PARTIALS mitigates but doesn't fix root cause.
- **05-30 regression: 06-seo timed out** — first timeout since 05-27. Previously 4/5 reliable. Check if lane prompt bloat or brief injection added overhead.
- **Reddit JSON API blocked (3rd consecutive night).** Returns HTML for all UAs. pullpush.io data ends 2025-05-19. Lane 04 ships via WebSearch fallback but Reddit drafts = 0.
- **Phase 0 stale sources (3/6 collectors)** — search, sentry, supabase returned 0 signals on both 05-29 and 05-30. Only PostHog+Railway+feedback are live. Fix auth or mark permanently optional.
- Per-lane commits — still banned. (kept)
- Auto-rollback on KPI dip — Railway deploy lag = false positives. (kept)
- Headless Claude creating realtime tables — hard-ban per Supabase perf rule. (kept)
- Demoting `logger.warn -> debug` to clean Sentry — root-cause or queue, never silence. (kept)

## Open watches (carry forward)
- **05-30 mass timeout** — 5/6 lanes timed out. Worst single night. Diagnose: MCP infrastructure, machine load, or prompt bloat? If repeats 05-31, escalate.
- **MCP_TOOL_TIMEOUT** — 7 nights at 60s. No false clips. Original plan to try 45s deferred; 05-30 timeouts suggest issue is cumulative, not per-call.
- **Reddit OAuth migration** — JSON API blocked 3 consecutive nights. Build OAuth flow on 05-31 or retire Reddit research.
- **Phase 0 stale sources** — search/sentry/supabase collectors returned 0 signals 2 nights running. Fix or mark optional.
- **Spanish SEO window** — ES Scrabble queries +168-2000% WoW. Lane 06 targeting. Time-sensitive, now 6 nights. CTR still 0% despite impressions — needs title/desc click-bait optimization.
- **`/en/multiplayer` LCP p75 ~3165ms** — game-client hydration. Trending improvement from 5806ms. Skeleton SSR needed.
- **`/he/word-tower` CLS 0.797** — inconclusive since 05-27. Predates crane commit. Needs manual repro.
- **Admin-session perf noise** — filter admin player_ids from HogQL. First noticed 05-22.
- **`show-signup-after-first-win` flag** — 63d old, 43 exposures. Wire or retire.
- **`results_viewed` event** — instrumented 05-27+05-28. Verify flowing by 05-31.
- **Sealed bid playtest feedback** — shipped 05-29. `polish:try` tapped by founder. Bid Reveal Share Card idea surfaced 05-30.
- **Fading Grid Sprint** — `idea:build` tapped by founder + `polish:try:blast` tapped. Lane 05 candidate.
- **Survival Rounds** — `idea:build` tapped 05-26. No implementation yet.
- **Hebrew bug report (05-29)** — "doesn't save blast progress + Hebrew keyboard bad in bug report". Blast guest-save FIXED (`cb8de7f73`). Hebrew IME FIXED. Verify user saw fix.

## Telegram-button feedback (last 7d)
- `idea:build` x2 — Survival Rounds (05-26), Fading Grid Sprint (05-29)
- `idea:pass` x1 — "games actually finish" (05-23)
- `polish:try` x2 — sealed-bid (05-29), blast fading-grid (05-29)
- Founder text x1 — "Build sealed bid, admin-only" (05-28)
- `night:good/meh` x0 — zero run-quality taps (all taps were smoketest)
- `reddit:*` x0 — no Reddit feedback (API blocked)
- `mode:keep/drop/promote` x0 — no mode lifecycle taps
- **Signal density: 6 real taps in 7 days. Builder interest clusters around new SP modes (sealed bid, fading grid, survival rounds).**

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging` | shipped 2/6; autonomy matrix approach more impactful |
| 02 perf | `superpowers:systematic-debugging` | shipped 1/6; timeout not skill gap |
| 03 engagement | none | shipped 3/6; prompt-driven |
| 04 competitor | `humanizer` | shipped 6/6; applied to Reddit drafts when available |
| 05 landing | `frontend-design` (mandatory) | shipped 1/5; only ships with pre-built code or founder directive |
| 06 seo | `seo-daily` (mandatory) | shipped 4/6; reliable when MCP cooperates |
| 07 self-learn | none — prompt-only | shipped 6/6 |
| 08 adsense | `humanizer` | shipped 3/5; copy quality when ships |

**Rules for lane 7 updating this table:**
- Add a skill if invoking it correlated with a shipped (not reverted) outcome in >=2 nights.
- Remove a skill if its lane reverted >=2 of last 3 nights *with that skill in the recipe* (timeout-reverts don't count).
- Cap each row at 4 skills; drop lowest-evidence first.
- Lane 5 ALWAYS keeps `frontend-design` or `impeccable:craft`. Lane 6 ALWAYS keeps `seo-daily`.

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when it's the genuine best answer.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-28.** 3 consecutive nights. OAuth needed or retire Reddit research.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
