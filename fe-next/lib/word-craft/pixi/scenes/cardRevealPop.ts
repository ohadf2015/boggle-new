import { Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';

export function playCardRevealPop(ctx: SceneCtx): Promise<void> {
  if (ctx.reducedMotion) return Promise.resolve();

  return new Promise((resolve) => {
    const flash = new Graphics();
    flash.rect(-2000, -2000, 4000, 4000).fill({ color: 0xbfff00, alpha: 0.18 });
    ctx.eventLayer.addChild(flash);

    gsap.to(flash, {
      alpha: 0,
      duration: 0.45,
      ease: 'power2.out',
      onComplete: () => {
        flash.destroy();
        resolve();
      },
    });
  });
}
