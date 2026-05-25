# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Sample caveat (2026-05-25):** 6 data nights in window (05-19 lane-4-only, 05-21 full sweep, 05-22 partial, 05-23 docs-only salvage, 05-24 partial, 05-25 worst-night). 05-20 aborted at preflight. Fleet ship rate: 23/37 lane-runs (62%); 12 timed out (32%); 2 cap-reverted (5%); 1 skipped (3%). Clear tier split: lanes 04/06/08 = 100%; lane 07 = 75%; lanes 01/02 = 40%; lanes 03/05 = 20-25%.

## What works (validated this week)
- **Direct-to-master, single end-of-run commit** — one rollback target, one Railway deploy. Held 6 nights. (kept)
- **WIP-safe scoped revert** — per-lane revert never flushes concurrent founder work. Proven 5 nights including 05-25 4-lane revert. (kept)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across all runs. Lane 1 reads route.ts before fixes; lane 6 confirms query position before meta edits. (kept)
- **`npm run build:fast` gate** — 3x faster, same correctness signal. No false negatives in 6 nights. (kept)
- **Security-adjacent = queue, never touch at 03:00** — lane 1 queued anon-callable RPC holes for human REVOKE. Validated 05-21 + 05-23. (kept)
- **Dedup-per-calendar-day gate** (`e00becb48`) — correctly skipped redundant re-runs. (validated)
- **PostHog REST helper** (`eefb0d52e`) — PostHog MCP hangs eliminated. Converted reads to direct REST API. Validated 2 nights (05-24, 05-25). (kept)
- **MCP outage graceful degrade** (`3da3f4407`) — preflight abort replaced with retry + degrade. PostHog-down no longer kills the whole run. Validated 2 nights. (kept)
- **File caps removed** (`4b59a9a35`) — eliminates #2 revert cause (cap overflow). Zero cap-reverts since 05-24. (validated)
- **Isolated worktree gate** (`c79e116f5`) — build validation can't race a dev server. (kept)
- **Reddit curl + UA helper** (`311af3d19`) — lane 4 gets real subreddit data via local curl. Validated 2 nights (05-24, 05-25). (kept)
- **Failure digest on kill/abort** — Telegram notifies even when the run doesn't ship. Validated 05-25 worst-night. (kept)
- **Lane 05 skip gate** — skips when no page has >=200 sessions. Correct skip: 05-23. (validated)
- **Per-lane revert isolation** — 05-25 reverted 4 lanes while 2 shipped. Core safety property proven 5 nights. (kept)
- **Lightweight lanes dominate** — lanes 04/06/08 (no heavy MCP, <=7m avg) = 100% ship rate. MCP dependency = failure predictor, not lane complexity. (new)

## What to avoid (failed this week)
- **MCP silent hangs = #1 failure mode, WORSENING (32%, up from 24%).** 05-25 worst night: 4/6 lanes timed out. PostHog REST helper fixed ONE vector; Sentry + Supabase MCP still hang. **Per-call `gtimeout 30` wrapper proposed 4 consecutive nights (05-21 to 05-25), still unshipped.** Single highest-leverage improvement.
- **Lane 03 (engagement) = flakiest lane (1/5 = 20%).** PostHog funnel queries = hang vector. When it ships (05-23), output is high-value. Fix: pre-fetch funnel data via REST before lane starts.
- **Lane 05 (landing) tied flakiest (1/4 = 25%).** Opus/1500s burns fully on timeout. Consider: downgrade to sonnet (lane 04 ships 100% on sonnet/600s doing comparable scope).
- **Lane 01 (triage) at 40%, down from 50%.** Feedback-digest injection (`18734c040`) added MCP scope. Trim to top-3 items or move digest parsing to lane 07.
- **Tonight (05-25) worst run: 2/6 lanes shipped (33%).** 4 consecutive timeouts. No new MCP-hang infra landed.
- Per-lane commits — still banned. (kept)
- Auto-rollback on KPI dip — Railway deploy lag = false positives. (kept)
- Headless Claude creating realtime tables — hard-ban per Supabase perf rule. (kept)
- Demoting `logger.warn -> debug` to clean Sentry — root-cause or queue, never silence. (kept)

