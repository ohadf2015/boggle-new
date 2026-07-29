# Brain Drills Audit — 2026-04-26

12-lens audit of the Brain Drills feature (cognitive-training hub + 5 drill mini-games + scoring/XP/coin pipeline).

Surface: `app/[locale]/brain/PageClient.tsx` (514 LoC) + 5 drill PageClients (165 LoC × 5, ≈99% identical) + 5 drill components in `components/drills/*` (420–556 LoC each) + ≈14 widgets in `components/brain/*` + server route `app/api/drills/submit/route.ts` (388 LoC) + hooks `useSaveDrillResult` / `useDrillRewards` / `useDrillGrid` / `useBrainScore`.

Reward pipeline (gold + XP + brain-score) is **wired** — this is not in the duel/WOTD broken-payout cluster (see `economy-balance-audit-2026-04-22`). The structural problems are progression, parity, telemetry, and cheat surface.

Prior baseline: none — first dedicated audit of this surface.

---

## Executive summary

**Top 3 risks**
1. **Level progression dead.** All 5 PageClients hardcode `level={1}`. `LEVEL_CONFIGS` (5 levels per drill) unreachable in prod. Server `/api/drills/submit` doesn't bump `drill_progress.level` either. Two-sided bug.
2. **Server trusts client score.** `/api/drills/submit` validates field presence + drill type + level range only. No max-score / max-words / min-duration / idempotency / rate-limit. Cheat surface for leaderboards + brain-tier social badges.
3. **Test coverage gap.** Only ComboMaster has direct unit tests (`DrillGameplay.test.tsx`). 4 of 5 drills + reward + grid hooks untested. Project rule `22-tdd-strict.md` violated.

---

## A — Parity / drift across 5 drills (5 findings)

### P0
- **A1. `level={1}` hardcoded** — `app/[locale]/brain/drills/{combo-master,lightning-round,memory-hunt,pattern-switcher,rare-gems}/PageClient.tsx:140`. Every page passes literal `1`. Drills 2–5 in `LEVEL_CONFIGS` (e.g. `RareGems.tsx:17-22`) unreachable. Pair with B1 server-side. Fix: derive from `useBrainScore().drillProgress[i].level` or URL param. (S)

### P1
- **A2. 5 PageClients ≈99% identical, 825 LoC total** — only `drillType`, color, drill component, extra-data field differ (≈11 lines). Extract `<DrillPageShell drill="combo-master" Component={ComboMaster} resultMapper={…}/>`. (M)
- **A3. Sound API drift** — `ComboMaster.tsx:59,203` uses `playSound('drillComplete')`; LightningRound:59,164 / MemoryHunt:43,59 / PatternSwitcher:59,257 / RareGems:81,198 use `playDrillCompleteSound()`. Pick one. (XS)
- **A4. Result-payload shapes diverge** — each drill emits a different `result` shape (`maxCombo` / `wordsPerMinute` / `rareWordsFound` / etc.) but server only persists `extra_data: any`. Define `DrillResultBase` discriminated union in `shared/types/cognitive.ts`. (S)

### P2
- **A5. Drill JSDoc descriptions copy-pasted** — symptom of A2; will drift when drills evolve. (XS, fix with A2)

---

## B — Server / API / Cheat surface (6 findings)

### P0
- **B1. No score sanity check** — `app/api/drills/submit/route.ts:68-91`. Validates fields + drill type + level (1-5) only. Client can POST `{score: 99999, wordsFound: 1000, durationSeconds: 1, level: 5}`. Add per-level max-score (already known via `DRILL_LEVEL_MAX_SCORES:24`) + min-duration (e.g. wordsFound × 1.5s floor) + max-XP cap. (S)
- **B2. No idempotency key** — `submit/route.ts:48`. Replay attack: client retries → multiple XP/coin awards. Add `drillSessionId` UUID generated client-side, dedupe via unique constraint on `drill_sessions(user_id, client_session_id)`. (M)
- **B3. Server doesn't bump `drill_progress.level`** — `submit/route.ts:135-148`. Updates highScore / totalPlays / totalScore / avgScore but never level. Pair with A1. Threshold = `LEVEL_CONFIGS[level-1].targetScore` (move from drill components to server-shared constant). (S)

### P1
- **B4. No rate limit on `/api/drills/submit`** — Next route inherits Express middleware? Verify. If not, brute-force XP farm. (S)
- **B5. Non-transactional updates** — `submit/route.ts` does 4 sequential supabase mutations (drill_sessions / drill_progress / brain_scores / brain_score_history). Failure mid-chain leaves inconsistent state. Wrap in RPC or use Supabase transaction helper. (M)
- **B6. `console.error` without Sentry capture** — `submit/route.ts:109,126,148,165,234,277,352`. Already imports `captureApiError` (used at L110/385) — apply consistently. (XS)

