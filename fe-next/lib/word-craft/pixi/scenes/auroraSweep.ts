import { Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';

const COLORS = [0xbfff00, 0x00ffff, 0xff1493, 0x8b5cf6, 0xffe135];

export function playAuroraSweep(ctx: SceneCtx): Promise<void> {
  if (ctx.reducedMotion) return Promise.resolve();
  return new Promise((resolve) => {
    const w = ctx.app.screen.width;
    const h = ctx.app.screen.height;
    const bandH = Math.max(80, h * 0.32);

    const bands: Graphics[] = [];
    for (let i = 0; i < COLORS.length; i++) {
      const band = new Graphics();
      band.rect(0, 0, w * 1.4, bandH).fill({ color: COLORS[i], alpha: 0.32 });
      band.pivot.set(w * 0.7, bandH / 2);
      band.position.set(-w * 0.4, h * 0.5);
      band.rotation = -0.18;
      band.alpha = 0;
      ctx.eventLayer.addChild(band);
      bands.push(band);
      gsap.to(band, {
        x: w * 1.2,
        alpha: 0.45,
        duration: 0.55,
        delay: i * 0.06,
        ease: 'power2.out',
        onComplete: () => {
          gsap.to(band, {
            alpha: 0,
            duration: 0.35,
            ease: 'power1.out',
            onComplete: () => band.destroy(),
          });
        },
      });
    }

    for (let k = 0; k < 28; k++) {
      const spark = new Graphics();
      const tint = COLORS[k % COLORS.length];
      spark.circle(0, 0, 2 + Math.random() * 3).fill({ color: tint, alpha: 0.9 });
      spark.position.set(Math.random() * w, h + 10);
      ctx.eventLayer.addChild(spark);
      gsap.to(spark, {
        y: -10,
        x: spark.x + (Math.random() - 0.5) * 80,
        alpha: 0,
        duration: 0.9 + Math.random() * 0.5,
        delay: Math.random() * 0.25,
        ease: 'power1.out',
        onComplete: () => spark.destroy(),
      });
    }

    setTimeout(resolve, 1200);
  });
}
