# Word Tower — competition, biomes, physics legibility, perf (2026-08-08)

Goal (founder): *"improve graphics, ui performance, gameplay and gravity and physics
engine and ui assets that make the biomes amazing in word tower. also improve the game
competition — make it more attractive to pass other opponents and make it feel like you
are actually competing against other players."*

## Findings that set the phase order

**The rival system is dead code.** `WordTowerGame.tsx:196` renders
`<WordTowerPlay rivals={[]} …>`, and `useWordTowerRivals` (lib/wordTower/useWordTowerRivals.ts)
has **zero call sites**. Everything downstream — `WordTowerRivalRail` (ghost towers),
`WordTowerNextRivalChip` (chase target), `rivalsPassed` (pass celebration), the minimap
rival ticks, and the sabotage raid targeting — is fully built and receives an empty array.
So today the game has *no* competitive surface at all beyond a modal leaderboard.

**Even once wired, the cohort would be wrong.** `rivalsFromLeaderboard(rows, 8)` takes
`.slice(0, 8)` of a board ordered `best_height_m DESC` across all time. A player at 30 m
would be shown eight rivals at 400–900 m and a chase chip reading `+870 m`. Unreachable
rivals are not competition; they are wallpaper.

**No stakes on overtaking.** Passing a rival fires a 2-second toast and nothing else. No
rank movement, no consequence for being re-passed, no closing-rate feedback.

**No liveness.** `word_tower_progress` stores `current_height_m` + `updated_at` per player
but the leaderboard API selects neither, so a rival can never read as "climbing right now".
There is no climb *timeline* in the schema (only bests + a resume blob), so a
time-paced ghost replay is not possible from stored data — and `rivals.ts` documents
"Real leaderboard data only (no fabricated rivals)" as a deliberate decision. We do not
route around that with synthetic racers.

**Top biomes render the emptiest sky.** `towerLayout.BACKDROP` zeroes scaffold/crane/
skyline/clouds for *both* `nebula` and `galaxy`. Those are the earned reward tiers and
they lose the entire construction-rig layer with nothing taking its place.

## Phase 1 — Competition (lead)

Pure-function-first, so TDD is cheap and the WYSIWYG rules are untouched.

1. **`rivalCohort()`** (new, `lib/wordTower/rivalCohort.ts`) — replaces the global-top
   slice. Given all leaderboard rows and the viewer's own best, select a *reachable band*:
   the N records just above the viewer (chase), the M just below (defend — being re-passed
   is what makes a lead feel owned), and the board leader as a single aspirational anchor.
   Everything is real leaderboard data; only the *selection* changes.
2. **Wire it.** `WordTowerGame` calls `useWordTowerRivals`, passes the cohort down. This
   alone revives the rail, chip, ghosts, pass celebration and minimap ticks.
3. **Rank stakes.** `rankAmong()` pure fn + an overtake readout that shows the rank the
   player *moved into* (`#12 → #11`), not just a name. Rank is the thing players defend.
4. **Liveness from real data.** Leaderboard API also selects `current_height_m` +
   `updated_at`; a rival whose row moved inside a recency window is flagged `live` and the
   rail marks them. No fabrication — an idle board simply shows no live flags.

Constraints honoured: all new strings get keys in **all five** locales (client `t()` has no
en-fallback — English-only keys ship blank and trip `check:translations`). New logic lands
in **new modules**; `WordTowerPlay.tsx` (1407) and `WordTowerScene.tsx` (1200) do not grow.

## Phase 2 — Biomes

Give `nebula` and `galaxy` signature backdrop layers of their own so losing the rig reads
as *arrival*, not as absence. Zero new PNG weight (the same sentence asks for better perf) —
CSS/SVG layers driven by the existing `BIOME_THEME` palette.

## Phase 3 — Physics legibility

The return here is whether the player *reads* weight on landing, not simulation fidelity.
`towerSway`, `towerLean`, `resonance`, `tumbleArc`, `landingImpact`, `impactPunch` and
`fallProfile` all already exist — and `fallProfile` has been dead code in this module
before. **Confirm a file is wired to a live caller before editing it.** Any change to
`CARRY_FACTOR`, `MAX_DRIFT` or `fallDurationMs` must thread the same value through both
the live band preview and the scored verdict in one commit, with a test asserting they
agree (WYSIWYG invariant, documented in `dropKinematics.ts`).

