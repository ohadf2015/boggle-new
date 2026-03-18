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

// ==============================================
// TYPES
// ==============================================

interface GameHeaderProps {
  worldNumber: number;
  levelNumber: number;
  score: number;
  timeRemaining: number;
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
        'px-3 py-1.5',
        hudTheme.headerBg, 'backdrop-blur-md',
        'border-b-3', hudTheme.headerBorder,
        'shadow-hard-sm',
        className
      )}
    >
      {/* Left: Level Badge — compact, always abbreviated */}
      <AdaptiveMotion.div
        className={cn(
          'flex items-center gap-1.5',
          'px-2 py-1',
          hudTheme.levelBadgeColor, 'rounded-neo',
          'border-2 border-neo-white/20',
          'shadow-hard-sm'
        )}
        whileHover={{ scale: 1.02 }}
        aria-label={`${t('adventure.world')} ${worldNumber}, ${t('adventure.level')} ${levelNumber}`}
      >
        <MapPin className={cn('w-4 h-4', hudTheme.levelBadgeText)} />
        <span className="text-xs sm:text-sm font-mono font-black text-neo-white tabular-nums">
          W{worldNumber} · L{levelNumber}
        </span>
      </AdaptiveMotion.div>

      {/* Center: Score — single display, always visible, absolutely centered.
          pointer-events-none prevents the absolutely-positioned element from
          intercepting clicks on the level badge or control buttons beneath it
          on narrow screens. */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
        data-testid="score-display"
      >
        <span className="text-[10px] sm:text-xs font-mono text-neo-white/50 uppercase tracking-widest leading-none">
          {t('common.score')}
        </span>
        <RollingNumber
          value={displayScore(score)}
          variant="white"
          className="text-lg sm:text-xl font-black leading-tight tabular-nums"
        />
      </div>

      {/* Streak Badge — only visible when streak > 0 */}
      {streakDays > 0 && (
        <div
          className="flex items-center gap-1 px-2 py-0.5 bg-neo-orange/20 rounded-neo"
          aria-label={t('adventure.streakBadge', { days: streakDays, multiplier: streakMultiplier.toFixed(1) })}
        >
          <Flame className="w-3.5 h-3.5 text-neo-orange" />
          <span className="text-xs font-black text-neo-orange tabular-nums">
            {streakMultiplier > 1 ? `${streakMultiplier.toFixed(1)}x` : `${streakDays}d`}
          </span>
        </div>
      )}

      {/* Gold Badge */}
      {gold !== undefined && (
        <div className="flex items-center gap-1 px-2 py-0.5 bg-neo-yellow/20 rounded-neo">
          <Coins className="w-4 h-4 text-neo-yellow" />
          <span className="text-sm font-bold text-neo-yellow">{gold}</span>
        </div>
      )}

      {/* Right: Timer & Controls */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Timer — most important game state indicator, visually prominent */}
        <AdventureTimer
          timeRemaining={timeRemaining}
          size="compact"
        />

        {/* Control Buttons */}
        <div className="flex items-center gap-1">
          {/* Pause/Resume */}
          <AdaptiveMotion.button
            onClick={onPauseToggle}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'p-2 rounded-neo',
              'min-w-11 min-h-11 flex items-center justify-center',
              'transition-colors duration-200',
              isPaused
                ? 'bg-neo-lime text-neo-black shadow-hard-sm'
                : 'bg-neo-white/10 text-neo-white hover:bg-neo-white/20'
            )}
            aria-label={isPaused ? t('common.resume') : t('common.pause')}
          >
            {isPaused ? (
              <Play className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </AdaptiveMotion.button>

          {/* Exit */}
          <AdaptiveMotion.button
            onClick={onExit}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={cn(
              'p-2 rounded-neo',
              'min-w-11 min-h-11 flex items-center justify-center',
              'bg-neo-white/5 text-neo-white/60',
              'hover:bg-neo-red/20 hover:text-neo-red',
              'transition-colors duration-200'
            )}
            aria-label={t('common.exit')}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </AdaptiveMotion.button>
        </div>
      </div>
    </header>
    {xpProgress !== undefined && (
      <div className="h-1 bg-neo-black/30">
        <div
          className="h-full bg-neo-purple transition-all duration-500"
          style={{ width: `${xpProgress * 100}%` }}
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
