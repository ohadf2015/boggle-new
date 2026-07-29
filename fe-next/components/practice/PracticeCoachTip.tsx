'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  tutorialTipKeys,
  TUTORIAL_TIP_COUNT,
  type PracticeMode,
} from '@/lib/practice/practiceTutorialSteps';

interface Props {
  mode: PracticeMode;
  /** Words found so far in the current run — once >= 1 the coach auto-hides. */
  wordsFound?: number;
  /** Milliseconds between tip rotations. */
  rotateMs?: number;
  className?: string;
}

const DEFAULT_ROTATE_MS = 7000;

/**
 * Inline coaching tip shown during a practice run. Rotates through the same 3
 * mode-specific tips that the pre-game intro uses, so the player can keep
 * referring back without leaving the board. Hides itself once the player
 * forms their first word (they "got it") or taps dismiss.
 */
export default function PracticeCoachTip({
  mode,
  wordsFound = 0,
  rotateMs = DEFAULT_ROTATE_MS,
  className,
}: Props) {
  const { t } = useLanguage();
  const tips = useMemo(() => tutorialTipKeys(mode), [mode]);
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % TUTORIAL_TIP_COUNT),
      rotateMs,
    );
    return () => clearInterval(id);
  }, [rotateMs, dismissed]);

  if (dismissed || wordsFound > 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="practice-coach-tip"
      className={
        className ??
        'mx-auto w-full max-w-md flex items-center gap-2 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-cream/95 text-neo-black shadow-hard-sm'
      }
    >
      <span className="font-neo-display font-black text-xs uppercase shrink-0">
        {t('practice.coach.label')}
      </span>
      <span className="font-neo-body text-sm flex-1 leading-snug">
        {t(tips[index])}
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-neo-black/60 text-xs underline underline-offset-2 hover:text-neo-black shrink-0"
      >
        {t('practice.coach.dismiss')}
      </button>
    </div>
  );
}