---

## C — Telemetry (3 findings)

### P0
- **C1. Only `drill_completed` fired** — `submit/route.ts:360`. Missing `drill_started` (engagement), `drill_abandoned` (drop-off), `drill_failed` (out-of-time/lives). Funnel + abandon-rate impossible to compute. Add client-side capture in drill `startGame()` + on `onExit` mid-play. (S)

### P2
- **C2. `drill_completed` properties shallow** — missing `duration_seconds`, `time_to_first_word`, `error_count`, `level_attempted_vs_passed`. Future analyses blocked. (S)
- **C3. No A/B test scaffolding** — drill content tuning will need experimentation framework. Note for future. (—)

---

## D — TDD coverage (4 findings)

### P0
- **D1. 4 of 5 drills untested** — `components/drills/__tests__/` has only `DrillGameplay.test.tsx` (covers ComboMaster) + `DrillWordLimits.test.tsx` (cross-cutting). Missing: `LightningRound.test.tsx`, `MemoryHunt.test.tsx`, `PatternSwitcher.test.tsx`, `RareGems.test.tsx`. Rule `22-tdd-strict.md` violated. (M)

### P1
- **D2. No unit tests for reward hook** — `hooks/useDrillRewards.ts:22-26` — gold formula `level*5 + floor(score/20)` capped 100, untested. Pure fn `calculateDrillGold` exported precisely so it could be tested. (XS)
- **D3. No tests for `useSaveDrillResult` + `useDrillGrid`** — 78 + 464 LoC untested. Network-error path silently swallows in `useSaveDrillResult.ts:50`. (M)
- **D4. Server test partial** — `app/api/drills/__tests__/submit-xp.test.ts` only covers XP path. Brain-score rolling-avg + history upsert untested. (M)

---

## E — A11y (5 findings)

### P1
- **E1. Timer milestone announcements missing** — `LightningRound.tsx:201` (`role="status"` on countdown). Sighted users see color change at 10s; SR users get no warning. Add periodic `aria-live` announcement at 30s/10s. (S)
- **E2. Locked drill buttons missing `aria-disabled`** — `QuickDrillsSection.tsx:124`. Uses `disabled` only; redundancy preferred for SR. (XS)

### P2
- **E3. ESC key not bound to drill exit** — keyboard-only users tab to Exit button. Add `onKeyDown` handler at drill root. (XS)
- **E4. 18 direct `framer-motion` imports bypass `AdaptiveMotion`** — 5 PageClients (line 6) + 13 brain widgets. Reduced-motion users still get animations. Migrate to `AdaptiveMotion`. (M)

### P3
- **E5. Lock badge in `QuickDrillsSection` decorative without `aria-hidden`** — `QuickDrillsSection.tsx:143`. (XS)

---

## F — RTL (1 finding)

### P1
- **F1. `text-left` on drill name** — `components/brain/QuickDrillsSection.tsx:150`. Hebrew flips. Use `text-start`. (XS)

(Otherwise clean — `rtl:rotate-180` on back arrows + `dir={dir}` on drill containers correct.)

---

## G — Performance (3 findings)

### P1
- **G1. `framer-motion` for spinner only** — `app/[locale]/brain/drills/*/PageClient.tsx:6` imports full `motion` to render a single rotating border. Replace with CSS `animation: spin`. Same in `app/[locale]/brain/PageClient.tsx:5`. (XS)

### P2
- **G2. `Math.random()` in `PatternSwitcher.tsx:108`** — non-deterministic, blocks seedable tests. Inject via prop / use `useDrillGrid` seeded RNG. (XS)
- **G3. `BrainScoreShareCard` (11.2K) statically imported** — `app/[locale]/brain/PageClient.tsx:42`. Modal-only; should be `dynamic()` like Recharts charts. (XS)

---

## H — Balance / economy (4 findings)

### P1
- **H1. RareGems L1 instant-end** — `RareGems.tsx:17-22` (`targetScore=50`) vs `RARITY_POINTS.legendary=100` (line 44). First 6+ letter word = drill ends. Either bump L1 target or remove instant-end on score threshold. (XS)
- **H2. Coin/XP undertuned by A1** — with `level=1` hardcoded: max gold/drill ≈ 30 (cap from `level*5 + floor(score/20)` with score≤500), max XP/drill ≈ 45 (`DRILL_XP_BASE[1]=30 × 1.5 combo cap`). Once A1 fixed, recalibrate. (—)

