# Word Tower — TowerBloxx pass (layout, graphics, gameplay simplification)

**Date:** 2026-08-07 · **Status:** spec → implement (autonomy directive, commit per phase)

## Founder ask (verbatim)
> "improve and refactor word tower fix layout, improve graphics and make it fun and work
> well. improve the gameplay, research online how to make it work well and fun, simplify
> gameplay and take ideas from towerbloxx to make it fun and exciting"

## Research (external)

Tower Bloxx (Digital Chocolate) — the reference the founder named:

- **One-button core.** A floor hangs from a swinging crane; a single tap releases it.
  The designers spent *three weeks* of a senior designer + programmer iterating the
  physics "feel" alone. The block-drop is the whole game; everything else extends it.
- **Alignment is visible and cumulative.** "Better alignment allows the tower to grow
  higher and remain more stable, while poorly placed floors make the tower sway more."
  The tower you built is *legible as a record of your drops* — wonky towers look wonky.
- **Difficulty emerges from the player's own mistakes**, not from a curve: a lopsided
  tower sways more, and a moving target is harder to hit.
- **A combo for dead-centre drops** carries the score.
- **Immediate gratification**: "the screen rumbled when you dropped a block."
- **The meta-game is what retains.** Without the city-building layer, playtesters asked
  "what else is there?" after ten minutes.

Juice literature (game-feel): scale the feedback to the event (a pistol ≠ a rocket),
respond instantly, over-communicate the outcome, then let it settle fast.

