# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Sample caveat (2026-05-28):** 6 data nights in window (05-23 thru 05-28). Fleet ship rate: 30/46 lane-runs (65%); 16 timed out (35%); 0 cap-reverted; 0 skipped. Tier: 04 = 100% (6/6); 07 = 83% (5/6); 06 = 83% (5/6); 03 = 67% (4/6); 01 = 50% (3/6); 08 = 60% (3/5 confirmed); 02 = 33% (2/6); 05 = 17% (1/6, only ship = 05-24).

## What works (validated this week)
- **Direct-to-master, single end-of-run commit** — one rollback target, one Railway deploy. Held 10 nights. (kept)
- **WIP-safe scoped revert** — per-lane revert never flushes concurrent founder work. Proven 8+ nights. (kept)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across all runs. (kept)
- **`npm run build:fast` gate** — 3x faster, same correctness signal. No false negatives in 10 nights. (kept)
- **Autonomy matrix for reversible fixes** — if reversible + small blast → ship; if policy/auth/irreversible → queue. Proven 05-21, 05-23, 05-26, 05-27 (4 nights, 7+ autonomous fixes total). (kept)
- **PostHog REST helper** (`eefb0d52e`) — PostHog MCP hangs eliminated. Validated 6 nights (05-24 thru 05-28). (promoted)
- **MCP outage graceful degrade** (`3da3f4407`) — preflight abort→retry+degrade. Validated 6 nights. (promoted)
- **File caps removed** (`4b59a9a35`) — zero cap-reverts since 05-24 (6 nights clean). (validated)
- **Isolated worktree gate** (`c79e116f5`) — build validation can't race a dev server. (kept)
- **Reddit curl + UA helper** (`311af3d19`) — lane 4 gets real subreddit data. Validated 6 nights. (promoted)
- **Failure digest on kill/abort** — Telegram notifies even when the run doesn't ship. Validated 05-25 thru 05-28. (kept)
- **Anti-repetition idea ledger** (`3154c643a`) — lane 4 stopped re-pitching passed ideas. Validated 5 nights. (promoted)
- **Per-MCP-call timeout** (`2a08d07844`, `MCP_TOOL_TIMEOUT=60000`) — 4 clean nights (05-26 thru 05-28). Clips runaway MCP calls at 60s. (confirmed)
- **Stream-json tool timeline** (`6cc98a3d7`) — hung MCP call attributable by name. Confirmed 4 nights. (kept)
- **Idea Telegram card loop** (`d6fd55f1e`) — first `idea:build` tap 05-26 (Survival Rounds). Loop works. (kept)
- **Lightweight lanes dominate** — 04 (100%), 06/07 (83%). MCP dependency = failure predictor. (kept)
- **Docs-only salvage path** — reliably recovers docs value when code gate fails. Pushed successfully 4/6 nights. (promoted)
- **Lane 03 trending up** — 4/6 shipped (67%), up from 50% prior week. `results_viewed` + replay CTA = tangible output. (new)

## What to avoid (failed this week)
- **MCP silent hangs still #1 failure mode (~35%).** MCP_TOOL_TIMEOUT clips at 60s but 16/46 lane-runs still timeout. Target <10% — not there.
- **Lane 05 (landing) = 1/6 ships (17%).** Worst lane. opus/1500s AND sonnet/600s both timeout. Scope cut is the only remaining lever.
- **Lane 02 (perf) = 2/6 (33%).** High-value when it ships (CLS 05-24, LCP 05-27). Supabase execute_sql hang suspected.
- **Push failures on 2/6 nights** — 05-24 (type-check on LandingView.tsx isAdmin) and 05-27 (merge conflict on MascotCelebrationVideo.tsx from concurrent founder work). Pre-integration type-check needed.
- **Lane 06 timeout (05-27)** — recovered 05-28, likely transient. Watch one more night.
- Per-lane commits — still banned. (kept)
- Auto-rollback on KPI dip — Railway deploy lag = false positives. (kept)
- Headless Claude creating realtime tables — hard-ban per Supabase perf rule. (kept)
- Demoting `logger.warn -> debug` to clean Sentry — root-cause or queue, never silence. (kept)

