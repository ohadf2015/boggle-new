# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Sample caveat (2026-05-24):** 5 data nights in window (05-19 lane-4-only, 05-21 full sweep, 05-22 partial, 05-23 docs-only salvage, 05-24 partial). 05-20 aborted at preflight. Fleet ship rate: 22/33 lane-runs (67%); 8 timed out (24%); 2 cap-reverted (6%); 1 skipped (3%). Clear tier split: lanes 04/06/08 = 100%; lanes 01/02/07 = 50-75%; lanes 03/05 = 25%.

## What works (validated this week)
- **Direct-to-master, single end-of-run commit** — one rollback target, one Railway deploy. Held 5 nights. (kept)
- **WIP-safe scoped revert** — `81b3c8680`, `558169c97`, `3c44e767c`. Per-lane revert never flushes concurrent founder work. Proven 4 nights including 05-24 multi-lane revert. (kept)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across all runs. Lane 1 reads route.ts before fixes; lane 6 confirms query position before meta edits. (kept)
- **`npm run build:fast` gate** — 3x faster, same correctness signal. No false negatives observed. (kept)
- **Security-adjacent = queue, never touch at 03:00** — lane 1 queued anon-callable RPC holes for human REVOKE. Validated 05-21 + 05-23. (kept)
- **Dedup-per-calendar-day gate** (`e00becb48`) — correctly skipped 2 redundant re-runs. (validated)
- **PostHog REST helper** (`eefb0d52e`) — lanes no longer hang on PostHog MCP flaps. Converted PostHog reads to direct REST API. First night: 05-24. (new)
- **MCP outage graceful degrade** (`3da3f4407`) — preflight abort replaced with retry + degrade. 05-24 PostHog-down at 02:00 no longer kills the whole run. (new)
- **File caps removed** (`4b59a9a35`) — eliminates #2 revert cause (cap overflow). First night without cap-revert: 05-24. (new)
- **Isolated worktree gate** (`c79e116f5`) — build validation can't race a dev server. (kept)
- **Reddit curl + UA helper** (`311af3d19`) — lane 4 gets real subreddit data via local curl. Replaced blocked MCP WebFetch. (new)
- **Failure digest on kill/abort** (`eb86486b5`, `8945c61cc`) — Telegram notifies even when the run doesn't ship. (new)
- **Lane 05 skip gate** — skips cleanly when no page has >=200 sessions and no concept has >=2 citations. Correct skip: 05-23. First ship: 05-24. (new)
- **Per-lane revert isolation** — 05-22 reverted lanes 1+3+5 while 4+6 shipped. 05-24 reverted 1+3 while 2+4+5+6 shipped. Core safety property proven 4 nights. (kept)

