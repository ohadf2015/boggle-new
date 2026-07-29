import { Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';

export function playScreenEdgeFlash(ctx: SceneCtx, tint: number): Promise<void> {
  if (ctx.reducedMotion) return Promise.resolve();
  return new Promise((resolve) => {
    const w = ctx.app.screen.width;
    const h = ctx.app.screen.height;
    const thickness = Math.max(18, Math.min(w, h) * 0.06);

    const frame = new Graphics();
    // Four strip rects form the picture-frame border. Pixi 8's Graphics API
    // dropped `beginHole`/`endHole`; overdraw is the equivalent here and
    // avoids the cost of a mask sprite for a one-shot flash.
    frame
      .rect(0, 0, w, thickness).fill({ color: tint, alpha: 0.55 })
      .rect(0, h - thickness, w, thickness).fill({ color: tint, alpha: 0.55 })
      .rect(0, thickness, thickness, h - thickness * 2).fill({ color: tint, alpha: 0.55 })
      .rect(w - thickness, thickness, thickness, h - thickness * 2).fill({ color: tint, alpha: 0.55 });
    frame.alpha = 0;
    ctx.eventLayer.addChild(frame);

    gsap
      .timeline({
        onComplete: () => {
          frame.destroy();
          resolve();
        },
      })
      .to(frame, { alpha: 0.9, duration: 0.12, ease: 'power2.out' })
      .to(frame, { alpha: 0, duration: 0.35, ease: 'power2.in' });
  });
}
