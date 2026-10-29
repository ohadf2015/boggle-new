/** Sparks and confetti read the same at 1.5x; a full-screen layer at 2.6x is ~3x the pixels to draw and composite. */
export const FX_RESOLUTION_CAP = 1.5;

export function fxResolution(devicePixelRatio: number): number {
  return Math.min(devicePixelRatio || 1, FX_RESOLUTION_CAP);
}

/** Longest delay before a batch's last scheduled burst, plus a frame of margin. */
const LATE_BURST_MS: Record<string, number> = { wordValid: 150, targetFound: 600, gameWon: 1500 };
const MARGIN_MS = 200;

export function fxHoldMs(effects: ReadonlyArray<{ type: string }>): number {
  return effects.reduce((ms, e) => Math.max(ms, (LATE_BURST_MS[e.type] ?? 0) + MARGIN_MS), MARGIN_MS);
}

export interface FxActivity {
  emitters: number;
  shaking: boolean;
  flashing: boolean;
  dilating: boolean;
  sinceEffectMs: number;
  holdMs: number;
}

/** A full-screen effects canvas that redraws an empty frame every rAF competes with the board for every frame. */
export function fxCanSleep(a: FxActivity): boolean {
  return a.emitters === 0 && !a.shaking && !a.flashing && !a.dilating && a.sinceEffectMs > a.holdMs;
}
