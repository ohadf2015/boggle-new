import { CRANE_ARM_PX, CRANE_CLEARANCE_PX, SWING } from './crane';
import { PX_PER_M } from './engine';
import { BLOCK_HEIGHT_PX } from './scoring';

/**
 * Camera framing — pure, so it can be asserted at every viewport.
 *
 * The old camera framed the crane with a clearance measured in PHYSICS pixels,
 * so at desktop scale (2x) the clearance ate 78% of the play area and pushed the
 * whole tower under the dock. Everything here is solved in screen pixels.
 */

/** Screen space the HUD (height badge + score) owns at the top. */
export const HUD_TOP_PX = 96;

/**
 * Street visible between the ground line and the dock. The ground used to start
 * exactly at the dock's top edge, so the base of the tower — and the floor the
 * city stands on — was always hidden behind the controls.
 */
export const GROUND_STRIP_PX = 30;

/**
 * Widest the hanging block reaches from centre: full swing + 15% of a 5-letter
 * slab (37px). ponytail: far less than a real half-slab, on purpose — at the
 * swing's far end, for the instant it turns, <=35% of the slab leaves the screen
 * (camera.test pins it). Fitting the whole slab shrank floors to 38-58% of a
 * phone's width, which read as "the game is so little".
 */
const SWING_HALF_SPAN_PX = CRANE_ARM_PX * Math.sin(SWING.amplitudeRad) + 37;
const SIDE_GUTTER_PX = 12;
/** Play-area height that maps to scale 1 — sets block size on big screens. */
const COMFORT_PLAY_HEIGHT_PX = 480;
const MIN_SCALE = 0.6;
const MAX_SCALE = 2;

/**
 * Floors of finished tower kept on screen under the hanging slab when the wheel
 * sits in a SIDE panel (desktop/TV) and the canvas owns the full height.
 *
 * On a phone the play area is short enough that "comfort" already decides the
 * zoom and a floor target would shrink the slabs below what reads as a game
 * (feel.test pins 130px). With a full-height column the zoom is free, so it buys
 * what a phone cannot afford: you see the building you are stacking.
 */
const SIDE_DOCK_VISIBLE_FLOORS = 2.4;

/**
 * Where the controls sit. `bottom` = the wheel dock covers the bottom of the
 * canvas (phones, portrait). `inline` = the wheel is a side panel and the canvas
 * IS the play column, so `viewportW` is already the narrowed width and the
 * tower centres in it for free.
 */
export type DockSide = 'bottom' | 'inline';

export interface CameraInput {
  viewportW: number;
  viewportH: number;
  /** Measured height of the control dock covering the bottom of the canvas. */
  dockPx: number;
  /** Settled tower height, metres. */
  towerTopM: number;
  dockSide?: DockSide;
}

export interface CameraFrame {
  scale: number;
  /** Screen y of the ground line before camera offset (top edge of the dock). */
  groundScreenY: number;
  /** Upward pan in screen px; 0 while the tower is short. */
  cameraY: number;
}

export function frameCamera({ viewportW, viewportH, dockPx, towerTopM, dockSide = 'bottom' }: CameraInput): CameraFrame {
  const groundScreenY = viewportH - dockPx - GROUND_STRIP_PX;
  const playH = groundScreenY;
  const hangSpan = CRANE_CLEARANCE_PX + BLOCK_HEIGHT_PX / 2;

  const byWidth = (viewportW / 2 - SIDE_GUTTER_PX) / SWING_HALF_SPAN_PX;
  // Hanging block under the HUD AND the tower top above the dock, at once.
  const byHeight = (playH - HUD_TOP_PX) / hangSpan;
  // With a side panel the extra height buys floors on screen instead of sky:
  // the slab AND `SIDE_DOCK_VISIBLE_FLOORS` of tower under it have to fit.
  const byFloors =
    dockSide === 'inline'
      ? (playH - HUD_TOP_PX) / (hangSpan + SIDE_DOCK_VISIBLE_FLOORS * BLOCK_HEIGHT_PX)
      : playH / COMFORT_PLAY_HEIGHT_PX;
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, byWidth, byHeight, byFloors));

  // Pan up only once the hanging block would slide under the HUD.
  const hangingTopFromGround = (towerTopM * PX_PER_M + hangSpan) * scale;
  const cameraY = Math.max(0, HUD_TOP_PX - groundScreenY + hangingTopFromGround);

  return { scale, groundScreenY, cameraY };
}

/** How far a floor's underside is shaded when it is nowhere near the dock. */
const SKIRT_PX = BLOCK_HEIGHT_PX * 1.4;
/** Extra depth a pinned skirt runs past the screen's bottom edge. */
const PINNED_OVERSHOOT_PX = 240;

export interface SkirtBlock {
  x: number;
  y: number;
  widthPx: number;
  heightPx: number;
}

export interface SkirtRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The structure drawn UNDER each floor so the tower never floats.
 *
 * Two symptoms, one shape. A floor wider than the one below it left a wedge of
 * sky under its overhang, and once the camera panned the whole stack appeared to
 * hover on the dock's top edge with nothing holding it up — the ground is a
 * child of the scene at y=0, so it slides away behind the dock the moment the
 * camera climbs. Each floor gets a core shaft under it: a short shadow high up,
 * and — for anything within reach of the screen's bottom edge — a shaft that
 * runs past that edge and into the dock, so the building always continues down
 * out of frame instead of ending in mid-air.
 */
export function towerSkirts(blocks: SkirtBlock[], bottomWorldY: number): SkirtRect[] {
  const reach = bottomWorldY + PINNED_OVERSHOOT_PX;

  return blocks.map((b) => {
    // Overlap the floor by 2px: a hairline of sky between slab and shaft reads
    // as a render seam at TV zoom.
    const top = b.y + b.heightPx / 2 - 2;

    return {
      x: b.x - b.widthPx / 2,
      y: top,
      w: b.widthPx,
      h: top + SKIRT_PX >= bottomWorldY ? Math.max(SKIRT_PX, reach - top) : SKIRT_PX,
    };
  });
}

/** Anything with a Pixi v8 `screen` rectangle (the renderer, in practice). */
export interface ScreenSized {
  screen: { width: number; height: number };
  /**
   * Present on a real renderer and deliberately NOT read. Declared so the trap
   * is visible at the type: `width / resolution` is the v7 habit that painted
   * the whole scene into 1/dpr of the canvas.
   */
  resolution?: number;
  width?: number;
  height?: number;
}

/**
 * The viewport in CSS pixels.
 *
 * Pixi v8's `renderer.screen` is already CSS px. `renderer.width` is too — but
 * it reads like v7's device-pixel value, and dividing it by `resolution` (as
 * this file's callers used to) is a no-op at dpr 1 and shrinks the whole world
 * to 1/dpr of the canvas on every real phone. Read `screen`, never `width`.
 */
export function screenSize(renderer: ScreenSized): { w: number; h: number } {
  return { w: renderer.screen.width, h: renderer.screen.height };
}
