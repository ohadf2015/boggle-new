# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Sample (2026-06-02):** 7 report nights in window (05-27..06-02; 05-31 = run log only, no formal report). Code ship rate: 3/6 completed nights (50%). **Two distinct failure modes emerged:** (1) timeouts kill lanes mid-edit → half-written files poison gate (4/7 nights), (2) all lanes complete but authored code breaks tests/build → gate rejects (06-01 evening, all 9 lanes finished <10min each, gate failed 3 rounds). Solving timeouts alone won't reach 100% — lanes must self-verify. Per-lane 7-night completion: 07=7/7 (100%); 04=7/7 (100%); 08=6/7 (86%); 03=4/7 (57%); 06=4/7 (57%); 01=3/7 (43%); 02=3/7 (43%); 05=2/7 (29%).

## Active watches (2026-06-02)
- **NEW failure mode: gate rejects clean-timed lanes.** 06-01 evening: all 9 lanes completed, gate failed 3 rounds (lint+test+build). Timeouts are #1 by frequency (4/7 nights), but code-quality gate failure is #2 and UNSOLVED. Each lane should run `npx tsc --noEmit` on changed files before finishing.
- **`/en/multiplayer` CWV improving but still poor** — LCP 3010ms (was 8448ms), INP 528ms (was 584ms), CLS 0.512. Trending right direction but CLS needs SSR skeleton. Status: improving.
- **Phase 0 intel sources** — sentry/supabase/posthog/revenue/railway healthy; **search collector dead 8+ nights** (0 signals — retire it).
- **Gate pass rate: 3/6 = 50%.** Half of completed nights fail to ship code. Flip this by addressing both failure modes.
- **KEEP_TIMEOUT_PARTIALS = stable** — 6th night, zero gate poisoning from partials specifically.

## What works (validated this week)
- **Phase 0 intel brief + scoped MCP** — 06-01 evening: 9/9 lanes completed (0 timeouts). 05-31 run also succeeded. Front-loaded ranked signals eliminate blind MCP fan-out. (validated, 3+ nights)
- **Direct-to-master, single end-of-run commit** — one rollback target, one Railway deploy. 17+ nights. (stable)
- **WIP-safe scoped revert** — per-lane revert never flushes concurrent founder work. 16+ nights. (stable)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across window. (stable)
- **`npm run build:fast` gate** — 3x faster, same signal. 17+ nights. (stable)
- **Autonomy matrix** — reversible+small→ship; policy/auth/irreversible→queue. 0 reverted. (stable)
- **PostHog REST helper** — eliminates PostHog MCP hangs for data queries. 12+ nights. (stable)
- **Isolated worktree gate** — build validation can't race a dev server. (stable)
- **Failure digest on kill/abort** — Telegram notifies even on no-ship runs. (stable)
- **Anti-repetition idea ledger** — lane 4 stopped re-pitching. (stable)
- **Lightweight lanes dominate** — 07 (100%), 04 (100%), 08 (86%). Low/zero MCP dependency = no timeout. (stable)
- **Docs-only salvage path** — recovers docs value when code gate fails. 11+ nights. (stable)
- **Mandatory-Minimum-Artifact** — every lane writes artifact file. Floor never zero. (stable)
- **Founder-directive fast path** — sealed-bid directive shipped 05-29; `polish:try` sealed-bid share card shipped 06-01. (validated 3x)
- **Baseline-poison salvage** — re-gates authored set lint-skipped when non-authored file fails on HEAD. (stable)

## What to avoid (failed this week)
- **Over-scoped lane work = #1 ship-killer by frequency** (4/7 nights). One complete gate-clean change ships; three half-finished edits ship nothing. Lanes must pick smallest correct change.
- **Gate code-quality failure = #2 ship-killer** (NEW). 06-01 evening: all lanes completed, gate rejected authored code 3 rounds. Lanes must self-verify with tsc/lint on changed files.
- **Lane 05 (landing) = 2/7 (29%).** Worst lane. Ships only with founder directive or pre-built code. "Build from scratch" always exceeds budget. Cap to title+meta+CTA or pre-built only.
- **Lane 01 (triage) = 3/7 (43%).** MCP-heavy (Sentry+Supabase) + migration scope. Succeeds when scoped to 1 fix.
- **Lane 02 (perf) = 3/7 (43%).** Improved from 1/7 last window. Still struggles with multiplayer CWV (large-scope investigation).
- **Reddit JSON API blocked (7+ consecutive nights).** OAuth not configured. Lane 04 compensates via WebSearch; native Reddit drafts = 0 since 05-27.
- **Search collector dead** — 0 signals 8+ nights. Pure waste. Remove.
- **05-31 preflight abort** — dirty HEAD (unpushed founder commits) rejected. Stash-or-branch handler still missing.
- Per-lane commits — banned. (kept)
- Auto-rollback on KPI dip — Railway deploy lag = false positives. (kept)
- Headless Claude creating realtime tables — hard-ban per Supabase perf rule. (kept)
- Demoting `logger.warn→debug` to clean Sentry — root-cause or queue, never silence. (kept)
- **Self-summarizing wrong root cause** — prior learnings framed 06-01 as "worst night" from morning run only. Always check ALL runs for a date + the actual log.

