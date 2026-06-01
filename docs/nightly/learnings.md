# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Sample (2026-06-01):** 6 report nights in window (05-26..05-30, 06-01; 05-31 aborted on dirty HEAD, no report). Code ship rate: ~27/55 lane-runs (49%). **06-01 is a SPLIT night, not a uniform-worst night:** the 02:00 run timed out 5/6 code lanes; the **19:05 evening rerun shipped all attempted lanes** after Phase-0 scoping + hardened MCP timeouts landed. The "worst night" framing in last night's learnings was self-amplified — it summarized only the failed morning run. Per-lane 7-night reliability: 07=7/7 (100%); 04=6/7 (86%); 06=5/7 (71%); 01=4/7 (57%); 03=4/7 (57%); 05=3/7 (43%); 08=2/6 (33%); 02=1/7 (14%).

## Active watches (2026-06-01)
- **Timeout root cause = cumulative MCP call budget + over-scope, NOT MCP being down.** 4 timed-out lanes on 06-01 morning made ZERO MCP calls — they ran out of wall-clock on scope. Per-call 60s clip is fine; the sum of sequential calls + over-scoped edits blows the 12-min budget. Fix direction = cap calls + cut scope, not "wait for MCP."
- **06-01 evening recovery is the proof point** — Phase-0 brief (pre-ranked signals) + scoped MCP let lanes 02/03/05/06 all ship in the rerun. Carry this: front-load intel, cap live calls.
- **`/en/multiplayer` LCP CRITICAL** — p75 8448ms (+167% vs prior window). INP 584ms (new high). CLS 0.510. Root = socket.io + game-state hydration renders the client hidden until full connect; no SSR skeleton. Lane 02 shipped a leaderboard LCP fix 06-01 but multiplayer is still open + escalating.
- **Phase 0 intel sources** — sentry/supabase/posthog/revenue collectors healthy; **search collector dead 7+ nights** (0 signals — retire it).
- **KEEP_TIMEOUT_PARTIALS = stable** — 5th night, zero gate poisoning.

## What works (validated this week)
- **Phase 0 intel brief + scoped MCP** — the 06-01 evening recovery (4 lanes unblocked) is direct evidence. Front-loaded ranked signals replace blind per-lane MCP fan-out. (validated, escalate)
- **Direct-to-master, single end-of-run commit** — one rollback target, one Railway deploy. 16+ nights. (stable)
- **WIP-safe scoped revert** — per-lane revert never flushes concurrent founder work. 15+ nights. (stable)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across the window. (stable)
- **`npm run build:fast` gate** — 3x faster, same signal. 16+ nights. (stable)
- **Autonomy matrix** — reversible+small→ship; policy/auth/irreversible→queue. 0 reverted. (stable)
- **PostHog REST helper** — eliminates PostHog MCP hangs for data queries. 11+ nights. (stable)
- **Isolated worktree gate** — build validation can't race a dev server. (stable)
- **Failure digest on kill/abort** — Telegram notifies even on no-ship runs. (stable)
- **Anti-repetition idea ledger** — lane 4 stopped re-pitching. (stable)
- **Lightweight lanes dominate** — 07 (100%), 04 (86%), 06 (71%). Low/zero MCP dependency = no timeout. (stable)
- **Docs-only salvage path** — recovers docs value when code gate fails. 10+ nights. (stable)
- **Mandatory-Minimum-Artifact** — every lane writes `docs/nightly/artifacts/lane-NN-<date>.md`. Floor never zero. (stable)
- **Founder-directive fast path** — sealed-bid directive → lanes 04/05 shipped+tested in <24h (05-29, follow-up 06-01). (validated 2x)
- **Baseline-poison salvage** — re-gates authored set lint-skipped when a non-authored file fails on HEAD. (stable)