### P2
- **H3. Magic numbers duplicated** — `DRILL_LEVEL_MAX_SCORES` (route.ts:24) + `DRILL_XP_BASE` (route.ts:337) + drill-component `LEVEL_CONFIGS`. 3 sources of level numbers. Move to `shared/types/cognitive.ts`. (S)
- **H4. `levelBonus = (level-1)*5`** — `route.ts:39`. Arbitrary; no design doc. Document or remove. (XS)

---

## I — File-size / 500-line cap (1 finding, 5 violations)

### P2
- **I1. Over `< 500` cap** (CLAUDE.md):
  - `components/drills/ComboMaster.tsx` 556
  - `components/drills/RareGems.tsx` 553
  - `components/drills/LightningRound.tsx` 524
  - `components/drills/PatternSwitcher.tsx` 542
  - `app/[locale]/brain/PageClient.tsx` 514
  Extract `<DrillCompleteScreen>` (each drill has near-identical end-screen) and `<DrillReadyScreen>`. (M)

---

## J — Error / empty / loading / disconnect (4 findings)

### P1
- **J1. No pause-on-blur** — drill timers run while tab hidden. Add `document.visibilityState === 'hidden'` pause. Affects `LightningRound`, `RareGems`, `PatternSwitcher`, `ComboMaster`. (S)
- **J2. `useSaveDrillResult` swallows errors silently** — `useSaveDrillResult.ts:50,68`. User sees overlay anyway? — actually `saveResult.success` gates overlay (PageClient.tsx:66) but no toast on failure. User assumes saved. Add error toast. (XS)
- **J3. Grid regenerate failure unhandled** — `PatternSwitcher.tsx:121` — `onPlayAgain?.()` if board exhausted. If regenerate fails too, user stuck in `ready` phase. (S)

### P2
- **J4. No optimistic / offline queue** — mobile flaky-LTE users lose drill results. Out of scope for now, note. (—)

---

## K — Monetization (2 findings)

### P3
- **K1. No rewarded-ad placements in drills** — extra time, extra life, retry-without-streak-loss are clean opportunities. Respect web-platform refusal rule (`feedback-web-no-ads-block-boosts.md`) when adding. (M)
- **K2. `DrillProgressionOverlay` could gate gold-bonus behind ad-watch** — straightforward bonus opportunity. (S)

---

## L — Dead code / config drift (2 findings)

### P2
- **L1. `unlockRequirement` duplicated** — `QuickDrillsSection.tsx:24-65` (`DRILLS[].unlockRequirement: 0/0/0/5/10`) + `DrillUnlockProgress.tsx:20-33` (`LOCKED_DRILLS[].gamesRequired: 5/10`). Two sources. Centralize. (XS)
- **L2. i18n source label** — `useDrillRewards.ts:56` — `addCoins(goldAwarded, 'Brain Drill', …)`. Hardcoded English. If surfaced (transaction history), won't translate. Use stable token `'brain_drill'`, format at render. (XS)

---

## Top 10 fixes by ROI

| # | Fix | Why | Effort |
|---|-----|-----|--------|
| 1 | A1 + B3: wire drill level (client + server) | Unlocks 4× content already built; immediate retention lift | M |
| 2 | B1 + B2: server score validation + idempotency | Closes cheat surface before leaderboards ship | M |
| 3 | C1: `drill_started` + `drill_abandoned` PostHog | Funnel + abandon-rate are product KPIs | S |
| 4 | A2: extract `<DrillPageShell>` (collapse 825→200 LoC) | Cuts maintenance + drift; enables shared improvements | M |
| 5 | D1+D2: tests for 4 missing drills + reward hook | Restores TDD compliance; catches scoring drift | M |
| 6 | J1: pause-on-blur for all drill timers | Fairness; matches mobile-tab UX expectation | S |
| 7 | H3: centralize `LEVEL_CONFIGS` in `shared/types/cognitive.ts` | One source for client + server (currently 3) | S |
| 8 | E4: replace direct `framer-motion` with `AdaptiveMotion` | Reduced-motion compliance + perf on low-end Android | M |
| 9 | J2: surface save errors via toast | Users currently think failed saves succeeded | XS |
| 10 | I1: split 4 over-cap drill files (extract `<DrillCompleteScreen>`) | 500-line rule + DRY | M |

---

## Sprint sketch (≥3.0)

**Sprint 1 — progression + integrity (P0 cluster)**: A1, B1, B2, B3, C1, H3 (centralize constants).
**Sprint 2 — parity + tests**: A2, A3, A4, D1–D4.
**Sprint 3 — quality + performance**: J1, J2, J3, E1, E4, G1, G2, I1, F1.
**Backlog**: K1, K2, H1, H2, E3, L1, L2, G3, B4, B5, B6.

Tracked in: `fe-next/docs/audits/brain-drills-2026-04-26.md` (this file).
