import { Container, Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';

export interface WordStampInput {
  word: string;
  score: number;
  tint: number;
  /** Optional anchor cell; falls back to board center. */
  anchor?: { row: number; col: number };
}

export function playWordStampSlam(ctx: SceneCtx, input: WordStampInput): Promise<void> {
  if (ctx.reducedMotion) return Promise.resolve();
  return new Promise((resolve) => {
    const board = ctx.coords.cellRect(0, 0);
    if (!board) {
      resolve();
      return;
    }
    const canvasW = ctx.app.screen.width;
    const canvasH = ctx.app.screen.height;
    let cx = canvasW * 0.5;
    let cy = canvasH * 0.5;
    if (input.anchor) {
      const r = ctx.coords.cellRect(input.anchor.row, input.anchor.col);
      if (r) {
        cx = r.x - board.x + r.width * 0.5;
        cy = r.y - board.y + r.height * 0.5;
      }
    }

    const container = new Container();
    container.position.set(cx, cy);
    container.pivot.set(0, 0);
    container.scale.set(0.2);
    container.alpha = 0;
    ctx.eventLayer.addChild(container);

    const labelText = `${input.word.toUpperCase()}  +${input.score}`;
    const label = new Text({
      text: labelText,
      style: {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: 32,
        fill: 0x1a1a2e,
        fontWeight: '900',
        letterSpacing: 1,
      },
    });
    label.anchor.set(0.5);

    const padX = 22;
    const padY = 12;
    const bgW = label.width + padX * 2;
    const bgH = label.height + padY * 2;

    const bg = new Graphics();
    bg.rect(-bgW / 2, -bgH / 2, bgW, bgH).fill({ color: input.tint, alpha: 0.95 });
    bg.rect(-bgW / 2, -bgH / 2, bgW, bgH).stroke({ width: 3, color: 0x000000 });
    bg.rect(-bgW / 2 + 6, -bgH / 2 + 6, bgW, bgH).fill({ color: 0x000000, alpha: 0.25 });

    container.addChild(bg);
    container.addChild(label);

    gsap
      .timeline({
        onComplete: () => {
          container.destroy({ children: true });
          resolve();
        },
      })
      .to(container, { alpha: 1, duration: 0.08, ease: 'power1.out' }, 0)
      .to(container.scale, { x: 1.15, y: 1.15, duration: 0.18, ease: 'back.out(3)' }, 0)
      .to(container.scale, { x: 1, y: 1, duration: 0.1, ease: 'power2.out' })
      .to({}, { duration: 0.45 })
      .to(container, { alpha: 0, duration: 0.35, ease: 'power2.in' }, '>-0.1')
      .to(container, { y: cy - 32, duration: 0.45, ease: 'power2.in' }, '<');
  });
}
