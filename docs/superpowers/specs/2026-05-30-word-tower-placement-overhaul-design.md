# Word Tower — Placement Mechanism Overhaul (Design)

**Date:** 2026-05-30
**Status:** Approved (autonomy directive — proceed to plan + implement)

## Problem (user words)
> "word tower word placement should be much better — right now it is impossible to place in the right spot, it is too fast, and even when you place you don't know if you succeeded or not. Improve the whole mechanism and the feedback. Also make the tower swing when it is not stable (which should also make it harder to place), and improve the graphics and gravity effects."

## Root-cause diagnosis
1. **Unfair motion profile.** `craneOffsetAt` uses `Math.sin()`. Velocity ∝ `cos`, **maximal at the zero-crossing = dead-center = the `perfect` band (±8%)**. The target zone is the fastest, hardest-to-time part of the sweep. Slowing `periodMs` alone doesn't fix the *feel*.
2. **Scattered feedback.** Verdict is a small pill at the crane; height-gain isn't surfaced; the landed tile doesn't confirm its own quality. No single unmistakable success/fail moment.
3. **Static lean.** `leanDeg` is fixed per recent drops, applied once to `container.angle`. There is no continuous swing, and the tower-top doesn't move under the aim — so "swing when unstable → harder to place" doesn't exist yet.

## Solution overview — 3 layered parts (sequenced)
Ship **Part 1 first** (placeability + feedback — the literal complaint), verify it feels fair, then layer **Part 2** (sway) and **Part 3** (graphics/gravity) as separately-tunable enhancements.

---

### Part 1 — Placeable + unmistakable feedback
**1a. Constant-velocity sweep (the core fix).** New pure module `craneSweep.ts`:
- `craneOffsetAt(elapsedMs, periodMs)` → **triangle/ping-pong wave** (linear position, uniform speed) replacing the sine. Every horizontal position is equally hard to time; the `perfect` band gets *more* honest dwell than sine without becoming a gimme. (We keep `craneOffsetAt` exported from `cranePlacement.ts` as a thin re-export so existing imports/tests don't break, but the body moves to `craneSweep.ts`.)
- `sweepPeriodMs(towerHeightFloors)` → starts **slow** (~2600 ms) and ramps **faster** with height (floor by floor, clamped to a floor like ~1400 ms). Escalating challenge replaces a flat 1800 ms. Reduced-motion path unaffected (see constraints).

**1b. Static target reticle (WYSIWYG anchor).** A fixed center "gate" indicator on the tower top showing exactly where `perfect` is — independent of the moving beam. The existing band-tinted landing shadow stays (shows where the beam *is*); the reticle shows where it *should* be. The two converging is the readable skill cue.

**1c. Unmistakable verdict.** New pure module `dropVerdict.ts` → maps `PlacementOutcome` to display props: big label (`PERFECT! / NICE / SLOPPY / MISSED`), band color, and `+Nm` height-gained string. `WordTowerPlay` renders a large screen-anchored verdict pop on every drop (scale-pop + color), and the **landed tile flashes its quality color**. Sounds/haptics already exist — keep, align to new labels.

---

### Part 2 — Tower sway when unstable (fair-hard)
New pure module `towerSway.ts`:
- `swayAmplitudeDeg(instability)` and `swayAt(elapsedMs, instability)` → continuous oscillation angle. `instability` derived from `consecutiveSloppy` / lean magnitude. Zero when stable → **no sway in normal play** (no dual-moving-target).
- **Couples into placement:** at drop, the sway's instantaneous horizontal contribution at the tower top is added to the effective error fed to `evaluatePlacement`. A swaying top genuinely moves the target → harder.
- **WYSIWYG hard constraint:** the landing shadow + reticle **track the sway** so the player always sees the true landing point. Fair-hard, never unfair-hard.
- Clutch save zeroes sway (lean → 0), as today.

### Part 3 — Graphics + gravity polish
New pure module `fallProfile.ts`:
- Gravity **ease-in** fall curve (accelerating, not linear), squash/overshoot params scaled by fall depth.
- Impact: bigger squash + **settle spring** (overshoot then rest), **dust/debris** particle burst scaled to impact, screen-shake scaled to fall depth (existing `engine.shake`).
- Topple: dramatic collapse with debris (reuse existing hazard FX, intensify).
- Sway visual: whole-tower pivot-at-base oscillation (top sways most).

---

## Architecture / new pure modules (all TDD)
| Module | Purpose |
|---|---|
| `lib/wordTower/craneSweep.ts` | Triangle sweep `craneOffsetAt`; height-ramped `sweepPeriodMs` |
| `lib/wordTower/towerSway.ts` | Instability → sway amplitude + `swayAt(t)`; horizontal top-offset for coupling |
| `lib/wordTower/dropVerdict.ts` | `PlacementOutcome` → verdict label key + color + `+Nm` string |
| `lib/wordTower/fallProfile.ts` | Gravity ease-in curve + depth-scaled squash/shake/debris params |

Component wiring: `WordTowerCrane.tsx` (sweep + reticle + verdict trigger), `WordTowerScene.tsx` / `TowerCanvasLayer.tsx` (sway animation, gravity easing, debris), `WordTowerPlay.tsx` (verdict pop, sway→eval coupling via `useCraneDrop`).

## Constraints (baked in)
- **reduced-motion:** sweep effect currently `return`s early on `reducedMotion` (beam stays at 0). Confirm how a drop resolves in that mode *before* changing the profile; sway + gravity-easing must respect `reducedMotion` (no oscillation, instant settle).
- **Brink reachability regression:** prior advisor catch — lean gate was unreachable (`sloppy` capped lean ≤2.4° < 3.2° threshold). New bands + sway can re-break clutch/topple calibration. Add a test asserting brink/topple thresholds stay reachable under the new numbers.
- **i18n:** new verdict labels need `t()` keys ×5 langs (en/he/sv/ja/es).
- **daily-seed determinism:** time-based sway means two players on the same daily seed face different sway phases. Accepted — it's reaction skill, not RNG. Noted consciously.
- **RTL:** sweep, reticle, sway, verdict must work mirrored in Hebrew.
- **YAGNI:** keep the single timing mechanic. No drag-to-aim fork (changes game identity).

## Verification
Unit tests for all 4 pure modules + brink-reachability test. Then **play it** (Playwriter, CDP cache-disable for stale dev chunks): LTR + Hebrew RTL, reduced-motion on/off, confirm placeable + fair + readable feedback before tuning sway against the new baseline. `npm run lint && test && build`.
