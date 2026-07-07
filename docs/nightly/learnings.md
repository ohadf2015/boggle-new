# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-07-02..07-07 (6 report nights).** SALVAGE IS THE NORM, not the exception: **07-02 + 07-05 + 07-06 = docs-only salvage** (gate failed on lane code, docs kept, code backed up). Only **07-03 = typecheck-tier ship** (`5f94cb60f`) and **07-04 = baseline-red override** (`1bf70c095`) landed lane code. Prior lane-07 wrongly logged 07-06 as "first clean full ship" — the 07-06 report reads `GATE FAILED → DOCS-ONLY salvage`. **0 pushed-code reverts all window** — salvage drops lane code PRE-push, master never regresses. Window still merged real code via the 07-03/04 ships + salvage→restore treadmill (05→06→07). **MODE CULL: `1e650153e` removed party, word-alchemy, word-forge, word-vault** (+`3d11d85ce` test cleanup) — several lanes' polish work + the Word-Vault founder directive are now MOOT (see below). **#1 infra STILL: Supabase MCP token drought — absent 07-02..07-07 (~12 nights); 4 migrations (20260628/0701/0706/0707) written-but-UNAPPLIED, 0 DB migrations applied in window.** **Backbone lanes 02-perf, 03-eng, 05-landing, 11-mode-qa reliably produce; 04/06/08/10/12 intermittent (skipped or budget-hit several nights).**

## FOUNDER DIRECTIVE — highest priority
- **2026-07-06 (MODE CULL):** party, word-alchemy, word-forge, word-vault DELETED (`1e650153e`). **STOP polishing/auditing/pitching these** — Word-Vault escape-room redesign directive is now VOID; word-alchemy/word-forge polish votes are spent on dead code. Lane 05/11/04 remove them from rotation. adventure/blast REUSE former wordForge code — relocate, don't grep-delete blindly.
- **2026-06-27 (blog cadence):** ship a NEW blog every 2 days — unique generated hero image, word-game topic w/ SEO keywords, education + "AI to learn a language" angles, link a live game MODE, witty + sourced. **Lane 08 owns; 04/06 feed topics.** Status: blocked on repeatable Higgsfield hero-image recipe (CLI sudo-install pending).
- **2026-06-26 (word-tower, live since `f35bcf57f`):** lean/sway/crane/HUD/drop-feel ✅. Readiness **86→87%** (lane 11: cleared 10 unaudited components clean, reclassified false-blocker). Open: **DAILY-over-MP refocus + daily-leaderboard backend (Layer B)** = the ONE blocker 87%→90%; needs founder design call (1-attempt/day vs unlimited; spec `docs/specs/word-tower-daily-seed.md`). Lane 05/11 + founder.
- **2026-06-24/25:** Education "free forever"→trial+price ✅. **STOP deferring to human — ship reversible work** (autonomy). Sealed-bid Showdown shipped.
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate. NB: rotation pool shrank by 4 after the cull — pick from surviving modes only.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last window, n=5 settled: 07-02/07-03)
- **idea:build ×2, polish:try ×3, 0 pass/drop/keep/promote/night:*/reddit:*.** Ideas: Word Alchemy (`b57d9704`), Sealed Bid (`976f9f92`). Polish: word-alchemy (`3bbfd0f1`), anagram (`61205c0c`), word-forge (`21d52bc0`).
- **COORDINATION GAP:** 2 of 3 polish targets (word-alchemy, word-forge) were DELETED days later by the cull → lane-05 shipped polish on modes about to die. **Lesson: before spending a polish slot on a vote, confirm the mode is still live + not cull-flagged.** Steering votes lag founder's roadmap.
- **Zero night:good/meh** = no explicit run-quality signal this window; accept silence, don't over-correct. **Zero reddit callbacks** (60+ d) — keep drafts-only, accept silence.

## What works (validated this week)
- **0 pushed-code reverts across the window** — salvage drops lane code BEFORE push; a gate-fail never regresses master. (strongest, holds every night)
- **Salvage→next-night restore treadmill** — 07-05 dropped code salvaged → restored+re-gated 07-06 → 07-06 dropped → restored 07-07. `scripts/nightly/restore-salvaged-code.sh <tag>`. No night fully zeroed. (validated — but see "treadmill unsustainable" below)
- **Reduced-strength gate tiers** — 07-03 shipped on tsc+test:changed when full re-gate wedged; 07-04 shipped past a gate test (`thin-shell-noindex.test.tsx`) that pre-fails on clean master. Beats blanket docs-only drop. (holds — the only 2 code ships this window)
- **02-perf + 03-eng + 05-landing + 11-mode-qa = reliable backbone** — asset/SSR/CLS/boot-loader perf, rage-click fixes, mode polish, systematic mode-QA. word-tower 86→87%. (validated)
- **Founder-directive fast path** — free-text directives = top of queue. (strongest)
- **eslint-changed-files-only self-check + single end-of-run commit** — lanes skipping full tsc/build finish in budget; one rollback target. (30+ nights)
- **Mandatory-Minimum-Artifact floor** — every degraded lane still shipped `docs/nightly/artifacts/lane-NN-*.md` (docs/ gate-clean). Floor never zero. (validated)
- **`revalidate=N` over `force-dynamic`** + **`serverExternalPackages` for fs-read dicts** + **local JWT verify on read-only GET**. (doctrine)
- **Guard Pixi `.clear()`/`.draw()` vs post-unmount null ctx** + **return BOOLEAN not bare Capacitor proxy** — recurring native/Pixi race; guard proactively. 07-06 reverted a salvage regression that stripped a `TrailRenderer` null-guard — salvage MERGES can REINTRODUCE fixed bugs; diff salvage against HEAD before re-shipping. (doctrine)
- **Use `DirectionalIcon` for back/exit arrows** — 07-06 caught a salvage revert dropping it in `WordTowerPlay.tsx` (RTL regression). (doctrine)

