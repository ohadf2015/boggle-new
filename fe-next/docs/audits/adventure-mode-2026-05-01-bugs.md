# Adventure Mode — Bugs & Broken Flows Audit

**Date:** 2026-05-01
**Auditor:** feature-dev:code-reviewer (subagent), consolidated by main thread
**Scope:** `fe-next/{app/[locale]/adventure,app/api/adventure,components/adventure,lib/adventure,hooks/adventure*,types/adventure}`
**Status:** read-only — no code edits performed

> All findings cite file:line. Per repo memory, agent file-claims have ~40% false-positive rate; verify each before implementing fix.

## Severity counts

- Critical: 3
- High: 3
- Medium: 0
- Low: 0

---

## CRITICAL

### C1 — Server-Trust Score Inflation via sendBeacon Fallback
- **File:Line:** `fe-next/components/adventure/hooks/useAdventureLevelCompletion.ts:404-424`
- **Problem:** When the primary fetch to `/api/adventure/complete` is in-flight and the user navigates away, a `beforeunload` handler sends a `sendBeacon` fallback request (line 420) using `earnedGoldRef.current` (line 413). The fallback request is treated as a fresh completion. There is no server-side check that `earnedGold` matches a server-recomputed value.
- **Repro:**
  1. In console: `earnedGoldRef.current = 999999`
  2. Pause/throttle the fetch before it completes
  3. Close tab → sendBeacon delivers unvalidated gold
- **Fix-direction:** server recomputes gold from `(stars, world, level, words)` and ignores any client `earnedGold` field — applies to both fetch and beacon endpoints. Reject submissions where `earnedGold > maxAllowed(stars, world, …)`.

### C2 — Flash Challenge Gold Awarded Without Proof
- **File:Line:** `fe-next/app/api/adventure/complete/route.ts:195-196`
- **Problem:** `flashChallengeCompleted` is read directly from client payload. Server only checks `validation.data.flashChallengeCompleted === true && validatedWordsFound.length > 0`; it never verifies the player matched the challenge criteria, was inside the challenge window, or that the challenge was active for that world/level.
- **Repro:** intercept request, set `flashChallengeCompleted: true` with any single valid word. Bonus gold awarded.
- **Fix-direction:** load active flash-challenge config server-side for `(world, level, dateBucket)`; verify `wordsFound` actually satisfy the criteria (length, prefix, letter pool). Reject mismatched claims.

### C3 — Retry Score Retention Not Validated Server-Side
- **File:Line:** `fe-next/hooks/useAdventureGame.ts:256-266` + `fe-next/app/api/adventure/complete/route.ts:88-92`
- **Problem:** `retainedScore` is folded into `gameState.score` client-side (Salvage Claw flow). The complete endpoint accepts the merged score with no upper bound and no diff against the previous attempt: `void _retainedScore;` at line 89. Attacker submits arbitrary `score`.
- **Repro:** Complete level with score S. Retry: intercept request, submit `score: S + 99999`. Server awards XP + gold for inflated total.
- **Fix-direction:** server reads previous best for `(user, world, level)`. Validate `submittedScore - previousBestScore ≤ maxRetryDelta(world)`; reject when submitted score < previous best. Persist a server-side "retainedFromAttemptId" instead of trusting client merge.

---

## HIGH

### H1 — Boss Phase-Change Double-Fire Race
- **File:Line:** `fe-next/components/adventure/hooks/useAdventureBossOrchestration.ts:166-176, 179-191`
- **Problem:** Two independent triggers both call `bossMechanics.advancePhase()`:
  1. HP-phase-change effect (line 174)
  2. Timed rotation interval for World 10 finalWord (line 187)
- The 2-second guard (`Date.now() - lastPhaseAdvanceRef.current < 2000`, line 186) is a leaky lock — the interval can still fire just after the effect's grace window expires while the first phase change is still settling, producing two phase advances.
- **Repro:** W10 finalWord boss, 15s rotation. Damage to phase boundary at t≈13.9s → effect advances; at t=15.0s the interval fires (1.1s elapsed, guard passes) → advances again. Phase index off by one.
- **Fix-direction:** lock by phase index, not by timestamp: `if (lastPhaseIndex === bossMechanics.currentPhase) return;`. Better: collapse the timed rotation into `bossMechanics` so a single source-of-truth emits one event per transition.

