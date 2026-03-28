/**
 * GameHeader Component
 *
 * Organized header bar with level info, score, and timer.
 * Clean visual hierarchy with distinct sections.
 * Colors driven by useHUDTheme() for per-world theming.
 */

'use client';

import { memo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Pause, Play, X, MapPin, Coins, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHUDTheme } from '@/contexts/AdventureThemeContext';
import AdventureTimer from '../AdventureTimer';
import { RollingNumber } from './RollingNumber';
import { displayScore } from '@/utils/scoreDisplay';
import type { AdventureTimerStore } from '@/hooks/useAdventureTimerStore';

// ==============================================
// TYPES
// ==============================================

interface GameHeaderProps {
  worldNumber: number;
  levelNumber: number;
  score: number;
  /**
   * External timer store (preferred). Passed to AdventureTimer so only the
   * timer widget re-renders on tick, not GameHeader or AdventureGame.
   */
  timerStore?: AdventureTimerStore;
  /**
   * Fallback timeRemaining for legacy/test usage when timerStore is absent.
   */
  timeRemaining?: number;
  isPaused: boolean;
  onPauseToggle: () => void;
  onExit: () => void;
  /** Current gold amount */
  gold?: number;
  /** XP progress within current level (0-1) */
  xpProgress?: number;
  /** Current adventure streak days (0 = no streak) */
  streakDays?: number;
  /** Streak multiplier (1.0-2.0) */
  streakMultiplier?: number;
  className?: string;
}

// ==============================================
// COMPONENT
// ==============================================

export const GameHeader = memo(function GameHeader({
  worldNumber,
  levelNumber,
  score,
  timerStore,
  timeRemaining,
  isPaused,
  onPauseToggle,
  onExit,
  gold,
  xpProgress,
  streakDays = 0,
  streakMultiplier = 1,
  className,
}: GameHeaderProps) {
  const { t } = useLanguage();
  const hudTheme = useHUDTheme();

  return (
    <div className="flex-shrink-0">
    <header
      className={cn(
        'flex items-center justify-between relative',
        'px-2.5 py-1.5 gap-1.5 sm:gap-3 lg:gap-4 pt-[max(0.375rem,env(safe-area-inset-top,0.375rem))]',
        hudTheme.headerBg, 'backdrop-blur-md',
        'border-b-2', hudTheme.headerBorder,
        className
      )}
    >
      {/* Left: Level Badge + Streak + Gold — grouped as info cluster */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Level Badge */}
        <AdaptiveMotion.div
          className={cn(
            'flex items-center gap-1',
            'px-2 py-1',
            hudTheme.levelBadgeColor, 'rounded-neo',
            'border-2 border-neo-black/30',
          )}
          whileHover={{ scale: 1.02 }}
          aria-label={`${t('adventure.world')} ${worldNumber}, ${t('adventure.level')} ${levelNumber}`}
        >
          <MapPin className={cn('w-3.5 h-3.5', hudTheme.levelBadgeText)} />
          <span className="text-xs font-mono font-black text-neo-white tabular-nums">
            W{worldNumber}·L{levelNumber}
          </span>
        </AdaptiveMotion.div>

        {/* Streak Badge — inline pill */}
        {streakDays > 0 && (
          <div
            className="flex items-center gap-0.5 px-1.5 py-0.5 bg-neo-orange/15 rounded-full border border-neo-orange/20"
            aria-label={t('adventure.streakBadge', { days: streakDays, multiplier: streakMultiplier.toFixed(1) })}
          >
            <Flame className="w-3 h-3 text-neo-orange" />
            <span className="text-[10px] font-black text-neo-orange tabular-nums">
              {streakMultiplier > 1 ? `${streakMultiplier.toFixed(1)}×` : `${streakDays}d`}
            </span>
          </div>
        )}

        {/* Gold Badge — inline pill */}
        {gold !== undefined && (
          <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-neo-yellow/15 rounded-full border border-neo-yellow/20">
            <Coins className="w-3 h-3 text-neo-yellow" />
            <span className="text-[10px] font-bold text-neo-yellow tabular-nums">{gold}</span>
          </div>
        )}
      </div>

      {/* Center: Score — prominent floating display */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none max-w-[35%] sm:max-w-none"
        aria-live="polite"
        aria-atomic="true"
        data-testid="score-display"
      >
        <span className="text-[9px] sm:text-[10px] font-mono text-neo-white/40 uppercase tracking-widest leading-none mb-0.5">
          {t('common.score')}
        </span>
        <RollingNumber
          value={displayScore(score)}
          variant="white"
          className="text-lg sm:text-xl font-black leading-none tabular-nums"
        />
      </div>

      {/* Right: Timer & Controls — tighter spacing */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
        {/* Timer */}
        <AdventureTimer
          timerStore={timerStore}
          timeRemaining={timeRemaining}
          size="compact"
        />

        {/* Control Buttons — minimal chrome */}
        <div className="flex items-center gap-1">
          {/* Pause/Resume */}
          <AdaptiveMotion.button
            onClick={onPauseToggle}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className={cn(
              'p-1.5 sm:p-2 rounded-neo',
              'min-w-11 min-h-11 flex items-center justify-center',
              'transition-colors duration-200',
              isPaused
                ? 'bg-neo-lime text-neo-black'
                : 'bg-neo-white/8 text-neo-white/70 hover:bg-neo-white/15'
            )}
            aria-label={isPaused ? t('common.resume') : t('common.pause')}
          >
            {isPaused ? (
              <Play className="w-4 h-4" />
            ) : (
              <Pause className="w-4 h-4" />
            )}
          </AdaptiveMotion.button>

          {/* Exit */}
          <AdaptiveMotion.button
            onClick={onExit}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className={cn(
              'p-1.5 sm:p-2 rounded-neo',
              'min-w-11 min-h-11 flex items-center justify-center',
              'bg-neo-white/5 text-neo-white/40',
              'hover:bg-neo-red/15 hover:text-neo-red/80',
              'transition-colors duration-200'
            )}
            aria-label={t('common.exit')}
          >
            <X className="w-4 h-4" />
          </AdaptiveMotion.button>
        </div>
      </div>
    </header>
    {/* XP progress bar — thinner, world-colored accent */}
    {xpProgress !== undefined && (
      <div className="h-0.5 bg-neo-black/20">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${xpProgress * 100}%`,
            background: 'linear-gradient(90deg, #8B5CF6, #A78BFA)',
          }}
          role="progressbar"
          aria-valuenow={Math.round(xpProgress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('adventure.xp.progress')}
        />
      </div>
    )}
    </div>
  );
});

GameHeader.displayName = 'GameHeader';

export default GameHeader;
