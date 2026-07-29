/**
 * AdventureHUD Component
 *
 * Main HUD container integrating all game displays.
 * Mobile-first, landscape-optimized layout with clear visual hierarchy.
 * Colors driven by useHUDTheme() for per-world theming.
 */

'use client';

import { memo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHUDTheme } from '@/contexts/AdventureThemeContext';
import AdventureTimer from '@/components/adventure/AdventureTimer';
import AdventureXpProgressBar from '@/components/adventure/meta/AdventureXpProgressBar';
import { CurrencyDisplay } from '@/components/adventure/meta/CurrencyDisplay';
import { RollingNumber } from '@/components/adventure/ui/RollingNumber';
import { ObjectiveProgress, type ObjectiveProgressProps } from './ObjectiveProgress';
import { CooldownIndicator } from './CooldownIndicator';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface AdventureHUDProps {
  // Timer
  remainingTime: number;

  // Score
  score: number;
  recentScoreGain?: number;

  // Objectives
  objectives: ObjectiveProgressProps['objectives'];

  // Meta-progression
  totalXp: number;
  recentXpGain?: number;
  gold: number;
  recentGoldGain?: number;
  playerLevel: number;

  // Cooldowns (for future power-ups)
  cooldowns?: Array<{
    id: string;
    icon: string;
    totalDuration: number;
    remainingTime: number;
  }>;

  className?: string;
}

// ============================================
// COMPONENT
// ============================================

export const AdventureHUD = memo<AdventureHUDProps>(
  ({
    remainingTime,
    score,
    recentScoreGain,
    objectives,
    totalXp,
    recentXpGain,
    gold,
    recentGoldGain,
    playerLevel,
    cooldowns,
    className,
  }) => {
    const prefersReducedMotion = usePrefersReducedMotion();
    const { t, language } = useLanguage();
    const hudTheme = useHUDTheme();

    return (
      <div
        data-testid="adventure-hud"
        aria-label={t('adventure.game.hud')}
        className={cn('fixed inset-x-0 top-0 z-40 pointer-events-none', className)}
      >
        {/* Top Bar */}
        <div
          data-testid="hud-top-bar"
          className={cn(
            'flex items-center justify-between gap-2 p-2',
            hudTheme.headerBg,
            'border-b-2', hudTheme.headerBorder,
            'pointer-events-auto'
          )}
        >
          {/* Left: Level badge and XP */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {/* Level badge */}
            <div
              className={cn(
                'shrink-0 px-2 py-1',
                hudTheme.levelBadgeColor, hudTheme.levelBadgeText,
                'rounded-neo border-2 border-neo-black',
                'shadow-hard-sm',
                'font-neo-display font-black text-sm'
              )}
            >
              {t('adventure.levelWithNumber', { level: playerLevel })}
            </div>

            {/* XP Progress — always visible, compact on mobile */}
            <div className="flex-1 min-w-0 max-w-xs">
              <AdventureXpProgressBar
                totalXp={totalXp}
                recentXpGain={recentXpGain}
                size="sm"
              />
            </div>
          </div>

          {/* Right: Gold and Timer */}
          <div className="flex items-center gap-2">
            {/* Gold */}
            <CurrencyDisplay
              amount={gold}
              recentGain={recentGoldGain}
              size="sm"
            />

            {/* Timer */}
            <AdventureTimer
              timeRemaining={remainingTime}
              size="compact"
            />
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          data-testid="hud-bottom-bar"
          className={cn(
            'fixed bottom-[var(--admob-banner-height,0px)] inset-x-0',
            'flex items-end justify-between gap-2 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0.5rem))]',
            hudTheme.headerBg,
            'border-t-2', hudTheme.headerBorder,
            'pointer-events-auto'
          )}
        >
          {/* Left: Objectives */}
          <div className="flex-1 min-w-0 max-w-md">
            <ObjectiveProgress objectives={objectives} />
          </div>

          {/* Right: Score and Cooldowns */}
          <div className="flex flex-col items-end gap-2">
            {/* Score */}
            <div className="relative">
              <div
                className={cn(
                  'px-3 py-2',
                  'bg-neo-yellow text-neo-black',
                  'rounded-neo border-3 border-neo-black',
                  'shadow-hard',
                  'font-neo-display font-black text-xl'
                )}
              >
                <span className="text-xs opacity-70">{t('common.score')}: </span>
                <RollingNumber value={score} variant="gold" className="text-xl font-black" />
              </div>

              {/* Recent score gain animation */}
              <AdaptiveAnimatePresence>
                {recentScoreGain && recentScoreGain > 0 && (
                  <AdaptiveMotion.div
                    data-testid="recent-score-gain"
                    initial={
                      prefersReducedMotion
                        ? { opacity: 1 }
                        : { opacity: 1, y: 0, scale: 1.2 }
                    }
                    animate={
                      prefersReducedMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -30, scale: 1 }
                    }
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className={cn(
                      'absolute -top-8 end-0',
                      'text-neo-lime font-neo-display font-black text-lg',
                      'pointer-events-none'
                    )}
                  >
                    +{recentScoreGain.toLocaleString(language)}
                  </AdaptiveMotion.div>
                )}
              </AdaptiveAnimatePresence>
            </div>

            {/* Cooldowns */}
            {cooldowns && cooldowns.length > 0 && (
              <div
                data-testid="cooldowns-section"
                className="flex items-center gap-2"
              >
                {cooldowns.map((cooldown) => (
                  <CooldownIndicator
                    key={cooldown.id}
                    icon={cooldown.icon}
                    totalDuration={cooldown.totalDuration}
                    remainingTime={cooldown.remainingTime}
                    size="sm"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

AdventureHUD.displayName = 'AdventureHUD';
