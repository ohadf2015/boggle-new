# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Sample (2026-06-05):** 6 report nights in window (05-30..06-05). Recovery is NOT monotonic: **06-02 relapsed into a timeout-collapse** (lanes 01/02/03/05/06/08 all rc=124) — the same MCP-spiral + over-scope pattern the `bd14fa03e`/`a2334a3b3` guards were supposed to end. 06-03 mixed; **06-04 and 06-05 every code lane clean (rc=0)**. So the fix holds on calm nights but still breaks under MCP load — treat "epidemic ended" as FALSE. Per-lane 6-night completion: **07=6/6, 04=6/6**, 05=4/6, 06=4/6, 01=4/6, 02=3/6, 03=3/6, 08=3/6, 09=2/6.

## FOUNDER DIRECTIVE — applied 2026-06-05 (highest priority)
- **(06-05) Polish the OTHER party games (admin-only), make them look + feel good.** Lane 05 scope. Telegram `polish:try` callbacks corroborate: founder one-click-requested polish on sealed-bid (×3), word-tower (×2), word-alchemy (×2), blast, word-vault, word-forge, caption-clash. **`polish:try:<slug>` frequency IS the game-mode priority queue** — work the top-clicked slugs first. Keep new modes behind `{isAdmin && …}` per the permissions grant below.
- **(06-04, still active) No hard file-count cap.** `LEXI_LANE_FILE_CAP` default 8→999 in `headless.sh`. Ship ALL 5 locales in one night; never leave ja/es as key strings. Wall-clock finalize cutoff stays (SIGTERM-sprawl safety).

## Active watches (2026-06-05)
- **`/en/multiplayer` CLS regressed 0.057→0.29 (×5)** — NEW 06-05. Root cause IDENTIFIED: `AutoHideHeader` returns `null` → layout shift on hydrate. **Fix authored but NOT shipped** — highest-confidence perf fix in the backlog; land it tomorrow.
- **Homepage LCP 7107ms / `/en/word-hunt` 8188ms / `/en/word-wheel` 5244ms** — open since 06-03/06-04, undiagnosed. Highest-impact perf targets.
- **`/en/multiplayer` INP 528–584ms + LCP ~4237ms** — persists; skeleton-vs-hydrated-lobby height mismatch in `PageClient.tsx`.
- **Perf WIN shipped 06-05:** `idx_web_vitals_player_id` (seq scan 3207ms → index scan; 99k+ rows). Keep indexing hot read paths.

## What works (validated this week)
- **Lightweight, low-MCP lanes never time out** — 07=6/6, 04=6/6 across the window incl. the 06-02 collapse night. Zero/low external-call dependency = no timeout. (strongest signal, 6 nights)
- **Bounded budgets + baseline-aware gate** (`bd14fa03e`) — ships authored code on calm nights even when pre-existing tests fail on clean HEAD. Holds 06-04/06-05. (validated, with 06-02 caveat below)
- **Ground-truth audit before edits** — zero fabricated-feature bugs across window. (stable)
- **Direct-to-master single end-of-run commit** — one rollback target, one Railway deploy. 19+ nights. (stable)
- **TDD on new pure modules** — highest ship rate for new code (wave-modifiers, dailyLetterPool, season scoreTier). (stable)
- **Founder-directive fast path** — file-cap removal 06-04, party-polish 06-05 acted same night. (validated 6×)
- **Security hardening via migration** (lane 01) — SECURITY DEFINER view fixes + anon-execute REVOKEs shipped 06-01/06-02/06-04 with zero reverts. (stable)
- **WIP-safe scoped revert** — per-lane revert never flushes concurrent founder work. (stable)
- **Isolated-worktree gate + `build:fast`** — validation can't race a dev server; 3× faster. (stable)
- **Mandatory-Minimum-Artifact** — floor never zero even on killed lanes. (stable)
- **PostHog REST helper** — avoids PostHog MCP hangs. (stable)

