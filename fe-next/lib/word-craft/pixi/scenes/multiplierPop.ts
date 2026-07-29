import { Text } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';

export function playMultiplierPop(
  ctx: SceneCtx,
  args: { chips: number; mult: number },
): Promise<void> {
  if (ctx.reducedMotion) return Promise.resolve();

  return new Promise((resolve) => {
    const label = new Text({
      text: `${args.chips} x ${args.mult}`,
      style: { fill: 0xffe135, fontSize: 48, fontWeight: '700', fontFamily: 'Fredoka' },
    });
    label.anchor.set(0.5);
    label.position.set(ctx.app.screen.width / 2, ctx.app.screen.height / 2);
    label.scale.set(0.4);
    ctx.eventLayer.addChild(label);

    gsap.to(label.scale, { x: 1.2, y: 1.2, duration: 0.3, ease: 'back.out(2)' });
    gsap.to(label, {
      alpha: 0,
      duration: 0.35,
      delay: 0.3,
      ease: 'power2.in',
      onComplete: () => {
        label.destroy();
        resolve();
      },
    });
  });
}
