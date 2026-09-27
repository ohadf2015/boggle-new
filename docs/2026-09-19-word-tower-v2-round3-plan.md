# Word Tower v2 — round 3 plan (2026-09-19)

User asks: blocks too hard to align (make bigger/easier) · Hebrew must be RTL · big unused area, not full width · find more gaps · prettier, more captivating background (taste skill) · wrecking ball / ways to ruin a FRIEND's tower, fun + graphic.

## Findings (measured, phone 390x844 + desktop 1440x900, he)
- Scale on phone 0.88 → block 30px tall, 5-letter block ~130px. Swing ±127px, perfect window ±5px, good ±21px. Too tight.
- Hook hangs 230 physics px above tower top → big dead sky band between hook and tower.
- Desktop: dock 270px tall, wheel + 2 buttons in `max-w-md` centre; sky sides empty.
- Hebrew text itself renders correctly (DOM + Pixi). RTL gaps: hardcoded `m` unit (V2Hud 71/176/191), wheel ring order not mirrored, dock button sides.
- Dev server on main checkout 404'd every route until `rm -rf .next/dev`.

## Phases
1. **Feel** — BLOCK_HEIGHT 34→46, width 64+14/letter → 104+18/letter; swing amplitude 0.62→0.42 rad, period 2200→2700ms; landing ratios perfect .08→.14, good .35→.5; clearance 230→170. Landing shadow: projected landing x marker on tower top while swinging. Camera: SWING_HALF_SPAN derived from shared swing constant; comfort height 460→400.
2. **Layout** — dock full width, buttons at edges, wheel larger on ≥md; i18n unit; RTL audit.
3. **Backdrop** — richer layered parallax (skyline silhouettes w/ lit windows at ground, light rays, twinkling stars), taste pass.
4. **Wreck** — rival tower (friend's words via share link `?rival=`; default bot tower) standing beside yours; earn wrecking balls (perfect streaks / long words); swing a real matter pendulum ball, release to smash; rubble/shake/score for knocked blocks. Share-link out after run.