## Phase 4 — Perf

Measure before refactoring. A prior audit (`low-end-device-perf-audit-2026-07-25`) already
established that root cause is JS volume / chunk count, **not** effects, and lists four
measured-and-rejected hypotheses — do not re-investigate those. The cheap local win is
verifying every `burst()` call site in the Scene actually respects `useParticleBudget` /
`useDevicePerformance`; a preset firing full particle counts on a low-end device is a real,
measurable, local fix.

## What shipped

**Phase 1 — competition.**
- `lib/wordTower/rivalCohort.ts` (new): `rivalCohort` (reachable band, backfilling when
  one side is short), `rankAmong` (ties count as ahead — never over-claim a rank),
  `rankDelta`, `isLiveRival`. 23 tests.
- `lib/wordTower/useRivalRace.ts` (new): the live race — cohort re-centred as you climb,
  live rank, and a transient rank gain. Holds the cohort's array identity while the band
  is unchanged so the ghost towers don't remount on every accepted word, and owns the
  presence clock so every consumer stays a pure function of its props. 8 tests.
- `useWordTowerRivals` now returns raw rows and refreshes on a visible-only interval;
  `WordTowerGame` actually calls it. `WordTowerPlay` takes `leaderboardRows` (one source,
  so the rail and the rank can't disagree about who is on the board).
- Rail + chase chip ungated from `!daily`. The Wrecking Ball stays gated — it writes
  shared state; the rival surfaces are read-only.
- `WordTowerRankStakes.tsx` (new): live board position + a "#12 → #11" flash on overtake.
- Live presence: the leaderboard API now returns `currentHeightM` + `updatedAt`, and the
  rail draws a second *moving* marker for rivals mid-climb. Derived from writes that
  already happen — an idle board flags nobody.
- Rank keys added to all five locales.

**Phase 1b — the flash on scroll (founder follow-up).** `onViewAltChange` now carries
`(alt, panning)` from all three call sites, and `WordTowerRivalRail`,
`WordTowerLandmarkRail` and `WordTowerParallaxProps` drop their altitude eases while the
camera is driven. The parallax props' `opacity 700ms` was the literal flicker: it
re-triggered as each prop crossed its altitude window during a fling.

Also fixed en route: the rail's pass celebration ran off `viewerHeightM` (the *camera*),
so panning down and back up re-crossed every rival and fired a fake "Passed Ann!". It now
takes `climbedHeightM`. **`viewAlt` is a camera value; `game.heightM` is a game value —
anything that celebrates, ranks or persists reads the game value, only layout reads the
camera.** All `viewAlt` consumers audited; the rest are pure layout.

**Phase 2 — biomes.** `BiomeTheme.skyFeature`: a signature volumetric sky layer, CSS
gradients only (no new asset weight). `nebula` gets drifting ion clouds, `galaxy` a
galactic dust band with an off-centre core — so the last three zones stop sharing one
"dark with stars" look. Cross-faded across the biome band like the base gradient, because
`background-image` is not animatable and a layer keyed to the hard biome switch would pop
into existence on a single frame at the threshold. 5 tests.

**Phase 3 — physics.** No change. Every module (`fallProfile`, `impactPunch`,
`landingImpact`, `tumbleArc`, `resonance`, `shaftWind`, `towerLean`, `towerSway`) was
verified to have live non-test importers, and the drop already has depth-scaled gravity,
settle-spring, momentum carry and impact. Nothing here was worth the WYSIWYG risk.

**Phase 4 — perf.** All 25 `burst()` sites in `WordTowerScene` already respect
`capParticles(…, particleBudget.max)`. The three in `WordTowerSmashScene` did not — a
perfect smash asked for ~100 particles across two presets regardless of device. Now
capped. No speculative rAF consolidation: a prior measured audit attributes low-end cost
to JS volume, not effects.

## Verification

`npm run lint && npm run test` per phase; build with `next build --webpack` and a
non-default `NEXT_BUILD_DIR` (concurrent sessions wipe `.next`). Note: pre-push may report
"Tests failed" with everything green — six Host/Player view tests throw
`EnvironmentTeardownError` through the `next/dynamic` `WordTowerVersus` chain, and it fires
when a change makes those tests finish *faster*. Fix is `vi.mock` on `WordTowerVersus` in
those six, not a retry.
