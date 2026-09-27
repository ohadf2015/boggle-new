import { playScoreConfetti } from './scoreConfetti';
import type { SceneCtx } from '../sceneCtx';

export function playGameOverBurst(ctx: SceneCtx): Promise<void> {
  if (ctx.reducedMotion) return Promise.resolve();
  return new Promise((resolve) => {
    playScoreConfetti(ctx);
    setTimeout(() => playScoreConfetti(ctx), 500);
    setTimeout(() => {
      playScoreConfetti(ctx).then(resolve);
    }, 1000);
  });
}
