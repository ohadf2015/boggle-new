# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Sample caveat (2026-05-22):** usable runs so far = 05-21 (first full sweep) + two manual 05-22 re-runs that shipped lanes 4+6 but did NOT integrate-commit a full sweep (output sits as WIP: `word-alchemy/`, SEO pages, `sv.js`). 05-19 finished only lane 4; all 05-20 runs aborted at preflight. So "this week" ≈ 1.x clean sweeps. Trends are firming but still ≤3 clean sweeps — don't over-fit.

## What works (validated this week)
- **Direct-to-master, single end-of-run commit** — one rollback target, one Railway deploy. (kept)
- **WIP-safe scoped revert** — hardened past plain dirty-tree handling: per-lane revert never flushes concurrent founder work (`81b3c8680`, `558169c97`, exclusion note `8fe8ddb6b`). Closed the "daemon wiped my WIP" wound from last week.
- **Per-lane revert isolation held again** — 05-22 reverted lanes 1+3+5 (timeout/cap) while 4+6 shipped clean. Core safety property proven twice.
- **Ground-truth audit before edits** — still zero fabricated-feature bugs. Lane 1 read `route.ts` before the AvatarRenderer SSR fix; lane 6 confirmed "ordhjul" absent before adding. (kept)
- **`npm run build:fast` gate** — 3× faster, same correctness signal. (kept)
- **Security-adjacent = queue, never touch at 03:00** — lane 1 queued `award_ad_coins` / `increment_blast_progress` anon-callable RPC holes for human REVOKE instead of acting blind. (kept, validated)
- **Dedup-per-calendar-day gate** (`e00becb48`) — correctly skipped the redundant 02:39 run; replaced the 18h rolling window. (new, working)

## What to avoid (failed this week)
- **DO NOT raise lane 3/5 budgets again — proven not the fix.** Budgets WERE raised this week (lane 3 720→1080s, lane 5 1080→1500s) and **both still exit-124'd on 05-22** — lane 5 burned the FULL 1500s of opus before the kill, emitting zero bytes. Now a 2-night high-confidence result: the lanes **hang on a blocked call** (stuck MCP to Sentry/PostHog/Supabase, or a tool retry storm), they are NOT scope-too-broad. Next step is heartbeat logging + per-call timeout, NOT more budget — a bigger ceiling just burns more opus for nothing.
- **Lane 1 (triage) NEW timeout class on 05-22** — both manual runs hit exit 124 (~15m44s) after the player-feedback digest was injected into its prompt (`18734c040`). The extra scope/MCP surface likely pushed it into the same hang. Watch: lane 1 was a reliable shipper on 05-21; the regression coincides with the feedback injection.
- **File-cap off-by-one / overflow** — 05-22 lane 2 wrote 9 files (cap 8 → reverted), lane 3 wrote 10 then a 31-file blowout (reverted). Doc-heavy lanes (baseline+watch+report = 3 writes) systematically clip the cap. Fix = count docs separately or +2 cap for perf/engagement, not a blunt revert that discards real edits.
- **getUpdates poller collision** — daemon long-poll + run's own feedback-poll both call Telegram getUpdates → `terminated by other getUpdates request` (05-20). Button acks drop; `update_id=59463629` stuck since 05-19. (kept, queued)
- Per-lane commits — many rollback targets at 03:00, no one watching. (kept ban)
- Auto-rollback on KPI dip — Railway deploy lag = false positives; alert-and-queue. (kept ban)
- Headless Claude creating realtime tables — burned 94% DB CPU once. (kept hard-ban)
- Demoting `logger.warn → debug` to clean Sentry — root-cause or queue, never silence. (kept)