## What to avoid (failed this week)
- **Over-scoped lane work is the #1 ship-killer**, ahead of MCP. The 12-min budget punishes 3-half-finished-edits; one complete gate-clean change ships. Lanes must pick the smallest correct change.
- **Lane 02 perf = 1/7 (14%).** Worst lane. Dual MCP dependency (supabase+posthog) + multiplayer fix is large-scope. Only shipped when it cut scope to a single opacity/LCP fix. Needs REST-only + scope-capped prompt.
- **Lane 05 landing = 3/7 (43%).** Ships only when given pre-built code (sealed-bid) or a tightly-scoped change. "New page from scratch" always exceeds budget. Cut to title+meta+CTA or pre-built only.
- **Lane 08 adsense = 2/6 (33%).** Timeout-prone; copy-quality good when it ships.
- **Reddit JSON API blocked (6+ consecutive nights).** OAuth not configured. Lane 04 ships via WebSearch fallback; native Reddit drafts = 0 since 05-27.
- **Phase 0 search collector dead** — 0 signals 7+ nights. Wastes budget. Remove.
- **05-31 preflight abort** — dirty HEAD (unpushed founder commits) rejected, wasted 2 retries. Needs stash-or-branch handler.
- Per-lane commits — banned. (kept)
- Auto-rollback on KPI dip — Railway deploy lag = false positives. (kept)
- Headless Claude creating realtime tables — hard-ban per Supabase perf rule. (kept)
- Demoting `logger.warn→debug` to clean Sentry — root-cause or queue, never silence. (kept)
- **Self-summarizing the wrong root cause** — last night's learnings called 06-01 a uniform "worst night" by reading only the failed morning run. Always check evening reruns + the actual log, not just the prior summary.

## Open watches (carry forward)
- **MCP cumulative timeout** — sequential calls sum past lane budget. Proposed MAX_MCP_CALLS=3 then REST fallback. Status: open, 6 nights proposed.
- **`/en/multiplayer` LCP 8448ms / INP 584ms / CLS 0.510** — socket+hydration; SSR skeleton needed. Status: escalating (06-01).
- **`/he/word-tower` CLS 0.797** — inconclusive since 05-27, predates crane commit. Status: open.
- **`/he/daily/word-wheel` LCP 2568ms** (was 1399ms, +84%). Status: open.
- **`PageClient.tsx` line bloat** — leaderboard 519→600+ lines, blocking lane 03 wiring. Status: open (split file).
- **`perf-baseline.json` Write-tool perms** — lane 02 falls back to `cat >>`. Status: open (minor).
- **Reddit OAuth migration** — JSON API blocked 6+ nights. Spec at `docs/nightly/reddit-oauth-setup.md`. Status: open.
- **Search collector dead** — 0 signals 7+ nights. Recommend remove. Status: open.
- **GSC token scope** — `webmasters.readonly` missing from ADC. Blocks live GSC pulls. Status: open.
- **Admin-session perf noise** — filter admin player_ids from HogQL. Status: open.
- **`show-signup-after-first-win` flag** — 72d old, 43 exposures. Wire or retire. Status: open.
- **Fading Grid Sprint** — `idea:build`+`polish:try` tapped by founder. Status: open (3 nights).
- **Survival Rounds** — `idea:build` tapped 05-26. No implementation. Status: open (6 nights).

## Telegram-button feedback (last 7d)
- `polish:try` x4 — sealed-bid x2, word-alchemy x1, blast (fading-grid) x1
- `idea:build` x2 ; `idea:pass` x2
- `night:good/meh` x0 ; `reddit:*` x0 ; `mode:*` x0
- **8 taps in 7d. `polish:try` dominant (50%) — founder iterates on already-pitched ideas more than proposing new ones. Builder interest clusters on new SP modes (sealed-bid, fading-grid). Zero run-quality taps = no strong steer on loop health; don't over-read it.**

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging` | shipped 4/7; MCP/scope health predicts success, not skill |
| 02 perf | `superpowers:systematic-debugging` | shipped 1/7; timeout+scope, not skill gap |
| 03 engagement | none | shipped 4/7; prompt-driven |
| 04 competitor | `humanizer` | shipped 6/7; applied to idea drafts |
| 05 landing | `frontend-design` (mandatory) | shipped 3/7; ships with pre-built/scoped code |
| 06 seo | `seo-daily` (mandatory) | shipped 5/7; reliable when MCP cooperates |
| 07 self-learn | none — prompt-only | shipped 7/7 |
| 08 adsense | `humanizer` | shipped 2/6; copy quality when it ships |

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
- **Reddit JSON API blocked since 05-27.** 6+ consecutive nights. OAuth needed or retire Reddit research.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
