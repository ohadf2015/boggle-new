/**
 * Attack Telegraph Component
 *
 * Renders the 2-second warning before boss attacks:
 * - Full-screen warning banner
 * - Target tiles highlighted with TileWarningOverlay
 * - Countdown timer
 * - Progress bar
 * - Screen edge flash effect
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

import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../../contexts/LanguageContext';
import { usePrefersReducedMotion } from '../../../hooks/usePrefersReducedMotion';
import { useBossFightTheme } from '@/contexts/AdventureThemeContext';

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
 * Displays a prominent warning banner with countdown timer,
 * progress bar, and optional screen edge flash effect.
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

  // Convert ms to seconds for display (ceiling to show full seconds)
  const secondsRemaining = Math.ceil(timeRemaining / 1000);

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
              absolute top-20 left-1/2 -translate-x-1/2
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
                animate={
                  prefersReducedMotion ? {} : { rotate: [-10, 10, -10] }
                }
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

              {/* Countdown */}
              <motion.span
                className="
                  ms-2 w-10 h-10
                  flex items-center justify-center
                  bg-black text-white
                  font-neo-display font-bold text-xl
                  rounded-full
                "
                animate={prefersReducedMotion ? {} : { scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                data-testid="telegraph-countdown"
                aria-label={`${secondsRemaining} ${t('common.seconds')}`}
              >
                {secondsRemaining}
              </motion.span>
            </div>
          </motion.div>

          {/* Progress Bar */}
          <div
            className="
              absolute bottom-32 left-1/2 -translate-x-1/2
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
              className={`h-full ${bossFightTheme.telegraphProgressColor}`}
              initial={{ width: '0%' }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.05 }}
            />
          </div>

          {/* Screen Edge Flash (visual emphasis, not accessible) */}
          {!prefersReducedMotion && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                boxShadow: `inset 0 0 ${50 + progress * 50}px rgba(239, 68, 68, ${0.1 + progress * 0.2})`,
              }}
              animate={{
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                repeat: Infinity,
                duration: 0.5,
              }}
              aria-hidden="true"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
