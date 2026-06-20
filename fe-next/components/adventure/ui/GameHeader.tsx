/**
 * GameHeader — in-level Adventure HUD (rebuilt).
 *
 * Three confident groups on a neo-brutalist bar:
 *   Left   — Exit + MODE chip (mode identity, previously missing)
 *   Center — SCORE hero: solid high-contrast chip, hard shadow, combo amps it
 *   Right  — mode-specific resource (timer / moves / HP / boss clock) + Pause
 *
 * Design rules honored: ≥44px touch targets, black ink on accent fills, hard
 * shadows (no blur), per-world theming via useHUDTheme(), timer urgency at low
 * time, juicy combo feedback. Behavior + props unchanged from the prior version.
 */

'use client';

import { memo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Pause, Play, X, Swords, Heart, Star, Flame } from 'lucide-react';
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

// Mode accent — the one place each mode declares its color identity.
const MODE_ACCENT: Record<string, { chip: string; ink: string }> = {
  blast: { chip: 'bg-neo-pink', ink: 'text-neo-black' },
  hunt: { chip: 'bg-neo-cyan', ink: 'text-neo-black' },
  boss: { chip: 'bg-neo-red', ink: 'text-neo-white' },
  classic: { chip: 'bg-neo-lime', ink: 'text-neo-black' },
};

