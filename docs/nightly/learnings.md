# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-05..06-10 (6 report nights).** Two long-running watches CLOSED this window: (1) **AutoHideHeader CLS 0.29 SHIPPED** on the 3rd carry-night — `AutoHideHeader.tsx` now returns a spacer `<div>` not `null` when hidden (the "author-then-never-ship" anti-pattern finally beaten). (2) **force-dynamic→`revalidate=3600`** on `/daily/word-wheel` + `/daily/word-hunt` (06-09) recovered `/es/multiplayer` LCP 4903ms→1706ms. NEW regression surfaced same direction: that lane-03 `QuickPlaySeekingOverlay` (06-09) appears to have pushed `/es/multiplayer` **INP 244ms→614ms** — re-measure & bisect next run. 6-night per-lane ship: **04=6/6, 06=6/6, 07=6/6**, 01=5/6, 08=5/6, 10=5/6, 02=4/6, 03=4/6, 05=3/6, 09=3/6. Gate: only **2/6 clean**; 4/6 were salvage/docs-only (timeout, OOM, baseline-red) — the Mandatory-Artifact floor kept all nights non-zero.

## FOUNDER DIRECTIVE — applied 2026-06-05 (highest priority)
- **Polish party games (admin-only).** Lane 05 scope. `polish:try` is the priority queue. Last-7d: **polish:try ×9 vs polish:pass ×2** — still the strongest single appetite signal. Recent shipped polish: CaptionHall, ForgeHeatBar, ShiritoriComboMeter, TowerArchitectTier. `polish:pass` on word-vault + crossword — BUT crossword ALSO drew a `polish:try` this window, so treat crossword as MIXED (only word-vault is a clean deprioritize). New modes stay behind `{isAdmin && …}`.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`. Ship all 5 locales in one night. Wall-clock finalize cutoff is the real limit. (Note: lanes 05/09 still hit a working-set file cap 3/6 nights → ES translations dropped — see Friction.)

## Telegram-button feedback (last 7d, 19 records)
- **idea:build ×4 / idea:pass ×0 = 100% build rate** — founder still WANTS daily-mode ideas built. Lane 05 keeps converting lane 04's S-effort daily ideas.
- **polish:try ×9 / polish:pass ×2** (word-vault, crossword) — dominant signal; word-vault = clean pass, crossword = mixed.
- **night:meh ×1 / night:good ×0** — below the ≥3 critique threshold; no sharp self-critique triggered. Digest button still under-engaged (most nights zero night-quality votes).
- **reddit:* = 0** — zero reddit callbacks in 21+d. Drafts may not reach user, or user doesn't button-vote them. (Investigate delivery once; else accept silence.)

## Active watches (2026-06-10)
- **`/es/multiplayer` INP "244→614ms"** — RESOLVED 06-10: NOT a regression, statistical noise. Route gets n=2–13 web-vitals samples/day; p75 swings 104↔760ms day-to-day; 06-09 "614" was n=4 with a 1424ms outlier, and 06-06 already hit 704ms (3 days BEFORE the suspect overlay shipped). Suspect `QuickPlaySeekingOverlay` is also dark — gated behind unset flag `exp-mp-quickplay-wait-v1`, `growth:mp_quickplay_seeking`=0 events in 7d. Fix shipped: mandatory n≥50 sample gate added to `prompts/02-perf.md`. Status: CLOSED.
- **Invite funnel 83% drop** — `invite_landed`→`invite_consumed` 18→3, 29 rage-clicks. Persists 4+ nights. `exp-invite-arrival-clarity-v1` registered 06-10 (`invite_redirect_fired`) — watch delta next run. Status: open, instrumented.
- **practice funnel 43% drop** — `/es/practice/wheelRush` 47 started→27 completed (7d). `practice_session_abandoned` event proposed 06-07, NOT shipped. Status: open, undiagnosed.
- **Hebrew `המילה היומית` +3467% WoW (pos ~8.9, 144 impr)** — internal-link leverage identified 06-08, deferred. Cheapest SEO win on the board. Status: open, ready.
- **`/he` home CLS 0.386** — new, undiagnosed (06-10). Status: open.
- **Spanish SEO momentum** — "scrabble online" ES 4669 impr pos 5.9; +200–907% WoW across ES queries. Lane 06 title-truncation iterations working. Status: ride it.

## Idea backlog (founder-signalled, 100% build rate this week)
Lane 04 surfaced (all S-effort daily): Shadow Word Daily (reversal pairs), Craft Blueprint Daily, Adventure Boss Word, Word Telescope Daily, Reverse Dictionary Daily, Pyramid Descent Daily, Hidden Crown Daily, Word Venn Daily. Lane 05 builds these admin-gated.

## What works (validated this week)
- **Low-MCP / prompt-only lanes never time out** — 04/06/07 all 6/6 across 06-05..06-10. Strongest reliability signal, 14+ nights.
- **Mandatory-Minimum-Artifact floor** — on the 06-06 + 06-09 gate-fail nights, every lane still shipped its artifact. Floor never zero. (strongest reliability lever)
- **`revalidate=3600` over `force-dynamic`** on cacheable game routes — `/es/multiplayer` LCP 4903→1706ms confirmed. (shipped, validated)
- **Author-then-ship in ONE budget** — AutoHideHeader CLS proved the inverse for 3 nights; it only closed when one lane both edited AND landed it. Don't carry a written-but-unshipped fix. (newly validated)
- **Usage-limit-aware headless runner** (`5cb7f28a0`) — sleep-until-reset + RECOMPUTE deadline epochs ends the instant-fail cascade. (shipped, validate next limit event)
- **Founder-directive fast path** — `polish:try` queue drives lane 05 ordering; ideas voted `build` within 1 night. (validated 10×)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across the window. (stable)
- **Direct-to-master single end-of-run commit** — one rollback target. 27+ nights. (stable)
- **TDD on new pure modules** — highest ship rate for new code (captionHall, forge/shiritori/tower heat, sanitizeGameCode). (stable)
- **Security hardening via migration** (lane 01) — DEFINER REVOKEs (push_token, curator fns, grant_offerwall_coins) + RLS initplan fixes, zero reverts 06-07/08/10. (stable)
- **Isolated-worktree gate + `build:fast`** — validation can't race dev server. (stable)
- **Lane 04 reddit RSS fallback + idea drafts** — 6/6 nights produce 5 ideas + 3 reply drafts. (stable)
- **eslint-changed-files-only self-check** — lanes that skip full tsc/build finish inside budget. (validated)

## What to avoid (failed this week)
- **Working-set file cap dropping ES locale** — lanes 05/09 hit the cap 3/6 nights → Spanish translation left incomplete (06-09/06-10). Either ship locales FIRST or split the mode-polish across two nights. (new, high)
- **Over-scoped lane work** — lanes 05/09 timed out 2/6 each attempting TDD+5-locales+component+page-wire in one budget. One complete change ships; three half-finished ship nothing. (highest-frequency failure)
- **`rg` as sole search path** — EACCES 06-06 blocked ALL of lane 01's callsite verification; `find|xargs grep` fallback too slow. Lanes must degrade gracefully. (high)
- **Flagging a Web-Vitals "regression" on a sub-floor sample** — the 06-10 `/es/multiplayer` INP "2.5× regression" was n=10 noise; the query's `HAVING n>50` floor was ignored and a dark, flag-gated overlay was wrongly blamed. NEVER issue a regression verdict (or name a suspect) below n≥50 in BOTH runs. Sample gate now MANDATORY in `prompts/02-perf.md`. (new, corrected)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Auto-rollback on KPI dip** — Railway deploy lag = false positives. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Reddit JSON/OAuth + search-collector** — blocked 21+ nights, 0 signals. Use RSS; stop retrying OAuth. (kept)

## Open watches (carry forward)
- **`/es/multiplayer` INP 244→614ms** — CLOSED 06-10: noise on n=4 (not a regression); suspect overlay is dark (flag unset, 0 seeking events). Sample gate added to perf prompt. Do not carry forward.
- **Invite funnel 83% drop** — status: instrumented (`exp-invite-arrival-clarity-v1`), measure delta.
- **practice funnel 43% drop** (`/es/practice/wheelRush`) — status: open, undiagnosed.
- **Hebrew `המילה היומית` internal links** — status: open, ready, cheapest SEO win.
- **`/he` home CLS 0.386** — status: open, new.
- **AdSense E-E-A-T gap** (lane 08) — no author bylines / publication dates blocks approval. Status: open, core blocker.
- **Gate clean-rate 2/6** — 4/6 nights salvage/docs-only (timeout/OOM/baseline-red). Status: watch (heap ceiling raised to 8GB `b266ca10e`).
- **`PageClient.tsx` 600+ / `SinglePlayerResults.tsx` 500+** — refactor deferred. Status: open.
- **Dead/underpowered experiment flags** — `share-prompt-timing` (71d), `show-signup-after-first-win` (70d), `mp-signup-nudge-copy-v1` (0 converts). Prune or fix tracking. Status: open.
- **Lane 09 monetization 3/6** — ad-UX/education upsell shipping; offerwalls still dark. Status: open.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `superpowers:systematic-debugging` | DEFINER/RLS REVOKEs shipped 06-07/08/10, 0 reverts |
| 02 perf | `superpowers:systematic-debugging` | RLS initplan + CLS spacer + force-dynamic→revalidate shipped 06-05/08/09/10 |
| 03 engagement | `frontend-design` | quickplay overlay + experiment wiring shipped 06-08/09/10 |
| 04 competitor | `humanizer` | 6/6; 5 ideas + 3 reply drafts, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | polish shipped 3/6; captionHall/forge/shiritori/tower heat |
| 06 seo | `seo-daily` | 6/6; ES title-truncation CTR + dead_pages.py noindex feed |
| 07 self-learn | none — prompt-only | 6/6 |
| 08 adsense | `humanizer` | 5/6; FAQPage/ItemList/VideoGame JSON-LD + word-count ships |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`33f8641c3`); OAuth un-configured — stop retrying.
- **Zero reddit callbacks in feedback (21+ d)** — drafts may not reach user, OR user simply doesn't button-vote them. Investigate delivery once; else accept silence.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
