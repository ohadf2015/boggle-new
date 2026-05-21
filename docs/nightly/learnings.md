# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Sample caveat (2026-05-21):** the loop's *first complete multi-lane sweep* was 2026-05-21. 05-19 only finished lane 4; all 05-20 runs aborted at preflight (dirty tree, fixed by `3e0217129`). So "this week" = ~1 usable run + fragments. Trends below are low-confidence until ≥3 clean sweeps accumulate. Do not over-fit.

## What works (validated this week)
- **Direct-to-master, single end-of-run commit** — matches project pref, one rollback target, one Railway deploy. (kept)
- **Dirty-tree resilience** — preflight now runs on top of WIP + snapshots/restores per-lane instead of aborting. Unblocked the first full sweep after 3 nights of preflight aborts. Evidence: `3e0217129`, clean run 05-21.
- **Per-lane revert on failure** — lanes 3 + 5 timed out 05-21; only those reverted, the other 4 still shipped. Isolation worked as designed.
- **Ground-truth audit before edits** — lane 1 read `route.ts` source before fixing the `AvatarRenderer` server-boundary bug; lane 6 confirmed "ordhjul" was literally absent from the SV page before adding it. Zero fabricated-feature bugs this week.
- **`npm run build:fast` for the gate** — 3× faster than full build, same correctness signal. (kept)
- **Security-adjacent = queue, never touch at 03:00** — lane 1 queued `award_ad_coins`/`increment_blast_progress` anon-callable holes for human review instead of REVOKE-ing blind. (kept, validated)

## What to avoid (failed this week)
- **Lanes 3 + 5 hit their timeout ceiling and reverted to zero output** — lane 3 (engagement, sonnet, 720s) ran the full 12m then exit 124; lane 5 (landing, opus, 1080s) ran the full 18m then exit 124. ~30 min compute (incl. expensive opus) produced nothing AND lost partial work. Root cause: budget too tight for prompt scope. Fix queued in loop-improvements 2026-05-21. **Until fixed: lane 5 must write spec+design-draft and exit clean rather than attempt a full design→build→test→build cycle it can't finish.**
- **Two getUpdates pollers collide** — `terminated by other getUpdates request; make sure that only one bot instance is running` (05-20 15:32 log). The long-poll daemon and the run's own feedback-poll both call getUpdates → dropped button acks. Queued.
- Per-lane commits — many rollback targets at 03:00 with no one watching. (kept ban)
- Auto-rollback on KPI dip — Railway deploy lag = false positives; alert-and-queue. (kept ban)
- Headless Claude creating realtime tables — burned 94% DB CPU once. Hard-banned. (kept)
- Demoting `logger.warn → debug` to clean Sentry — root-cause or queue, never silence. (kept)

## Open watches (carry forward)
- **Reddit hard-blocked (not rate-limited)** — first noticed 05-19, confirmed 05-21. `reddit.com` + `old.reddit.com` + JSON API all REFUSE the Claude Code fetcher (connection block, not HTTP 429). **Working path: pullpush.io** with `sort=score&sort_type=desc` (NOT `after=7d` → HTTP 400), filter `created_utc` client-side. Status: open — lane 4 should stop retrying reddit.com directly.
- **r/wordgames is post-and-forget, scores floor at 1** — 05-21 confirmed genuinely low-traffic, not a data gap. Real MP-word-game audience is on Discord. Status: open — lane 4 should widen to r/dailygames + r/Anagrams + Discord signal rather than mine r/wordgames for high-score threads.
- **Parseword (Josh Wardle, Mar 2026)** — biggest competitor signal of the month, major press, reviews uniformly call it "niche." That gap is LexiClash's opening. Open watch for lane 4.
- **`/en/multiplayer` LCP p75 = 5806ms (POOR)**, n=11 — game-client hydration likely the LCP element. Needs profiling before code change. First noticed 05-21. Open in `perf-watch.md`.
- **WAL parser rank-1 DB CPU (78% on 05-18)** — publication now empty, auto-remediation working; remaining cost is infra overhead, not app code. Deferred to human. Monitor.
- Lane 05 landing-variant coverage: cap at 1 variant/week to avoid flag explosion. (kept)
- Self-learn drift: if `learnings.md` hits 200 lines for 3 nights running, rotation is broken — investigate. (kept)

## Telegram-button feedback (last 7d)
- Only **smoke-test taps** so far: `night:good` ×2, `night:meh` ×1, plus `test:works` r2/r3 (all 2026-05-19, before the first real digest). **No feedback on an actual run yet** — `meh ≥3` self-critique threshold not reachable until real digests accumulate. Buttons armed; signal pending.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable → script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest (`🎮` block).

## Specialized Skills (maintained by lane 7)

Per-lane skill recommendations, evidence-weighted. Each lane prompt reads this and honors it.

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging`, `code-review` | seed — 05-21 shipped clean fix, no skill explicitly logged |
| 02 perf | `superpowers:systematic-debugging`, `web-interface-guidelines`, `code-review` | seed — 05-21 shipped `sync_coins` migration, no skill logged |
| 03 engagement | none yet — data needed | seed — reverted 1/1 (timeout, not skill-caused) |
| 04 competitor/reddit | `humanizer`, `ux-writer` | seed — shipped ideas 2/2 nights run |
| 05 landing | `frontend-design`, `impeccable:craft` (mandatory), `usability-psychologist`, `web-interface-guidelines` | reverted 1/1 — TIMEOUT not overdesign; thin recipe before adding more |
| 06 SEO | `seo-daily` (mandatory), `humanizer` | shipped 1/1 — ES/SV/EN meta edits |
| 07 self-learn | none — keep prompt-only | seed |

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
