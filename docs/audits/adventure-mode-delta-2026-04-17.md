# Adventure Mode Delta Audit — 2026-04-17

Baseline: [adventure-mode-audit-2026-04-04.md](./adventure-mode-audit-2026-04-04.md) (11 CRIT / 25 HIGH / 40 MED / 24 LOW).
Method: spot-check CRITICAL/HIGH items against current source + git log since 2026-04-04.

## Summary

- 13 days elapsed. Notable fix cadence on architecture + wiring, minimal movement on a11y/i18n and file-size rule.
- 10 CRITICAL verified FIXED (UX-C1/C2/C3/C4 + GD-C1/C2 + EN-C2 + PF-C1 + EN-H6 + UX-C5 false-positive), 1 OPEN (EN-C1), 1 still needs deeper check (GD-C3).
- New architectural drift: 5 components + 4 hooks now exceed the 500-line cap.

## CRITICAL — Delta

| # | Status | Evidence |
|---|--------|----------|
| GD-C1 Boss HP one-shot | ✅ FIXED | HP bumped 5× (`bossConfig.ts:95-98`, W1=150, W10=1750) AND damage scaled: `useAdventureWordSubmit.ts:228` computes `baseDamage = max(1, ceil(scoreValue / 3))` then applies skill + mechanic multipliers before `dealBossDamage`. A 60-pt word on W1 → ~20 dmg (2× w/ mechanic = 40), far under 150 HP. Prior audit misread `useAdventureBossNew.dealDamage(score)` as raw — caller pre-scales. |
| GD-C2 W10 `phaseOrder` dead code | ✅ FIXED | `useBossMechanics.ts:427,437,439,571-578` consumes `phaseOrder` with rotation logic + tests in `useBossMechanics.finalWord.test.ts`. |
| GD-C3 XP curve unreachable | ⚠️ PARTIAL | `xpManager.getXpForLevel` (`backend/modules/xpManager.ts:234-250`) now TIERED: L1-25 exp=1.4, L26-50 exp=1.45, L51-75 exp=1.5, L76+ exp=1.55. L30 ≈ 16.1K XP (was ~22K). Still gated by `getDiminishingReturnsFactor` (0.85× at L26-50, 0.70× at L51-75) + daily cap (1500/3000/∞ at 100%/50%/25%). Reachability depends on session cadence; needs analytics, not code fix. |
| UX-C1 hardcoded "Loading adventure…" | ✅ FIXED | now `t('loading')` key present in `translations/en.js:6593` and 4 other locales. |
| UX-C2 back-btn aria | ✅ FIXED | `AdventureViewHeader.tsx:43,47` — `aria-label={t('common.back')}`. |
| UX-C3 error emoji aria | ✅ FIXED (this session) | `AdventureView.tsx:324,372` — `🗺️`, `🔑` spans now `aria-hidden="true"`; adjacent `<p>` with `t(...)` carries the semantic. |
| UX-C4 currency aria hardcodes "gold" | ✅ FIXED | `CurrencyDisplay.tsx:82,89` — `t('adventure.currency.goldAmount')`. |
| UX-C5 AdventureHub framer-motion w/o reduced-motion | ✅ FALSE POSITIVE | `AdventureHub` uses `AdaptiveMotion` wrapper (`components/motion/AdaptiveMotion.tsx:32-38,86-94`) which internally calls `useShouldReduceMotion()` (`contexts/AccessibilityContext.tsx:214-224`, reads `prefers-reduced-motion` media query + a11y setting) and renders static elements when true. No per-component hook needed. |
| EN-C1 Push notifications for streak grace | ❌ OPEN | no service-worker push wiring found in adventure surfaces. |
| EN-C2 Ghost Rival not wired | ✅ FIXED | `useGhostRival`, `ghostRivalSync`, `GhostRivalWidget`, `/api/ghost-rival`, imports in `AdventureHub.tsx` + `LandingView.tsx` + `AnonymousTeaserWidgets.tsx`. |
| PF-C1 Hint `setTimeout` leak | ✅ FIXED | `AdventureGame.tsx:318-319` uses `hintTimerRef` + unmount cleanup effect. |

## HIGH / MED — Spot-checks

