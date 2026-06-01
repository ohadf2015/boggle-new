# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Sample caveat (2026-06-01):** 6 data nights in window (05-26 thru 06-01; 05-31 run aborted/re-ran, no report file). Fleet ship rate: 25/46 lane-runs (54%); 21 timed out (46%). Declining trend — 06-01 worst night (1/6 code lanes shipped). Tier: 04 = 100% (6/6); 07 = 100% (5/5); 08 = 80% (4/5); 06 = 67% (4/6); 03 = 50% (3/6); 01 = 33% (2/6); 02 = 17% (1/6); 05 = 17% (1/6).

## Active watches (2026-06-01)
- **06-01 = worst night since tracking** — only lane 04 shipped code (1/6). Lanes 01-03+05-06 ALL timed out. 05-31 also disrupted (preflight abort on unpushed founder commits, 2 retries). Fleet health declining, not recovering.
- **`/en/multiplayer` LCP CRITICAL** — p75 3165ms→8448ms (+167%, n=48) on 06-01. CLS 0.056→0.510. INP 584ms new high. Regression accelerating. Lane 02 (the lane that would fix this) has 17% ship rate.
- **MCP availability worsening** — sentry+supabase recovered 05-31 but timeouts persist 06-01. Sequential MCP call budget remains the #1 unsolved infrastructure problem.
- **Phase 0 intel sources** — sentry=10, supabase=187, posthog=6, revenue=4 on 06-01. Search dead (7+ nights). 4/6 collectors healthy.
- **KEEP_TIMEOUT_PARTIALS = stable** — 4th night. Zero gate-poisoning.

## What works (validated this week)
- **Direct-to-master, single end-of-run commit** — one rollback target, one Railway deploy. 16+ nights. (stable)
- **WIP-safe scoped revert** — per-lane revert never flushes concurrent founder work. 14+ nights. (stable)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across 6 runs. (stable)
- **`npm run build:fast` gate** — 3x faster, same correctness signal. 16+ nights. (stable)
- **Autonomy matrix** — reversible+small blast→ship; policy/auth/irreversible→queue. 7+ autonomous fixes shipped, 0 reverted. (stable)
- **PostHog REST helper** — PostHog MCP hangs eliminated for data queries. 10+ nights. (stable)
- **MCP outage graceful degrade** — preflight abort→retry+degrade. 10+ nights. (stable)
- **Isolated worktree gate** — build validation can't race a dev server. (stable)
- **Failure digest on kill/abort** — Telegram notifies even on no-ship runs. 10+ nights. (stable)
- **Anti-repetition idea ledger** — lane 4 stopped re-pitching. 10+ nights. (stable)
- **Per-MCP-call timeout 60s** — 9 nights, no false clips. (stable)
- **Lightweight lanes dominate** — 04 (100%), 07 (100%), 08 (80%). No MCP dependency = no timeout. (stable)
- **Docs-only salvage path** — recovers docs value when code gate fails. 9+ nights. (stable)
- **KEEP_TIMEOUT_PARTIALS** — 4 nights validated. Zero poisoned files. (stable)
- **Phase 0 intel brief** — 4 nights deployed. Sentry+supabase operational. (validating)
- **Mandatory-Minimum-Artifact** — all lanes produce `docs/nightly/artifacts/lane-NN-<date>.md`. 9+ nights. (stable)
- **Founder-directive fast path** — lane 05 shipped 05-29 by detecting founder text in brief. (validated once)