## Open watches (carry forward)
- **MCP_TOOL_TIMEOUT tuning** — 4 clean nights at 60s. If no legit clipping by 05-30, try lowering to 30s.
- **Stream-timeline read-back** — grep `stream-*.ndjson` for last `>` before exit-124 lanes. Suspects: Sentry `analyze_issue_with_seer`, Supabase `execute_sql`. Still unactioned.
- **Lane 05 scope cut needed** — model downgrade failed. Next: title/meta/CTA-only (no full page variant) or skip if no page >=200 sessions/14d.
- **Lane 03 REST pre-fetch** — funnel data via PostHog REST before dispatch. Proposed 5 nights, still unshipped. Would reduce L03 timeout rate.
- **Trim nightly MCP server set** — 23-25 servers spawn per lane; figma, atlassian, rive, ahrefs unused. Fewer = less startup + smaller hang surface.
- **Spanish SEO window** — ES Scrabble queries +168-6667%. Lane 06 targeting. Time-sensitive, 4 nights active. Still elevated 05-28 (+168-416%).
- **`/en/multiplayer` LCP p75 ~3165-5806ms (POOR)** — game-client hydration. Skeleton SSR needed. Trending slight improvement.
- **`/he/word-tower` CLS 0.280→0.797** — first noticed 05-27. Inconclusive (data predates crane commit). Re-check 05-29 after 72h window.
- **Admin-session CLS/LCP noise** — `/he/daily` CLS 0.882, `/ja` LCP 8775ms = admin-only sessions. Filter admin player_ids from perf HogQL. First noticed 05-22.
- **`show-signup-after-first-win` flag** — ACTIVE 61d, 43 exposures, no linked experiment. Wire or retire.
- **WAL parser DB CPU** — trending down, publication empty, auto-remediation working. Deferred to human.
- **Telegram feedback still sparse** — 7 taps in 10 nights (5 smoke + 1 pass + 1 build). First `idea:build` 05-26 = positive but sample tiny.
- **Push reliability** — 2/6 nights failed to push (type-check or merge conflict). NEW watch. Consider pre-gate `tsc --noEmit` on authored files.
- **`/en/about` LCP fix verification** — opacity:0 removed 05-27. Check 05-28 perf baseline for improvement signal.
- **`results_viewed` event verification** — instrumented 05-27, replay CTA wired 05-28. Verify PostHog events flowing.

## Telegram-button feedback (last 7d)
- `night:good`x2, `night:meh`x1 — smoke-test from 05-19 (aging out of window).
- `idea:pass:41b1c6b6`x1 — 05-23 ("games actually finish" concept passed).
- `idea:build:b30c7fe0`x1 — 05-26 ("Survival Rounds" last-word-standing — FIRST BUILD TAP).
- `test:works`x2 — infra smoke from 05-19 (aging out).
- **No `reddit:*`, `mode:*` taps.** First `idea:build` = positive. `meh >=3` self-critique threshold unreachable.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging`, `code-review` | shipped 3/6; autonomy matrix approach more impactful than skills |
| 02 perf | `superpowers:systematic-debugging` | shipped 2/6; timeout not skill gap |
| 03 engagement | none yet | shipped 4/6 (trending up); prompt-driven |
| 04 competitor | `humanizer` | shipped 6/6; humanizer on reddit drafts 05-24 |
| 05 landing | `frontend-design`, `impeccable:craft` (mandatory) | shipped 1/6; skills can't run if lane times out |
| 06 seo | `seo-daily` (mandatory) | shipped 5/6; recovered from 05-27 timeout |
| 07 self-learn | none — prompt-only | shipped 5/6 |
| 08 adsense | `humanizer` | shipped 3/5; copy quality when it runs |

**Rules for lane 7 updating this table:**
- Add a skill if invoking it correlated with a shipped (not reverted) outcome in >=2 nights.
- Remove a skill if its lane reverted >=2 of last 3 nights *with that skill in the recipe* (timeout-reverts don't count).
- Cap each row at 4 skills; drop lowest-evidence first.
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
