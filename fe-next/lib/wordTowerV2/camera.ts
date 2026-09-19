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

/** Widest the hanging block reaches from centre: full swing + a typical half-block. */
const SWING_HALF_SPAN_PX = CRANE_ARM_PX * Math.sin(SWING.amplitudeRad) + 90;
const SIDE_GUTTER_PX = 12;
/** Play-area height that maps to scale 1 — sets block size on big screens. */
const COMFORT_PLAY_HEIGHT_PX = 400;
const MIN_SCALE = 0.6;
const MAX_SCALE = 2;

export interface CameraInput {
  viewportW: number;
  viewportH: number;
  /** Measured height of the control dock covering the bottom of the canvas. */
  dockPx: number;
  /** Settled tower height, metres. */
  towerTopM: number;
}

export interface CameraFrame {
  scale: number;
  /** Screen y of the ground line before camera offset (top edge of the dock). */
  groundScreenY: number;
  /** Upward pan in screen px; 0 while the tower is short. */
  cameraY: number;
}

export function frameCamera({ viewportW, viewportH, dockPx, towerTopM }: CameraInput): CameraFrame {
  const groundScreenY = viewportH - dockPx - GROUND_STRIP_PX;
  const playH = groundScreenY;
  const hangSpan = CRANE_CLEARANCE_PX + BLOCK_HEIGHT_PX / 2;

  const byWidth = (viewportW / 2 - SIDE_GUTTER_PX) / SWING_HALF_SPAN_PX;
  // Hanging block under the HUD AND the tower top above the dock, at once.
  const byHeight = (playH - HUD_TOP_PX) / hangSpan;
  const byComfort = playH / COMFORT_PLAY_HEIGHT_PX;
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, byWidth, byHeight, byComfort));

  // Pan up only once the hanging block would slide under the HUD.
  const hangingTopFromGround = (towerTopM * PX_PER_M + hangSpan) * scale;
  const cameraY = Math.max(0, HUD_TOP_PX - groundScreenY + hangingTopFromGround);

  return { scale, groundScreenY, cameraY };
}