## What to avoid (failed this week)
- **MCP silent hangs remain #1 failure mode (24% of lane-runs).** PostHog REST helper fixed ONE vector, but Sentry + Supabase MCP calls still hang. Lanes 01/03 timed out 2/4 nights each. Root = blocked MCP call with no per-call timeout. Heartbeat logging proposed 3 consecutive nights (05-21-23), still unshipped. **NEXT: per-call `gtimeout` wrapper in lane runner, NOT more budget.**
- **Lane 03 (engagement) = flakiest lane (1/4 ship).** Needs PostHog funnel queries (slow MCP) + experiment flag creation (manual PostHog step). When it ships (05-23), output is high-value. Consider: pre-fetch funnel data via REST before lane starts.
- **Lane 01 (triage) degraded since feedback-digest injection** — 2/4 ship rate (was reliable on 05-21). Extra prompt surface from `18734c040` pushes Sentry MCP calls past timeout. Trim digest to top-3 items.
- **Docs-only salvage = wasted compute** — 05-23 gate failed on code (lint errors from prior lanes), shipped ONLY reports. Root: cross-lane lint contamination. Fix shipped (`4feed1f50` eslint ignore .next-nightly) but needs retest.
- **getUpdates poller collision FIXED** (`d7b6e4058`) — no new collision errors. But feedback still sparse (1 real tap since fix). Poller is not the bottleneck anymore; user engagement with buttons is.
- **Budget raises proven ineffective** — lane 5 burned full 1500s of opus on 05-22, zero output. Confirmed: hangs are blocked calls, not scope-too-broad. (kept, closed — don't revisit)
- Per-lane commits — still banned. (kept)
- Auto-rollback on KPI dip — Railway deploy lag = false positives. (kept)
- Headless Claude creating realtime tables — hard-ban per Supabase perf rule. (kept)
- Demoting `logger.warn -> debug` to clean Sentry — root-cause or queue, never silence. (kept)

## Open watches (carry forward)
- **Per-call MCP timeout wrapper** — proposed 3 nights, unshipped. Highest-leverage improvement. A `gtimeout 30` per MCP call would cap hangs instead of burning full lane budget. First noticed 05-21.
- **Shareable result card (Wordle emoji format)** — lane 4's TOP idea 2 nights running (05-22, 05-24). r/wordgames thread confirms demand. Effort: S. Strong build candidate. First noticed 05-22.
- **Parseword (Josh Wardle, Q1-Q2 2026)** — biggest competitor signal. Reviews call it "niche" — LexiClash's opening. (kept)
- **`/en/multiplayer` LCP p75 ~4228ms (POOR)** — n=29, highest confidence. Game-client hydration suspected. Needs profile + lazy socket bundle. Open in `perf-watch.md`. (kept)
- **Admin-session CLS noise** — `/he/daily` CLS 0.882 and `/ja` LCP 8775ms confirmed admin-only (05-24 lane 2). Filter admin player_ids from perf queries to eliminate false regressions. First noticed 05-22.
- **`show-signup-after-first-win` flag** — ACTIVE 53d, no linked experiment. Queued: wire experiment or retire. (kept)
- **WAL parser DB CPU ~78%** — trending down, publication empty, auto-remediation working. Deferred to human. (kept)
- **Telegram feedback near-zero** — 6 total taps in 5 nights (5 smoke-test + 1 real). Poller fixed, but user isn't tapping. Verify digest delivery. First noticed 05-22.
- **Lane 03 REST pre-fetch** — funnel data could be fetched via PostHog REST API before lane starts (like the perf fix). Would eliminate main MCP hang vector. (new)
- Lane 05 landing-variant coverage: cap 1 variant/week to avoid flag explosion. (kept)
- Self-learn drift: if `learnings.md` hits 200 lines for 3 nights running, rotation is broken. (kept)

## Telegram-button feedback (last 7d)
- `night:good`x2, `night:meh`x1 — ALL smoke-test from 05-19.
- `idea:pass:41b1c6b6`x1 — 05-23 (real tap: "games actually finish" concept passed).
- `test:works`x2 — infra smoke from 05-19.
- **No `reddit:*`, `mode:*` taps.** Poller collision fixed (`d7b6e4058`), engagement near-zero. `meh >=3` self-critique threshold unreachable.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.

## Specialized Skills (maintained by lane 7)

Per-lane skill recommendations, evidence-weighted. Each lane prompt reads this and honors it.

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging`, `code-review` | shipped 2/4 (AvatarRenderer 05-21, crypto+FRIEND_MESSAGES 05-23); timeouts = MCP hang not skill |
| 02 perf | `superpowers:systematic-debugging`, `code-review` | shipped 2/4 (sync_coins 05-21, CLS skeleton 05-24); timeout 05-23 = MCP hang. Dropped `web-interface-guidelines` (no evidence of use) |
| 03 engagement | none yet — insufficient data | shipped 1/4 (funnel+experiment 05-23); 3 failures = MCP hang or cap — add none until 2+ ships |
| 04 competitor | `humanizer`, `ux-writer` | shipped 5/5 — most reliable lane; humanizer applied 05-24 reddit draft |
| 05 landing | `frontend-design`, `impeccable:craft` (mandatory) | shipped 1/4 (hero variant 05-24 — first success). Dropped `usability-psychologist`, `web-interface-guidelines` (no shipped evidence). Design quality non-negotiable |
| 06 seo | `seo-daily` (mandatory), `humanizer` | shipped 4/4 — tied most reliable; seo-daily every night |
| 07 self-learn | none — keep prompt-only | shipped 3/4; timeout 05-23 = MCP hang |
| 08 adsense | `humanizer` | shipped 4/4 — tied most reliable; humanizer on 05-21 copy |

**Rules for lane 7 updating this table:**
- Add a skill to a lane only if invoking it correlated with a shipped (not reverted) outcome in >=2 nights.
- Remove a skill if its lane reverted >=2 of last 3 nights *with that skill in the recipe* (timeout-reverts don't count against a skill).
- Cap each row at 4 skills; drop lowest-evidence first.
- Evidence column must be specific.
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
