'use client';

import React, { useState, useEffect } from 'react';
import { useInterval } from '@/hooks/useSafeTimeout';
import Link from 'next/link';
import Image from 'next/image';
import { m } from 'framer-motion';
import { MODE_IMAGE_ENTRANCE } from '@/lib/landing/modeImageEntrance';
import { Flame, Check, Clock, Sparkles, X, Star, Zap, ArrowRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';
import { useTiltEffect } from '@/hooks/useTiltEffect';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import {
  getDailyChallengeDate,
  getPuzzleNumber,
  getSecondsUntilNextDaily,
  formatCountdown,
  getWordHuntStatusToday,
  getDailyStreak,
} from '@/utils/dailyChallenge';
import type { Language } from '@/types';

interface PreloadedDailyStats {
  hasPlayed: boolean;
  hasSolved: boolean | null;
  currentStreak: number;
  puzzleNumber?: number;
  loading?: boolean;
}

interface DailyChallengeBannerProps {
  className?: string;
  /** Compact mode for smaller displays */
  compact?: boolean;
  /** Optional mascot element to replace the icon (for mobile portrait) */
  mascot?: React.ReactNode;
  /** Pre-loaded stats from parent to avoid duplicate fetching */
  preloadedStats?: PreloadedDailyStats;
}

/**
 * DailyChallengeBanner - Hero mode card for the Daily Challenge.
 * Shares the ModeCard visual language (navy→accent gradient, arrow affordance,
 * badge row, bottom-end mascot) but uses the reserved `neo-yellow` celebration
 * accent plus puzzle#/streak/countdown/win-loss chrome for daily identity.
 */
const DailyChallengeBanner: React.FC<DailyChallengeBannerProps> = ({
  className = '',
  compact = false,
  mascot,
  preloadedStats,
}) => {
  const { t, language, dir } = useLanguage();
  const [countdown, setCountdown] = useState<string>(() => {
    if (typeof window === 'undefined') return '--:--:--';
    return formatCountdown(getSecondsUntilNextDaily());
  });
  const [hasPlayed, setHasPlayed] = useState<boolean>(preloadedStats?.hasPlayed ?? false);
  const [hasSolved, setHasSolved] = useState<boolean>(preloadedStats?.hasSolved ?? false);
  const [streak, setStreak] = useState<number>(preloadedStats?.currentStreak ?? 0);
  const [puzzleNumber, setPuzzleNumber] = useState<number>(preloadedStats?.puzzleNumber ?? 0);
  const [isClient, setIsClient] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();

  // Match ModeCard tilt params for consistent feel
  const { ref: tiltRef, style: tiltStyle, handlers: tiltHandlers } = useTiltEffect<HTMLDivElement>({
    maxTilt: 18,
    hoverScale: 1.06,
    perspective: 700,
  });

  const combinedHandlers = {
    ...tiltHandlers,
    onMouseEnter: () => {
      setIsHovered(true);
      tiltHandlers.onMouseEnter();
    },
    onMouseLeave: () => {
      setIsHovered(false);
      tiltHandlers.onMouseLeave();
    },
  };

  useEffect(() => {
    setIsClient(true);
    const date = getDailyChallengeDate();

    if (preloadedStats && !preloadedStats.loading) {
      setHasPlayed(preloadedStats.hasPlayed);
      setHasSolved(preloadedStats.hasSolved ?? false);
      setStreak(preloadedStats.currentStreak);
      if (preloadedStats.puzzleNumber) {
        setPuzzleNumber(preloadedStats.puzzleNumber);
      } else {
        setPuzzleNumber(getPuzzleNumber(date));
      }
      return;
    }

    setPuzzleNumber(getPuzzleNumber(date));

    const status = getWordHuntStatusToday(language as Language);
    setHasPlayed(!!status);
    setHasSolved(status?.solved ?? false);

    setStreak(getDailyStreak().currentStreak);
  }, [language, preloadedStats]);

  useInterval(() => {
    if (document.visibilityState === 'hidden') return;
    const seconds = getSecondsUntilNextDaily();
    setCountdown(formatCountdown(seconds));
  }, isClient ? 1000 : null);

  useEffect(() => {
    if (!isClient) return;

    const updateCountdown = () => {
      if (document.visibilityState === 'hidden') return;
      const seconds = getSecondsUntilNextDaily();
      setCountdown(formatCountdown(seconds));
    };

    updateCountdown();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateCountdown();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isClient]);

  useEffect(() => {
    if (!isClient) return;
    const status = getWordHuntStatusToday(language as Language);
    setHasPlayed(!!status);
    setHasSolved(status?.solved ?? false);
    setStreak(getDailyStreak().currentStreak);
  }, [language, isClient]);

  useEffect(() => {
    if (!isClient) return;

    const refreshStatus = () => {
      const status = getWordHuntStatusToday(language as Language);
      setHasPlayed(!!status);
      setHasSolved(status?.solved ?? false);
      setStreak(getDailyStreak().currentStreak);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshStatus();
      }
    };

    const handleFocus = () => {
      refreshStatus();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isClient, language]);

  const isRTL = dir === 'rtl';
  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  // Navy → neo-yellow (celebration/gold) gradient, matching ModeCard pattern
  const gradientClass = 'bg-linear-to-br from-neo-navy via-neo-navy-light/80 to-neo-yellow/70';
  const hoverGradientClass = 'hover:to-neo-yellow/90';
  const glowColor = 'rgba(255, 225, 53, 0.65)';

  if (!isClient) {
    return (
      <div className={cn(
        'w-full h-full rounded-neo-lg border-3 border-neo-black shadow-hard-lg relative overflow-hidden',
        gradientClass,
        className
      )}
      style={{ padding: compact ? 'clamp(0.5rem, 3cqw, 1rem)' : 'clamp(0.75rem, 4cqw, 1.5rem)' }}
      >
        {/* Render the illustration at SSR (static, no client state) so it IS the
            LCP element and paints before hydration — without this it would be
            floored at hydration time. `priority` also emits the preload <link>
            at SSR. The interactive banner swaps in on hydration with the image
            in the same position, so there is no layout shift. */}
        {!mascot && (
          <div
            className={cn('absolute pointer-events-none', isRTL ? 'bottom-0 left-0' : 'bottom-0 right-0')}
            style={{ width: 'clamp(5.5rem, 28cqw, 8rem)', height: 'clamp(5.5rem, 28cqw, 8rem)' }}
          >
            <Image
              src="/modes/daily.png"
              alt=""
              fill
              priority
              className="object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
              sizes="(max-width: 640px) 96px, 192px"
            />
          </div>
        )}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="rounded-neo border-2 border-neo-black bg-neo-yellow shrink-0 w-10 h-10 sm:w-14 sm:h-14" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-6 w-40 bg-neo-white/15 rounded" />
            <div className="h-4 w-24 bg-neo-white/10 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/${language}/daily`}
      className="block w-full h-full group focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-lime focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy rounded-neo-lg"
      onClick={() => trackLandingCtaClick('daily_banner', { mode: 'daily', hasPlayed })}
    >
      <div
        ref={tiltRef}
        className={cn(
          'relative w-full h-full rounded-neo-lg border-3 border-neo-black shadow-hard-lg cursor-pointer overflow-hidden cq-container',
          'transition-shadow duration-200 ease-out',
          compact ? 'min-h-[80px] sm:min-h-[92px]' : 'min-h-[128px] sm:min-h-[148px]',
          isRTL
            ? 'active:-translate-x-px active:translate-y-px'
            : 'active:translate-x-px active:translate-y-px',
          'active:shadow-hard-pressed',
          gradientClass,
          hoverGradientClass,
          className
        )}
        style={{
          padding: compact ? 'clamp(0.5rem, 3cqw, 1rem)' : 'clamp(0.75rem, 4cqw, 1.5rem)',
          filter: isHovered ? `drop-shadow(0 0 20px ${glowColor})` : undefined,
          ...tiltStyle,
        }}
        {...combinedHandlers}
      >
        {/* Idle "glance" sheen — the SAME shared primitive the mode cubes use
            (.cube-sheen), so the daily hero joins the new homepage design
            language instead of only shining on hover. Always-on, CSS-gated on
            prefers-reduced-motion (NOT the JS perf flag), so it shimmers even
            on low-end devices the way the cubes do. */}
        <span
          aria-hidden="true"
          data-testid="cube-sheen"
          className="cube-sheen pointer-events-none absolute inset-y-0 -left-1/3 z-[1] w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent rtl:right-auto"
        />
        {/* Sparkles for unplayed state - celebration accent */}
        {!hasPlayed && enableComplexAnimations && !prefersReducedMotion && (
          <>
            <m.div
              className="absolute top-2 right-20 rtl:right-auto rtl:left-20 pointer-events-none"
              animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="w-4 h-4 text-neo-yellow" />
            </m.div>
            <m.div
              className="absolute top-1 right-12 rtl:right-auto rtl:left-12 pointer-events-none"
              animate={{ rotate: [0, -10, 10, 0], scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ type: 'tween', duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            >
              <Star className="w-3 h-3 text-neo-yellow fill-neo-yellow" />
            </m.div>
            <m.div
              className="absolute bottom-12 right-4 rtl:right-auto rtl:left-4 pointer-events-none"
              animate={{ rotate: [0, 20, -20, 0], scale: [0.8, 1.1, 0.8], opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            >
              <Zap className="w-3 h-3 text-neo-yellow fill-neo-yellow" />
            </m.div>
          </>
        )}

        {/* Mode character — matches ModeCard sizing */}
        {!mascot && (
          <m.div
            className={cn(
              'absolute pointer-events-none',
              isRTL ? 'bottom-0 left-0' : 'bottom-0 right-0'
            )}
            style={{
              width: 'clamp(5.5rem, 28cqw, 8rem)',
              height: 'clamp(5.5rem, 28cqw, 8rem)',
            }}
            {...MODE_IMAGE_ENTRANCE}
            animate={isHovered
              ? { scale: 1.08, y: -6, rotate: isRTL ? -5 : 5 }
              : { scale: 1, y: 0, rotate: 0 }
            }
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          >
            <Image
              src="/modes/daily.png"
              alt=""
              fill
              priority
              className={cn(
                'object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]',
                isHovered ? 'brightness-110' : 'brightness-100'
              )}
              style={{
                filter: isHovered ? 'drop-shadow(0 6px 16px rgba(0,0,0,0.5))' : undefined,
                transition: 'filter 0.3s ease',
              }}
              sizes="(max-width: 640px) 96px, 192px"
            />
          </m.div>
        )}

        {/* Header: title + puzzle# chip + arrow/win-loss indicator */}
        <div
          className="flex items-center gap-2 sm:gap-3 lg:gap-4 relative z-10"
          style={{ marginBottom: 'clamp(0.25rem, 1.5cqw, 0.75rem)' }}
        >
          {mascot && <div className="shrink-0">{mascot}</div>}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                className="font-black uppercase tracking-tight text-neo-white leading-tight"
                style={{ fontSize: 'clamp(1rem, 5cqw, 1.75rem)' }}
              >
                {t('daily.badge')}
              </h2>
              <span
                className="font-black text-neo-navy bg-neo-yellow border-2 border-neo-black shadow-hard-xs rounded-neo"
                style={{
                  padding: 'clamp(0.125rem, 0.5cqw, 0.25rem) clamp(0.375rem, 1.5cqw, 0.5rem)',
                  fontSize: 'clamp(0.625rem, 2.5cqw, 0.875rem)',
                }}
              >
                #{puzzleNumber}
              </span>
            </div>
          </div>

          {/* Arrow (unplayed) or Win/Loss circular badge (played) — same slot */}
          {hasPlayed ? (
            <m.div
              className={cn(
                'flex items-center justify-center rounded-full border-2 border-neo-black shrink-0 shadow-hard-sm',
                hasSolved ? 'bg-neo-lime text-neo-black' : 'bg-neo-pink text-neo-black'
              )}
              style={{
                width: 'clamp(2.75rem, 8cqw, 3.25rem)',
                height: 'clamp(2.75rem, 8cqw, 3.25rem)',
              }}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              data-testid={hasSolved ? 'won-badge' : 'lost-badge'}
            >
              {hasSolved ? (
                <Check style={{ width: 'clamp(1rem, 4cqw, 1.5rem)', height: 'clamp(1rem, 4cqw, 1.5rem)' }} strokeWidth={3} />
              ) : (
                <X style={{ width: 'clamp(1rem, 4cqw, 1.5rem)', height: 'clamp(1rem, 4cqw, 1.5rem)' }} strokeWidth={3} />
              )}
            </m.div>
          ) : (
            <div
              className={cn(
                'min-w-[44px] min-h-[44px] rounded-full border-2 border-neo-black bg-neo-yellow text-neo-navy',
                'flex items-center justify-center shrink-0 transition-all duration-200 ease-out',
                'opacity-100 lg:opacity-0 lg:group-hover:opacity-100',
                isRTL ? 'lg:group-hover:-translate-x-1' : 'lg:group-hover:translate-x-1'
              )}
              style={{
                width: 'clamp(2.75rem, 8cqw, 3.25rem)',
                height: 'clamp(2.75rem, 8cqw, 3.25rem)',
              }}
            >
              <ArrowIcon style={{ fontSize: 'clamp(0.75rem, 3.5cqw, 1rem)' }} />
            </div>
          )}
        </div>

        {/* Badges row: streak + countdown (replaces duration/difficulty) */}
        <div
          className="flex flex-wrap items-center relative z-10"
          style={{ gap: 'clamp(0.375rem, 1.5cqw, 0.5rem)' }}
        >
          {streak > 0 && (
            <m.span
              className="inline-flex items-center bg-neo-white/10 text-neo-white font-bold rounded-neo border-2 border-neo-white/20"
              style={{
                gap: 'clamp(0.25rem, 1cqw, 0.375rem)',
                padding: 'clamp(0.125rem, 0.5cqw, 0.25rem) clamp(0.375rem, 1.5cqw, 0.5rem)',
                fontSize: 'clamp(0.625rem, 2.5cqw, 0.75rem)',
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
            >
              <Flame
                className="text-neo-orange"
                style={{ width: 'clamp(0.625rem, 2.5cqw, 0.875rem)', height: 'clamp(0.625rem, 2.5cqw, 0.875rem)' }}
              />
              {streak} {t('daily.dayStreak')}
            </m.span>
          )}
          <span
            className="inline-flex items-center bg-neo-white/10 text-neo-white font-bold rounded-neo border-2 border-neo-white/20 tabular-nums"
            style={{
              gap: 'clamp(0.25rem, 1cqw, 0.375rem)',
              padding: 'clamp(0.125rem, 0.5cqw, 0.25rem) clamp(0.375rem, 1.5cqw, 0.5rem)',
              fontSize: 'clamp(0.625rem, 2.5cqw, 0.75rem)',
            }}
          >
            <Clock style={{ width: 'clamp(0.625rem, 2.5cqw, 0.875rem)', height: 'clamp(0.625rem, 2.5cqw, 0.875rem)' }} />
            {hasPlayed
              ? <><span className="opacity-80">{t('daily.nextPuzzleIn')}:</span>&nbsp;<span className="font-black tabular-nums" suppressHydrationWarning>{countdown}</span></>
              : <span className="font-black tabular-nums" suppressHydrationWarning>{countdown}</span>
            }
          </span>
        </div>

        {/* Shine + corner accent — matches ModeCard */}
        {enableComplexAnimations && !prefersReducedMotion && (
          <>
            <m.div
              className="absolute inset-0 pointer-events-none overflow-hidden rounded-neo-lg"
              initial={false}
              animate={isHovered ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <m.div
                className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent"
                initial={{ x: '-100%' }}
                animate={isHovered ? { x: '200%' } : { x: '-100%' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </m.div>

            <m.div
              className="absolute top-0 inset-e-0 w-16 h-16 pointer-events-none overflow-hidden rounded-neo-lg"
              initial={false}
            >
              <m.div
                className="absolute -top-8 -inset-e-8 w-16 h-16 bg-white/10 rotate-45"
                animate={isHovered ? { scale: 1.2, opacity: 0.15 } : { scale: 1, opacity: 0.08 }}
                transition={{ duration: 0.3 }}
              />
            </m.div>
          </>
        )}
      </div>
    </Link>
  );
};

export default DailyChallengeBanner;
