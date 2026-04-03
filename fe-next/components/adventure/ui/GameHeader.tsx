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
import { Pause, Play, X, MapPin, Flame, Swords } from 'lucide-react';
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
  /** Boss level — hides countdown timer, shows elapsed time instead */
  isBossLevel?: boolean;
  /** Elapsed time in seconds for boss fights (counts up from 0) */
  elapsedTime?: number;
  /** Current combo count */
  comboCount?: number;
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
  // gold, streakDays, streakMultiplier, xpProgress hidden during active play to reduce clutter
  isBossLevel = false,
  elapsedTime = 0,
  comboCount = 0,
  className,
}: GameHeaderProps) {
  const { t } = useLanguage();
  const hudTheme = useHUDTheme();

  return (
    <div className="flex-shrink-0">
    <header
      className={cn(
        'flex items-center justify-between relative',
        'px-2.5 py-1.5 gap-1.5 sm:gap-3 lg:gap-4',
        hudTheme.headerBg, 'backdrop-blur-md',
        'border-b-2', hudTheme.headerBorder,
        className
      )}
    >
      {/* Left: Level Badge — minimal during play */}
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
      </div>

      {/* Center: Score + Combo — prominent floating display */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none max-w-[40%] sm:max-w-none"
        aria-live="polite"
        aria-atomic="true"
        data-testid="score-display"
      >
        <RollingNumber
          value={displayScore(score)}
          variant="white"
          className="text-lg sm:text-xl font-black leading-none tabular-nums"
        />
        {comboCount > 0 && (
          <span className="text-[10px] font-black text-neo-purple tabular-nums mt-0.5">
            <Flame className="w-3 h-3 inline-block -mt-0.5 me-0.5" />
            {comboCount}x {t('adventure.combo')}
          </span>
        )}
      </div>

      {/* Right: Timer & Controls — tighter spacing */}
      <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
        {/* Timer — hidden in boss fights, replaced with elapsed time */}
        {isBossLevel ? (
          <div className="flex items-center gap-1 px-2 py-1 bg-neo-red/15 rounded-neo border border-neo-red/30">
            <Swords className="w-3.5 h-3.5 text-neo-red" />
            <span className="text-xs font-mono font-bold text-neo-white tabular-nums">
              {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}
            </span>
          </div>
        ) : (
          <AdventureTimer
            timerStore={timerStore}
            timeRemaining={timeRemaining}
            size="compact"
          />
        )}

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
    {/* XP bar removed from in-game header to reduce clutter — shown on level complete */}
    </div>
  );
});

GameHeader.displayName = 'GameHeader';

export default GameHeader;
