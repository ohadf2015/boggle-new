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
}

const MASCOT_FOR_MODE: Record<IntroMode, string> = {
  classic: '/mascot/scholar.webp',
  blast: '/mascot/bomber.webp',
  wordHunt: '/mascot/explorer.webp',
  wheelRush: '/mascot/dj.webp',
};

const RING_FOR_MODE: Record<IntroMode, string> = {
  classic: 'bg-neo-cyan/20 border-neo-cyan/40',
  blast: 'bg-neo-pink/20 border-neo-pink/40',
  wordHunt: 'bg-neo-lime/20 border-neo-lime/40',
  wheelRush: 'bg-neo-purple/20 border-neo-purple/40',
};

/**
 * Cozy first-time mode intro. One mascot, one description, one CTA.
 * No timer, no leaderboard, no data clutter. Skippable.
 */
const ModeIntroCard: React.FC<ModeIntroCardProps> = ({ mode, t, onContinue }) => {
  const { playButtonClickSound } = useSoundEffects();
  const handleContinue = () => {
    playButtonClickSound();
    haptics.tap();
    onContinue();
  };
  const name = t(`gameModes.${mode}.name`);
  const description = t(`gameModes.${mode}.description`);
  const greet = t(`gameModes.${mode}.intro.greet`);
  const cta = t('gameModes.intro.cta');
  const skip = t('gameModes.intro.skip');

  return (
    <div className="h-full bg-linear-to-b from-neo-navy to-neo-navy-light flex items-center justify-center px-6">
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center text-center max-w-sm gap-6"
      >
        <AdaptiveMotion.div
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className={`w-32 h-32 rounded-full border-2 flex items-center justify-center ${RING_FOR_MODE[mode]}`}
          aria-hidden
        >
          <Image
            src={MASCOT_FOR_MODE[mode]}
            alt=""
            width={96}
            height={96}
            className="object-contain"
            draggable={false}
            priority
          />
        </AdaptiveMotion.div>

        <p className="text-sm font-neo-body text-neo-cream/70 italic">
          {greet}
        </p>

        <h1 className="text-3xl font-neo-display font-bold text-neo-cream">
          {name}
        </h1>

        <p className="text-base font-neo-body text-neo-cream/80 leading-relaxed">
          {description}
        </p>

        <button
          type="button"
          onClick={handleContinue}
          className="mt-2 px-8 py-3 rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black font-neo-display font-bold shadow-hard transition-transform active:translate-y-px active:shadow-hard-pressed"
        >
          {cta}
        </button>

        <button
          type="button"
          onClick={handleContinue}
          className="text-xs text-neo-cream/50 underline-offset-4 hover:underline focus-visible:underline"
        >
          {skip}
        </button>
      </AdaptiveMotion.div>
    </div>
  );
};

export default ModeIntroCard;
