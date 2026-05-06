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
      className="min-h-[100dvh] w-full bg-linear-to-b from-neo-navy to-neo-navy-light flex items-center justify-center px-6 py-10"
    >
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md flex flex-col gap-5"
      >
        {/* 2-step progress: intro+tutorial(here) · play */}
        <div className="flex items-center justify-center gap-2" aria-hidden>
          <span className="w-6 h-2 rounded-full bg-neo-lime" />
          <span className="w-2 h-2 rounded-full bg-neo-cream/40" />
        </div>

        {/* Hero illustration — big, friendly, mascot included. Replaces
            the previous tiny 64px mascot circle. The image carries the full
            mechanic story (drag/wheel/wordle-feedback) so tip cards become
            reinforcement, not the primary teaching surface. */}
        <AdaptiveMotion.div
          initial={{ scale: 0.92, rotate: -2 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 18 }}
          className="relative w-full aspect-square max-w-xs mx-auto rounded-neo border-3 border-neo-black overflow-hidden shadow-hard"
        >
          <Image
            src={HERO_FOR_MODE[mode]}
            alt=""
            fill
            sizes="(max-width: 640px) 90vw, 384px"
            className="object-cover"
            draggable={false}
            priority
          />
        </AdaptiveMotion.div>

        <div className="text-center">
          <p className="text-xs font-neo-body text-neo-cream/80 uppercase tracking-wider font-bold">
            {t('gameModes.tutorial.title')}
          </p>
          <h2 className="text-2xl font-neo-display font-bold text-neo-cream mt-1">
            {t(`gameModes.${mode}.name`)}
          </h2>
        </div>

        {/* Greeting line — the charm-prelude that used to live in ModeIntroCard. */}
        <p className="text-sm font-neo-body text-neo-cream/85 italic text-center">
          {t(`gameModes.${mode}.intro.greet`)}
        </p>

        {/* Wordless animated mechanic demo — supplementary motion below the
            static hero. Plays a short loop showing the input gesture. */}
        <PracticeMiniDemo mode={mode} />

        <ol className="flex flex-col gap-3">
          {tipKeys.map((tipKey, idx) => {
            const Icon = icons[idx];
            return (
              <AdaptiveMotion.li
                key={tipKey}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut', delay: 0.15 + idx * 0.08 }}
                className={`flex gap-3 items-center rounded-neo border-2 ${ACCENT_FOR_MODE[mode]} px-4 py-3`}
              >
                <span className={`shrink-0 w-10 h-10 rounded-neo border-2 border-neo-black flex items-center justify-center ${ICON_BG_FOR_MODE[mode]}`}>
                  <Icon className="w-5 h-5" aria-hidden />
                </span>
                <span className="text-sm font-neo-body font-medium text-neo-cream leading-tight">
                  {t(tipKey)}
                </span>
              </AdaptiveMotion.li>
            );
          })}
        </ol>

        <div className="flex flex-col items-center gap-2 mt-1">
          <button
            type="button"
            onClick={handleContinue}
            className="px-8 py-3 rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black font-neo-display font-bold shadow-hard transition-transform active:translate-y-px active:shadow-hard-pressed"
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
