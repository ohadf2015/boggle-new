'use client';

import React from 'react';
import Image from 'next/image';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics';
import type { IntroMode } from '@/hooks/useModeFirstSeen';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

export interface ModeIntroCardProps {
  mode: IntroMode;
  t: TFunction;
  onContinue: () => void;
  /**
   * Optional skip handler — if provided, the "skip" link bypasses the tutorial
   * and jumps straight to play. If omitted, falls back to onContinue (so the
   * link is functional but goes to whatever onContinue routes to).
   */
  onSkip?: () => void;
}

const MASCOT_FOR_MODE: Record<IntroMode, string> = {
  classic: '/mascot/scholar.webp',
  blast: '/mascot/bomber.webp',
  wordHunt: '/mascot/explorer.webp',
  wheelRush: '/mascot/dj.webp',
};

const RING_FOR_MODE: Record<IntroMode, string> = {
  classic: 'bg-neo-cyan/35 border-neo-cyan',
  blast: 'bg-neo-pink/35 border-neo-pink',
  wordHunt: 'bg-neo-lime/35 border-neo-lime',
  wheelRush: 'bg-neo-purple/35 border-neo-purple',
};

/**
 * Cozy first-time mode intro. One mascot, one description, one CTA.
 * No timer, no leaderboard, no data clutter. Skippable.
 */
const ModeIntroCard: React.FC<ModeIntroCardProps> = ({ mode, t, onContinue, onSkip }) => {
  const { playButtonClickSound } = useSoundEffects();
  const handleContinue = () => {
    playButtonClickSound();
    haptics.tap();
    onContinue();
  };
  const handleSkip = () => {
    playButtonClickSound();
    haptics.tap();
    (onSkip ?? onContinue)();
  };
  const name = t(`gameModes.${mode}.name`);
  const description = t(`gameModes.${mode}.description`);
  const greet = t(`gameModes.${mode}.intro.greet`);
  const cta = t('gameModes.intro.cta');
  const skip = t('gameModes.intro.skip');

  return (
    <div className="min-h-[100dvh] w-full bg-linear-to-b from-neo-navy to-neo-navy-light flex flex-col items-center justify-center px-6 py-10">
      <div className="flex items-center justify-center gap-2 mb-6" aria-hidden>
        <span className="w-6 h-2 rounded-full bg-neo-lime" />
        <span className="w-2 h-2 rounded-full bg-neo-cream/60" />
        <span className="w-2 h-2 rounded-full bg-neo-cream/40" />
      </div>
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center text-center max-w-sm gap-6"
      >
        <AdaptiveMotion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className={`relative w-32 h-32 rounded-full border-2 overflow-hidden flex items-center justify-center ${RING_FOR_MODE[mode]}`}
          aria-hidden
        >
          <Image
            src={MASCOT_FOR_MODE[mode]}
            alt=""
            width={96}
            height={96}
            className="object-contain rounded-full"
            draggable={false}
            priority
          />
        </AdaptiveMotion.div>

        <p className="text-sm font-neo-body text-neo-cream/90 italic">
          {greet}
        </p>

        <h1 className="text-3xl font-neo-display font-bold text-neo-cream">
          {name}
        </h1>

        <p className="text-base font-neo-body text-neo-cream leading-relaxed">
          {description}
        </p>

        <button
          type="button"
          onClick={handleContinue}
          className="mt-2 px-8 py-3 rounded-neo border-2 border-neo-black bg-neo-cozy text-neo-black font-neo-display font-bold shadow-hard transition active:translate-y-px active:shadow-hard-pressed hover:-translate-y-1 hover:shadow-hard-xl focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cozy"
        >
          {cta}
        </button>

        <button
          type="button"
          onClick={handleSkip}
          className="text-xs text-neo-cream/70 underline-offset-4 hover:underline focus-visible:underline hover:text-neo-cream focus-visible:text-neo-cream transition-colors"
        >
          {skip}
        </button>
      </AdaptiveMotion.div>
    </div>
  );
};

export default ModeIntroCard;
