import { Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';
import type { HeatBeat } from '../../celebration/heatTransition';

const EMBER_COLORS = [0xff6b35, 0xffe135, 0xff1493];
const ICE_COLORS = [0x00ffff, 0xbfff00, 0xffffff];

export function playHeatBeat(ctx: SceneCtx, beat: HeatBeat): Promise<void> {
  if (ctx.reducedMotion) return Promise.resolve();
  if (beat === 'recover') return playRecoverPulse(ctx);
  if (beat === 'enter-burnout') return playIceCracks(ctx);
  // enter-overdrive / exit-overdrive both use embers; exit dims faster.
  return playEmbers(ctx, beat === 'exit-overdrive');
}

function playEmbers(ctx: SceneCtx, fade: boolean): Promise<void> {
  return new Promise((resolve) => {
    const w = ctx.app.screen.width;
    const h = ctx.app.screen.height;
    const count = 36;
    let done = 0;
    for (let i = 0; i < count; i++) {
      const ember = new Graphics();
      const color = EMBER_COLORS[i % EMBER_COLORS.length];
      const size = 2 + Math.random() * 4;
      ember.circle(0, 0, size).fill({ color, alpha: 0.9 });
      ember.position.set(Math.random() * w, -10);
      ctx.eventLayer.addChild(ember);
      gsap.to(ember, {
        y: h + 20,
        x: ember.x + (Math.random() - 0.5) * 60,
        alpha: 0,
        duration: 0.7 + Math.random() * 0.6,
        delay: Math.random() * 0.4,
        ease: fade ? 'power3.out' : 'power1.in',
        onComplete: () => {
          ember.destroy();
          done++;
          if (done === count) resolve();
        },
      });
    }
  });
}

function playIceCracks(ctx: SceneCtx): Promise<void> {
  return new Promise((resolve) => {
    const w = ctx.app.screen.width;
    const h = ctx.app.screen.height;
    const cracks = new Graphics();
    ctx.eventLayer.addChild(cracks);

    const arms = 6;
    for (let i = 0; i < arms; i++) {
      const startX = Math.random() * w;
      const startY = Math.random() * h;
      const segs = 5 + Math.floor(Math.random() * 3);
      cracks.moveTo(startX, startY);
      let x = startX;
      let y = startY;
      for (let s = 0; s < segs; s++) {
        x += (Math.random() - 0.5) * 80;
        y += (Math.random() - 0.5) * 80;
        cracks.lineTo(x, y);
      }
      cracks.stroke({ width: 2, color: ICE_COLORS[i % ICE_COLORS.length], alpha: 0.85 });
    }
    cracks.alpha = 0;
    gsap
      .timeline({
        onComplete: () => {
          cracks.destroy();
          resolve();
        },
      })
      .to(cracks, { alpha: 0.9, duration: 0.12, ease: 'power2.out' })
      .to(cracks, { alpha: 0, duration: 0.6, ease: 'power2.in' });
  });
}

function playRecoverPulse(ctx: SceneCtx): Promise<void> {
  return new Promise((resolve) => {
    const w = ctx.app.screen.width;
    const h = ctx.app.screen.height;
    const ring = new Graphics();
    ring.circle(0, 0, Math.min(w, h) * 0.25).stroke({ width: 4, color: 0xbfff00, alpha: 0.9 });
    ring.position.set(w * 0.5, h * 0.5);
    ring.scale.set(0.3);
    ring.alpha = 0;
    ctx.eventLayer.addChild(ring);
    gsap
      .timeline({
        onComplete: () => {
          ring.destroy();
          resolve();
        },
      })
      .to(ring, { alpha: 0.95, duration: 0.1, ease: 'power2.out' }, 0)
      .to(ring.scale, { x: 1.4, y: 1.4, duration: 0.55, ease: 'power2.out' }, 0)
      .to(ring, { alpha: 0, duration: 0.35, ease: 'power2.in' }, '>-0.2');
  });
}
