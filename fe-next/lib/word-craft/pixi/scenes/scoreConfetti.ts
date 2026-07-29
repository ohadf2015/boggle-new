import { Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';

const COLORS = [0xff1493, 0xbfff00, 0x00ffff, 0x8b5cf6, 0xffe135];

export function playScoreConfetti(ctx: SceneCtx): Promise<void> {
  if (ctx.reducedMotion) return Promise.resolve();
  const board = ctx.coords.cellRect(0, 0);
  if (!board) return Promise.resolve();
  const width = ctx.app.renderer?.width ?? 320;
  const height = ctx.app.renderer?.height ?? 320;

  return new Promise((resolve) => {
    let pending = 60;
    for (let i = 0; i < 60; i++) {
      const g = new Graphics();
      g.rect(-3, -1, 6, 2).fill({ color: COLORS[i % COLORS.length], alpha: 0.95 });
      const startX = width * 0.5 + (Math.random() - 0.5) * 80;
      const startY = height * 0.5;
      g.position.set(startX, startY);
      g.rotation = Math.random() * Math.PI * 2;
      ctx.eventLayer.addChild(g);

      const targetX = startX + (Math.random() - 0.5) * width;
      const targetY = startY + height * (0.4 + Math.random() * 0.6);
      gsap.to(g.position, { x: targetX, y: targetY, duration: 0.9 + Math.random() * 0.4, ease: 'power2.in' });
      gsap.to(g, {
        rotation: g.rotation + Math.PI * (Math.random() * 4 - 2),
        alpha: 0,
        duration: 1.2,
        ease: 'power2.in',
        onComplete: () => {
          g.destroy();
          pending -= 1;
          if (pending === 0) resolve();
        },
      });
    }
  });
}
