# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Sample (2026-06-03):** 6 report nights in window (05-28..06-03). Gate pass rate: 1/6 (17%) — only 05-28 passed cleanly; others docs-only salvage. **Two failure modes persist:** (1) timeouts kill lanes mid-edit (4/6 nights), (2) gate rejects authored code on quality (3/6 nights). The evening run (06-01 19:05) proved all 9 lanes CAN complete in <7min each when scoped — total 53min vs typical 2-4h. Per-lane 6-night completion: 07=6/6 (100%); 04=6/6 (100%); 03=4/6 (67%); 02=3/6 (50%); 08=3/6 (50%); 06=3/6 (50%); 01=2/6 (33%); 05=1/6 (17%); 09=0/2 (0%, new lane).

## Active watches (2026-06-03)
- **Homepage LCP 7107ms — catastrophic NEW regression.** First appeared 06-03. Likely ScrollTrigger/showcase3D hero. CLS 1.0 on same page. Highest-priority perf fix.
- **Gate pass rate: 1/6 = 17%.** Down from 50% last window. Timeout + code-quality double failure. Every lane MUST self-verify (`npx tsc --noEmit` on changed files).
- **Phase 0 intel sources** — sentry/supabase/posthog/revenue/railway healthy; **search collector dead 9+ nights** (retire it).
- **KEEP_TIMEOUT_PARTIALS = stable** — 7th night, zero gate poisoning from partials.
- **Founder directive: Word Tower daily letter pool** — `dailyLetterPool.ts` + 14 TDD tests SHIPPED 06-03 (module only, wiring deferred). Ad-refill integration next.

## What works (validated this week)
- **Phase 0 intel brief + scoped MCP** — 06-01 evening: 9/9 completed (0 timeouts). Front-loaded ranked signals eliminate blind MCP fan-out. (validated, 4+ nights)
- **Direct-to-master, single end-of-run commit** — one rollback target, one Railway deploy. 18+ nights. (stable)
- **WIP-safe scoped revert** — per-lane revert never flushes concurrent founder work. 17+ nights. (stable)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across window. (stable)
- **`npm run build:fast` gate** — 3x faster, same signal. 18+ nights. (stable)
- **Autonomy matrix** — reversible+small→ship; policy/auth/irreversible→queue. 0 reverted. (stable)
- **PostHog REST helper** — eliminates PostHog MCP hangs for data queries. 13+ nights. (stable)
- **Isolated worktree gate** — build validation can't race a dev server. (stable)
- **Failure digest on kill/abort** — Telegram notifies even on no-ship runs. (stable)
- **Anti-repetition idea ledger** — lane 4 stopped re-pitching. (stable)
- **Lightweight lanes dominate** — 07=100%, 04=100%. Low/zero MCP dependency = no timeout. (stable)
- **Docs-only salvage path** — recovers docs value when code gate fails. 12+ nights. (stable)
- **Mandatory-Minimum-Artifact** — every lane writes artifact file. Floor never zero. (stable)
- **Founder-directive fast path** — sealed-bid 05-29, share-card 06-01, word-tower-pool 06-03. (validated 4x)
- **Baseline-poison salvage** — re-gates authored set lint-skipped when non-authored file fails on HEAD. (stable)
- **PreToolUse time guard hook** — mechanical deny past 80% budget. Shipped 06-02 `a2334a3b3`. Prevents runaway edits. (validated 2 nights)
- **TDD on new modules** — dailyLetterPool 06-03 shipped 14 tests + pure module, gate-clean. Word-wheel rarity 06-01 same pattern. Pure-module TDD = highest ship rate for new code.