| # | Status | Evidence |
|---|--------|----------|
| UX-H6 `toLocaleString('en-US')` hardcoded locale | ✅ FIXED (this session) | `RollingNumber.tsx` now uses `useLanguageSafe()`; `AdventureHUD.tsx` uses `useLanguage().language`. Test mock in `GameHeader.theme.test.tsx:44` remains (test-only cosmetic). |
| RTL — physical `left/right/ml/mr/pl/pr` leaks in adventure/ | ✅ PARTIAL (this session) | Converted to logical utilities: `BossHPBar.tsx:96,205` (HP fills → `start-0`), `BossHPBar.tsx:248` (damage number → `end-2`), `ObjectiveProgress.tsx:207` (progress fill → `start-0`), `ThemedTile.tsx:191,329` (tile badge/icon → `-end-1`/`end-0.5`), `MechanicIndicator.tsx:49` (`ms-auto`), `AdventureShopFAB.tsx:43` (`ps-`/`pe-`), `AdventureToast.tsx:73` (`me-1` + `aria-hidden`), `LevelGridHeader.tsx:180` (`inset-x-0`), `AdventureGame.tsx:912` (RuneBar fixed overlay → `inset-x-0`), `PlayerHealthBar.tsx:156` (player HP fill → `start-0`), `AdventureHUD.tsx:141` (bottom bar → `inset-x-0`), `AdventureHUD.tsx:188` (**real RTL bug** — floating `+score` used `right-0` but parent `items-end` flips anchor in RTL, so the gain number detached from the score pill in Hebrew; → `end-0`). Remaining physical usages audited: decorative god-rays (`LevelGrid.tsx:188,243`), symmetric corner glows (`BossDefeatShareCard.tsx:249-250`), mascot anchor (`BossIntro.tsx:116`), 4-corner decor map (`BoardFrame.tsx:62-65`), centering trick `left-1/2 -translate-x-1/2` (`PowerUpBar.tsx:287`, `CurrencyDisplay.tsx:116`) — all atmospheric scenery or symmetric anchors; left physical. Tests: 59/59 HUD + 19/19 PlayerHealthBar suites green. |
| EN-H6 Ascension gate not wired | ✅ FIXED | `AdventureHub.tsx:61,112,118,167` imports `getAscensionLevel`, uses `ascensionLevel`. |
| Arch-H "File > 500 lines" rule | ❌ REGRESSED | See below. |

## NEW — Architectural Drift (not in prior audit)

Project rule: ≤ 500 lines per file (CLAUDE.md). Violations today:

| File | Lines | Notes |
|------|-------|-------|
| `components/adventure/AdventureGame.tsx` | 923 | 85% over cap; orchestrator god-component |
| `components/adventure/WorldMap.tsx` | 658 | map + render + animation concerns |
| `components/adventure/AdventureView.tsx` | 633 | view shell |
| `components/adventure/AdventureHub.tsx` | 578 | now also owns ascension/ghost-rival wiring |
| `components/adventure/AdventureGrid.tsx` | 499 | at limit |
| `hooks/useAdventureMusic.ts` | 561 | music state machine — split candidate |
| `hooks/useAdventureBossNew.ts` | 456 | already partially extracted (`useBossMechanics`, `useBossAbilities`) |
| `hooks/useAdventureHints.ts` | 445 | approaching limit |

Recommend extract targets for `AdventureGame.tsx`:
- hint orchestration → `useHintOrchestration`
- level-complete side-effects (xp/loot/quest) → `useLevelCompleteEffects`
- power-up activation dispatch → `usePowerUpDispatch`

## Priority Action List (CONSOLIDATED — post-delta + this session)

### Closed this session
- ✅ GD-C1 boss HP math — confirmed scaled (`baseDamage = ceil(scoreValue/3)`).
- ✅ UX-H6 locale leak — `RollingNumber`, `AdventureHUD` now use `useLanguage` + TDD test.
- ✅ UX-C5 reduced-motion — false positive (`AdaptiveMotion` centralizes).
- ✅ UX-C3 error emoji a11y — spans now `aria-hidden="true"` (`AdventureView.tsx:324,372`).
- ✅ UX-N1 `SkillUnlockModal` a11y — `role=dialog`/`aria-modal`/`aria-labelledby`/`useFocusTrap` + 4 TDD tests.
- ✅ UX-N2 `NextLevelPreview` dismiss target — 44×44 AAA (`min-h-11 min-w-11`).
- ✅ UX-N3 `SkillUnlockModal` deprecated palette — `utility` + `power` paths migrated to `neo-lime`/`neo-cyan` + `neo-red`/`neo-pink`.
- ✅ PF-M1 `init` effect-dep narrowing — `AdventureGame.tsx:498,522,527` now depend on `init.checkMilestone` / `init.startAIDirector` / `init.upgradeEffects.freeStartHint` instead of full `init` identity.
- ✅ GD-N2 boss-damage ceil stacking — `useAdventureWordSubmit.ts:228-235` now `Math.max(1, Math.ceil(rawBase * bossMult * longMult))` (one round, was three). TDD RED with `score=5, boss×1.3, long×1.2` expected dmg=3 got 4; GREEN after consolidation. Full adventure suite 1455/1455.
- ✅ Test-mock regression from UX-H6 — `LevelCompleteModal.test.tsx` mock of `LanguageContext` now also exports `useLanguageSafe` (required by `RollingNumber` via `LevelCompleteContent`).
- ✅ RTL physical-axis leaks — 11 components migrated to logical utilities; 1 real bug (`AdventureHUD` floating +score).

