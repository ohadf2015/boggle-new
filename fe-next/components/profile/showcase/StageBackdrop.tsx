'use client';

import React from 'react';
import type { StageTheme } from './profileShowcaseModel';

/**
 * Battle-card backdrop for the profile stage: a slanted, hard-bordered card
 * (neo-brutalist take on the Brawl Stars battle card) whose fill and pattern
 * escalate with the rarest thing the player wears. Pure decoration.
 *
 * The slant is a CSS clip-path shared by three stacked layers (hard shadow,
 * black border, colored fill) so the border stays crisp at any size.
 */

const SLANT = 'polygon(0 4%, 100% 0, 100% 96%, 0 100%)';

function Dots({ theme }: { theme: StageTheme }) {
  const dots: React.ReactNode[] = [];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 11; col++) {
      const r = 3 + row * 1.6;
      dots.push(
        <circle key={`${row}-${col}`} cx={col * 40 + (row % 2) * 20} cy={140 + row * 26} r={r} fill={theme.accent} opacity={0.14 + row * 0.03} />,
      );
    }
  }
  return <g>{dots}</g>;
}

function Rays({ theme }: { theme: StageTheme }) {
  const wedges: React.ReactNode[] = [];
  for (let i = 0; i < 18; i++) {
    const a0 = (i * 20 * Math.PI) / 180;
    const a1 = ((i * 20 + 10) * Math.PI) / 180;
    const R = 420;
    wedges.push(
      <path
        key={i}
        d={`M200 130 L${200 + R * Math.cos(a0)} ${130 + R * Math.sin(a0)} L${200 + R * Math.cos(a1)} ${130 + R * Math.sin(a1)} Z`}
        fill={theme.accent}
        opacity={0.13}
      />,
    );
  }
  return (
    <g className="motion-safe:animate-[spin_60s_linear_infinite]" style={{ transformOrigin: '200px 130px', transformBox: 'view-box' }}>
      {wedges}
    </g>
  );
}

const BUBBLES: ReadonlyArray<readonly [number, number, number, 1 | 2]> = [
  [30, 290, 70, 1], [120, 300, 60, 2], [220, 285, 80, 1], [330, 300, 70, 2], [390, 250, 45, 1],
  [80, 225, 28, 2], [290, 215, 22, 1], [175, 240, 18, 2], [360, 170, 14, 1], [20, 170, 12, 2],
];

function Bubbles({ theme }: { theme: StageTheme }) {
  return (
    <g>
      {BUBBLES.map(([cx, cy, r, tone]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={tone === 1 ? theme.accent : theme.accent2} opacity={tone === 1 ? 0.3 : 0.24} />
      ))}
    </g>
  );
}

const FLAME = 'M0 300 C 10 250, 40 240, 30 190 C 60 220, 70 180, 60 140 C 100 180, 120 210, 110 250 C 130 230, 140 210, 135 180 C 170 220, 175 260, 170 300 Z';

function Flames({ theme }: { theme: StageTheme }) {
  return (
    <g>
      <g className="motion-safe:animate-[pulse_2.4s_ease-in-out_infinite]">
        <path d={FLAME} fill={theme.accent2} opacity={0.55} transform="translate(-10 0) scale(1.4 1)" />
        <path d={FLAME} fill={theme.accent2} opacity={0.5} transform="translate(410 0) scale(-1.5 1.1)" />
      </g>
      <path d={FLAME} fill={theme.accent} opacity={0.75} transform="translate(-20 30) scale(1.1 0.85)" />
      <path d={FLAME} fill={theme.accent} opacity={0.7} transform="translate(420 40) scale(-1.2 0.8)" />
      <path d={FLAME} fill="#fff6d6" opacity={0.55} transform="translate(-30 90) scale(0.8 0.6)" />
    </g>
  );
}

const PATTERNS: Record<StageTheme['pattern'], (p: { theme: StageTheme }) => React.ReactElement> = {
  dots: Dots,
  rays: Rays,
  bubbles: Bubbles,
  flames: Flames,
};

export function StageBackdrop({ theme }: { theme: StageTheme }): React.ReactElement {
  const Pattern = PATTERNS[theme.pattern];
  return (
    <div className="absolute inset-0" aria-hidden data-testid="stage-backdrop" data-rarity={theme.rarity}>
      {/* hard shadow */}
      <div className="absolute inset-0 translate-x-[6px] translate-y-[6px] bg-neo-black" style={{ clipPath: SLANT }} />
      {/* border */}
      <div className="absolute inset-0 bg-neo-black" style={{ clipPath: SLANT }} />
      {/* fill + pattern */}
      <div
        className="absolute inset-[4px] overflow-hidden"
        style={{ clipPath: SLANT, background: `linear-gradient(170deg, ${theme.from} 0%, ${theme.to} 100%)` }}
      >
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full">
          <Pattern theme={theme} />
        </svg>
        <div className="absolute inset-0 texture-halftone-comic opacity-20 mix-blend-overlay" />
      </div>
    </div>
  );
}

export default StageBackdrop;
