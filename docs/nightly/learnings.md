# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-06-06..06-11 (6 report nights).** 6-night per-lane ship: **04=6/6, 07=6/6**, 06=5/6, 08=5/6, 01/02/03/05/09/10=4/6. Gate clean: **2/6** (06-08 `f30186b84`, 06-10 `375acfb44`); 06-06=docs-salvage (6 lanes timed out), 06-07=push-fail (commit stranded in `refs/nightly-pending/2026-06-07`), 06-09=baseline-red docs-salvage, 06-11=in-flight. Mandatory-Artifact floor kept all 6 nights non-zero. CLOSED watch: AutoHideHeader CLS 0.29 SHIPPED 06-10 (spacer `<div>` not `null`); `/es/multiplayer` INP "244→614" debunked as n=4 noise (`00d96ad3f` added n≥50 gate). NEW dominant gap: **experiments wired in code but PostHog flag never created** — both `exp-mp-quickplay-wait-v1` (06-09) and `exp-invite-arrival-clarity-v1` (06-10) ship dark; the human flag-creation step is the loop's biggest leak.

## FOUNDER DIRECTIVE — applied 2026-06-05 (highest priority)
- **Polish party games (admin-only).** Lane 05 scope. `polish:try` is the priority queue. Last-7d: **polish:try ×13 vs polish:pass ×2** (word-vault, crossword) — strongest single appetite signal. Shipped polish this window: AlchemyHeatBar, ForgeHeatBar, ShiritoriComboMeter, TowerArchitectTier, ShiritoriGhostMultiplier, CaptionClash crowd-verdict. word-vault = clean deprioritize; crossword = MIXED (drew both try+pass). New modes stay behind `{isAdmin && …}`.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`. Ship all 5 locales in one night. Wall-clock finalize cutoff is the real limit. (Lanes 05/09 still hit a working-set cap some nights → ES dropped — see Avoid.)

## Telegram-button feedback (last 7d)
- **idea:build ×6 / idea:pass ×1 = 86% build rate** — founder still WANTS daily-mode ideas built. Lane 05 converts lane 04's S-effort ideas.
- **polish:try ×13 / polish:pass ×2** — dominant signal; word-vault clean pass, crossword mixed.
- **night:meh ×1 (06-03) / night:good ×0** — below the ≥3 critique threshold; no sharp self-critique triggered. Digest run-quality button still under-engaged (most nights zero votes).
- **reddit:* = 0** — zero reddit callbacks 23+d. Drafts may not reach user, or user doesn't button-vote them. Accept silence; do not keep re-investigating delivery.

## Active watches (2026-06-11)
- **PostHog flags never created (NEW, highest)** — `exp-mp-quickplay-wait-v1` + `exp-invite-arrival-clarity-v1` are fully wired, translated, tested — but dark because flag creation is a manual human step the loop can't do. Both target real funnel drops; both sit idle. Surface in EVERY digest until flags exist. Status: open, blocked-on-human.
- **Invite funnel 83% drop** — `invite_landed`→`invite_consumed` 18→3, 29 rage-clicks. `exp-invite-arrival-clarity-v1` wired 06-10 (+`invite_consumed` for returning users 06-11) — dark pending flag. Status: open, instrumented.
- **Practice funnel 43% drop** — `/es/practice/wheelRush` 47 started→27 completed (7d). `exp_practice_wheel_cta_v1` proposed, NOT wired. Status: open, undiagnosed 5+ nights.
- **Hebrew `המילה היומית`** — 06-09 0→144 impr pos 8.9; 06-11 180 impr pos 8.7. Cheapest SEO win on the board: add internal `/he/daily` link. Status: open, ready, deferred 3+ nights.
- **`/he` home CLS 0.386** — undiagnosed (06-10), n=8 below floor. Status: open, re-measure.
- **Spanish SEO momentum** — "scrabble online" ES 2019→5189 impr (+156% over window), pos 6.5→5.8. Lane 06 title-truncation working. Status: ride it.

## Idea backlog (founder-signalled, 86% build rate)
Lane 04 surfaced (all S-effort daily): Shadow Word Daily, Craft Blueprint Daily, Adventure Boss Word, Word Telescope Daily, Reverse Dictionary Daily, Pyramid Descent Daily, Hidden Crown Daily, Word Venn Daily. Lane 05 builds these admin-gated.

## What works (validated this week)
- **Low-MCP / prompt-only lanes never time out** — 04/07 = 6/6, 06 = 5/6 across 06-06..06-11. Strongest reliability signal, 15+ nights.
- **Mandatory-Minimum-Artifact floor** — on the 06-06 + 06-09 gate-fail nights every lane still shipped its artifact. Floor never zero. (strongest reliability lever)
- **`revalidate=3600` over `force-dynamic`** on cacheable game routes — `/daily/word-wheel`+`/daily/word-hunt`, `/es/multiplayer` LCP 4903→1706ms. (shipped 06-09, validated)
- **Author-then-ship in ONE budget** — AutoHideHeader CLS finally closed 06-10 only when one lane both edited AND landed it. Don't carry a written-but-unshipped fix. (validated)
- **Usage-limit-aware headless runner** (`5cb7f28a0`) — sleep-until-reset + RECOMPUTE deadline epochs ends the instant-fail cascade. (shipped, holding)
- **Founder-directive fast path** — `polish:try` queue drives lane 05 ordering; ideas voted `build` within 1 night. (validated 11×)
- **Security hardening via migration** (lane 01) — DEFINER REVOKEs (push_token 06-07, curator fns 06-08, grant_offerwall_coins 06-10, upsert_player_word 06-11) + RLS initplan fixes, zero reverts. (stable)
- **TDD on new pure modules** — highest ship rate for new code (captionHall, forge/shiritori/tower heat, sanitizeGameCode, ghost-multiplier). (stable)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across the window. (stable)
- **Direct-to-master single end-of-run commit** — one rollback target. 28+ nights. (stable)
- **frontend-design for mode polish** — 5 polish components shipped clean this window, 0 reverts. (validated)
- **Isolated-worktree gate + `build:fast`** — validation can't race dev server. (stable)
- **Lane 04 reddit RSS fallback + idea drafts** — 6/6 nights produce 5 ideas + 3 reply drafts. (stable)
- **eslint-changed-files-only self-check** — lanes that skip full tsc/build finish inside budget. (validated)

## What to avoid (failed this week)
- **Wiring an experiment without a flag-creation handoff** — code-complete experiments accrue dark (`exp-mp-quickplay-wait-v1`, `exp-invite-arrival-clarity-v1`). Lane 03 MUST emit a one-line "FLAG NEEDED: <key> <variants> <hypothesis>" block to the digest so the human creates it; otherwise the work never measures anything. (new, highest)
- **MCP-heavy lanes timing out** — 06-06 saw 6 lanes (01/02/03/05/06/08) exceed 15min and get code-dropped to docs-salvage. Cap MCP round-trips per lane; prefer prompt-only paths. (high, recurring)
- **Working-set file cap dropping ES locale** — lanes 05/09 hit the cap → Spanish translation left incomplete. Ship locales FIRST or split mode-polish across two nights. (high)
- **Over-scoped lane work** — lanes 05/09 timed out attempting TDD+5-locales+component+page-wire in one budget. One complete change ships; three half-finished ship nothing. (highest-frequency failure)
- **Flagging a Web-Vitals "regression" on a sub-floor sample** — 06-10 `/es/multiplayer` INP "2.5× regression" was n=4 noise. NEVER issue a regression verdict (or name a suspect) below n≥50 in BOTH runs. Sample gate now in `prompts/02-perf.md` (`00d96ad3f`). (corrected)
- **`rg` as sole search path** — EACCES blocked lane 01 callsite verification; keep `find|xargs grep` fallback. (high)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Auto-rollback on KPI dip** — Railway deploy lag = false positives. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Reddit JSON/OAuth + search-collector** — blocked 23+ nights, 0 signals. Use RSS; stop retrying OAuth. (kept)

## Open watches (carry forward)
- **PostHog flag-creation backlog** — `exp-mp-quickplay-wait-v1`, `exp-invite-arrival-clarity-v1` dark. Status: blocked-on-human, surface every digest.
- **Invite funnel 83% drop** — instrumented, dark pending flag. Status: open.
- **Practice funnel 43% drop** (`/es/practice/wheelRush`) — Status: open, unwired.
- **Hebrew `המילה היומית` internal links** — Status: open, ready, cheapest SEO win.
- **`/he` home CLS 0.386** — Status: open, re-measure (n below floor).
- **AdSense E-E-A-T gap** (lane 08) — author page now 26 posts (15→26 06-10); bylines/dates still partial. Status: open, core blocker.
- **Gate clean-rate 2/6** — 4/6 nights salvage/baseline-red/push-fail. Heap raised to 8GB (`b266ca10e`); vitest abort-traps still wedge gate on dictionary nights. Status: watch.
- **Push-fail stranding** — 06-07 commit stranded in `refs/nightly-pending/`; non-fast-forward when daemon advanced master mid-run. Status: watch runner rebase-before-push.
- **`PageClient.tsx` 600+ / `SinglePlayerResults.tsx` 500+** — refactor deferred. Status: open.
- **Dead/underpowered experiment flags** — `share-prompt-timing` (72d), `show-signup-after-first-win` (71d), `mp-signup-nudge-copy-v1` (0 converts). Prune or fix tracking. Status: open.
- **Lane 09 monetization 4/6** — ad-UX/education upsell shipping; offerwalls still dark. Status: open.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `superpowers:systematic-debugging` | DEFINER/RLS REVOKEs shipped 06-07/08/10/11, 0 reverts |
| 02 perf | `superpowers:systematic-debugging` | RLS initplan + CLS spacer + force-dynamic→revalidate shipped 06-08/09/10 |
| 03 engagement | `frontend-design` | quickplay + invite-clarity overlays wired 06-09/10 (dark pending flag) |
| 04 competitor | `humanizer` | 6/6; 5 ideas + 3 reply drafts, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | 5 polish components shipped this window, 0 reverts |
| 06 seo | `seo-daily` | 5/6; ES title-truncation CTR + ES +156% impr |
| 07 self-learn | none — prompt-only | 6/6 |
| 08 adsense | `humanizer` | 5/6; FAQPage/ItemList/VideoGame JSON-LD + author-page 26 posts |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`33f8641c3`); OAuth un-configured — stop retrying.
- **Zero reddit callbacks in feedback (23+ d)** — accept silence; do not keep re-investigating delivery.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