### Open — priority order
1. **GD-N1 XP tier-boundary walls** — `backend/modules/xpManager.ts:234-250`. Δ ratios 4.4× / 8.8× / 13.5× at L26 / L51 / L76. Fix: C⁰-continuous piecewise anchor (`xp(L) = xp(tierStart) + k·(L − tierStart + base)^exp`). Add test asserting tier-boundary Δ ≤ 2× of prior step. **Blocker:** retroactively changes every player's level — requires product call on save migration. (HIGH, 1d w/ migration plan)
2. **EN-C1 streak push notifications** — web-push subscription + cron at streak T-6h. No service-worker push wiring found in adventure surfaces. (CRIT, 1d greenfield)
3. **GD-C3 XP reachability re-measure** — supersede by GD-N1 fix, then re-run analytics on 100%-completion → L30+ reachability. (CRIT→downgrade pending GD-N1, 4h analytics)
4. **Arch-H split `AdventureGame.tsx` (923 → ≤500)** — TDD-extract `useHintOrchestration`, `useLevelCompleteEffects`, `usePowerUpDispatch`, `useAdventureTimerReport`. (HIGH, 4h)
5. **Arch split `WorldMap.tsx` (658)**, `AdventureView.tsx` (633), `AdventureHub.tsx` (578), `useAdventureMusic.ts` (561). (LOW, 1d total)

## Performance — Spot-checks (AdventureGame.tsx)

Full read 1–923. Findings:

| Concern | Location | Severity | Notes |
|---|---|---|---|
| `init` object used as full `useEffect` dep | `AdventureGame.tsx:498` | MED | eslint-disable present; only `init.checkMilestone` called in body. `init` identity churns on every parent hook result → effect fires far more than needed. Narrow dep to `[gameState.comboCount, isPlaying, entryPhase, isPaused, init.checkMilestone]`. |
| `init` full-object dep (repeat) | `AdventureGame.tsx:522,527` | LOW | `handleCascadeComplete` / `handleEntryPhaseComplete` re-memoize whenever `init` identity flips. Same narrow-dep remedy. |
| `isModalOpen` not memoized | `AdventureGame.tsx:405` | LOW | 5-way OR on booleans, cheap — skip. |
| Coarsening of `timeRemaining` to `lexiGameState` | `AdventureGame.tsx` (pre-405) | ✅ GOOD | `coarseTimeRemaining = timeRemaining <= 10 ? timeRemaining : 11` — prevents per-second render churn outside final-10s. Document as pattern. |
| `useMemoizedFlatTiles(tiles2D, tilesVersion)` | — | ✅ GOOD | Version-int shortcut avoids deep compare. Intentional. |
| Orchestrator calls 20+ hooks | whole file | HIGH | Still the 923→≤500 split candidate. Concrete extract targets re-confirmed below. |
| Fixed overlay physical `left-0 right-0` | `AdventureGame.tsx:912` | ✅ FIXED (this session) | → `inset-x-0`. |

Recommended extractions (post-audit, TDD):
- `useHintOrchestration` (hintTimerRef, `getHint`, `handleHintClick`, `nextHintCost`, `hintGoldPending`, auto-hint)
- `useLevelCompleteEffects` (`showLootOrComplete`, `handleContinue`, `handleRetry`, `handleCinematicComplete`, xp/loot/quest glue)
- `usePowerUpDispatch` (freeze, shuffle, detonate toggles)
- `useAdventureTimerReport` (the lines 480–490 significant-change reporter)

