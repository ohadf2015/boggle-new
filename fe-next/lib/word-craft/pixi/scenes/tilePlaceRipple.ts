import { Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';

export function playTilePlaceRipple(
  ctx: SceneCtx,
  cell: { row: number; col: number },
): Promise<void> {
  if (ctx.reducedMotion) return Promise.resolve();
  const rect = ctx.coords.cellRect(cell.row, cell.col);
  if (!rect) return Promise.resolve();

  const board = ctx.coords.cellRect(0, 0);
  const baseX = board ? rect.x - board.x : rect.x;
  const baseY = board ? rect.y - board.y : rect.y;

  return new Promise((resolve) => {
    const ring = new Graphics();
    ring.circle(0, 0, Math.min(rect.width, rect.height) * 0.45)
      .stroke({ color: 0xbfff00, width: 2, alpha: 0.9 });
    ring.position.set(baseX + rect.width * 0.5, baseY + rect.height * 0.5);
    ring.scale.set(0.4);
    ring.alpha = 1;
    ctx.eventLayer.addChild(ring);

    gsap.to(ring.scale, { x: 2.2, y: 2.2, duration: 0.25, ease: 'power2.out' });
    gsap.to(ring, {
      alpha: 0,
      duration: 0.25,
      ease: 'power2.out',
      onComplete: () => {
        ring.destroy();
        resolve();
      },
    });
  });
}