## Open watches (carry forward)
- **Gate code-quality failure** — 06-01 evening: all lanes done, gate failed. Self-verify needed. Status: NEW, high priority.
- **MCP cumulative timeout** — sequential calls sum past lane budget. MAX_MCP_CALLS=3 proposed. Status: open (7 nights).
- **`/en/multiplayer` LCP 3010ms / INP 528ms / CLS 0.512** — improving (was 8448/584/0.510). SSR skeleton needed. Status: improving.
- **`/he/word-tower` CLS 0.797** — inconclusive since 05-27, predates crane commit. Status: open.
- **`/he/daily/word-wheel` LCP 2568ms** (was 1399ms, +84%). Status: open.
- **`PageClient.tsx` line bloat** — leaderboard 519→600+ lines, blocking lane 03 experiment wiring. Status: open.
- **Reddit OAuth migration** — JSON API blocked 7+ nights. Spec at `docs/nightly/reddit-oauth-setup.md`. Status: open.
- **Search collector dead** — 0 signals 8+ nights. Recommend remove. Status: open.
- **GSC token scope** — `webmasters.readonly` missing from ADC. Blocks live GSC pulls. 6+ nights. Status: open.
- **Admin-session perf noise** — filter admin player_ids from HogQL. Status: open.
- **`show-signup-after-first-win` flag** — 06-01 confirmed IS wired (prior "no callsite" was wrong). Monitor exposure count. Status: corrected.
- **Fading Grid Sprint** — `idea:build` tapped by founder 05-29. No implementation. Status: open (4 nights).
- **Survival Rounds** — `idea:build` tapped 05-26. No implementation. Status: open (7 nights).
- **Word Detective daily** — `idea:build` tapped 06-01. New entry. Status: open (1 night).

## Telegram-button feedback (last 7d)
- `polish:try` x6 — sealed-bid x2, blast x1, word-alchemy x1, word-vault x1, word-forge x1
- `idea:build` x3 — survival rounds, fading grid sprint, word detective
- `idea:pass` x1 — language family classification
- `night:good/meh` x0 ; `reddit:*` x0 ; `mode:*` x0
- **11 taps in 7d (up from 8). `polish:try` dominant (55%) and BROADENING — now hitting word-vault + word-forge beyond sealed-bid. 3 `idea:build` taps = founder wants new SP modes (survival, fading grid, word detective). Zero run-quality taps = no strong steer on loop health.**

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging` | 3/7; succeeds scoped to 1 fix |
| 02 perf | `superpowers:systematic-debugging` | 3/7; improved from 1/7, multiplayer CWV open |
| 03 engagement | none | 4/7; prompt-driven |
| 04 competitor | `humanizer` | 7/7; applied to idea drafts |
| 05 landing | `frontend-design` (mandatory) | 2/7; ships only with directive or pre-built |
| 06 seo | `seo-daily` (mandatory) | 4/7; reliable when scoped |
| 07 self-learn | none — prompt-only | 7/7 |
| 08 adsense | `humanizer` | 6/7; improved, reliable this window |

**Rules for lane 7 updating this table:**
- Add a skill if invoking it correlated with a shipped (not reverted) outcome in ≥2 nights.
- Remove a skill if its lane reverted ≥2 of last 3 nights *with that skill in the recipe* (timeout-reverts don't count).
- Cap each row at 4 skills; drop lowest-evidence first.
- Lane 5 ALWAYS keeps `frontend-design` or `impeccable:craft`. Lane 6 ALWAYS keeps `seo-daily`.

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when it's the genuine best answer.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** 7+ consecutive nights. OAuth needed or retire Reddit research.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
