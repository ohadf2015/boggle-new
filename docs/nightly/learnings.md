# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Sample caveat (2026-05-31):** 7 data nights in window (05-26 thru 05-31). Fleet ship rate: 30/54 lane-runs (56%); 10 timeout-reverted (19%); 12 timeout-partial (22%); 2 gate-fail-docs-only. Tier: 04 = 100% (7/7); 07 = 100% (7/7); 08 = 83% (5/6); 06 = 71% (5/7); 01 = 43% (3/7); 03 = 43% (3/7); 05 = 14% (1/7); 02 = 14% (1/7).

## Active watches (2026-05-31)
- **05-31 recovery vs 05-30 mass timeout** — 3/6 lanes shipped tonight (01+04+06) vs 05-30's 2/6 (04+07+08). Triage SHIPPED first time since 05-28 (security-invoker migration). Perf/engagement/landing still timing out. Partial recovery, not full.
- **Phase 0 intel sources stabilizing** — 05-31: sentry=10, supabase=187, posthog=7, railway=1, search=0 (stale). Sentry+supabase BACK (were 0 on 05-30). Search still dead. 3/6 collectors healthy.
- **KEEP_TIMEOUT_PARTIALS = VALIDATED** — 3rd night (05-31): 3 lanes kept partials. Zero gate-poisoning across 3 nights. Promoted to "stable."
- **git-ship preserve+reset** — 8 consecutive nights. Stable.

## What works (validated this week)
- **Direct-to-master, single end-of-run commit** — one rollback target, one Railway deploy. 15+ nights. (stable)
- **WIP-safe scoped revert** — per-lane revert never flushes concurrent founder work. 13+ nights. (stable)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across 7 runs. (stable)
- **`npm run build:fast` gate** — 3x faster, same correctness signal. 15+ nights. (stable)
- **Autonomy matrix** — reversible+small blast→ship; policy/auth/irreversible→queue. 7 autonomous fixes shipped (search_path, REVOKE, pathTrace null, sync_coins qualify, RLS initplan, WASM build, security-invoker), 0 reverted. (stable)
- **PostHog REST helper** — PostHog MCP hangs eliminated for data queries. 9 nights. (stable)
- **MCP outage graceful degrade** — preflight abort→retry+degrade. 9 nights. (stable)
- **Isolated worktree gate** — build validation can't race a dev server. (stable)
- **Failure digest on kill/abort** — Telegram notifies even on no-ship runs. 9 nights. (stable)
- **Anti-repetition idea ledger** — lane 4 stopped re-pitching. 9 nights. (stable)
- **Per-MCP-call timeout 60s** — 8 nights, no false clips. (stable)
- **Lightweight lanes dominate** — 04 (100%), 07 (100%), 08 (83%). No MCP dependency = no timeout. (stable)
- **Docs-only salvage path** — recovers docs value when code gate fails. 8 nights. (stable)
- **KEEP_TIMEOUT_PARTIALS** — 3 nights validated. Zero poisoned files. Promoted stable. (stable)
- **Phase 0 intel brief** — 3 nights deployed. Sentry+supabase recovered on 05-31 (were dead 05-30). Search still 0. (validating)
- **Mandatory-Minimum-Artifact** — all lanes produce `docs/nightly/artifacts/lane-NN-<date>.md`. 8 nights. (stable)
- **Founder-directive fast path** — lane 05 shipped 05-29 by detecting founder text in brief. (validated once)

