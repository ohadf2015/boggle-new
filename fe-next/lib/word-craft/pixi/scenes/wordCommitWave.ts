import { Graphics, Text } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from '../sceneCtx';
import { scoreDotTier } from '../../scoreDotTier';

const TIER_TINT: Record<string, number> = {
  common: 0xa0a0a0,
  mid: 0x00ffff,
  rare: 0x8b5cf6,
  legendary: 0xffe135,
};

export interface CommitInput {
  placements: ReadonlyArray<{ row: number; col: number; letter: string; value: number }>;
  totalScore: number;
}

export function playWordCommitWave(ctx: SceneCtx, input: CommitInput): Promise<void> {
  if (ctx.reducedMotion) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('wordcraft:score-chip-bump', { detail: { score: input.totalScore } }));
    }
    return Promise.resolve();
  }
  return new Promise(async (resolve) => {
    const board = ctx.coords.cellRect(0, 0);
    for (const p of input.placements) {
      const rect = ctx.coords.cellRect(p.row, p.col);
      if (!rect || !board) continue;
      const cx = (rect.x - board.x) + rect.width * 0.5;
      const cy = (rect.y - board.y) + rect.height * 0.5;
      const tint = TIER_TINT[scoreDotTier(p.value)] ?? TIER_TINT.common;
      for (let k = 0; k < 5; k++) {
        const angle = (Math.PI * 2 * k) / 5;
        const particle = new Graphics();
        particle.circle(0, 0, 3).fill({ color: tint, alpha: 0.95 });
        particle.position.set(cx, cy);
        ctx.eventLayer.addChild(particle);
        gsap.to(particle.position, { x: cx + Math.cos(angle) * 28, y: cy + Math.sin(angle) * 28, duration: 0.45, ease: 'power2.out' });
        gsap.to(particle, { alpha: 0, duration: 0.45, ease: 'power2.out', onComplete: () => particle.destroy() });
      }
      await new Promise((r) => setTimeout(r, 80));
    }
    const chip = ctx.coords.scoreChipRect();
    if (!chip || !board) {
      resolve();
      return;
    }
    const last = input.placements[input.placements.length - 1];
    const lastRect = ctx.coords.cellRect(last.row, last.col);
    if (!lastRect) {
      resolve();
      return;
    }
    const startX = (lastRect.x - board.x) + lastRect.width * 0.5;
    const startY = (lastRect.y - board.y) + lastRect.height * 0.5;
    const endX = (chip.x - board.x) + chip.width * 0.5;
    const endY = (chip.y - board.y) + chip.height * 0.5;

    const orb = new Graphics();
    orb.circle(0, 0, 10).fill({ color: 0xffe135, alpha: 0.95 });
    orb.position.set(startX, startY);
    ctx.eventLayer.addChild(orb);
    const label = new Text({ text: `+${input.totalScore}`, style: { fontFamily: 'Fredoka, sans-serif', fontSize: 14, fill: 0x1a1a2e, fontWeight: '900' } });
    label.anchor.set(0.5);
    label.position.set(startX, startY);
    ctx.eventLayer.addChild(label);

    const proxy = { t: 0 };
    const midX = (startX + endX) / 2;
    const midY = Math.min(startY, endY) - 60;
    gsap.to(proxy, {
      t: 1,
      duration: 0.4,
      ease: 'power2.in',
      onUpdate: () => {
        const tt = proxy.t;
        const x = (1 - tt) * (1 - tt) * startX + 2 * (1 - tt) * tt * midX + tt * tt * endX;
        const y = (1 - tt) * (1 - tt) * startY + 2 * (1 - tt) * tt * midY + tt * tt * endY;
        orb.position.set(x, y);
        label.position.set(x, y);
      },
      onComplete: () => {
        orb.destroy();
        label.destroy();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('wordcraft:score-chip-bump', { detail: { score: input.totalScore } }));
        }
        resolve();
      },
    });
  });
}