## What to avoid (failed this week)
- **Supabase MCP token drought — absent ~12 nights, 0 DB migrations applied** — blocks FK-index/RLS-initplan/auth-pool/REVOKE work; 4 migrations (20260628/0701/0706/0707) written-but-unapplied. **#1 infra.** Fix: mint never-expire `SUPABASE_ACCESS_TOKEN` into nightly env + preflight refresh probe + retry-with-backoff. (open, worsening — HUMAN escalate)
- **Salvage treadmill is unsustainable** — 3 of 6 nights docs-only-salvaged; code re-gated each restore, re-drops possible, and salvage merges can reintroduce fixed bugs (07-06 TrailRenderer/DirectionalIcon). The gate wedge is NOT stabilizing. Next: scope Vitest to changed-files + per-suite hard kill (never idle-900s → rc124). (recurring, #2 infra)
- **Gate rc=124 idle-timeout (07-04, 07-05) → INCONCLUSIVE re-verify** — gate loop wedges at idle-900s/backstop-5400s. Distinguish timeout-kill from pass. (recurring)
- **Recurring gate lint `VirtualGamesList.tsx:39:23`** blocked gate PASS on 07-03 & 07-06 — a stable pre-existing lint keeps failing the full gate. Fix once at source (`fe-next/components/admin/today-games/components/VirtualGamesList.tsx`) so it stops wedging every night. (new, actionable)
- **Polishing cull-bound modes** — lane 05 shipped word-alchemy/word-forge polish the 07-06 cull deleted. Confirm mode is live before spending a slot. (new)
- **`results_viewed` genuine-0 in PostHog** — call site live (`SinglePlayerResults.tsx:189`), 0 fires 14d+. Next: trace distinct_id overlap classic→results_viewed, check consent/render bypass. (open, lane 12)
- **Lane 05 over-scope → deferred UI wire** — write ALL 5 locales FIRST, then a slice that fully wires in one budget. (high-frequency)
- **Lane 03 — WIRE the conditional render the SAME night as the flag; delete zombie flags before new ones.** (recurring)
- **Flagging a Web-Vitals regression on one reading** — never name a suspect below n≥50 in BOTH runs. (holding)
- **Unguarded `Record`/lookup access crashes modes** — guard `MAP[key]` before wiring. (carry, lane 11)
- **>500-line files block flag-wiring** — `WordTowerPlay.tsx`/`WordTowerScene.tsx`/`wordTowerManager.ts` over cap. (carry, lane 11)
- **Reddit OAuth/JSON blocked → use RSS fallback, error-tolerant parse, stop retrying.** (kept)
- **`next build`/full `tsc`/full test in a LANE verify path** — wedge risk; eslint-changed-files-only. (kept)
- **Demoting `logger.warn→debug` to silence Sentry / per-lane commits / headless realtime-table creation** — banned, held. (kept)
- **06-seo + 11-mode-qa hit USAGE-LIMIT** (07-04/07-05) → 120s backoff retry — heavy lanes near the rate ceiling; keep budgets tight. (new)

## Open watches (carry forward)
- **Supabase MCP token drought** — mint never-expire PAT + preflight probe + cold-boot retry; apply 4 pending migrations. Status: #1 infra, worsening, HUMAN.
- **Gate wedge / salvage treadmill** — scope-Vitest-to-changed + per-suite kill; fix `VirtualGamesList` lint at source. Status: #2 infra, lane 07/infra.
- **07-01-style early-lane cascade abort** — isolate lane failures (continue-on-error); only gate gates push. Status: infra, lane 01.
- **`results_viewed` silent-0** — trace distinct_id overlap + consent/render bypass. Status: open, lane 12.
- **Word Tower daily-leaderboard backend (Layer B)** — the ONE blocker 87%→90%; founder design call. Status: open, lane 11 + founder.
- **PostHog zombie/dark flags** — audit defined flags for 0 call sites; wire-or-delete. Status: open, lane 03.
- **Blog cadence engine** — needs repeatable Higgsfield hero-image recipe (CLI install blocked) + topic rotation. Status: #1 founder-content, lane 08.
- **Sentry MCP read-only (403 on update_issue, 07-04)** — can't auto-resolve; manual UI. Status: open, human.
- **IndexNow Bing parity + AdSense re-submit + Higgsfield CLI install** — manual ops. Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | ships when MCP up; REVOKE/search_path migrations written-but-unapplied (MCP drought) |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | backbone; boot-loader CLS, socket-stall, Pixi null-guards |
| 03 engagement | `frontend-design` | backbone; rage-click + daily-first funnel wired w/ render path |
| 04 competitor | `humanizer`, `game-designer` | idea:build 2/2; surface buildable ideas w/ named LIVE mode+file |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | mode-polish ships; 0 reverts (design non-negotiable) |
| 06 seo | `seo-daily` | content lane; native HE/SV/JA/ES/RU review (mandatory keep); usage-limit prone |
| 07 self-learn | none — prompt-only | ships every night |
| 08 adsense | `humanizer`, `higgsfield-generate` | JSON-LD+ISR when it runs; hero-image blocked on CLI install |
| 09 monetization | `frontend-design` | daily-first funnel + rewarded warming; ships most nights |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | intermittent (scheduler skips); Wiktionary+Russian top throughput |
| 11 mode-qa | `senior-qa`, `ccgs-design-review` | backbone; word-tower 86→87% |
| 12 telemetry | none — prompt-only | event-registry + dual-emit fixes; results_viewed open |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (60+ d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.
