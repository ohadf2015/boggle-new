/** Gags are authored on an 80px box; a stage scales the whole box so beats, props and slide-outs stay in proportion. */
export const GAG_BOX_PX = 80;
export const MIN_STAGE_PX = 56;
const MIN_GAG_PX = 48;
const MAX_GAG_PX = 120;
/** Tallest gag drawn (the stamp held overhead) over the mascot's own height, measured in the browser. */
export const GAG_ENVELOPE = 1.36;
export const GAG_TARGET_PX = 88;
/** Stage height a host reserves on short phones so the target-size mascot and its props fit. */
export const STAGE_TARGET_PX = Math.ceil(GAG_TARGET_PX * GAG_ENVELOPE);

const BOARD_TILE_MIN_PX = 44;
const BOARD_GAP_PX = 6;
const BOARD_INSET_PX = 20;

export interface StageBox {
  width: number;
  height: number;
}

/** First candidate tall enough for the target-size gag; otherwise the tallest readable one; -1 when none is readable. */
export function pickStage(boxes: readonly StageBox[]): number {
  let best = -1;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (b.width < MIN_STAGE_PX || b.height < MIN_STAGE_PX) continue;
    if (b.height >= STAGE_TARGET_PX) return i;
    if (best < 0 || b.height > boxes[best].height) best = i;
  }
  return best;
}

export function gagStageScale(stageHeight: number): number {
  const px = Math.min(MAX_GAG_PX, Math.max(MIN_GAG_PX, Math.floor(stageHeight / GAG_ENVELOPE)));
  return px / GAG_BOX_PX;
}

/** Smallest board that keeps 44px tiles, so a stage reserve never shrinks tiles below a touch target. */
export function boardFloorPx(cols: number): number {
  return cols * BOARD_TILE_MIN_PX + (cols - 1) * BOARD_GAP_PX + 2 * BOARD_INSET_PX;
}
