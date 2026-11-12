/** Gags are authored on an 80px box; a stage scales the whole box so beats, props and slide-outs stay in proportion. */
export const GAG_BOX_PX = 80;
export const MIN_STAGE_PX = 56;
const MIN_GAG_PX = 48;
const MAX_GAG_PX = 120;
/** Room above the head for props (stamp, tile stack) inside the stage. */
const HEADROOM = 0.78;

export interface StageBox {
  width: number;
  height: number;
}

export function pickStage(boxes: readonly StageBox[]): number {
  return boxes.findIndex((b) => b.width >= MIN_STAGE_PX && b.height >= MIN_STAGE_PX);
}

export function gagStageScale(stageHeight: number): number {
  const px = Math.min(MAX_GAG_PX, Math.max(MIN_GAG_PX, Math.round(stageHeight * HEADROOM)));
  return px / GAG_BOX_PX;
}
