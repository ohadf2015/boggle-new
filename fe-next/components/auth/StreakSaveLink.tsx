'use client';

/**
 * StreakSaveLink — the solo-results signup ask, demoted to one line.
 *
 * `results_inline` was 83% of all signup_prompt_shown (771 shows / 145 guests
 * in 28d) and converted at 0.65%, against ~14% for every other surface, so the
 * blended funnel read 3.6%. The card is gone from solo results; what is left is
 * a link, shown only when the player has a streak an account would protect.
 * SignupPromptHost still serves the once-per-session soft sheet — this stays a
 * link and expands in place (the Word Wheel CTA pattern) so no second sheet can
 * race that one.
 */

import React, { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, Flame } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { canOfferStreakSave } from '@/lib/growth/streakSave';
import { cn } from '@/lib/utils';

const InlineSignupCard = dynamic(() => import('@/components/auth/InlineSignupCard'), { ssr: false });

/** Prompt-surface id: its own funnel row, outside the results_inline cap. */
export const STREAK_SAVE_SOURCE = 'streak_save';

interface StreakSaveLinkProps {
  isAuthenticated: boolean;
  /** Streak as the surface counts it — win streak on solo, days in practice. */
  streak: number;
  /** False while the streak is still resolving: render nothing, never a flash. */
  isStreakLoaded?: boolean;
  /** The two streaks are different quantities, so the surface rides the event. */
  source: 'solo_results' | 'practice_results';
  className?: string;
}

const StreakSaveLink: React.FC<StreakSaveLinkProps> = ({
  isAuthenticated,
  streak,
  isStreakLoaded = true,
  source,
  className,
}) => {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const shownRef = useRef(false);

  const eligible = canOfferStreakSave({ isAuthenticated, streak, isStreakLoaded });

  useEffect(() => {
    if (!eligible || shownRef.current) return;
    shownRef.current = true;
    trackGrowthEvent('streak_save_link_shown', { streak, source });
  }, [eligible, streak, source]);

  if (!eligible) return null;

  if (expanded) {
    return (
      <InlineSignupCard
        isAuthenticated={isAuthenticated}
        titleKey="results.saveStreak.title"
        bodyKey="results.saveStreak.body"
        analyticsSource={STREAK_SAVE_SOURCE}
        compact
        className={className}
      />
    );
  }

  return (
    <button
      type="button"
      data-testid="streak-save-link"
      onClick={() => {
        trackGrowthEvent('streak_save_link_clicked', { streak, source });
        setExpanded(true);
      }}
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-neo-body font-bold text-neo-cyan',
        'underline decoration-neo-cyan/50 underline-offset-4 hover:decoration-neo-cyan',
        className,
      )}
    >
      <Flame className="w-4 h-4 shrink-0 text-neo-orange" aria-hidden />
      {t('results.saveStreak.title')}
      <DirectionalIcon icon={ArrowRight} className="w-4 h-4 shrink-0" />
    </button>
  );
};

export default StreakSaveLink;
