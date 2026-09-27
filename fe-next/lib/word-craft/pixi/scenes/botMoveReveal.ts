import { Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';

export function playBotMoveReveal(
  ctx: SceneCtx,
  placements: ReadonlyArray<{ row: number; col: number }>,
): Promise<void> {
  return new Promise(async (resolve) => {
    for (const p of placements) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('wordcraft:bot-tile-revealed', { detail: p }));
      }
      if (!ctx.reducedMotion) {
        const rect = ctx.coords.cellRect(p.row, p.col);
        const board = ctx.coords.cellRect(0, 0);
        if (rect && board) {
          const g = new Graphics();
          g.rect(-rect.width / 2, -rect.height / 2, rect.width, rect.height)
            .fill({ color: 0xff1493, alpha: 0.25 });
          g.position.set((rect.x - board.x) + rect.width / 2, (rect.y - board.y) + rect.height / 2);
          g.scale.set(1.3);
          g.alpha = 0;
          ctx.eventLayer.addChild(g);
          gsap.to(g, { alpha: 0.6, duration: 0.08, yoyo: true, repeat: 1, ease: 'power2.out' });
          gsap.to(g.scale, { x: 1, y: 1, duration: 0.16, ease: 'back.out(1.6)', onComplete: () => g.destroy() });
        }
      }
      await new Promise((r) => setTimeout(r, ctx.reducedMotion ? 0 : 120));
    }
    resolve();
  });
}
