# Word Tower v2 — real physics, fewer rules

Date: 2026-08-29
Branch: `feat/word-tower-v2`
Status: in progress

## Why v1 feels wrong

v1 has **no physics**. It has a classifier and a counter:

- `lib/wordTower/cranePlacement.ts` buckets a drop into `perfect | good | sloppy | miss` from a scalar offset.
- `components/wordTower/useCraneDrop.ts:117` topples the tower after **3 consecutive sloppy** drops.
- `lib/wordTower/towerSway.ts` leans the whole tower for drama. It is decorative — it never affects legality.

So the tower looks stable, then dies on a hidden counter. The player cannot see the failure coming, because the thing being rendered is not the thing being simulated.

## v2 thesis

One change fixes the physics goal and the "less constraint" goal at once: **delete the classifier and the counter, and let rigid bodies decide.** A tower falls when its centre of mass leaves its support polygon — which is visible for the entire time the player is building toward it.

## Stack (ladder: use what is installed)

| Need | Choice | Why |
|---|---|---|
| Physics | `matter-js@0.20.0` | Already in `package.json`, imported by **nothing**. Pure JS, deterministic at fixed dt, trivially enough for ≤60 bodies. No wasm/Next config fight. |
| Render | `pixi.js@8.17.1` | Already used by v1's scene. WebGL, batches sprites. |
| Loop | hand-rolled fixed-timestep accumulator | See below. |

No new dependencies.

## Fixed timestep is load-bearing

Physics runs at a fixed `1000/120` ms step driven by an accumulator; render interpolates between the last two physics states.

This is not a style preference — it is what makes three separate requirements satisfiable simultaneously:

1. **Deterministic** → the engine is unit-testable → the repo's zero-exception TDD rule is actually satisfiable for a physics game.
2. **Identical feel across devices** → "60fps on a mid-tier phone" is a meaningful target rather than a device-dependent accident.
3. **Replayable** → seeded runs reproduce exactly, which the daily challenge and share-replay already depend on.

`body.y += v * dt` off a raw rAF delta loses all three, silently.

## Constraints: what goes, what stays

Removed (placement):
- topple-after-3-consecutive-sloppy counter
- drop-quality classification (`perfect/good/sloppy/miss`)
- offset snapping to a computed floor x-position
- decorative global lean

Kept (words — this is still a word game):
- word must be in the dictionary
- word must be buildable from the wheel
- no duplicate words in a run
- min length 3

Physics decides **where a block lands and whether the tower survives**. The dictionary still decides **whether a word scores**. Nobody deletes validation in the name of freedom.

## Feel targets (numeric — these are the bar for motion)

Motion cannot be judged from a screenshot. These numbers are the bar instead:

| Property | Target | Rationale |
|---|---|---|
| Release → first contact | 380–520 ms | Tower Bloxx drop weight; under 300ms reads as teleport |
| Settle to rest after contact | ≤ 700 ms | Suika: fast enough not to stall the loop |
| Residual sway amplitude at rest | ≤ 0.4° | anything more reads as jitter, not life |
| Collapse duration (topple → floor) | 900–1600 ms | long enough to watch, short enough to retry |
| Physics substeps per frame @60fps | 2 | 120Hz sim |
| Frame time p95 @ 4x CPU throttle | ≤ 16.6 ms | the mid-tier-phone proxy we can actually measure |
| Bodies at 40 floors | ≤ 60 | sleep settled bodies below the camera |

## File plan (500-line repo cap; decompose up front)

```
lib/wordTowerV2/
  engine.ts       fixed-timestep world: create / spawn / step / snapshot
  crane.ts        pendulum kinematics — pure math, no Matter import
  scoring.ts      measured height -> score
  types.ts
components/wordTowerV2/
  TowerCanvas.tsx Pixi renderer, interpolated
  WordTowerV2.tsx orchestrator + word input
```

## Measurement method

Verify on a **production build** (`npm run build --webpack` + `npm start` — not the dev server, which in this repo renders without hydrating, and not `next start`, which omits Socket.IO). Frame time p95 from an in-page rAF sampler logged to console; CPU 4x throttled in DevTools as the mid-tier-phone proxy.

## Integration points v2 must not break

- `/[locale]/word-tower` and `/[locale]/daily/word-tower` routes
- `LandingChallengeCards` cube `data-cube-key="wordTower"`
- `POST /api/word-tower/daily/score` — submits **climb delta**, not cumulative
- `trackGameStart()` / `trackGameEnd()`

Known v1 bug not to port: a run that ends must report `completed: true`, or it is gated out of `incrementGamesPlayed` / `markFirstGameActivation` and the whole mode goes invisible to activation metrics again.
