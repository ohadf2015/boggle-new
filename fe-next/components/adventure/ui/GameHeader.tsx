/**
 * GameHeader Component
 *
 * Decluttered header: 3 visual groups instead of 6.
 * Left: Exit. Center: Score (with combo glow). Right: Level+Timer merged pill, Pause.
 * Combo indicator is a decay ring around the score — no separate text/bar.
 * Colors driven by useHUDTheme() for per-world theming.
 */

'use client';

import { memo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Pause, Play, X, Swords } from 'lucide-react';
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
  timerStore?: AdventureTimerStore;
  timeRemaining?: number;
  isPaused: boolean;
  onPauseToggle: () => void;
  onExit: () => void;
  gold?: number;
  xpProgress?: number;
  streakDays?: number;
  streakMultiplier?: number;
  isBossLevel?: boolean;
  elapsedTime?: number;
  comboCount?: number;
  comboTimeoutMs?: number;
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
  isBossLevel = false,
  elapsedTime = 0,
  comboCount = 0,
  comboTimeoutMs = 3000,
  className,
}: GameHeaderProps) {
  const { t } = useLanguage();
  const hudTheme = useHUDTheme();

  return (
    <div className="shrink-0">
    <header
      className={cn(
        'flex items-center justify-between relative',
        'px-2 py-1 gap-1',
        hudTheme.headerBg, 'backdrop-blur-md',
        'border-b-2', hudTheme.headerBorder,
        className
      )}
    >
      {/* Left: Exit only — single icon, minimal footprint */}
      <div className="flex items-center shrink-0">
        <AdaptiveMotion.button
          onClick={onExit}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className={cn(
            'p-1.5 rounded-neo',
            'min-w-10 min-h-10 flex items-center justify-center',
            'bg-neo-white/5 text-neo-white/40',
            'hover:bg-neo-red/15 hover:text-neo-red/80',
            'transition-colors duration-200'
          )}
          aria-label={t('common.exit')}
        >
          <X className="w-4 h-4" />
        </AdaptiveMotion.button>
      </div>

      {/* Center: Score with combo glow ring — no separate combo text/bar */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
        data-testid="score-display"
      >
        <div className={cn(
          'relative px-3 py-0.5 rounded-full transition-all duration-300',
          comboCount > 0
            ? 'bg-neo-purple/15 ring-2 ring-neo-purple/60'
            : 'bg-transparent'
        )}>
          {/* Combo multiplier badge — appears on left when active */}
          {comboCount > 0 && (
            <AdaptiveMotion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute -inset-s-1 -top-1 w-5 h-5 rounded-full bg-neo-purple text-neo-white text-[9px] font-black flex items-center justify-center leading-none"
            >
              {comboCount}×
            </AdaptiveMotion.span>
          )}
          <RollingNumber
            value={displayScore(score)}
            variant="white"
            className="text-lg sm:text-xl font-black leading-none tabular-nums"
          />
          {/* Combo decay arc — thin border that shrinks via CSS animation */}
          {comboCount > 0 && (
            <div
              key={comboCount}
              className="absolute inset-0 rounded-full border-2 border-neo-purple/80 pointer-events-none origin-left"
              style={{
                animation: `combo-shrink ${comboTimeoutMs}ms linear forwards`,
                clipPath: 'inset(0 0 0 0)',
              }}
            />
          )}
        </div>
      </div>

      {/* Right: Level+Timer merged pill, then Pause */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Merged Level + Timer pill */}
        {isBossLevel ? (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-neo-red/15 rounded-neo border border-neo-red/30">
            <Swords className="w-3.5 h-3.5 text-neo-red" />
            <span className="text-[10px] font-mono font-bold text-neo-white/60 tabular-nums">
              W{worldNumber}·L{levelNumber}
            </span>
            <span className="text-[10px] text-neo-white/20">|</span>
            <span className="text-xs font-mono font-bold text-neo-white tabular-nums">
              {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}
            </span>
          </div>
        ) : (
          <div className={cn(
            'flex items-center gap-1.5',
            hudTheme.levelBadgeColor, 'rounded-neo',
            'border-2 border-neo-black/30',
            'px-2 py-0.5'
          )}>
            <span dir="ltr" className={cn('text-[10px] font-mono font-bold tabular-nums', hudTheme.levelBadgeText)}>
              W{worldNumber}·L{levelNumber}
            </span>
            <span className="text-neo-white/20 text-[10px]">|</span>
            <AdventureTimer
              timerStore={timerStore}
              timeRemaining={timeRemaining}
              size="embedded"
            />
          </div>
        )}

        {/* Pause/Resume */}
        <AdaptiveMotion.button
          onClick={onPauseToggle}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          className={cn(
            'p-1.5 rounded-neo',
            'min-w-10 min-h-10 flex items-center justify-center',
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
      </div>
    </header>
    </div>
  );
});

GameHeader.displayName = 'GameHeader';

export default GameHeader;
