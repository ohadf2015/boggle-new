# Nightly Learnings — accumulated playbook deltas

Rewritten by **lane 7** each night from prior 7 reports. **≤200 lines.** All lane prompts inject this file as preamble.

> **Window: 2026-07-01..07-06 (6 report nights).** Gate wedge is STABILIZING but not gone: **07-02 + 07-05 = docs-only salvage** (lane code dropped at gate, docs kept), **07-03 = typecheck-tier reduced-strength ship** (`5f94cb60f`), **07-04 = baseline-red override** (`1bf70c095`, gate's own `thin-shell-noindex.test.tsx` pre-fails on clean master), **07-06 = FIRST clean FULL ship of window** + restored 07-05's dropped lane code (`e347fe29c`). **07-01 preflight/early ABORT** — lane 01-triage exit 75 cascaded, 4 lanes failed (01/07/09/10), 03/04 never launched. **0 pushed-code reverts all window** — salvage drops lane code pre-push, never regresses master; window still merged big real code (blast feel batch, wordcraft setup+drag-perf, word-tower Bloxx, MP no-auto-start + brag-link, connections pyramid+quality-gate, education 6-locale, Russian blog). **Most reliable: 02-perf, 03-eng, 05-landing, 11-mode-qa all 6/6.** **Wins:** word-tower readiness **82%→86%** (lane 11 FTUE+a11y+perk-display); mode polish 3/4 shipped (word-forge tier labels + iron-streak glow, word-alchemy elemental burst); connections bridge-pyramid mode; Russian 6th-locale blog+SEO closed. **#1 infra STILL: Supabase MCP token drought — absent 07-01..07-06 (now ~11 nights); 3 migrations (20260628/0701/0706) written-but-UNAPPLIED, 0 DB migrations applied in window.**

## FOUNDER DIRECTIVE — highest priority
- **2026-06-30 (Word Vault):** "Word vault isn't actually fun — rework puzzles + UI, should feel like a real escape room, fun to explore." Escape-room redesign captured (M effort); `idea:build` YES 07-02. Lane 05/09 to pick up — NOT yet shipped, top mode-polish target.
- **2026-06-27 (blog cadence):** ship a NEW blog every 2 days — unique generated hero image, word-game topic w/ SEO keywords, education + "AI to learn a language" angles, link a game MODE, witty + sourced. **Lane 08 owns; 04/06 feed topics.** Status: blocked on repeatable Higgsfield hero-image recipe (CLI sudo-install pending).
- **2026-06-26 (word-tower, shipping since `f35bcf57f`):** lean/sway/crane/HUD/drop-feel ✅ (`ace446f72`, `9db96d51a`). Open: **DAILY-over-MP refocus + daily-leaderboard backend (Layer B)** = the ONE blocker 86%→90%; needs founder design call (1-attempt/day vs unlimited; spec `docs/specs/word-tower-daily-seed.md`). Lane 05/11 + founder.
- **2026-06-24/25:** Education "free forever"→trial+price ✅. **STOP deferring to human — ship reversible work** (autonomy). Sealed-bid Showdown engine shipped.
- **2026-06-23 (standing):** (1) SPEED without bugs, (2) MODE READINESS to release quality, (3) EDUCATION growth into real `/[locale]/education` pages, (4) AUTONOMY (ship reversible, defer only irreversible).
- **Improve admin-beta modes nightly — NO new modes** (2026-06-16). Lane 05 STEP 0 improves ONE existing admin-gated mode/night, EXISTING files only, keeps admin gate.
- **No hard file-count cap.** `LEXI_LANE_FILE_CAP=999`; per-lane working-set ~8. Write all 5 locale translations FIRST.

## Telegram-button feedback (last window, n=8 settled)
- **polish:try ×5, idea:build ×3, 0 pass/drop/meh** — every actionable vote converted: word-alchemy particles (voted 07-02 → shipped 07-03), word-forge iron-streak (voted → shipped 07-05). Modes touched: word-vault, word-alchemy ×2, crossword, anagram, word-forge, sealed-bid. **100% build/polish YES, zero rejection** — broad mode appetite holds; word-vault leads on named-directive weight.
- **idea:build ×3 vs pass ×0** — appetite for concrete BUILDABLE ideas w/ named mode+file. Lane 04 keep surfacing 1-3/night.
- **Zero night:meh, zero reddit:* callbacks.** Silence = no dissatisfaction; accept it, don't over-correct.

## What works (validated this week)
- **0 pushed-code reverts across the window** — salvage drops lane code BEFORE push; a gate-fail never regresses master. Window still merged big real code (blast, wordcraft, word-tower, MP, connections, education, Russian). (strongest, holds every night)
- **02-perf + 03-eng + 05-landing + 11-mode-qa = 6/6** — the reliability backbone. Asset/SSR/CLS/boot-loader perf, rage-click fixes, mode polish, systematic mode-QA = highest-yield lanes. (validated)
- **All Telegram polish:try votes convert to ships** — vote 07-02 → ship 07-03 turnaround. Lane 05 self-selects target; votes are steering, not gates. (validated)
- **Salvage-on-gate-failure floor + next-night restore** — 07-05 dropped lane code salvaged to `~/logs/lexi-nightly/salvaged-code-<tag>/`, restored + shipped 07-06 (`e347fe29c`). Gate failure never zeroed a night. (validated)
- **Reduced-strength gate tiers (typecheck-tier / baseline-red override)** — 07-03 shipped on tsc+test:changed when full re-gate wedged; 07-04 shipped past a gate test that pre-fails on clean master. Beats blanket docs-only drop. (new this window — promising)
- **Founder-directive fast path** — free-text directives = top of queue. (strongest)
- **eslint-changed-files-only self-check + single end-of-run commit** — lanes skipping full tsc/build finish in budget; one rollback target. (30+ nights)
- **Mandatory-Minimum-Artifact floor** — every degraded/failed lane still shipped its `docs/nightly/artifacts/lane-NN-*.md` (docs/ gate-clean). Floor never zero. (validated)
- **`revalidate=N` over `force-dynamic`** + **`serverExternalPackages` for fs-read dicts** + **local JWT verify on read-only GET** — cumulative AdSense/LCP/auth-latency wins. (doctrine)
- **Guard Pixi `.clear()`/`.draw()` sites vs post-unmount null context** (`647f6ecac`, `eb3551526`) + **return BOOLEAN not bare Capacitor proxy** (`d2fb54b03`) — recurring native/Pixi race class, guard proactively. (doctrine)

## What to avoid (failed this week)
- **Supabase MCP token drought — absent 07-01..07-06 (~11 nights), 0 DB migrations applied** — blocks FK-index/RLS-initplan/auth-pool work; 3 migrations (20260628/0701/0706) written-but-unapplied. **#1 infra.** Fix: mint never-expire `SUPABASE_ACCESS_TOKEN` into nightly env + preflight refresh probe + retry-with-backoff. (open, worsening — escalate to human)
- **07-01 lane-01 early fail (exit 75) cascaded the whole run** — 4 lanes failed, 03/04 never launched, no salvage at that stage. A single early-lane crash should NOT abort downstream lanes. Fix: lane failures isolate (continue-on-error per lane), only the GATE gates the push. (open — #2 infra)
- **Gate wedge → 2 docs-only salvages (07-02, 07-05) + 1 typecheck-tier fallback (07-03)** — `c826e1924` (07-02, skip next-build TS phase) helped but did NOT fully close; full re-gate still wedges on peel. 07-06 clean = stabilizing. Next step: scope Vitest to changed-files + per-suite hard kill (never a 5400s idle). (recurring, improving)
- **`results_viewed` genuine-0 in PostHog** — call site confirmed live (`SinglePlayerResults.tsx:189`) but 0 fires 14d. Lane 12 investigated 07-06, budget-exhausted. Next: trace distinct_id overlap classic→results_viewed, check consent/render-path bypass. (open, lane 12)
- **Lane 05 over-scope → deferred UI wire** — write ALL 5 locales FIRST, then pick a slice that fully wires in one budget; crossword warmth was research-only 07-06 (budget hit). (high-frequency)
- **Lane 03 — WIRE the conditional render the SAME night as the flag** — window improved but rule stands; delete zombie flags before new ones. (recurring, improving)
- **Flagging a Web-Vitals regression on a single reading** — never name a suspect below n≥50 in BOTH runs. (holding)
- **Unguarded `Record`/lookup access crashes modes** — `TOWER_SURPRISE_META[key]`, `PERKS[id]`. Guard before wiring. (carry, lane 11)
- **>500-line files block flag-wiring + split** — `WordTowerPlay.tsx`/`WordTowerScene.tsx`/`wordTowerManager.ts` over cap. (carry, lane 11)
- **Reddit OAuth/JSON blocked → search source stale.** Use RSS fallback, error-tolerant parse, stop retrying. (kept)
- **`next build`/full `tsc`/full test in a LANE verify path** — wedge risk. Lanes eslint-changed-files-only; gate runs authoritative build AFTER. (kept)
- **Demoting `logger.warn→debug` to silence Sentry / per-lane commits / headless realtime-table creation** — all banned, all held. (kept)

## Open watches (carry forward)
- **Supabase MCP token drought** — mint never-expire PAT + preflight probe + cold-boot retry; apply 3 pending migrations. Status: #1 infra, worsening, HUMAN.
- **07-01-style early-lane cascade abort** — isolate lane failures (continue-on-error); only gate gates push. Status: #2 infra, lane 01/infra.
- **Gate wedge** — `c826e1924` partial; 07-06 clean but 07-02/05 salvaged. Next: scope-Vitest-to-changed + per-suite kill. Status: verifying, lane 07/infra.
- **`results_viewed` silent-0** — trace distinct_id overlap + consent/render bypass. Status: open, lane 12.
- **Word Vault escape-room redesign** — founder-directive, idea:build YES, NOT shipped. Status: top mode target, lane 05.
- **Word Tower daily-leaderboard backend (Layer B)** — the ONE blocker 86%→90%; founder design call. Status: open, lane 11 + founder.
- **PostHog zombie/dark flags** — audit defined flags for 0 call sites; wire-or-delete. Status: open, lane 03.
- **Blog cadence engine** — needs repeatable Higgsfield hero-image recipe (CLI install blocked) + topic rotation. Status: #1 founder-content, lane 08.
- **IndexNow Bing parity + AdSense re-submit + Higgsfield CLI install** — manual ops. Status: open, human.

## Specialized Skills (maintained by lane 7)

| Lane | Recommended skills | Evidence |
|---|---|---|
| 01 triage | `security`, `supabase-db-manager` | 5/6 shipped (07-01 exit-75); idempotent REVOKE + search_path pins |
| 02 perf | `superpowers:systematic-debugging`, `supabase-db-manager` | 6/6 — backbone (boot-loader CLS, socket-stall, Pixi null-guards) |
| 03 engagement | `frontend-design` | 6/6; rage-click fixes + daily-first funnel wired w/ render path |
| 04 competitor | `humanizer`, `game-designer` | idea:build 3/3; surface buildable ideas w/ named mode+file |
| 05 landing | `frontend-design`, `impeccable:craft`, `animate-ai` | mode-polish 3/4 shipped, 0 reverts (design non-negotiable) |
| 06 seo | `seo-daily` | 5/6 content; native HE/SV/JA/ES/RU review (mandatory keep) |
| 07 self-learn | none — prompt-only | ships every night (except 07-01 whole-run cascade) |
| 08 adsense | `humanizer`, `higgsfield-generate` | 4/6 JSON-LD+ISR; hero-image gen blocked on CLI install |
| 09 monetization | `frontend-design` | 4/6 after 07-01 fail; daily-first funnel + rewarded warming |
| 10 dict | `dictionary-improvement`, `crossword-clue-craft` | 2/6 (07-01 exit-75, scheduler skips); Wiktionary+Russian top throughput |
| 11 mode-qa | `senior-qa`, `ccgs-design-review` | 6/6; word-tower 82→86% (FTUE+a11y+perk) |
| 12 telemetry | none — prompt-only | 5/6; event-registry + dual-emit fixes; results_viewed open |

## Reddit reply etiquette (lane 4 sub-output)
- **Never auto-post.** Drafts only. User reviews + posts manually.
- Default = helpful answer with **no product mention**. Mention LexiClash only when genuine best answer.
- **NEW (founder 06-24):** start LIGHT promo comments to `lexiclash.live`; improve comment suggestions. Still drafts-only, still skip strict self-promo subs.
- Skip strict self-promo subs (r/AskReddit, r/woahdude). Prefer r/wordgames, r/dailygames, r/Anagrams, r/Scrabble, r/languagelearning.
- Two drafts per thread: (a) pure-value, (b) value + one-line product mention. User picks.
- Use older account (fresh 0-karma = spam-flagged).
- **Reddit JSON API blocked since 05-27.** Use RSS fallback (`c5b0c4c10`); OAuth un-configured — stop retrying. Wrap fetch in error-tolerant parse.
- **Zero reddit callbacks in feedback (40+ d)** — accept silence.

## Core principle (granted by user) — DO NOT EDIT
- **Anything repeatable -> script it.** If a lane repeats the same WebSearch / WebFetch / SQL / shell sequence on multiple nights, codify it under `scripts/nightly/lib/` or `scripts/nightly/tools/`. Lane 7 is empowered to create AND update these helpers. Each new script must be: (a) under 200 lines, (b) idempotent, (c) syntax-checked with `bash -n`, (d) referenced from at least one lane prompt.

## Permissions (granted by user) — DO NOT EDIT
- **Improve existing admin-beta modes — NO new modes** *(updated 2026-06-16)* — lane 05 STEP 0 no longer ships new game modes. It IMPROVES an existing admin-gated / experimental mode every night WITHOUT asking (UI / gameplay / variable-reward / feel / graphics / defeat-obviousness / understandability / fun), editing EXISTING files only. KEEP every admin gate intact — promotion to public is the founder's 🚀 call. It self-selects a target (rotating across modes; `mode:tweak` / `polish:try` votes are optional steering), ships the smallest coherent slice, and emits a `#### Mode improvement shipped` block whose URL MUST use the `.live` host (run.sh only sends the Telegram card on a `lexiclash.live` match). Lane 04 surfaces improvement ideas for these modes (never new-mode pitches).

## Stat-framing reminders (memory anchors — DO NOT EDIT)
- Never write "0 downloads" / "0 ads" / "no rating yet" — use "browser-based", "ad-free", "free".
- Never insert `aggregateRating` JSON-LD without source data.
- Hebrew/Japanese/Swedish/Spanish strings are AI-generated — flag commits for native review.
