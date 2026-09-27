'use client';

import type { CSSProperties } from 'react';
import type { RevealTheme } from './revealTheme';

type Shape = 'chip' | 'ribbon' | 'dot' | 'star';

interface Piece {
  /** final offset from the burst center, in vmin */
  x: number;
  y: number;
  rot: number;
  shape: Shape;
  color: number;
  delay: number;
}

const SHAPES: readonly Shape[] = ['chip', 'ribbon', 'star', 'dot', 'chip', 'ribbon'];
const FOUR_POINT = 'polygon(50% 0%, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0% 50%, 38% 38%)';

/**
 * Deterministic burst (no Math.random: no hydration drift, stable captures).
 * Pieces land in a wide ring around the stage, stretched vertically for phones,
 * and STAY there: the settled frame is the mid-explosion pose, so a still
 * screenshot and prefers-reduced-motion both show the celebration.
 */
export const CONFETTI: readonly Piece[] = Array.from({ length: 22 }, (_, i) => {
  const h = (Math.imul(i + 7, 2654435761) >>> 0);
  const angle = (i / 22) * Math.PI * 2 + ((h % 100) / 100 - 0.5) * 0.5;
  const dist = 40 + (h >>> 7) % 24; // 40..63 vmin: a ring around the stage, clear of the avatar
  return {
    x: Math.round(Math.cos(angle) * dist),
    y: Math.round(Math.sin(angle) * dist * 1.45),
    rot: (h >>> 3) % 360,
    shape: SHAPES[i % SHAPES.length],
    color: (h >>> 11) % 5,
    delay: ((h >>> 5) % 12) * 12,
  };
});

function pieceBox(shape: Shape): CSSProperties {
  switch (shape) {
    case 'chip': return { width: 12, height: 18, borderRadius: 2 };
    case 'ribbon': return { width: 7, height: 26, borderRadius: 3 };
    case 'dot': return { width: 12, height: 12, borderRadius: '50%' };
    case 'star': return { width: 22, height: 22, clipPath: FOUR_POINT, border: 'none' };
  }
}

export default function RevealConfetti({ theme, centerX = '50%', centerY }: { theme: RevealTheme; centerX?: string; centerY: string }) {
  // rarity colors + the brand lime, so even a silver burst reads as a party
  const palette = [theme.hex, theme.field, ...theme.rays, '#BFFF00'];
  return (
    <div data-testid="unlock-reveal-confetti" aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      {CONFETTI.map((p, i) => (
        <span
          key={i}
          className="lcr-anim lcr-burst absolute"
          style={{
            left: centerX,
            top: centerY,
            transform: `translate(-50%, -50%) translate(${p.x}vmin, ${p.y}vmin) rotate(${p.rot}deg)`,
            animationDelay: `${p.delay}ms`,
          }}
        >
          <span
            className="lcr-anim lcr-flutter block border-2 border-black"
            style={{
              ...pieceBox(p.shape),
              background: palette[p.color % palette.length],
              animationDelay: `${900 + p.delay * 3}ms`,
            }}
          />
        </span>
      ))}
    </div>
  );
}