## What to avoid (failed this week)
- **MCP-spiral timeout collapse RECURRED 06-02** — lanes 01/02/03/05/06/08 all rc=124 on one night. Cause: serial Sentry+Supabase+PostHog calls summing past budget. The `MAX_MCP_CALLS` cap is STILL un-shipped after 11+ nights. **This is now the #1 infra gap** — last week's "epidemic ended" was premature.
- **Over-scoped lane work** — 06-02/06-03 partials were lanes attempting multi-file ships they couldn't finish + self-verify in budget. One complete gate-clean change ships; three half-finished ship nothing. (kept)
- **Preflight abort on unpushed founder commits** — caused 05-30 loss; still NO stash-or-warn handler. (kept, high)
- **Reddit JSON/OAuth API blocked 11+ nights** — RSS fallback (`33f8641c3`) works from residential IP. Use RSS, stop retrying JSON/OAuth. (kept)
- **Search collector dead 11+ nights** — 0 signals. Remove it. (kept)
- **Demoting `logger.warn→debug` to silence Sentry** — root-cause or queue, never mute. (kept)
- **Headless Claude creating realtime tables** — hard-ban per Supabase perf rule. (kept)
- **Auto-rollback on KPI dip** — Railway deploy lag = false positives. (kept)
- **Per-lane commits** — banned; single end-of-run commit only. (kept)
- **Self-summarizing a wrong root cause** — read the actual log + ALL runs for a date, not prior summaries. (kept)

## Open watches (carry forward)
- **`/en/multiplayer` CLS 0.29 (AutoHideHeader null)** — fix authored, unshipped. Status: open, ship-ready.
- **Homepage LCP 7107 / word-hunt 8188 / word-wheel 5244** — undiagnosed. Status: critical.
- **MAX_MCP_CALLS cap** — un-shipped 11 nights; caused 06-02 collapse. Status: open, #1 infra gap.
- **Preflight abort handler for unpushed commits** — no handler. Status: open, high.
- **GSC token scope** — `webmasters.readonly` missing from ADC; lanes 06/08 fall back to Bing-only. 11+ nights. Status: open.
- **`PageClient.tsx` bloat (600+) + `SinglePlayerResults.tsx` 500+** — refactor deferred. Status: open.
- **Dead experiment flags** — `show-signup-after-first-win`, `share-prompt-timing`, `wheel-signup-offer-v1`, `wheel-replay-cta-v1` wired, 0 exposures (DARK until PostHog flags created). Prune or create flags. Status: open.
- **Lane 09 monetization 2/6** — runs rarely; web ad providers (ayeT offerwall) researched + dark adapters committed, not live. Status: open.
- **`/en/guides` thinnest content (~567w)** — lane 08 raising; still below target. Status: resolving.
- **Founder idea:build backlog** — `idea:build` clicked 3× this week (hashes 22d362d4, 6fd3c339, a462044e) vs 1 pass. User WANTS ideas built. Map hashes→ideas files, prioritize. Status: open, founder-signalled.
- **Admin-session perf noise** — filter admin player_ids from HogQL. Status: open.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `superpowers:systematic-debugging`, `security` | sec-hardening migrations shipped 06-01/02/04, 0 reverts |
| 02 perf | `superpowers:systematic-debugging` | LCP/CLS fixes + db index shipped 06-04/06-05 |
| 03 engagement | none | prompt-driven; experiment-event wiring shipped 3 nights |
| 04 competitor | `humanizer` | 6/6; applied to idea + reddit drafts, 0 timeouts |
| 05 landing | `frontend-design`, `impeccable:craft` | sealed-bid/word-tower/caption-clash polish shipped 4 nights |
| 06 seo | `seo-daily` | title/meta rewrites shipped 06-05 (Daily Word Wheel) |
| 07 self-learn | none — prompt-only | 6/6 |
| 08 adsense | `humanizer` | Article JSON-LD + word-count ships; GSC-scope-blocked |

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
- **Reddit JSON API blocked since 05-27.** Use the RSS fallback (`33f8641c3`); OAuth still un-configured.

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Experimental game modes — admin-only HUB VISIBILITY** *(updated 2026-05-19)* — lane 05 may ship a NEW game mode at `fe-next/app/[locale]/<slug>/page.tsx`. The hub tile linking to it MUST be wrapped in `{isAdmin && ...}` so only the admin sees the entry point. NO sitemap entry, NO llms.txt, NO header nav, NO rollout flag, NO Playwriter mandate. User playtests then decides on public rollout. The mode URL MUST appear in the manager-summary Telegram digest block.
