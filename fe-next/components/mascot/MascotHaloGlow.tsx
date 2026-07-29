'use client';

import { memo, type CSSProperties, type ReactNode } from 'react';

export type HaloIntensity = 'subtle' | 'medium' | 'bold';
export type HaloTone = 'pink-cyan' | 'lime-cyan' | 'purple-pink' | 'yellow-orange';

const TONE_STOPS: Record<HaloTone, { inner: string; mid: string }> = {
  'pink-cyan': { inner: 'rgba(255,20,147,1)', mid: 'rgba(0,255,255,1)' },
  'lime-cyan': { inner: 'rgba(191,255,0,1)', mid: 'rgba(0,255,255,1)' },
  'purple-pink': { inner: 'rgba(139,92,246,1)', mid: 'rgba(255,20,147,1)' },
  'yellow-orange': { inner: 'rgba(255,225,53,1)', mid: 'rgba(255,107,53,1)' },
};

const INTENSITY: Record<HaloIntensity, { innerAlpha: number; midAlpha: number; blur: number; scaleHi: number }> = {
  subtle: { innerAlpha: 0.25, midAlpha: 0.18, blur: 18, scaleHi: 1.04 },
  medium: { innerAlpha: 0.45, midAlpha: 0.35, blur: 12, scaleHi: 1.08 },
  bold: { innerAlpha: 0.65, midAlpha: 0.5, blur: 10, scaleHi: 1.12 },
};

export interface MascotHaloGlowProps {
  children: ReactNode;
  tone?: HaloTone;
  intensity?: HaloIntensity;
  /** Disable pulse animation (still renders the static glow) */
  paused?: boolean;
  /** Extra Tailwind/CSS class on the outer wrapper */
  className?: string;
  /** Halo size multiplier (1 = matches content). Default 1.1 */
  scale?: number;
  /**
   * Extra CSS on the wrapper (e.g. `{ width: '100%', height: '100%' }` when
   * the parent is sized and the child uses Image `fill`).
   * `position: relative` is always enforced — it must remain to keep the
   * absolute halo and children stacked correctly.
   */
  wrapperStyle?: CSSProperties;
}

function rgbaWithAlpha(rgba: string, alpha: number): string {
  // Convert "rgba(r,g,b,1)" → "rgba(r,g,b,alpha)"
  return rgba.replace(/[\d.]+\)$/, `${alpha})`);
}

/**
 * Pulsing radial brand glow behind a mascot (or any focal element).
 * Pink→cyan default — matches LexiClash neo-brutalist palette.
 * Auto-disables animation under prefers-reduced-motion.
 */
export const MascotHaloGlow = memo(function MascotHaloGlow({
  children,
  tone = 'pink-cyan',
  intensity = 'medium',
  paused = false,
  className = '',
  scale = 1.1,
  wrapperStyle: extraWrapperStyle,
}: MascotHaloGlowProps) {
  const stops = TONE_STOPS[tone];
  const cfg = INTENSITY[intensity];
  const sizePct = `${scale * 100}%`;
  const animKey = `mascotHaloPulse_${tone}_${intensity}`;

  // Always enforce position:relative so the absolute halo + children stack.
  const wrapperStyle: CSSProperties = { ...extraWrapperStyle, position: 'relative' };
  const haloStyle: CSSProperties = {
    position: 'absolute',
    inset: 0,
    margin: 'auto',
    height: sizePct,
    width: sizePct,
    borderRadius: '50%',
    zIndex: -1,
    pointerEvents: 'none',
    filter: `blur(${cfg.blur}px)`,
    background: `radial-gradient(circle, ${rgbaWithAlpha(stops.inner, cfg.innerAlpha)} 0%, ${rgbaWithAlpha(stops.mid, cfg.midAlpha)} 45%, transparent 70%)`,
    animation: paused ? undefined : `${animKey} 2.2s ease-in-out infinite`,
  };

  return (
    <div className={className} style={wrapperStyle}>
      <style>{`
        @keyframes ${animKey} {
          0%, 100% { transform: scale(1);   opacity: 0.55; }
          50%      { transform: scale(${cfg.scaleHi}); opacity: 0.95; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lc-halo-${tone}-${intensity} { animation: none !important; }
        }
      `}</style>
      <span aria-hidden className={`lc-halo-${tone}-${intensity}`} style={haloStyle} />
      {children}
    </div>
  );
});
