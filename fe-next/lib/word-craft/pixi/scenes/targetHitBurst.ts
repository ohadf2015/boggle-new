import { Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';

export function playTargetHitBurst(ctx: SceneCtx): Promise<void> {
  if (ctx.reducedMotion) return Promise.resolve();

  return new Promise((resolve) => {
    const cx = ctx.app.screen.width / 2;
    const cy = ctx.app.screen.height / 2;
    let settled = 0;
    const COUNT = 24;

    for (let i = 0; i < COUNT; i++) {
      const p = new Graphics();
      p.circle(0, 0, 5).fill({ color: 0xbfff00 });
      p.position.set(cx, cy);
      ctx.eventLayer.addChild(p);

      const angle = (i / COUNT) * Math.PI * 2;
      gsap.to(p, {
        x: cx + Math.cos(angle) * 220,
        y: cy + Math.sin(angle) * 220,
        alpha: 0,
        duration: 0.6,
        ease: 'power2.out',
        onComplete: () => {
          p.destroy();
          settled += 1;
          if (settled === COUNT) resolve();
        },
      });
    }
  });
}