### H2 — Unstable Combo-Timeout Closure
- **File:Line:** `fe-next/hooks/useAdventureGame.ts:220-232`
- **Problem:** `effectiveComboTimeout` is captured into the closure of `submitWordWithPath`. If `comboDecayMultiplier` changes mid-session (skill-tree unlock, weekly modifier swap, rune re-equip), the stale value persists until the closure re-creates.
- **Repro:** Cargo Bay T1 (mult 0.7) → timeout ≈ 4286ms. Mid-level upgrade to T2 (mult 0.5). Next submission still uses 4286ms.
- **Fix-direction:** read `comboDecayMultiplierRef.current` at timeout-fire time inside `submitWordWithPath`, or recompute timeout from a ref.

### H3 — Stale `earnedGoldRef` in Level-Completion Promise
- **File:Line:** `fe-next/components/adventure/hooks/useAdventureLevelCompletion.ts:355-372`
- **Problem:** `earnedGoldRef.current` is written once when the reward effect first runs (line 217). If the effect re-runs (dependency change, re-mount, retry) the `earnedGold` state updates but the ref is never re-synced. The Promise closure and the sendBeacon fallback (line 413) then use the stale value. The ref is also never cleared after resolution, so retries inherit the previous level's gold.
- **Repro:** Complete level, ref=50, navigate away mid-flight, return, retry — sendBeacon may fire with the prior 50.
- **Fix-direction:** add `useEffect(() => { earnedGoldRef.current = earnedGold; }, [earnedGold]);` and reset on level change. Better: drop the ref and read state at fire-time.

---

## Upgrade Wiring Verification (regression check vs prior audit)

Prior 2026-04-02 audit listed these as unwired. **Re-verified 2026-05-01: all wired.**

| Upgrade ID | Status | Citation |
|---|---|---|
| `iceTileReduction` | wired | `hooks/useUpgradeEffects.ts:143` → `adventureGameReducer.ts:276` |
| `bombTimerInvert` | wired | `useUpgradeEffects.ts:144` → `adventureGameReducer.ts:268-271` |
| `shuffleUsesPerLevel` | wired | `useUpgradeEffects.ts:149` → `useShuffle` hook |
| `guaranteedGoldTile` | wired | `useUpgradeEffects.ts:139` → `applyGemDetectorBoost`, `AdventureGame.ts:90` |
| `bonusHintsPerLevel` | wired | `useUpgradeEffects.ts:134` → `useAdventureHints` (`AdventureGame.ts:293`) |
| `retryScoreRetention` | wired | `useUpgradeEffects.ts:123` (retry-score path; **server-validation gap = C3**) |
| `comboDecayMultiplier` | wired | `useUpgradeEffects.ts:117` → `useAdventureGame.ts:220` (**closure gap = H2**) |
| `specialTileBoost` | wired | `useUpgradeEffects.ts:138` → `applyGemDetectorBoost` |
| `timeFreezeSeconds` | wired | `useUpgradeEffects.ts:154` → `activateFreeze` |
| `freezeHighlightsWord` | wired | `useUpgradeEffects.ts:155` → freeze UI logic |
| `canDetonateWords` | wired | `useUpgradeEffects.ts:150` → detonation UI / reducer |

**Conclusion:** persistent unwired-upgrade backlog from prior audits is closed.

---

## Suggested Sprint Phasing

1. **Server-trust hardening (C1 + C2 + C3)** — single PR, single migration if a `level_completion_attempts` audit table is needed. Invariant: server recomputes gold/xp from authoritative inputs; client values informational only.
2. **Boss-phase lock (H1)** — small, isolated.
3. **Combo + ref stability (H2 + H3)** — single hook-stability PR.

**Estimate:** 2 sprints (1 server validation, 1 hook stability).
