import { Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';

export interface PathTraceInput {
  cells: ReadonlyArray<{ row: number; col: number }>;
  tint: number;
}

export function playPathTrace(ctx: SceneCtx, input: PathTraceInput): Promise<void> {
  if (ctx.reducedMotion || input.cells.length < 2) return Promise.resolve();
  return new Promise((resolve) => {
    const board = ctx.coords.cellRect(0, 0);
    if (!board) {
      resolve();
      return;
    }
    const centers: { x: number; y: number }[] = [];
    for (const c of input.cells) {
      const rect = ctx.coords.cellRect(c.row, c.col);
      if (!rect) continue;
      centers.push({
        x: rect.x - board.x + rect.width * 0.5,
        y: rect.y - board.y + rect.height * 0.5,
      });
    }
    if (centers.length < 2) {
      resolve();
      return;
    }

    const line = new Graphics();
    ctx.eventLayer.addChild(line);
    const draw = (t: number) => {
      if (line.destroyed) return; // GSAP onUpdate can fire after Pixi context is nulled (Sentry 1PV)
      line.clear();
      line.moveTo(centers[0].x, centers[0].y);
      const totalSegs = centers.length - 1;
      const reached = Math.min(t * totalSegs, totalSegs);
      const fullSegs = Math.floor(reached);
      const partial = reached - fullSegs;
      for (let i = 1; i <= fullSegs; i++) line.lineTo(centers[i].x, centers[i].y);
      if (fullSegs < totalSegs) {
        const a = centers[fullSegs];
        const b = centers[fullSegs + 1];
        line.lineTo(a.x + (b.x - a.x) * partial, a.y + (b.y - a.y) * partial);
      }
      line.stroke({ width: 5, color: input.tint, alpha: 0.85 });
    };

    centers.forEach((p, i) => {
      const dot = new Graphics();
      dot.circle(0, 0, 4).fill({ color: input.tint, alpha: 1 });
      dot.position.set(p.x, p.y);
      dot.scale.set(0);
      ctx.eventLayer.addChild(dot);
      gsap.to(dot.scale, {
        x: 2.4,
        y: 2.4,
        duration: 0.18,
        delay: i * 0.06,
        ease: 'back.out(2.4)',
      });
      gsap.to(dot, {
        alpha: 0,
        duration: 0.5,
        delay: 0.5 + i * 0.06,
        ease: 'power2.out',
        onComplete: () => dot.destroy(),
      });
    });

    const proxy = { t: 0 };
    gsap.to(proxy, {
      t: 1,
      duration: Math.max(0.4, centers.length * 0.08),
      ease: 'power2.inOut',
      onUpdate: () => draw(proxy.t),
      onComplete: () => {
        gsap.to(line, {
          alpha: 0,
          duration: 0.45,
          delay: 0.3,
          ease: 'power2.out',
          onComplete: () => {
            line.destroy();
            resolve();
          },
        });
      },
    });
  });
}