function modeKeyToAccent(isBoss: boolean, showMoves: boolean, showLife: boolean) {
  if (isBoss) return MODE_ACCENT.boss;
  if (showMoves) return MODE_ACCENT.blast;
  if (showLife) return MODE_ACCENT.hunt;
  return MODE_ACCENT.classic;
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
  modeDisplayKey,
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

  const hasCombo = comboCount > 1;
  const accent = modeKeyToAccent(isBossLevel, showMoveCounter, showLifeBar);
  // Classic-mode timer urgency (other modes carry their own thresholds).
  const timerUrgent = timeRemaining != null && timeRemaining <= 10 && !isBossLevel && !showMoveCounter && !showLifeBar;

  return (
    <div className="shrink-0">
      <header
        className={cn(
          'flex items-center justify-between',
          'px-2.5 py-1.5 gap-2',
          hudTheme.headerBg,
          'border-b-3', hudTheme.headerBorder,
          'shadow-hard-sm',
          className
        )}
      >
        {/* Left: Exit + mode chip */}
        <div className="flex items-center gap-1.5 shrink-0">
          <AdaptiveMotion.button
            onClick={onExit}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'rounded-neo min-w-11 min-h-11 flex items-center justify-center',
              'bg-neo-white/8 text-neo-white border-2 border-transparent',
              'hover:bg-neo-red/20 hover:border-neo-red/50 hover:text-neo-red',
              'transition-colors duration-200'
            )}
            aria-label={t('common.exit')}
          >
            <X className="w-5 h-5" strokeWidth={2.5} />
          </AdaptiveMotion.button>

          {modeDisplayKey && (
            <span
              className={cn(
                'hidden xs:inline-flex items-center px-2 py-1 rounded-neo border-2 border-neo-black',
                'text-[10px] font-neo-display font-black uppercase tracking-wide leading-none shadow-hard-sm',
                accent.chip, accent.ink
              )}
            >
              {t(modeDisplayKey)}
            </span>
          )}
        </div>

        {/* Center: Score hero — solid chip with presence, combo amps it */}
        <div
          className="flex-1 min-w-0 flex items-center justify-center"
          aria-live="polite"
          aria-atomic="true"
          data-testid="score-display"
        >
          <AdaptiveMotion.div
            animate={hasCombo ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 0.25 }}
            className={cn(
              'relative flex items-center gap-1.5 px-3.5 py-1 rounded-neo border-3 border-neo-black shadow-hard transition-colors duration-300',
              hasCombo ? 'bg-neo-purple' : 'bg-neo-navy-light'
            )}
          >
            {/* Combo multiplier badge */}
            {hasCombo && (
              <AdaptiveMotion.span
                key={comboCount}
                initial={{ scale: 0, rotate: -12 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 600, damping: 18 }}
                className="absolute -top-2.5 -inset-s-2.5 min-w-6 h-6 px-1 rounded-neo bg-neo-yellow text-neo-black text-xs font-neo-display font-black flex items-center justify-center leading-none border-2 border-neo-black shadow-hard-sm z-10"
              >
                {comboCount}×
              </AdaptiveMotion.span>
            )}
            <Star
              className={cn(
                'w-4 h-4 shrink-0 transition-colors duration-300',
                hasCombo ? 'text-neo-yellow fill-neo-yellow' : 'text-neo-yellow fill-neo-yellow'
              )}
              aria-hidden="true"
            />
            <RollingNumber
              value={displayScore(score)}
              variant="white"
              className="text-xl sm:text-2xl font-neo-display font-black leading-none tabular-nums text-neo-white"
            />
            {/* Combo decay arc — shrinks via CSS animation, signals time pressure */}
            {hasCombo && (
              <div
                key={`decay-${comboCount}`}
                className="absolute -inset-0.5 rounded-neo border-2 border-neo-yellow pointer-events-none origin-left"
                style={{ animation: `combo-shrink ${comboTimeoutMs}ms linear forwards` }}
              />
            )}
          </AdaptiveMotion.div>
        </div>

        {/* Right: mode resource + Pause */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isBossLevel ? (
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-neo-red/20 rounded-neo border-2 border-neo-red shadow-hard-sm">
              <Swords className="w-4 h-4 text-neo-red shrink-0" />
              <span className="text-[10px] font-mono font-bold text-neo-white tabular-nums hidden sm:inline">
                W{worldNumber}·L{levelNumber}
              </span>
              <span className="text-xs font-mono font-black text-neo-white tabular-nums">
                {Math.floor(elapsedTime / 60)}:{String(elapsedTime % 60).padStart(2, '0')}
              </span>
            </div>
          ) : showMoveCounter && movesRemaining != null ? (
            /* Blast mode: circular move counter with urgency thresholds */
            <div className="flex items-center bg-neo-pink/15 rounded-neo border-2 border-neo-pink shadow-hard-sm px-1.5 py-0.5">
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center border-3 transition-colors',
                movesRemaining <= 2 ? 'border-neo-red bg-neo-red/20' :
                movesRemaining <= 5 ? 'border-neo-pink bg-neo-pink/15' :
                'border-neo-white/30 bg-neo-white/8'
              )}>
                <span className={cn(
                  'text-lg font-neo-display font-black tabular-nums leading-none',
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
            /* Hunt mode: HP bar */
            <div className="flex items-center gap-1.5 bg-neo-cyan/15 rounded-neo border-2 border-neo-cyan shadow-hard-sm px-2 py-1">
              <Heart className="w-4 h-4 text-neo-cyan fill-neo-cyan/60 shrink-0" />
              <div className="flex items-center gap-1">
                <div className="w-16 h-2.5 bg-neo-black/50 rounded-full overflow-hidden border border-neo-white/15">
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
            /* Classic/wheel/forge: timer with low-time urgency ring */
            <AdaptiveMotion.div
              animate={timerUrgent ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={timerUrgent ? { repeat: Infinity, duration: 0.7 } : { duration: 0.2 }}
              className={cn(
                'flex items-center gap-1.5 rounded-neo shadow-hard-sm px-2 py-1',
                'border-3',
                timerUrgent ? 'border-neo-red bg-neo-red/20' : 'border-neo-black/40',
                hudTheme.levelBadgeColor
              )}
            >
              {timerUrgent && <Flame className="w-3.5 h-3.5 text-neo-red shrink-0" aria-hidden="true" />}
              <AdventureTimer
                timerStore={timerStore}
                timeRemaining={timeRemaining}
                size="embedded"
              />
            </AdaptiveMotion.div>
          )}

          {/* Pause/Resume */}
          <AdaptiveMotion.button
            onClick={onPauseToggle}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'rounded-neo min-w-11 min-h-11 flex items-center justify-center border-2 transition-colors duration-200',
              isPaused
                ? 'bg-neo-lime text-neo-black border-neo-black shadow-hard-sm'
                : 'bg-neo-white/10 text-neo-white border-transparent hover:bg-neo-white/20'
            )}
            aria-label={isPaused ? t('common.resume') : t('common.pause')}
          >
            {isPaused ? <Play className="w-5 h-5" strokeWidth={2.5} /> : <Pause className="w-5 h-5" strokeWidth={2.5} />}
          </AdaptiveMotion.button>
        </div>
      </header>

      {/* Info strip — theme, mechanic, upgrades — in-flow, not floating */}
      {infoStrip && (
        <div className={cn(
          'flex items-center justify-center gap-2 px-2 py-0.5',
          'bg-neo-black/40 border-b border-neo-white/5',
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
