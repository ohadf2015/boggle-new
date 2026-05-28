/**
 * CinematicFallback Component
 *
 * Pure CSS/Framer Motion fallback for when Remotion Player stalls on mobile.
 * Displays the cinematic title, stats, progress bar, and skip button using
 * lightweight animations instead of canvas/WebGL rendering.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { SKIP_DELAY_MS } from '../../../../hooks/useCinematic';

// ==============================================
// TYPES
// ==============================================

export type CinematicType = 'victory' | 'defeat' | 'bossEntrance' | 'bossDefeat' | 'worldUnlock';

export interface CinematicFallbackProps {
  /** Which cinematic this fallback replaces */
  cinematicType: CinematicType;
  /** Props from the original composition (score, wordsFound, etc.) */
  compositionProps: Record<string, unknown>;
  /** Duration in seconds before auto-completing */
  durationSeconds: number;
  /** Called when fallback ends (natural or skipped) */
  onComplete: () => void;
}

// ==============================================
// TITLE KEY MAP
// ==============================================

const TITLE_KEYS: Record<CinematicType, string> = {
  victory: 'adventure.bosses.cinematics.fallbackTitle.victory',
  defeat: 'adventure.bosses.cinematics.fallbackTitle.defeat',
  bossEntrance: 'adventure.bosses.cinematics.fallbackTitle.bossEntrance',
  bossDefeat: 'adventure.bosses.cinematics.fallbackTitle.bossDefeat',
  worldUnlock: 'adventure.bosses.cinematics.fallbackTitle.worldUnlock',
};

// ==============================================
// COMPONENT
// ==============================================

export function CinematicFallback({
  cinematicType,
  compositionProps,
  durationSeconds,
  onComplete,
}: CinematicFallbackProps) {
  const { t } = useLanguage();
  const [canSkip, setCanSkip] = useState(false);
  const [progress, setProgress] = useState(0);
  const hasCompletedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const handleComplete = useCallback(() => {
    if (hasCompletedRef.current) return;
    hasCompletedRef.current = true;
    onCompleteRef.current();
  }, []);

  // Enable skip after SKIP_DELAY_MS
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanSkip(true);
    }, SKIP_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Progress bar + auto-complete timer
  useEffect(() => {
    const totalMs = durationSeconds * 1000;
    const intervalMs = 33; // ~30fps
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += intervalMs;
      const pct = Math.min(100, (elapsed / totalMs) * 100);
      setProgress(pct);

      if (elapsed >= totalMs) {
        clearInterval(interval);
        handleComplete();
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [durationSeconds, handleComplete]);

  const handleSkip = () => {
    if (canSkip) {
      handleComplete();
    }
  };

  // Extract stats from compositionProps
  const score = compositionProps.finalScore as number | undefined;
  const wordsFound = compositionProps.wordsFound as number | undefined;

  // Extract boss info for boss cinematics
  const isBossCinematic = cinematicType === 'bossEntrance' || cinematicType === 'bossDefeat';
  const bossImagePath = compositionProps.bossImagePath as string | undefined;
  const bossName = compositionProps.bossName as string | undefined;
  const showBoss = isBossCinematic && bossImagePath;

  return (
    <div
      className="fixed inset-0 z-50 bg-linear-to-b from-neo-abyss to-neo-navy flex flex-col items-center justify-center"
      data-testid="cinematic-fallback"
    >
      {/* Boss Image + Name */}
      {showBoss && (
        <AdaptiveMotion.div
          className="flex flex-col items-center mb-6"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 150, damping: 15, delay: 0.1 }}
        >
          <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-neo border-neo border-black shadow-hard-lg overflow-hidden bg-neo-navy mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bossImagePath}
              alt={bossName || ''}
              className="w-full h-full object-contain"
              data-testid="fallback-boss-image"
            />
          </div>
          {bossName && (
            <AdaptiveMotion.span
              className="text-2xl sm:text-3xl font-neo-display text-neo-white"
              data-testid="fallback-boss-name"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              {bossName}
            </AdaptiveMotion.span>
          )}
        </AdaptiveMotion.div>
      )}

      {/* Title */}
      <AdaptiveMotion.h1
        className="text-4xl sm:text-6xl font-neo-display text-neo-yellow mb-8"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: showBoss ? 0.6 : 0.3 }}
      >
        {t(TITLE_KEYS[cinematicType])}
      </AdaptiveMotion.h1>

      {/* Stats Panel */}
      {(score !== undefined || wordsFound !== undefined) && (
        <AdaptiveMotion.div
          className="flex gap-8 mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          {score !== undefined && (
            <div className="text-center">
              <div className="text-gray-400 text-sm font-neo-body">
                {t('adventure.bosses.cinematics.fallbackStats.score')}
              </div>
              <div className="text-3xl font-neo-display text-neo-white">
                {score}
              </div>
            </div>
          )}
          {wordsFound !== undefined && (
            <div className="text-center">
              <div className="text-gray-400 text-sm font-neo-body">
                {t('adventure.bosses.cinematics.fallbackStats.wordsFound')}
              </div>
              <div className="text-3xl font-neo-display text-neo-white">
                {wordsFound}
              </div>
            </div>
          )}
        </AdaptiveMotion.div>
      )}

      {/* Skip Button */}
      <AdaptiveMotion.div
        className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <button
          onClick={handleSkip}
          disabled={!canSkip}
          className={`
            px-4 py-2 sm:px-6 sm:py-3 rounded-neo border-neo border-black
            font-neo-display text-base sm:text-lg
            transition-all duration-200
            ${
              canSkip
                ? 'bg-neo-yellow hover:bg-neo-orange text-black cursor-pointer shadow-hard hover:shadow-hard-lg'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-70'
            }
          `}
          data-testid="fallback-skip-button"
        >
          {canSkip
            ? t('adventure.bosses.cinematics.skip')
            : t('adventure.bosses.cinematics.skipIn', { seconds: Math.ceil(SKIP_DELAY_MS / 1000) })}
        </button>
      </AdaptiveMotion.div>

      {/* Progress Bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 bg-neo-navy-light"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('adventure.bosses.cinematics.progress')}
      >
        <AdaptiveMotion.div
          className="h-full bg-neo-yellow"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

CinematicFallback.displayName = 'CinematicFallback';

export default CinematicFallback;