## Open watches (carry forward)
- **Per-call MCP timeout wrapper** — proposed 4 nights (05-21 to 05-25), unshipped. HIGHEST LEVERAGE. `gtimeout 30` per MCP call would cap hangs. Estimated: timeout rate 32% to <10%. First noticed 05-21.
- **Shareable result card (Wordle emoji format)** — lane 4 TOP idea 4 nights (05-22 to 05-25). r/wordgames thread confirms active demand. Effort: S. First noticed 05-22.
- **Parseword (Josh Wardle, Q1-Q2 2026)** — biggest competitor. Reviews call it "niche" — LexiClash's opening. (kept)
- **`/en/multiplayer` LCP p75 ~4228-5806ms (POOR)** — n=11-29. Game-client hydration suspected. Needs profile + lazy socket bundle. (kept)
- **Admin-session CLS/LCP noise** — `/he/daily` CLS 0.882, `/ja` LCP 8775ms = admin-only. Filter admin player_ids from perf HogQL queries. First noticed 05-22, still unfixed.
- **`show-signup-after-first-win` flag** — ACTIVE 55d, no linked experiment. Wire experiment or retire. (kept)
- **WAL parser DB CPU ~78%** — trending down, publication empty, auto-remediation working. Deferred to human. (kept)
- **Telegram feedback near-zero** — 6 taps in 6 nights (5 smoke-test + 1 real). Poller fixed, users don't tap. (kept)
- **Lane 03 REST pre-fetch** — funnel data via PostHog REST before lane dispatch. Would eliminate main hang vector. First proposed 05-24. (new)
- **Lane 05 model downgrade** — opus/1500s burns fully on timeout. Sonnet/720s would fail faster and cheaper. (new)
- **Spanish SEO window** — ES Scrabble queries +840-6667% this week (Google indexing burst). Lane 06 should keep targeting es pages. Time-sensitive. (new)
- Lane 05 landing-variant coverage: cap 1 variant/week to avoid flag explosion. (kept)
- Self-learn drift: if `learnings.md` hits 200 lines for 3 nights running, rotation is broken. (kept)

## Telegram-button feedback (last 7d)
- `night:good`x2, `night:meh`x1 — ALL smoke-test from 05-19.
- `idea:pass:41b1c6b6`x1 — 05-23 (real tap: "games actually finish" concept passed).
- `test:works`x2 — infra smoke from 05-19.
- **No `reddit:*`, `mode:*`, `idea:build` taps.** Engagement near-zero. `meh >=3` self-critique threshold unreachable.
- **In-game feedback (PostHog/Supabase):** zero sentiment ratings, zero bug reports in last 7d.

## Specialized Skills (maintained by lane 7)

Per-lane skill recommendations, evidence-weighted. Each lane prompt reads this and honors it.

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging`, `code-review` | shipped 2/5; failures = MCP timeout not skill (timeouts don't count against) |
| 02 perf | `superpowers:systematic-debugging`, `code-review` | shipped 2/5; 1 cap-revert (now fixed), 2 MCP timeouts |
| 03 engagement | none yet — insufficient data | shipped 1/5; all 4 failures = MCP timeout |
| 04 competitor | `humanizer` | shipped 6/6; humanizer applied 05-24 reddit draft. Dropped `ux-writer` (0 invocations) |
| 05 landing | `frontend-design`, `impeccable:craft` (mandatory) | shipped 1/4; frontend-design invoked on sole success (05-24) |
| 06 seo | `seo-daily` (mandatory) | shipped 5/5; dropped `humanizer` (0 invocations in this lane) |
| 07 self-learn | none — prompt-only | shipped 3/4; timeout 05-23 = MCP hang |
| 08 adsense | `humanizer` | shipped 3/3+; humanizer on 05-21 copy |

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

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
