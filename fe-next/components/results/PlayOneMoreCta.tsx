'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { m, useReducedMotion } from 'framer-motion';
import { RotateCw, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useExperiment } from '@/hooks/useExperiment';
import { practiceTargetUrl } from '@/lib/practice/practiceRoute';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';
import { trackGrowthEvent } from '@/utils/growthTracking';

/**
 * Random-mode rotation pool. Reuses the post-profile autoroute set so the
 * "play another" path lands on a mode with a working practice landing.
 */
const RANDOM_MODES: readonly PracticeMode[] = ['wordHunt', 'classic', 'wheelRush'];

interface PlayOneMoreCtaProps {
  /** Caller-supplied same-mode replay handler. */
  onPlayAgain: () => void;
  /**
   * Tag for the offered/clicked PostHog events. Identifies which results
   * surface emitted the CTA (e.g. 'sp_results', 'practice_results').
   */
  surface: string;
  className?: string;
}

/**
 * Oversized 2-tap "Play one more" CTA — drives plays/session (PostHog 14d
 * baseline: 3.03 games/session). The experiment `play-one-more-cta` gates
 * three variants:
 *
 *   - `control`:     renders nothing (preserves the existing results UI).
 *   - `same-mode`:   "Play again" reusing the caller's same-mode handler.
 *   - `random-mode`: "Play another mode" routing to a random practice mode
 *     via practiceTargetUrl so the user discovers new content.
 *
 * Exposure fires on mount for non-control variants only (control sessions
 * never see the CTA, so they don't count as exposed).
 */
export const PlayOneMoreCta: React.FC<PlayOneMoreCtaProps> = ({
  onPlayAgain,
  surface,
  className,
}) => {
  const { t, language } = useLanguage();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const exp = useExperiment('play-one-more-cta');
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (exp.variant === 'control') return;
    firedRef.current = true;
    exp.trackExposure();
    trackGrowthEvent('play_one_more_offered', {
      surface,
      variant: exp.variant,
    });
  }, [exp, surface]);

  const handleClick = useCallback(() => {
    trackGrowthEvent('play_one_more_clicked', {
      surface,
      variant: exp.variant,
    });
    if (exp.variant === 'random-mode') {
      const pick = RANDOM_MODES[Math.floor(Math.random() * RANDOM_MODES.length)];
      router.push(practiceTargetUrl(pick, language));
      return;
    }
    onPlayAgain();
  }, [exp.variant, surface, onPlayAgain, router, language]);

  if (exp.variant === 'control') return null;

  const isRandom = exp.variant === 'random-mode';
  const Icon = isRandom ? Shuffle : RotateCw;
  const label = isRandom
    ? t('results.playOneMore.random')
    : t('results.playOneMore.same');

  return (
    <m.button
      type="button"
      onClick={handleClick}
      whileTap={!reducedMotion ? { scale: 0.95 } : undefined}
      whileHover={!reducedMotion ? { scale: 1.03 } : undefined}
      animate={!reducedMotion ? { y: [0, -2, 0] } : { y: 0 }}
      transition={!reducedMotion ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' } : { type: 'tween' }}
      className={cn(
        'relative w-full inline-flex items-center justify-center gap-3',
        'px-6 py-4 text-lg font-black uppercase tracking-wide',
        'bg-neo-lime text-black border-neo-thick border-black rounded-neo shadow-hard-lg',
        'active:shadow-hard-pressed transition-colors',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-pink',
        className,
      )}
      data-testid={`play-one-more-cta-${exp.variant}`}
    >
      <Icon className="h-5 w-5" aria-hidden />
      <span>{label}</span>
    </m.button>
  );
};

export default PlayOneMoreCta;
