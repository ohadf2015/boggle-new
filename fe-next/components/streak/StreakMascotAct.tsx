'use client';

import { useEffect } from 'react';
import { m } from 'framer-motion';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useReducedEffects } from '@/hooks/useReducedEffects';
import useReducedMotion from '@/hooks/useReducedMotion';

export type StreakAct = 'launch' | 'iceBreak';

/** Seconds into the act when the action lands: the cry plays on this beat. */
const ACTION_BEAT_S: Record<StreakAct, number> = { launch: 0.45, iceBreak: 0.7 };
// Wind-up → fast action → freeze-frame → reaction.
const TIMES = [0, 0.25, 0.4, 0.62, 0.8, 1];

interface StreakMascotActProps {
  act: StreakAct;
  src: string;
  size: number;
  className?: string;
}

/** The mascot acts out a streak moment; a still pose under reduce effects or reduced motion. */
export function StreakMascotAct({ act, src, size, className = '' }: StreakMascotActProps) {
  const [reducedEffects] = useReducedEffects();
  const reducedMotion = useReducedMotion();
  const { playSound } = useSoundEffects();
  const still = reducedEffects || reducedMotion;

  useEffect(() => {
    if (still) return undefined;
    const timer = setTimeout(() => playSound('mascotCheer', { rate: 1.35, requiresGameActive: false }), ACTION_BEAT_S[act] * 1000);
    return () => clearTimeout(timer);
  }, [act, still, playSound]);

  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- small decorative mascot
    <img src={src} alt="" width={size} height={size} draggable={false} className="h-full w-full object-contain" />
  );

  if (still) {
    return (
      <span data-testid="streak-mascot-act" data-act={act} data-still="true" className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
        {img}
      </span>
    );
  }

  if (act === 'launch') {
    return (
      <m.span
        data-testid="streak-mascot-act"
        data-act={act}
        className={`relative inline-block origin-bottom ${className}`}
        style={{ width: size, height: size }}
        animate={{
          scaleX: [1, 1.25, 0.82, 0.82, 1.15, 1],
          scaleY: [1, 0.7, 1.22, 1.22, 0.88, 1],
          y: [0, 8, -38, -38, 0, 0],
          rotate: [0, -4, 8, 8, -6, 0],
        }}
        transition={{ duration: 1.3, times: TIMES, ease: 'easeOut' }}
      >
        {img}
      </m.span>
    );
  }

  return (
    <span data-testid="streak-mascot-act" data-act={act} className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <m.span
        className="absolute inset-0 block"
        animate={{ x: [0, -3, 3, 0, 0, 0], rotate: [0, 0, 0, 0, -10, 0], y: [0, 0, 0, 0, -10, 0] }}
        transition={{ duration: 1.6, times: TIMES }}
      >
        {img}
      </m.span>
      {/* The ice cube shakes, cracks off, hangs a beat as shards, then is gone. */}
      <m.span
        aria-hidden="true"
        data-testid="streak-mascot-ice"
        className="absolute -inset-1 rounded-lg border-[3px] border-neo-cyan bg-neo-cyan/35"
        initial={{ scale: 1, opacity: 1 }}
        animate={{ x: [0, -4, 4, -4, 0, 0], scale: [1, 1, 1, 1.35, 1.5, 1.5], opacity: [1, 1, 1, 0.6, 0, 0] }}
        transition={{ duration: 1.6, times: TIMES }}
      />
    </span>
  );
}

export default StreakMascotAct;
