'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { haptics } from '@/utils/haptics';
import {
  PRACTICE_MODES,
  getNextPracticeMode,
  nextPracticeUrl,
} from '@/lib/practice/practiceRoute';
import { trackPracticeChainClicked } from '@/lib/practice/telemetry';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

interface Props {
  currentMode: PracticeMode;
  className?: string;
}

const dotState = (
  dotIdx: number,
  currentIdx: number,
  isChainComplete: boolean
): 'done' | 'next' | 'pending' => {
  if (isChainComplete) return 'done';
  if (dotIdx <= currentIdx) return 'done';
  if (dotIdx === currentIdx + 1) return 'next';
  return 'pending';
};

const DOT_CLASS: Record<'done' | 'next' | 'pending', string> = {
  done: 'bg-neo-lime border-neo-black',
  next: 'bg-neo-cream/90 border-neo-black animate-pulse',
  pending: 'bg-neo-cream/20 border-neo-cream/40',
};

/**
 * Chain CTA — handoff from one finished practice mode to the next, or to the
 * hub when the chain is complete. Built for momentum: progress dots make the
 * "X of 3" position legible at a glance, sound + haptic cement the tap, and
 * telemetry lets us measure where the chain breaks.
 *
 * Audit ref: practice/onboarding audit 2026-05-03 §2 ("Chain CTA flat").
 */
export default function PracticeChainCta({ currentMode, className }: Props) {
  const { language, t } = useLanguage();
  const { playButtonClickSound } = useSoundEffects();
  const next = getNextPracticeMode(currentMode);
  const href = nextPracticeUrl(currentMode, language);
  const label = next ? t(`practice.continueTo.${next}`) : t('practice.allDone');

  const currentIdx = PRACTICE_MODES.indexOf(currentMode);
  const isChainComplete = next === null;

  const handleClick = () => {
    playButtonClickSound();
    haptics.tap();
    trackPracticeChainClicked({ fromMode: currentMode, toMode: next });
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div className="flex items-center gap-2" aria-hidden>
        {PRACTICE_MODES.map((mode, idx) => {
          const state = dotState(idx, currentIdx, isChainComplete);
          return (
            <span
              key={mode}
              data-testid={`practice-chain-dot-${mode}`}
              data-state={state}
              className={`block w-2.5 h-2.5 rounded-full border-2 transition-colors ${DOT_CLASS[state]}`}
            />
          );
        })}
      </div>
      <Link
        href={href}
        onClick={handleClick}
        data-testid="practice-chain-cta"
        className={
          className ??
          'inline-flex items-center justify-center w-full bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo py-3 px-4 font-neo-display font-black text-base shadow-hard active:shadow-hard-pressed active:translate-x-[1px] active:translate-y-[1px]'
        }
      >
        {label}
      </Link>
    </div>
  );
}