## What to avoid (failed this week)
- **Over-scoped lane work = #1 ship-killer** (4/6 nights). One complete gate-clean change ships; three half-finished edits ship nothing. Lanes must pick smallest correct change.
- **Gate code-quality failure = #2 ship-killer** (3/6 nights). Lanes finish but authored code fails lint/test/build. Every lane MUST run tsc on changed files before ending.
- **Lane 05 (landing) = 1/6 (17%).** Worst lane. Timeout 4/5 runs (40-42min vs 1200s budget). "Build from scratch" always exceeds budget. Cap to title+meta+CTA or pre-built component wiring only.
- **Lane 01 (triage) = 2/6 (33%).** Timeout 4/5 runs (15-55min). MCP-heavy (Sentry+Supabase). Succeeds ONLY when scoped to 1 small fix (UUID guard on 06-03 shipped).
- **Lane 09 (monetization) = 0/2.** New lane, timeout on every run (59min vs 600s). Needs scope reduction or timeout increase.
- **Reddit JSON API blocked (9+ consecutive nights).** OAuth not configured. Lane 04 compensates via WebSearch. Retire or migrate.
- **Search collector dead** — 0 signals 9+ nights. Pure waste. Remove.
- **05-31 preflight abort** — dirty HEAD (unpushed founder commits) rejected. Still no handler.
- Per-lane commits — banned. (kept)
- Auto-rollback on KPI dip — Railway deploy lag = false positives. (kept)
- Headless Claude creating realtime tables — hard-ban per Supabase perf rule. (kept)
- Demoting `logger.warn→debug` to clean Sentry — root-cause or queue, never silence. (kept)
- **Self-summarizing wrong root cause** — always check ALL runs for a date + the actual log, not prior summaries.

## Open watches (carry forward)
- **Homepage LCP 7107ms + CLS 1.0** — NEW 06-03. Catastrophic. Likely showcase3D/ScrollTrigger hero. Status: critical, new.
- **Gate code-quality failure** — 3/6 nights. Self-verify needed in every lane. Status: high priority.
- **MCP cumulative timeout** — sequential calls sum past lane budget. MAX_MCP_CALLS=3 proposed. Status: open (8 nights).
- **`/en/multiplayer` LCP 3010ms / INP 528ms / CLS 0.512** — improving (was 8448/584). SSR skeleton needed. Status: improving.
- **`/he/word-tower` CLS 0.797** — inconclusive since 05-27. Status: open.
- **`/he/daily/word-wheel` LCP 2568ms** — regressed +84%. Status: open.
- **`/he/free-multiplayer-word-game` LCP 5337ms** — NEW 06-03. Status: new.
- **`PageClient.tsx` line bloat** — 519→600+ lines. Status: open.
- **Reddit OAuth migration** — blocked 9+ nights. Spec at `docs/nightly/reddit-oauth-setup.md`. Status: open.
- **Search collector dead** — 0 signals 9+ nights. Recommend remove. Status: open.
- **GSC token scope** — `webmasters.readonly` missing from ADC. 7+ nights. Status: open.
- **Admin-session perf noise** — filter admin player_ids from HogQL. Status: open.
- **Fading Grid Sprint** — `idea:build` tapped by founder 05-29. No implementation. Status: open (5 nights).
- **Survival Rounds** — `idea:build` tapped 05-26. No implementation. Status: open (8 nights).
- **Word Detective daily** — `idea:build` tapped 06-01. Status: open (2 nights).
- **Word Heist MP** — `idea:build` tapped this window. Status: open (new).
- **Word Tower daily-letter wiring** — module shipped 06-03, hook+UI integration next. Status: open (new).

## Telegram-button feedback (last 7d)
- `polish:try` x8 — sealed-bid x2, blast x1, word-alchemy x1, word-vault x1, word-forge x1, party/caption-clash x1, word-tower x1
- `idea:build` x3 — sealed-bid, word-detective, word-heist
- `idea:pass` x1 — language family classification
- `night:good/meh` x0 ; `reddit:*` x0 ; `mode:*` x0
- **12 taps in 7d (up from 11). `polish:try` dominant (67%) and BROADENING — now hitting word-vault, word-forge, party, word-tower beyond sealed-bid. 3 `idea:build` = founder wants new SP/MP modes (sealed-bid, word-detective, word-heist). Zero run-quality taps = no strong steer on loop health.**

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging` | 2/6; succeeds scoped to 1 fix |
| 02 perf | `superpowers:systematic-debugging` | 3/6; perf baseline expansion shipped 2 nights |
| 03 engagement | none | 4/6; prompt-driven, word-tower pool shipped w/o skill |
| 04 competitor | `humanizer` | 6/6; applied to idea drafts, 0 timeouts |
| 05 landing | `frontend-design` (mandatory) | 1/6; needs scope cap, not more skills |
| 06 seo | `seo-daily` (mandatory) | 3/6; reliable when scoped to title/meta |
| 07 self-learn | none — prompt-only | 6/6 |
| 08 adsense | `humanizer` | 3/6; dropped from 6/7 — timeout regression |

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
- **Reddit JSON API blocked since 05-27.** 9+ consecutive nights. OAuth needed or retire Reddit research.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
