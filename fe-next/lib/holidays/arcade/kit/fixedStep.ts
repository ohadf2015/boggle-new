export const STEP_MS = 1000 / 60;
const MAX_STEPS = 5;

export function createFixedStep(update: (dtSec: number) => void) {
  let acc = 0;
  return {
    advance(frameMs: number, scale = 1) {
      acc = Math.min(acc + Math.max(0, frameMs) * scale, STEP_MS * MAX_STEPS);
      while (acc >= STEP_MS) {
        acc -= STEP_MS;
        update(STEP_MS / 1000);
      }
    },
  };
}
