'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { usePracticeStreak } from '@/hooks/usePracticeStreak';

/**
 * Renders the practice-streak day count on the hub. Hidden when streak == 0
 * so first-time players aren't presented a "Day 0" zero-state. Pop-in spring
 * animation on first appearance so the moment a streak starts is visible.
 *
 * Reactive: subscribes via `useSyncExternalStore` inside `usePracticeStreak`,
 * so a `recordPracticeSession()` call from anywhere (e.g. `markPracticeMode`
 * inside a sandbox) re-renders the chip the moment the player completes a mode.
 */
export default function PracticeStreakChip() {
  const { t } = useLanguage();
  const { current } = usePracticeStreak();

  if (current <= 0) return null;

  return (
    <AdaptiveMotion.div
      data-testid="practice-streak-chip"
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, scale: 0.85, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 18 }}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-neo border-2 border-neo-black bg-neo-orange text-neo-black shadow-hard-sm font-neo-display font-black text-xs uppercase tracking-wider"
    >
      <span aria-hidden>🔥</span>
      <span>{t('practiceHub.streakDays', { count: current })}</span>
    </AdaptiveMotion.div>
  );
}