## What to avoid (failed this week)
- **MCP silent hangs still #1 failure mode.** 22/54 lane-runs timed out or went partial (41%). 05-30 spike (5/6) recovered slightly on 05-31 (3/6). Per-call 60s clip helps but cumulative sequential hangs exceed lane budget. Target <25%.
- **Lane 02 perf = 1/7 (14%).** Worst lane. Supabase execute_sql + PostHog queries together exceed budget. When it ships, output is high-value (LCP fix, CLS skeleton). Consider splitting into REST-only fast path.
- **Lane 05 landing = 1/7 (14%).** Only shipped when founder directive provided pre-built code (sealed bid 05-29). Normal scope (new page from scratch) exceeds budget 6/7 times.
- **Lane 03 engagement = 3/7 (43%).** Shipped 05-26/27/28, then timed out 3 consecutive nights. Investigate whether brief injection added overhead.
- **Lane 01 triage = 3/7 (43%).** Shipped 05-26/27/31. 05-31 success = sentry+supabase intel back (was 0 on 05-30). MCP health directly predicts triage success.
- **Reddit JSON API blocked (5th consecutive night).** OAuth not configured. WebSearch for site:reddit.com also blocked. Lane 04 ships via WebSearch fallback but Reddit drafts = 0 since 05-27.
- **Phase 0 stale sources (1/6 collectors)** — search returned 0 signals all 7 nights. Sentry+supabase recovered 05-31. Fix search or mark permanently optional.
- Per-lane commits — still banned. (kept)
- Auto-rollback on KPI dip — Railway deploy lag = false positives. (kept)
- Headless Claude creating realtime tables — hard-ban per Supabase perf rule. (kept)
- Demoting `logger.warn -> debug` to clean Sentry — root-cause or queue, never silence. (kept)

## Open watches (carry forward)
- **MCP cumulative timeout** — not per-call (60s cap works), but sequential calls sum past lane budget. 22/54 runs affected. Proposed: MAX_MCP_CALLS=3/lane budget cap. Status: open, 4 nights proposed.
- **Reddit OAuth migration** — JSON API blocked 5 consecutive nights. `docs/nightly/reddit-oauth-setup.md` has spec. Status: open.
- **Search collector dead** — 0 signals all 7 nights. Fix auth or mark optional. Status: open.
- **Spanish SEO window** — ES Scrabble queries +168-2000% WoW (first noticed 05-26). CTR still near-0% despite impressions at pos 7-8. 05-31 added "no por turnos" differentiator. Time-sensitive. Status: resolving.
- **GSC token scope** — `webmasters.readonly` missing from ADC. Requires interactive gcloud auth. Blocks live GSC pulls. Status: open (05-31).
- **`/en/multiplayer` LCP p75 ~3165ms** — game-client hydration. Trending improvement from 5806ms. Skeleton SSR needed. Status: open.
- **`/he/word-tower` CLS 0.797** — inconclusive since 05-27. Predates crane commit. Needs manual repro. Status: open.
- **Admin-session perf noise** — filter admin player_ids from HogQL. First noticed 05-22. Status: open.
- **`show-signup-after-first-win` flag** — 70d old, 43 exposures. Wire or retire. Status: open.
- **Parseword mechanic** — 50K users/48h validates word-transformation daily (lane 04, 05-31). Strong candidate for lane 05. Status: new.
- **Fading Grid Sprint** — `idea:build` tapped by founder + `polish:try:blast` tapped. Lane 05 candidate. Status: open (2 nights).
- **Survival Rounds** — `idea:build` tapped 05-26. No implementation yet. Status: open (5 nights).

## Telegram-button feedback (last 7d)
- `idea:build` x2 — Survival Rounds (05-26), Fading Grid Sprint (05-29)
- `idea:pass` x1 — Language Family Classification (05-30)
- `polish:try` x4 — sealed-bid x2 (05-29), blast fading-grid (05-29), word-alchemy wildcard (05-30)
- `night:good/meh` x0 — zero run-quality taps
- `reddit:*` x0 — no Reddit feedback (API blocked)
- `mode:keep/drop/promote` x0 — no mode lifecycle taps
- **Signal density: 7 real taps in 7 days. Builder interest clusters around new SP modes. `polish:try` is dominant action (57%) — founder iterates on pitched ideas more than proposing new ones.**

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging` | shipped 3/7; success correlates with intel brief health, not skill |
| 02 perf | `superpowers:systematic-debugging` | shipped 1/7; timeout not skill gap |
| 03 engagement | none | shipped 3/7; prompt-driven |
| 04 competitor | `humanizer` | shipped 7/7; applied to Reddit drafts when available |
| 05 landing | `frontend-design` (mandatory) | shipped 1/7; only ships with pre-built code or founder directive |
| 06 seo | `seo-daily` (mandatory) | shipped 5/7; reliable when MCP cooperates |
| 07 self-learn | none — prompt-only | shipped 7/7 |
| 08 adsense | `humanizer` | shipped 5/6; copy quality when ships |

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
- **Reddit JSON API blocked since 05-27.** 5 consecutive nights. OAuth needed or retire Reddit research.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