## Open watches (carry forward)
- **No working Reddit path remains for RECENT threads** — first noticed 05-19, now 4-night high-confidence. reddit.com/old.reddit.com/JSON-API = IP block; pullpush.io = ~12-month archive lag (no recent posts); `site:reddit.com` via WebSearch = hits tool result limit. Lane 4 must STOP cycling these endpoints and pivot fully to WebSearch SERP + competitor sites + Discord signal. r/wordgames is also genuinely low-traffic (scores floor at 1) — not a data gap.
- **Shareable result card (Wordle emoji format)** — lane 4's TOP idea 05-22. LexiClash MP results have NO share mechanic; Wordle went 90k→300k DAU in one month largely via emoji-grid sharing; Parseword reviews note sharing is expected. Format: emoji score, no spoilers, winner + delta + best combo + time; works in all 5 locales (RTL fix exists). Effort: S. Open — strong build candidate.
- **Parseword (Josh Wardle, Q1–Q2 2026)** — biggest competitor signal; major press; reviews uniformly call it "niche." That gap is LexiClash's opening. (kept)
- **`/en/multiplayer` LCP p75 ≈ 4228ms (POOR)**, n=29 (now highest-confidence; no regression vs prior 5806ms reading). Game-client hydration is the suspected LCP element — needs a profile, then lazy/deferred socket+game bundle split. Open in `perf-watch.md`.
- **NEW 05-22 perf regressions — likely admin-skeleton SSR mismatch, not real users:** `/ja` LCP 8775ms + CLS 0.572 (n=4), `/he/word-tower` CLS 1.050 (n=6, loading-height mismatch), `/he` CLS +29% (admin-only). Low-confidence (n<10); confirm against non-admin sessions before any code change.
- **`show-signup-after-first-win` flag** — ACTIVE 52d, no linked experiment (lane 3, 05-22). Queued: wire an experiment or retire.
- **WAL parser DB CPU 89.57%→78.12%** — trending down, publication empty, auto-remediation working; residual is infra overhead. Deferred to human, monitor. (kept)
- Lane 05 landing-variant coverage: cap 1 variant/week to avoid flag explosion. (kept)
- Self-learn drift: if `learnings.md` hits 200 lines for 3 nights running, rotation is broken. (kept)

## Telegram-button feedback (last 7d)
- Still **only smoke-test taps**: `night:good`×2, `night:meh`×1, `test:works`×2 — ALL from 2026-05-19, before any real digest. The feedback FEATURE shipped (`18734c040`) but the getUpdates collision + stuck `update_id=59463629` mean **no real-run acks have landed yet**. `meh ≥3 → self-critique` threshold remains unreachable. Resolving the poller collision (see "what to avoid") is the unblock.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable → script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest (`🎮` block).

## Specialized Skills (maintained by lane 7)

Per-lane skill recommendations, evidence-weighted. Each lane prompt reads this and honors it.

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging`, `code-review` | shipped 1/2 (AvatarRendererSsr 05-21); 05-22 revert = timeout not skill |
| 02 perf | `superpowers:systematic-debugging`, `web-interface-guidelines`, `code-review` | shipped 2/2 (sync_coins 05-21, baseline 05-22) |
| 03 engagement | none yet — data needed | reverted 2/2 (timeout, not skill-caused) — add none until it ships |
| 04 competitor/reddit | `humanizer`, `ux-writer` | shipped 3/3 (05-19, 05-21, 05-22) |
| 05 landing | `frontend-design`, `impeccable:craft` (mandatory), `usability-psychologist`, `web-interface-guidelines` | reverted 2/2 — TIMEOUT not overdesign; design quality still non-negotiable |
| 06 seo | `seo-daily` (mandatory), `humanizer` | shipped 2/2 — ES/SV/EN meta edits |
| 07 self-learn | none — keep prompt-only | seed |
| 08 adsense | `humanizer` | shipped 1/1 (GuidesCalloutLink 05-21, copy run through humanizer) |

**Rules for lane 7 updating this table:**
- Add a skill to a lane only if invoking it correlated with a shipped (not reverted) outcome in ≥2 nights.
- Remove a skill if its lane reverted ≥2 of last 3 nights *with that skill in the recipe* (timeout-reverts don't count against a skill).
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
