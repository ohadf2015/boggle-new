'use client';

import React from 'react';
import Image from 'next/image';
import { Move, TrendingUp, Compass, Target, Route, Disc, Hand, Plus, type LucideIcon } from 'lucide-react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics';
import PracticeMiniDemo from './PracticeMiniDemo';
import { tutorialTipKeys, type PracticeMode } from '@/lib/practice/practiceTutorialSteps';

type TFunction = (key: string, params?: Record<string, string | number>) => string;

// Hero illustrations — same as the practice hub tile thumbnails AND the
// in-game help modal. One image, three places, consistent visual story.
const HERO_FOR_MODE: Record<PracticeMode, string> = {
  classic: '/practice/help/practice-help-classic.jpg',
  wordHunt: '/practice/help/practice-help-wordhunt.jpg',
  wheelRush: '/practice/help/practice-help-wheelrush.jpg',
};

const ACCENT_FOR_MODE: Record<PracticeMode, string> = {
  classic: 'border-neo-cyan/70 bg-neo-cyan/15',
  wordHunt: 'border-neo-lime/70 bg-neo-lime/15',
  wheelRush: 'border-neo-purple/70 bg-neo-purple/15',
};

const ICON_BG_FOR_MODE: Record<PracticeMode, string> = {
  classic: 'bg-neo-cyan/30 text-neo-cyan',
  wordHunt: 'bg-neo-lime/30 text-neo-lime',
  wheelRush: 'bg-neo-purple/30 text-neo-purple',
};

const TIP_ICONS: Record<PracticeMode, [LucideIcon, LucideIcon, LucideIcon]> = {
  classic: [Move, TrendingUp, Compass],
  wordHunt: [Target, Move, Route],
  wheelRush: [Disc, Hand, Plus],
};

export interface PracticeTutorialSheetProps {
  mode: PracticeMode;
  t: TFunction;
  onContinue: () => void;
  /**
   * Optional skip handler — bypasses the tutorial and jumps straight to play.
   * If omitted, the skip button calls onContinue (so it stays functional but
   * routes wherever the parent decides).
   */
  onSkip?: () => void;
}

/**
 * Merged practice intro + tutorial sheet (was two separate full-screen modals
 * before 2026-05-03). Combines the warm greeting from the deprecated
 * `ModeIntroCard` with the 3-tip tutorial layout, dropping a full-screen tap
 * from every new-mode entry.
 *
 * Audit ref: practice/onboarding audit 2026-05-03 §3 ("Double-modal intro").
 */
const PracticeTutorialSheet: React.FC<PracticeTutorialSheetProps> = ({ mode, t, onContinue, onSkip }) => {
  const { playButtonClickSound } = useSoundEffects();
  const tipKeys = tutorialTipKeys(mode);
  const icons = TIP_ICONS[mode];

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

  return (
    <div
      data-testid="practice-tutorial-sheet"
      className="min-h-[100dvh] w-full bg-linear-to-b from-neo-navy to-neo-navy-light flex items-center justify-center px-5 py-5 sm:py-8"
    >
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md flex flex-col gap-3 sm:gap-4"
      >
        {/* Compact header: progress dots + title side-by-side mascot demo —
            replaces the prior stacked hero + greeting + demo (3 large blocks)
            with a single tight row, cutting ~280px of vertical real-estate so
            the whole sheet fits on a 640px viewport without scrolling. */}
        <div className="flex items-center gap-3">
          <AdaptiveMotion.div
            initial={{ scale: 0.92, rotate: -2 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 18 }}
            className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-neo border-2 border-neo-black overflow-hidden shadow-hard-sm"
          >
            <Image
              src={HERO_FOR_MODE[mode]}
              alt=""
              fill
              sizes="96px"
              className="object-cover"
              draggable={false}
              priority
            />
          </AdaptiveMotion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1" aria-hidden>
              <span className="w-5 h-1.5 rounded-full bg-neo-lime" />
              <span className="w-1.5 h-1.5 rounded-full bg-neo-cream/40" />
            </div>
            <p className="text-[0.65rem] font-neo-body text-neo-cream/70 uppercase tracking-wider font-bold leading-none">
              {t('gameModes.tutorial.title')}
            </p>
            <h2 className="text-xl sm:text-2xl font-neo-display font-bold text-neo-cream mt-0.5 truncate">
              {t(`gameModes.${mode}.name`)}
            </h2>
            <p className="text-xs font-neo-body text-neo-cream/85 italic mt-0.5 line-clamp-2">
              {t(`gameModes.${mode}.intro.greet`)}
            </p>
          </div>
        </div>

        <PracticeMiniDemo mode={mode} />

        <ol className="flex flex-col gap-2">
          {tipKeys.map((tipKey, idx) => {
            const Icon = icons[idx];
            return (
              <AdaptiveMotion.li
                key={tipKey}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 + idx * 0.06 }}
                className={`flex gap-3 items-center rounded-neo border-2 ${ACCENT_FOR_MODE[mode]} px-3 py-2`}
              >
                <span className={`shrink-0 w-8 h-8 rounded-neo border-2 border-neo-black flex items-center justify-center ${ICON_BG_FOR_MODE[mode]}`}>
                  <Icon className="w-4 h-4" aria-hidden />
                </span>
                <span className="text-sm font-neo-body font-medium text-neo-cream leading-tight">
                  {t(tipKey)}
                </span>
              </AdaptiveMotion.li>
            );
          })}
        </ol>

        <div className="flex flex-col items-center gap-1.5 mt-1">
          <button
            type="button"
            onClick={handleContinue}
            className="w-full px-8 py-3 rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black font-neo-display font-bold shadow-hard transition-transform active:translate-y-px active:shadow-hard-pressed"
          >
            {t('gameModes.tutorial.cta')}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-neo-cream/50 underline-offset-4 hover:underline focus-visible:underline"
          >
            {t('gameModes.intro.skip')}
          </button>
        </div>
      </AdaptiveMotion.div>
    </div>
  );
};

export default PracticeTutorialSheet;