## Game Design — Spot-checks (this session)

| # | Severity | Location | Finding |
|---|----------|----------|---------|
| GD-N1 | **HIGH** (gameplay) | `backend/modules/xpManager.ts:234-250` | **XP curve tier boundaries are discontinuous.** `getXpForLevel(L) = 100 × L^exp` with piecewise exp (1.4 / 1.45 / 1.5 / 1.55) is *not* anchored — changing the exponent without offsetting the base creates visible walls at L25→L26 (Δ 504 → 2,204 XP = **4.4×**), L50→L51 (Δ 839 → 7,347 XP = **8.8×**), L75→L76 (Δ 1,295 → 17,322 XP = **13.5×**). Players feel a ceiling exactly at the "gentler mid-game" boundary the segmentation was designed to smooth. Fix: anchor each tier to the previous total, e.g. `xp(L) = xp(tierStart) + k × (L - tierStart + base)^exp` chosen for C⁰ continuity. Add test asserting `Δ(L,L+1)` at tier boundaries ≤ 2× of `Δ(L-1,L)`. |
| GD-N2 | ✅ FIXED (this session) | `components/adventure/hooks/useAdventureWordSubmit.ts:228-235` | **Stacked `Math.ceil` inflates boss damage.** `ceil(ceil(ceil(score/3) × bossMult) × lengthMult) × mechanicMult` — each ceil adds up to +1 dmg. Minor baseline (3 calls → up to +3 dmg/word). Prior delta audit's W1 math (60pt → ~20–40 dmg) underestimated: mechResult.scoreMultiplier already multiplies `scoreValue` at line 226, so a phase-3 taunted 60pt word at 2× mech = ~80 dmg → 2-hit on W1's 150 HP. Not broken, but boss length is sensitive to combo luck. |
| GD-N3 | LOW (telemetry) | GD-C3 XP curve reachability | Previously marked PARTIAL pending analytics. GD-N1 finding supersedes: curve is not just "maybe unreachable" — it has explicit **walls** that will stall retention at L26/51/76. Recommend fixing GD-N1 first, then re-measure reachability. |

## UX/UI — Spot-checks (this session)

| # | Severity | Location | Finding | Status |
|---|----------|----------|---------|--------|
| UX-N1 | HIGH a11y | `SkillTree/SkillUnlockModal.tsx` | Modal lacked `role="dialog"`, `aria-modal`, focus-trap, `aria-labelledby`. Sibling modals (`RetryAssistModal`, `LevelCompleteModal`, `BossVictory`, `BossIntro`, `PauseOverlay`, `AdventureLevelUpModal`, `AdventureViewModals`) all had it — single-component gap. | ✅ FIXED (this session) — added `useFocusTrap(dialogRef, !!skill, onClose)`, `role="dialog"`, `aria-modal="true"`, `aria-labelledby={titleId}` via `useId`. New TDD test `SkillUnlockModal.a11y.test.tsx` (4/4 green). |
| UX-N2 | MED a11y | `NextLevelPreview.tsx:68` | "Later" dismiss button uses only `text-xs text-neo-white/40`, no padding → sub-WCAG target size (2.5.5 Target Size AA = 24×24, AAA = 44×44). Adjacent Play button is `px-4 py-2`. | ✅ FIXED (this session) — `px-3 py-2 min-h-11 min-w-11` for AAA-compliant 44×44 target. |
| UX-N3 | LOW style-debt | `SkillTree/SkillUnlockModal.tsx:41-43` | `utility` path uses `neo-yellow`/`neo-orange` — flagged **deprecated** in `.claude/docs/design-system.md`. | ❌ OPEN — migrate to `neo-lime`/`neo-cyan` or design-token equivalent. |
| UX-N4 | INFO | `components/adventure/**` attr-strings scan | Regex `(aria-label|placeholder|title)="[A-Z][a-z]` and `>[A-Z][a-z]+… </tag>` → no production hits (test-mock strings only). | ✅ CLEAN |
| UX-N5 | INFO | Modal a11y audit | 8/9 adventure modals have `role="dialog"` + `aria-modal="true"` + `useFocusTrap`. Post UX-N1 fix: 9/9. | ✅ CLEAN |

## Fix Velocity

9/11 CRITICAL verified closed (incl. 1 false-positive) in 13 days = 82%. Remaining: GD-C3 (XP curve), EN-C1 (push). UX-C3 (error emoji a11y) low-severity recheck.
