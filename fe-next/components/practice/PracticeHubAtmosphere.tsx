'use client';

import { useEffect, useState } from 'react';

const usePrefersReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return reduced;
};

interface OrbConfig {
  id: string;
  className: string;
  style: React.CSSProperties;
}

const ORBS: OrbConfig[] = [
  {
    id: 'lime',
    className: 'bg-neo-lime/25',
    style: {
      width: '38vmin',
      height: '38vmin',
      top: '-8vmin',
      left: '-6vmin',
      animation: 'practice-hub-orb-a 17s ease-in-out infinite',
    },
  },
  {
    id: 'cyan',
    className: 'bg-neo-cyan/22',
    style: {
      width: '46vmin',
      height: '46vmin',
      top: '22vmin',
      right: '-12vmin',
      animation: 'practice-hub-orb-b 21s ease-in-out infinite',
    },
  },
  {
    id: 'pink',
    className: 'bg-neo-pink/20',
    style: {
      width: '34vmin',
      height: '34vmin',
      bottom: '-6vmin',
      left: '14vmin',
      animation: 'practice-hub-orb-c 25s ease-in-out infinite',
    },
  },
  {
    id: 'purple',
    className: 'bg-neo-purple/22',
    style: {
      width: '28vmin',
      height: '28vmin',
      top: '46vmin',
      left: '-4vmin',
      animation: 'practice-hub-orb-d 19s ease-in-out infinite',
    },
  },
];

/**
 * Ambient atmosphere layer behind the practice hub. Iridescent floating orbs
 * + soft gradient mesh add depth without competing with content. Pure CSS,
 * no JS animation loop. Sits at z-index 0; hub content layers above.
 *
 * Reduced motion: orbs render in their first keyframe state (decorative
 * color wash) but animations pause. Layer never blocks input.
 */
export default function PracticeHubAtmosphere() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div
      data-testid="practice-hub-atmosphere"
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 22% 14%, rgba(191,255,0,0.10), transparent 55%), ' +
          'radial-gradient(ellipse at 82% 78%, rgba(255,20,147,0.10), transparent 55%), ' +
          'radial-gradient(ellipse at 50% 50%, rgba(0,255,255,0.06), transparent 60%)',
      }}
    >
      {/* Soft halftone grain — noise texture for "real" depth, not flat color. */}
      <div
        className="absolute inset-0 opacity-30 mix-blend-overlay"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.10) 1px, transparent 1px)',
          backgroundSize: '3px 3px',
        }}
      />

      {ORBS.map((orb) => (
        <div
          key={orb.id}
          data-testid={`practice-hub-atmosphere-orb-${orb.id}`}
          className={`absolute rounded-full blur-3xl ${orb.className}`}
          style={{
            ...orb.style,
            ...(reducedMotion ? { animation: 'none' } : null),
          }}
        />
      ))}

      {/* Scoped keyframes — kept inline so the layer is a single self-contained
          file. compositor-only transforms (translate + scale) so paint stays cheap. */}
      <style>{`
        @keyframes practice-hub-orb-a {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(8vmin, 6vmin, 0) scale(1.12); }
        }
        @keyframes practice-hub-orb-b {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(-10vmin, -4vmin, 0) scale(1.08); }
        }
        @keyframes practice-hub-orb-c {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(6vmin, -8vmin, 0) scale(1.15); }
        }
        @keyframes practice-hub-orb-d {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(-4vmin, 10vmin, 0) scale(1.10); }
        }
      `}</style>
    </div>
  );
}
