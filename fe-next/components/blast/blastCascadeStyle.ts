import type { CSSProperties } from 'react';

const STAGGER_MS = 18;
const STAGGER_WRAP = 5;

export function getCascadeFallStyle(distPx: number, col: number): CSSProperties {
  const fallDuration = Math.max(250, 180 + distPx * 0.8);
  const colDelay = (col % STAGGER_WRAP) * STAGGER_MS;
  return {
    animation: `blastTileFall ${fallDuration}ms cubic-bezier(0.4, 0, 0.6, 1) ${colDelay}ms forwards`,
    ['--fall-from' as string]: `-${distPx}px`,
  } as CSSProperties;
}

export function getCascadeLandStyle(): CSSProperties {
  return {
    transform: 'scaleY(1.08) scaleX(0.94)',
    transition: 'transform 100ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  };
}
