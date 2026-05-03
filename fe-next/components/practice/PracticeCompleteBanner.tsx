'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { usePracticeStreak } from '@/hooks/usePracticeStreak';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

interface Props {
  mode: PracticeMode;
}

/**
 * Small "you nailed it" pill shown inside a sandbox once the player crosses
 * the mode's completion goal. Pops in (spring) so the moment registers; stays
 * in flow above the chain CTA so the eye naturally moves from "complete" →
 * "continue to next mode".
 *
 * Folds in the practice-streak chip when active so the milestone is felt
 * where it's earned (the player just bumped the streak — show it now, not
 * only on the hub).
 */
export default function PracticeCompleteBanner({ mode }: Props) {
  const { t } = useLanguage();
  const { current: streakDay } = usePracticeStreak();

  return (
    <AdaptiveMotion.div
      role="status"
      aria-live="polite"
      data-testid="practice-complete-banner"
      initial={{ opacity: 0, scale: 0.85, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 18 }}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black shadow-hard-sm"
    >
      <span aria-hidden className="text-lg">✓</span>
      <span className="font-neo-display font-black text-sm flex-1">
        {t('practice.complete.title')}
      </span>
      {streakDay > 0 && (
        <span
          data-testid="practice-complete-banner-streak"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-neo border-2 border-neo-black bg-neo-orange text-neo-black font-neo-display font-black text-[11px] uppercase tracking-wider"
        >
          <span aria-hidden>🔥</span>
          {t('practiceHub.streakDays', { count: streakDay })}
        </span>
      )}
      <span className="font-neo-body text-xs opacity-80">
        {t(`practice.complete.${mode}`)}
      </span>
    </AdaptiveMotion.div>
  );
}
