/**
 * Where the two fighters stand in the battle arena. Pure — no Pixi, no React.
 *
 * The arena is a side-on stage: the hero on the reading-start side, the foe
 * facing him across a ground line, both feet-planted so a knockback reads as
 * sliding along the floor rather than floating. RTL mirrors the whole stage so
 * the hero is always the one the eye starts on.
 *
 * The DOM keeps invisible markers on `foeHand` / `heroHit` / the foe box —
 * AttackFlight fires from the first, lands on the second, and BoardFx flies the
 * cast letters at the third. Moving the picture into a canvas must not break
 * those, so every anchor is published from here in canvas-local CSS px.
 */

export interface ArenaSpot { x: number; y: number; w: number; h: number }
export interface ArenaPoint { x: number; y: number }

export interface ArenaLayout {
  w: number;
  h: number;
  /** Floor line both fighters stand on. */
  groundY: number;
  hero: ArenaSpot;
  foe: ArenaSpot;
  /** The foe's casting hand: where a telegraphed shot charges and launches. */
  foeHand: ArenaPoint;
  /** The hero's chest: what an incoming shot aims at. */
  heroHit: ArenaPoint;
  /**
   * Where a strike's "-N ♥" is allowed to float. NOT the hero's head: the DOM
   * parks the intent panel over that corner and the canvas draws underneath it.
   */
  heroCallout: ArenaPoint;
  /** How far that callout may drift up before it would slide under the HUD. */
  calloutRise: number;
  /** +1 when the foe stands to the right of the hero (LTR), -1 in RTL. */
  facing: 1 | -1;
  rtl: boolean;
}

/** Width : height of the stage box a caller should reserve. */
export const ARENA_RATIO = 358 / 200;

/**
 * The share of the stage height the DOM HUD sits on top of, measured from the
 * top: the HP strip plus `ArenaStage`'s intent panel, which on a 352x194 canvas
 * runs to y 89 (0.459). Anything the canvas draws above this line is simply not
 * seen — the panel is opaque DOM over the canvas — so the callouts stay under it.
 */
export const HUD_BAND = 0.47;
/** How far a callout drifts up over its life, as a share of the stage height. */
const CALLOUT_RISE = 0.13;

/** Heights leave a band at the top for the HP strip and the floating intent. */
const FOE_H = 0.66;
const HERO_H = 0.52;
const GROUND = 0.88;
/** Sprite box side, as a share of the stage width. */
const FOE_W = 0.54;
const HERO_W = 0.42;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function arenaLayout(w: number, h: number, rtl = false): ArenaLayout {
  const groundY = Math.round(h * GROUND);
  const foeH = Math.round(h * FOE_H);
  const heroH = Math.round(h * HERO_H);
  const foeW = Math.round(Math.min(w * FOE_W, foeH * 1.15));
  const heroW = Math.round(Math.min(w * HERO_W, heroH * 1.05));

  // Centres, measured left-to-right, then mirrored for RTL.
  const heroCx = clamp(w * 0.24, heroW / 2, w - heroW / 2);
  const foeCx = clamp(w * 0.74, foeW / 2, w - foeW / 2);
  const mirror = (cx: number) => (rtl ? w - cx : cx);

  const hero: ArenaSpot = { x: Math.round(mirror(heroCx) - heroW / 2), y: groundY - heroH, w: heroW, h: heroH };
  const foe: ArenaSpot = { x: Math.round(mirror(foeCx) - foeW / 2), y: groundY - foeH, w: foeW, h: foeH };
  const facing: 1 | -1 = rtl ? -1 : 1;

  return {
    w,
    h,
    groundY,
    hero,
    foe,
    // Inner edge of the foe (the side it swings from), a third of the way down.
    foeHand: { x: Math.round(foe.x + foe.w * (rtl ? 0.78 : 0.22)), y: Math.round(foe.y + foe.h * 0.36) },
    heroHit: { x: Math.round(hero.x + hero.w * 0.5), y: Math.round(hero.y + hero.h * 0.42) },
    // Start low enough that the WHOLE rise finishes below the HUD band.
    heroCallout: {
      x: Math.round(hero.x + hero.w * 0.5),
      // ceil the start and floor the rise: rounding must never nibble the
      // clearance away and put the last, faintest frames back under the panel.
      y: Math.min(groundY - 1, Math.ceil(h * (HUD_BAND + CALLOUT_RISE))),
    },
    calloutRise: Math.floor(h * CALLOUT_RISE),
    facing,
    rtl,
  };
}
