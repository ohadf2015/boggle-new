/**
 * Attack Telegraph Component
 *
 * Renders the 2-second warning before boss attacks:
 * - Full-screen warning banner
 * - Target tiles highlighted with TileWarningOverlay
 * - Countdown SVG ring that depletes as progress increases
 * - Progress bar with animated barber-pole diagonal stripes
 * - Intensifying screen edge flash as progress approaches 1.0
 *
 * Accessibility:
 * - Respects prefers-reduced-motion preference
 * - Uses semantic HTML with ARIA labels
 * - Visual-only animations disabled in reduced motion mode
 *
 * @example
 * ```tsx
 * <AttackTelegraph
 *   isActive={true}
 *   progress={0.5}
 *   targetTiles={[0, 1, 2]}
 *   abilityId="scramble"
 *   timeRemaining={1000}
 *   abilityName="adventure.bosses.abilities.scramble"
 * />
 * ```
 */

'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../../contexts/LanguageContext';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { useBossFightTheme } from '@/contexts/AdventureThemeContext';

// ==============================================
// COUNTDOWN RING SUB-COMPONENT
// ==============================================

const RING_RADIUS = 18;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface CountdownRingProps {
  progress: number;
  secondsRemaining: number;
  prefersReducedMotion: boolean;
}

/** SVG ring that depletes as attack progress increases */
const CountdownRing = memo<CountdownRingProps>(({ progress, secondsRemaining, prefersReducedMotion }) => {
  const dashOffset = RING_CIRCUMFERENCE * progress;
  return (
    <div className="relative w-12 h-12 flex items-center justify-center ms-2 flex-shrink-0">
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90" aria-hidden="true">
        <circle cx="24" cy="24" r={RING_RADIUS} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="4" />
        <circle
          cx="24" cy="24" r={RING_RADIUS}
          fill="none" stroke="white" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={prefersReducedMotion ? 0 : dashOffset}
          style={{ transition: prefersReducedMotion ? 'none' : 'stroke-dashoffset 0.1s linear' }}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center font-neo-display font-bold text-xl text-white"
        data-testid="telegraph-countdown"
      >
        {secondsRemaining}
      </span>
    </div>
  );
});
CountdownRing.displayName = 'CountdownRing';

// ==============================================
// TYPES
// ==============================================

export interface AttackTelegraphProps {
  /** Whether telegraph is active */
  isActive: boolean;
  /** Progress (0-1) */
  progress: number;
  /** Target tile indices */
  targetTiles: number[];
  /** Ability ID for theming */
  abilityId: string | null;
  /** Time remaining in ms */
  timeRemaining: number;
  /** Ability display name (translation key) */
  abilityName?: string;
}

// ==============================================
// COMPONENT
// ==============================================

/**
 * AttackTelegraph - Main warning UI for boss attacks
 *
 * Displays a prominent warning banner with SVG countdown ring,
 * barber-pole progress bar, and intensifying screen edge flash.
 */
export function AttackTelegraph({
  isActive,
  progress,
  targetTiles: _targetTiles,
  abilityId: _abilityId,
  timeRemaining,
  abilityName,
}: AttackTelegraphProps) {
  const { t } = useLanguage();
  const prefersReducedMotion = usePrefersReducedMotion();
  const bossFightTheme = useBossFightTheme();

  const secondsRemaining = Math.ceil(timeRemaining / 1000);

  // Intensifying edge flash — spread and opacity grow with progress
  const edgeSpread = 50 + progress * 80;
  const edgeOpacity = (0.1 + progress * 0.35).toFixed(2);
  const edgeBoxShadow = `inset 0 0 ${edgeSpread}px rgba(239, 68, 68, ${edgeOpacity})`;
  // Pulse frequency speeds up as progress → 1
  const pulseDuration = Math.max(0.22, 0.5 - progress * 0.3);

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          data-testid="attack-telegraph"
          role="alert"
          aria-live="assertive"
          aria-label={t('adventure.bosses.telegraph.incoming')}
        >
          {/* Warning Banner */}
          <motion.div
            className={`
              absolute top-28 sm:top-32 left-1/2 -translate-x-1/2
              px-6 py-3
              ${bossFightTheme.telegraphColor}
              border-3 border-black
              rounded-neo
              shadow-hard-lg
            `}
            initial={{ y: -50, opacity: 0 }}
            animate={{
              y: 0,
              opacity: 1,
              scale: prefersReducedMotion ? 1 : [1, 1.05, 1],
            }}
            transition={{
              y: { duration: 0.3 },
              scale: { repeat: Infinity, duration: 0.5 },
            }}
            data-testid="telegraph-banner"
          >
            <div className="flex items-center gap-3">
              {/* Warning Icon */}
              <motion.span
                className="text-2xl"
                animate={prefersReducedMotion ? {} : { rotate: [-10, 10, -10] }}
                transition={{ repeat: Infinity, duration: 0.3 }}
                aria-hidden="true"
              >
                ⚠️
              </motion.span>

              {/* Warning Text */}
              <div className="flex flex-col">
                <span className="font-neo-display font-bold text-white text-lg">
                  {t('adventure.bosses.telegraph.incoming')}
                </span>
                {abilityName && (
                  <span className="font-neo-body text-white/80 text-sm">
                    {t(abilityName)}
                  </span>
                )}
              </div>

              {/* SVG Countdown Ring */}
              <CountdownRing
                progress={progress}
                secondsRemaining={secondsRemaining}
                prefersReducedMotion={prefersReducedMotion}
              />
            </div>
          </motion.div>

          {/* Progress Bar with barber-pole stripe */}
          <div
            className="
              absolute bottom-24 lg:bottom-10 left-1/2 -translate-x-1/2
              w-48 h-3
              bg-black/50
              border-2 border-black
              rounded-full
              overflow-hidden
            "
            data-testid="telegraph-progress-bar"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('adventure.bosses.telegraph.progress')}
          >
            <motion.div
              className={`h-full ${bossFightTheme.telegraphProgressColor} relative overflow-hidden`}
              initial={{ width: '0%' }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.05 }}
            >
              {/* Barber-pole diagonal stripe animation */}
              {!prefersReducedMotion && (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(135deg, rgba(255,255,255,0.3) 0px, rgba(255,255,255,0.3) 4px, transparent 4px, transparent 10px)',
                    backgroundSize: '14px 14px',
                    animation: 'barberpole 0.5s linear infinite',
                  }}
                  aria-hidden="true"
                />
              )}
            </motion.div>
          </div>

          {/* Screen Edge Flash — intensifies and speeds up as progress → 1 */}
          {!prefersReducedMotion && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ boxShadow: edgeBoxShadow }}
              animate={{ opacity: [0.4, 0.9, 0.4] }}
              transition={{ repeat: Infinity, duration: pulseDuration }}
              aria-hidden="true"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
