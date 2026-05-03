'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

interface Props {
  mode: PracticeMode;
}

/**
 * Small "you nailed it" pill shown inside a sandbox once the player crosses
 * the mode's completion goal. Stays in flow above the chain CTA so the eye
 * naturally moves from "complete" → "continue to next mode".
 */
export default function PracticeCompleteBanner({ mode }: Props) {
  const { t } = useLanguage();
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="practice-complete-banner"
      className="w-full flex items-center gap-2 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black shadow-hard-sm"
    >
      <span aria-hidden className="text-lg">✓</span>
      <span className="font-neo-display font-black text-sm flex-1">
        {t('practice.complete.title')}
      </span>
      <span className="font-neo-body text-xs opacity-80">
        {t(`practice.complete.${mode}`)}
      </span>
    </div>
  );
}