Sources: [Tower Bloxx postmortem (Game Developer)](https://www.gamedeveloper.com/design/postmortem-digital-chocolate-s-i-tower-bloxx-i-) ·
[Tower Bloxx Deluxe review (JayIsGames)](https://jayisgames.com/review/tower-bloxx-deluxe.php) ·
[Tower Bloxx (Wikipedia)](https://en.wikipedia.org/wiki/Tower_Bloxx) ·
[Juice / game feel](https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design)

## Diagnosis (measured in the running game + code)

Live playthrough at 390×844 (`/en/word-tower`, dev): spell → the word auto-hoists onto
the crane → the deck becomes one giant DROP button → tap → floor lands.

1. **The tower is not a tower.** Each word renders as a *vertical column of one-letter
   tiles* (`lib/wordTower/towerColumn.ts` `buildTowerColumn`). A 4-letter word is a
   4-tile-tall, 1-tile-wide spire. This model is a leftover of the **retired Shiritori
   chain** (`wordTowerManager.ts` `validateTowerWord`: "Chain retired"; `anchorLetter`
   is hard-coded `''` in init/restore) — the connector-blend logic it exists to serve no
   longer has a mechanic behind it. Meanwhile `courseTileLayout` in `towerLayout.ts`
   already lays a word out as a **horizontal course** and is **dead code — zero callers**.
2. **Drop accuracy is invisible.** `WordTowerScene.tsx:389` pins every tile at
   `tile.x = centerX`. The signed error only feeds `towerLean` (whole-tower tilt), so a
   sloppy run produces a *perfectly straight column that leans*, never an overhang. The
   Tower Bloxx feedback loop — your tower is the record of your drops — is absent.
   `evaluatePlacement` computes `overlap` and nothing consumes it geometrically.
3. **Celebration storm.** The FIRST word of a fresh tower fired three stacked banners at
   once (NEW DAILY BEST + "+32 NICE HAUL" + ACHIEVEMENT First Floor) plus full-screen
   confetti, covering the play field. Two prior commits are already titled "declutter
   HUD" — deleting banners one at a time has not held.
4. **Layout.** Build line at `0.5H` but the deck occupies ~45% of a 390×844 screen, so
   the base/landing zone hides behind it; the upper half is empty sky. The install
   promo ("GET THE APP") floats *inside* the play field over the crane. A grey altitude
   shaft on the right edge is clipped by that promo.
5. **Dead systems still wired into the daily play screen**: rivals, sabotage bay, versus,
   wreck minigame, minimap, `resonance` (imported, output unused). Daily is the only
   live mode (endless retired 2026-07-17).
6. **Unreadable scoring.** Height = base × word-length × combo × placement × word-mult ×
   perk × upgrade × mutator. Seven multiplicative modifiers; a player cannot tell why a
   word scored what it scored.

## Changes

### Phase 1 — Floors, not letter-spires (the core change)
`lib/wordTower/towerFloor.ts` (new, pure) + `towerLayout.ts` + `WordTowerScene.tsx`

- One word = **one floor** = a horizontal course of its letter tiles. Floor **width
  scales with word length** (reuse `courseTileLayout`).
- The floor is placed at its **actual signed drop offset**, so a bad drop leaves a
  visible overhang and the tower silhouette records the run. Offset is clamped to the
  supported overlap (`evaluatePlacement.overlap`) so a floor can never float free.
- Support width for the *next* drop = the width of the floor below → a long word is a
  wide, forgiving platform; a 3-letter word is a narrow perch. **Vocabulary now buys
  physical stability** — the word game and the stacking game finally share one currency.
- Retire `buildTowerColumn` + connector blending (the chain it served is gone).
- Tile registry key becomes `f{floor}c{char}`; `pos` becomes the floor row index.

### Phase 2 — One notice at a time (arbiter, not another deletion pass)
`lib/wordTower/noticeQueue.ts` (new, pure)

- Single priority queue; **at most one banner on screen**; lower-priority notices are
  dropped (not deferred) once their moment has passed.
- Achievements + "new best" move to the **end-of-session summary** (already specified in
  the May portfolio spec, never enforced).
- Confetti reserved for zone crossings and session end — not word #1.

### Phase 3 — Layout / camera
- Daily mode stops mounting rival rail, sabotage bay, minimap, versus, wreck.
- Install promo + dev chrome excluded from the play field.
- Deck collapses to a compact bar while a word is hoisted, so the landing zone is
  visible at the moment the player is aiming at it.

### Phase 4 — Stakes, session-scoped (resolves the persistence collision)
The tower is **hybrid-persistent**: `restoreWordTowerState` carries floors/height/
high-water across UTC days and the shared board is monotonic best-height. So collapse
must **end today's climb, not the tower**:

- 3 topples in one session → today's climb ends → session summary → return tomorrow.
- Floors, height and high-water persist untouched; the monotonic board is unaffected.

### Phase 5 — Juice, scaled to the event
- Screen shake + shockwave **scaled by drop band** (perfect ≫ good ≫ sloppy).
- Wind ramps with altitude and feeds the existing `towerSway` instability.
- Combo pitch ramp on consecutive perfects.

### Phase 6 — Refactor (file-size cap)
`WordTowerPlay.tsx` 1392 lines and `WordTowerScene.tsx` 1127 both blow the 500-line cap.
Split them; Phases 1–4 remove enough surface to make it tractable.

## Shipped in this pass

| Phase | State |
|---|---|
| 1 Floors, not letter-spires | **done** — `lib/wordTower/towerFloor.ts` + Scene rewrite + `WordTowerFloor.offset` serialized. The crane girder flipped horizontal with it (`craneBeamDisplay` budget is now a WIDTH budget), so the load on the hook is the floor that lands. Verified in-browser LTR + Hebrew RTL. |
| 1b Word↔physics tie-in | **done** — `supportBandBonus`: the floor below widens the perfect window by its word length (capped, and the total is capped again inside `alignmentBand` so the `good` band survives). |
| 2 One notice at a time | **done** — `MAX_NOTICES` 3 → 2. One would have shown a 950 ms achievement for ~40 ms behind the 910 ms verdict. |
| 3 Layout / camera | **partly** — `/word-tower` added to `GAME_ROUTES` (banner + install promo were over the crane); minimap hidden below 30 m; status rail moved above the build line. Deck-collapse-while-placing NOT done (the deck already swaps to a single DROP target). |
| 4 Session stakes | **not done** — deliberately deferred; it is new gameplay, not the layout/feel work that was asked for. |
| 5 Juice | **partly** — `good` drops lost their flash + confetti so `perfect` has somewhere to escalate to; `tall`/`highRise` confetti reserved for `skyscraper`. Wind-with-altitude already existed. |
| 6 Refactor | **partly** — deleted the retired chain machinery (`buildTowerColumn`, `cellAltitudes`, `blendColors`, `sharedConnectorLen`) and the never-called `courseTileLayout`. `WordTowerPlay` (1392) and `WordTowerScene` (1130) are still over the 500-line cap. |

## Out of scope
Tower-toon residents (new art pipeline), endless mode revival, backend leaderboard
changes, versus/multiplayer.

## Test plan
Pure logic (`towerFloor`, `noticeQueue`, session-end rule, support-width math) →
strict RED-GREEN-REFACTOR per rule 22. Pixi/FX → test the pure trigger, verify the rest
in the browser at 390×844 LTR + `?locale=he` RTL.
