import { Graphics } from 'pixi.js';
import gsap from 'gsap';
import type { SceneCtx } from './sceneCtx';
import type { PremiumKind } from '../types';

const TINT_BY_PREMIUM: Record<PremiumKind, number> = {
  TW: 0xff1493,
  DW: 0xbfff00,
  TL: 0x00ffff,
  DL: 0x8b5cf6,
};

export interface PremiumCellRef {
  row: number;
  col: number;
  kind: PremiumKind;
}

export interface AmbientHandle {
  destroy(): void;
}

export function mountAmbientSparkles(
  ctx: SceneCtx,
  premiumCells: readonly PremiumCellRef[],
): AmbientHandle {
  if (ctx.reducedMotion) {
    return { destroy() {} };
  }
  const sparkles: Graphics[] = [];
  const boardRect = ctx.coords.cellRect(0, 0);
  for (const cell of premiumCells) {
    const rect = ctx.coords.cellRect(cell.row, cell.col);
    if (!rect) continue;
    const offsetX = boardRect ? rect.x - boardRect.x : rect.x;
    const offsetY = boardRect ? rect.y - boardRect.y : rect.y;

    const g = new Graphics();
    g.circle(0, 0, 2).fill({ color: TINT_BY_PREMIUM[cell.kind], alpha: 0.85 });
    g.position.set(offsetX + rect.width * 0.5, offsetY + rect.height * 0.5);
    g.alpha = 0;
    ctx.ambientLayer.addChild(g);

    gsap.to(g, {
      alpha: 0.9,
      duration: 0.8 + Math.random() * 0.6,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      delay: Math.random() * 1.2,
    });
    sparkles.push(g);
  }
  return {
    destroy() {
      for (const s of sparkles) {
        gsap.killTweensOf(s);
        s.destroy();
      }
    },
  };
}
