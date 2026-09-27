'use client';

import type { CSSProperties } from 'react';
import { SPECKS, STREAKS, raysGradient, type RevealTheme } from './revealTheme';

/** Default burst center (before the stage is measured). */
export const BURST_CENTER_X = '50%';
export const BURST_CENTER_Y = '42%';

/**
 * Full-screen rarity light burst behind the reveal: radial field, slowly
 * spinning conic rays, speed streaks and star specks. Purely decorative.
 * The field is painted at full strength from frame one (no fade on the
 * full-screen layer); only the thin streaks / specks animate opacity.
 */
export default function RevealBurst({ theme, centerX = BURST_CENTER_X, centerY = BURST_CENTER_Y }: { theme: RevealTheme; centerX?: string; centerY?: string }) {
  const field: CSSProperties = {
    background: `radial-gradient(circle at ${centerX} ${centerY}, ${theme.core} 0%, ${theme.hex} 9%, ${theme.field} 30%, ${theme.deep} 62%, rgba(11,16,38,0.96) 100%)`,
  };
  const rays: CSSProperties = {
    left: centerX,
    top: centerY,
    transform: 'translate(-50%, -50%)',
    background: raysGradient(theme),
    WebkitMaskImage: 'radial-gradient(circle, #000 6%, rgba(0,0,0,0.55) 30%, transparent 62%)',
    maskImage: 'radial-gradient(circle, #000 6%, rgba(0,0,0,0.55) 30%, transparent 62%)',
  };

  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0" style={field} />
      <div
        className="lcr-anim lcr-rays absolute w-[190vmax] h-[190vmax] mix-blend-screen opacity-70"
        style={rays}
      />
      {/* halftone grit, brand texture */}
      <div
        className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1.4px)', backgroundSize: '7px 7px' }}
      />
      {STREAKS.map((s, i) => (
        <span
          key={i}
          className="lcr-anim lcr-streak absolute h-[3px] rounded-full origin-left"
          style={{
            left: centerX,
            top: centerY,
            width: `${s.len}vmax`,
            background: `linear-gradient(90deg, transparent, ${theme.rays[i % theme.rays.length]}, #fff)`,
            animationDelay: `${s.delay}s`,
            ['--a' as string]: `${s.angle}deg`,
            transform: `rotate(${s.angle}deg) translateX(20vmax)`,
            opacity: 0.8,
          }}
        />
      ))}
      {SPECKS.map((p, i) => (
        <span
          key={i}
          className="lcr-anim lcr-twinkle absolute rounded-full bg-white"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, animationDelay: `${p.d}s`, opacity: 0.7 }}
        />
      ))}
    </div>
  );
}
