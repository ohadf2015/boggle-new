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
import { Pause, Play, X, Swords, Heart, Star } from 'lucide-react';
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
  /** Mode badge translation key (e.g. 'adventure.mode.blast') */
  modeDisplayKey?: string;
  /** Show move counter instead of timer (blast mode) */
  showMoveCounter?: boolean;
  /** Moves remaining (blast mode) */
  movesRemaining?: number;
  /** Show life bar in header (hunt mode) */
  showLifeBar?: boolean;
  /** Current HP (hunt mode) */
  currentHP?: number;
  /** Max HP (hunt mode) */
  maxHP?: number;
  /** Inline info strip content (theme, mechanic, upgrades) — rendered below header bar */
  infoStrip?: React.ReactNode;
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
  showMoveCounter = false,
  movesRemaining,
  showLifeBar = false,
  currentHP,
  maxHP,
  infoStrip,
  className,
}: GameHeaderProps) {
  const { t } = useLanguage();
  const hudTheme = useHUDTheme();

  return (
    <div className="shrink-0">
    <header
      className={cn(
        'flex items-center justify-between',
        'px-2 py-1 gap-2',
        hudTheme.headerBg,
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
            'bg-neo-white/5 text-neo-white',
            'hover:bg-neo-red/15 hover:text-neo-red/80',
            'transition-colors duration-200'
          )}
          aria-label={t('common.exit')}
        >
          <X className="w-4 h-4" />
        </AdaptiveMotion.button>
      </div>

      {/* Center: Score with combo glow ring — flex-based so it never overlaps side pills */}
      <div
        className="flex-1 min-w-0 flex items-center justify-center"
        aria-live="polite"
        aria-atomic="true"
        data-testid="score-display"
      >
        <div className={cn(
          // Persistent score chip — gives the number presence at rest instead of
          // floating as bare text. Combo turns the chip purple with the decay ring.
          'relative flex items-center gap-1.5 px-3 py-1 rounded-full border-2 transition-all duration-300',
          comboCount > 0
            ? 'bg-neo-purple/20 ring-2 ring-neo-purple/60 border-neo-purple/50'
            : 'bg-neo-black/35 border-neo-yellow/35'
        )}>
          {/* Combo multiplier badge — appears on left when active */}
          {comboCount > 0 && (
            <AdaptiveMotion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="absolute -inset-s-1 -top-1 w-5 h-5 rounded-full bg-neo-purple text-neo-white text-[9px] font-black flex items-center justify-center leading-none z-10"
            >
              {comboCount}×
            </AdaptiveMotion.span>
          )}
          <Star
            className={cn(
              'w-3.5 h-3.5 shrink-0 transition-colors duration-300',
              comboCount > 0 ? 'text-neo-purple-light fill-neo-purple-light' : 'text-neo-yellow fill-neo-yellow'
            )}
            aria-hidden="true"
          />
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

      {/* Right: Level+Timer/Moves/HP pill, then Pause */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Merged Level + resource pill */}
        {isBossLevel ? (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-neo-red/15 rounded-neo border border-neo-red/30">
            <Swords className="w-3.5 h-3.5 text-neo-red" />
            <span className="text-[10px] font-mono font-bold text-neo-white tabular-nums">
              W{worldNumber}·L{levelNumber}
            </span>
            <span className="text-[10px] text-neo-white">|</span>
            <span className="text-xs font-mono font-bold text-neo-white tabular-nums">
              {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}
            </span>
          </div>
        ) : showMoveCounter && movesRemaining != null ? (
          /* Blast mode: rich circular move counter matching standalone BlastHUD */
          <div className={cn(
            'flex items-center gap-1.5',
            'bg-neo-pink/15 rounded-neo',
            'border-2 border-neo-pink/30',
            'px-2 py-0.5'
          )}>
            {/* Circular counter with urgency thresholds from BlastHUD */}
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors',
              movesRemaining <= 2 ? 'border-neo-red/80 bg-neo-red/15' :
              movesRemaining <= 5 ? 'border-neo-pink/60 bg-neo-pink/10' :
              'border-white/25 bg-white/8'
            )}>
              <span className={cn(
                'text-base font-black tabular-nums leading-none',
                movesRemaining <= 2 ? 'text-neo-red blast-heartbeat' :
                movesRemaining <= 3 ? 'text-neo-red' :
                movesRemaining <= 5 ? 'text-neo-yellow' :
                'text-neo-pink'
              )}>
                {movesRemaining}
              </span>
            </div>
          </div>
        ) : showLifeBar && currentHP != null && maxHP != null ? (
          /* Hunt mode: HP bar instead of timer */
          <div className={cn(
            'flex items-center gap-1.5',
            'bg-neo-cyan/15 rounded-neo',
            'border-2 border-neo-cyan/30',
            'px-2 py-0.5'
          )}>
            <Heart className="w-3.5 h-3.5 text-neo-cyan fill-neo-cyan/50" />
            <div className="flex items-center gap-1">
              <div className="w-16 h-2 bg-neo-black/40 rounded-full overflow-hidden border border-neo-white/10">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    currentHP / maxHP > 0.5 ? 'bg-neo-cyan' :
                    currentHP / maxHP > 0.25 ? 'bg-neo-yellow' : 'bg-neo-red'
                  )}
                  style={{ width: `${Math.max(0, (currentHP / maxHP) * 100)}%` }}
                />
              </div>
              <span className={cn(
                'text-xs font-mono font-black tabular-nums',
                currentHP / maxHP > 0.5 ? 'text-neo-cyan' :
                currentHP / maxHP > 0.25 ? 'text-neo-yellow' : 'text-neo-red'
              )}>
                {currentHP}
              </span>
            </div>
          </div>
        ) : (
          /* Classic/wheel/forge: standard timer */
          <div className={cn(
            'flex items-center gap-1.5',
            hudTheme.levelBadgeColor, 'rounded-neo',
            'border-2 border-neo-black/30',
            'px-2 py-0.5'
          )}>
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
              : 'bg-neo-white/8 text-neo-white hover:bg-neo-white/15'
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
    {/* Info strip — theme, mechanic, upgrades — in-flow, not floating */}
    {infoStrip && (
      <div className={cn(
        'flex items-center justify-center gap-2 px-2 py-0.5',
        'bg-neo-black/40',
        'border-b border-neo-white/5',
        'text-[10px] min-h-0'
      )}>
        {infoStrip}
      </div>
    )}
    </div>
  );
});

GameHeader.displayName = 'GameHeader';

export default GameHeader;