## What to avoid (failed this week)
- **MCP silent hangs still #1 failure mode.** 21/46 lane-runs timed out (46%, UP from 41%). 06-01 worst: 5/6 code lanes timed out. Per-call 60s clip insufficient — cumulative sequential hangs exceed lane budget. Unsolved. Target <25%.
- **Lane 02 perf = 1/6 (17%).** Worst lane (tied 05). Dual MCP dependency (supabase+posthog) kills budget. Only shipped 05-27 (LCP opacity fix). REST-only mode overdue.
- **Lane 05 landing = 1/6 (17%).** Only shipped when founder directive provided pre-built code (sealed bid 05-29). Scope mismatch: "new page from scratch" always exceeds budget.
- **Lane 01 triage = 2/6 (33%).** Declined from 43%. Shipped only 05-26/05-27. MCP health directly predicts success.
- **Lane 03 engagement = 3/6 (50%).** Shipped 05-26/27/28, then timed out 3 consecutive nights. No prompt change between success/failure — environment degradation, not prompt issue.
- **Lane 06 SEO = 4/6 (67%).** NEW regression: shipped 4 consecutive nights (05-26 thru 05-29), then timed out 2 consecutive (05-30/06-01). Coincides with MCP instability.
- **Reddit JSON API blocked (6th consecutive night).** OAuth not configured. Lane 04 ships via WebSearch fallback but Reddit drafts = 0 since 05-27.
- **Phase 0 search collector dead** — 0 signals 7+ nights. Remove or mark optional. Wastes budget.
- **05-31 preflight abort** — HEAD had unpushed founder commits → preflight rejected, wasted 2 retry attempts. Nightly needs dirty-HEAD handling.
- Per-lane commits — still banned. (kept)
- Auto-rollback on KPI dip — Railway deploy lag = false positives. (kept)
- Headless Claude creating realtime tables — hard-ban per Supabase perf rule. (kept)
- Demoting `logger.warn -> debug` to clean Sentry — root-cause or queue, never silence. (kept)

## Open watches (carry forward)
- **MCP cumulative timeout** — sequential calls sum past lane budget. 21/46 runs affected. Proposed: MAX_MCP_CALLS=3. Status: open, 5 nights proposed.
- **Reddit OAuth migration** — JSON API blocked 6 consecutive nights. Spec at `docs/nightly/reddit-oauth-setup.md`. Status: open.
- **Search collector dead** — 0 signals 7+ nights. Recommend: remove. Status: open.
- **`/en/multiplayer` LCP p75 8448ms** — CRITICAL regression (+167%). Was improving (5806→3165), now reversed. Skeleton SSR needed. Status: escalating.
- **`/en/multiplayer` CLS 0.510** — new regression from 0.056. Status: new (06-01).
- **`/en/multiplayer` INP 584ms** — new high. Status: new (06-01).
- **`/he/daily/word-wheel` LCP 2568ms** — was 1399ms (+84%). Status: new (06-01).
- **`/he/word-tower` CLS 0.797** — inconclusive since 05-27. Predates crane commit. Status: open.
- **Spanish SEO window** — ES Scrabble queries +168-2000% WoW. CTR near-0% at pos 7-8. Time-sensitive. Status: resolving.
- **GSC token scope** — `webmasters.readonly` missing from ADC. Blocks live GSC pulls. Status: open.
- **Admin-session perf noise** — filter admin player_ids from HogQL. Status: open.
- **`show-signup-after-first-win` flag** — 72d old, 43 exposures. Wire or retire. Status: open.
- **Fading Grid Sprint** — `idea:build` + `polish:try` tapped by founder. Status: open (3 nights).
- **Survival Rounds** — `idea:build` tapped 05-26. No implementation. Status: open (6 nights).
- **05-31 run infrastructure** — preflight abort on dirty HEAD. Needs stash-or-branch handler. Status: new.

## Telegram-button feedback (last 7d)
- `idea:build` x2 — Survival Rounds (05-26), Fading Grid Sprint (05-29)
- `idea:pass` x1 — Language Family Classification (05-30)
- `polish:try` x4 — sealed-bid x2 (05-29, 05-30), blast fading-grid (05-29), word-alchemy wildcard (05-30)
- `night:good/meh` x0 — zero run-quality taps
- `reddit:*` x0 — no Reddit feedback (API blocked)
- `mode:keep/drop/promote` x0 — no mode lifecycle taps
- **Signal density: 7 real taps in 7 days. `polish:try` dominant (57%) — founder iterates on pitched ideas more than proposing new ones. Builder interest clusters around new SP modes. Zero run-quality feedback = no strong signal either way.**

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging` | shipped 2/6; MCP health predicts success, not skill |
| 02 perf | `superpowers:systematic-debugging` | shipped 1/6; timeout not skill gap |
| 03 engagement | none | shipped 3/6; prompt-driven |
| 04 competitor | `humanizer` | shipped 6/6; applied to idea drafts |
| 05 landing | `frontend-design` (mandatory) | shipped 1/6; only ships with pre-built code |
| 06 seo | `seo-daily` (mandatory) | shipped 4/6; reliable when MCP cooperates |
| 07 self-learn | none — prompt-only | shipped 5/5 |
| 08 adsense | `humanizer` | shipped 4/5; copy quality when ships |

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
- **Reddit JSON API blocked since 05-27.** 6 consecutive nights. OAuth needed or retire Reddit research.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
