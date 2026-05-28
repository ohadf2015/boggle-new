'use client';

import { useState, useEffect, useRef } from 'react';
import { X, HelpCircle, Shield, Bomb, Zap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BlastComboStreakBadge } from './BlastComboStreakBadge';
import type { ComboStreakState } from './hooks/useBlastComboStreak';

/** Pre-game buff chip — shown in HUD top row when player claimed a rewarded-ad boost. */
type ActiveBuff = 'shield' | 'bomb' | 'combo2x';
const BUFF_META: Record<ActiveBuff, { Icon: typeof Shield; bg: string; label: string }> = {
  shield:  { Icon: Shield, bg: 'bg-neo-cyan',  label: 'blast.pregameBuff.shield' },
  bomb:    { Icon: Bomb,   bg: 'bg-neo-pink',  label: 'blast.pregameBuff.bomb' },
  combo2x: { Icon: Zap,    bg: 'bg-neo-lime',  label: 'blast.pregameBuff.combo2x' },
};

const NO_TEXT_SHADOW_STYLE = { textShadow: 'none' } as const;

/** Wave-clear goal: ≥90% of tiles cleared. Used for the visual target marker
 *  on the HUD progress bar and the goal-met color flip. */
export const BLAST_WAVE_GOAL_PCT = 90;

/** Smoothly lerps a number for display with a CSS transition on scale */
function useAnimatedScore(target: number) {
  const [display, setDisplay] = useState(target);
  const [pulse, setPulse] = useState(false);
  const prevRef = useRef(target);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (target === prevRef.current) return;
    const start = prevRef.current;
    const delta = target - start;
    const duration = Math.min(400, Math.abs(delta) * 10);
    const startTime = performance.now();
    prevRef.current = target;

    setPulse(true);
    const pulseTimer = setTimeout(() => setPulse(false), 200);

    function tick(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - t) * (1 - t); // ease-out quad
      setDisplay(Math.round(start + delta * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(pulseTimer);
    };
  }, [target]);

  return { display, pulse };
}

interface BlastHUDProps {
  score: number;
  wordsFoundCount: number;
  movesRemaining: number;
  totalMoves: number;
  waveNumber: number;
  tilesCleared: number;
  totalTiles: number;
  onQuit: () => void;
  onShowHelp?: () => void;
  /** Combo streak state from useBlastComboStreak */
  comboStreak?: ComboStreakState;
  /** Ref for the SVG arc — driven at 60fps by useBlastComboStreak */
  comboStreakArcRef?: React.RefObject<SVGCircleElement | null>;
  /** Active rewarded-ad pre-game buff (null if none claimed). */
  activeBuff?: ActiveBuff | null;
  /** Whether the buff effect has been spent (e.g. shield revive used). Greys the chip. */
  buffConsumed?: boolean;
  /** DDA "Lucky Boost" — surfaces when 2+ consecutive failed words triggered
   *  the invisible spawn-rate boost. Sprint 1 visibility guard. */
  ddaBoostActive?: boolean;
  /** Optional hint button slot — rendered beside Help when present. Wave 6+ only. */
  hintSlot?: React.ReactNode;
  /** Whether this is multiplayer mode (timer-era, no waves). Hides wave chip in MP. */
  isMultiplayer?: boolean;
  t: (key: string) => string | undefined;
}

/**
 * BlastHUD — compact top-bar showing score, moves, wave, and tile progress.
 * Layout-stable: every show/hide chip has a reserved slot so the surrounding
 * columns never reflow. The progress bar carries an always-visible 90% target
 * marker and an explicit "current / 90%" label so the wave goal is unmissable.
 */
export function BlastHUD({
  score,
  wordsFoundCount,
  movesRemaining,
  totalMoves,
  waveNumber,
  tilesCleared,
  totalTiles,
  onQuit,
  onShowHelp,
  comboStreak,
  comboStreakArcRef,
  activeBuff = null,
  buffConsumed = false,
  ddaBoostActive = false,
  hintSlot,
  isMultiplayer = false,
  t,
}: BlastHUDProps) {
  const clearPct = totalTiles > 0 ? Math.round((tilesCleared / totalTiles) * 100) : 0;
  const isFiniteMoves = isFinite(totalMoves);
  const goalMet = clearPct >= BLAST_WAVE_GOAL_PCT;
  const { display: animatedScore, pulse: scorePulse } = useAnimatedScore(score);

  let moveColorClass: string;
  if (movesRemaining <= 2) {
    moveColorClass = 'text-neo-red blast-heartbeat';
  } else if (movesRemaining <= 3) {
    moveColorClass = 'text-neo-red';
  } else if (movesRemaining <= 5) {
    moveColorClass = 'text-neo-yellow';
  } else {
    moveColorClass = 'text-neo-white';
  }

  return (
    <div
      className="flex flex-col gap-0 bg-neo-navy border-b-2 border-neo-black"
      data-testid="blast-hud"
    >
      {/* Top row: wave + buff slot + controls. Min-h fixed so chip toggles never reflow. */}
      <div className="flex items-center justify-between px-3 py-1.5 pt-safe min-h-[36px]">
        <div className="flex items-center gap-2 min-w-0">
          {/* Wave chip — hidden in MP (timer-era, no waves) */}
          {!isMultiplayer && (
            <span
              className="shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border-2 border-neo-cyan/40 text-neo-cyan tabular-nums"
              style={NO_TEXT_SHADOW_STYLE}
              aria-label={`${t('blast.wave')} ${waveNumber}`}
            >
              W{waveNumber}
            </span>
          )}
          {/* Lucky Boost chip — visible only when DDA assist is active. */}
          {ddaBoostActive && (
            <span
              data-testid="blast-lucky-boost-chip"
              className="shrink-0 inline-flex items-center gap-1 rounded-lg border-2 border-black bg-neo-yellow px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-neo-navy shadow-hard animate-neo-pop"
              style={NO_TEXT_SHADOW_STYLE}
              aria-label={t('blast.luckyBoostDesc')}
              title={t('blast.luckyBoostDesc')}
            >
              <Sparkles className="h-3 w-3" strokeWidth={3} />
              {t('blast.luckyBoost') || 'Lucky'}
            </span>
          )}
          {/* Reserved buff slot — keeps chrome stable whether a buff is active or not. */}
          <div
            data-testid="blast-buff-slot"
            className="shrink-0 flex items-center min-h-[28px] min-w-[28px]"
          >
            {activeBuff && (() => {
              const meta = BUFF_META[activeBuff];
              const Icon = meta.Icon;
              return (
                <span
                  data-testid="blast-active-buff-chip"
                  data-consumed={buffConsumed ? 'true' : 'false'}
                  className={cn(
                    'shrink-0 inline-flex items-center gap-1.5 rounded-lg border-2 border-black px-2.5 py-1 text-xs font-black uppercase tracking-wider text-neo-navy shadow-hard transition-all animate-neo-pop',
                    buffConsumed ? 'bg-white/20 text-white line-through opacity-60 shadow-none' : `${meta.bg} blast-heartbeat`,
                  )}
                  style={NO_TEXT_SHADOW_STYLE}
                  aria-label={(t(meta.label) || activeBuff) + (buffConsumed ? ` (${t('common.used') || 'used'})` : '')}
                >
                  <Icon className="h-4 w-4" strokeWidth={3} />
                  {t(meta.label) || activeBuff}
                </span>
              );
            })()}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {hintSlot}
          {onShowHelp && (
            <button
              onClick={onShowHelp}
              className="text-white hover:text-white transition-colors"
              aria-label={t('blast.help')}
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onQuit}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/8 hover:bg-neo-red/25 text-white hover:text-neo-red transition-colors"
            aria-label={t('common.quit')}
            data-testid="blast-quit-btn"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bottom row: score | moves + combo | progress.
          Each cell uses fixed basis/min-width so digit growth or chip toggles
          don't shove neighbours around. */}
      <div className="flex items-stretch px-3 py-2 gap-3">
        {/* Score — fixed minimum width room for 5 digits */}
        <div
          className="flex items-center gap-1.5 basis-1/3 min-w-0"
          aria-label={`${t('blast.score')}: ${animatedScore}`}
        >
          <span className="text-amber-400 text-base shrink-0">★</span>
          <span
            className={cn(
              'text-2xl font-black tabular-nums truncate transition-transform duration-150 text-neo-white',
              scorePulse && 'scale-[1.15]',
            )}
            style={{ minWidth: '5ch' }}
          >
            {animatedScore.toLocaleString()}
          </span>
        </div>

        {/* Moves + reserved combo slot */}
        <div className="flex items-center gap-2 shrink-0" aria-live="polite">
          {isFiniteMoves ? (
            <div className="flex flex-col items-center gap-0.5 w-[56px]">
              <div
                className={cn(
                  'w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 transition-colors',
                  movesRemaining <= 3 ? 'border-neo-red/80 bg-neo-red/15' : 'border-white/25 bg-white/8',
                )}
              >
                <span className={cn('text-2xl font-black tabular-nums leading-none', moveColorClass)}>
                  {movesRemaining}
                </span>
              </div>
              <span className={cn('text-[9px] font-bold uppercase tracking-wider leading-none', movesRemaining <= 3 ? 'text-neo-red' : 'text-white')}>
                {t('blast.movesLeft')}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5 w-[56px]">
              <span className="text-2xl font-black text-neo-white tabular-nums">
                {wordsFoundCount}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-white">
                {t('blast.words')}
              </span>
            </div>
          )}
          {/* Reserved combo badge slot — fixed footprint regardless of streak presence. */}
          <div
            data-testid="blast-combo-slot"
            className="w-[44px] h-[44px] flex items-center justify-center"
          >
            {comboStreak && comboStreakArcRef && (
              <BlastComboStreakBadge streak={comboStreak} arcRef={comboStreakArcRef} />
            )}
          </div>
        </div>

        {/* Tile clear progress with 90% goal marker */}
        <div className="flex flex-col items-end gap-1 basis-1/3 min-w-0">
          <span
            data-testid="blast-progress-label"
            className="text-sm font-black tabular-nums whitespace-nowrap"
          >
            <span className={goalMet ? 'text-neo-lime' : 'text-neo-white'}>{clearPct}%</span>
            <span className="text-white"> / {BLAST_WAVE_GOAL_PCT}%</span>
          </span>
          <div className="relative w-full h-3.5 bg-white/10 rounded-full overflow-hidden border border-white/10">
            <div
              data-testid="blast-progress-fill"
              data-goal-met={goalMet ? 'true' : 'false'}
              className={cn(
                'h-full rounded-full transition-all duration-300',
                goalMet && 'blast-progress-shimmer',
              )}
              style={{
                width: `${clearPct}%`,
                background: goalMet
                  ? 'linear-gradient(90deg, #BFFF00, #D9FF66)'
                  : 'linear-gradient(90deg, #00FFFF, #66FFFF)',
              }}
            />
            {/* 90% goal marker — always visible so the player sees how far they need to push */}
            <div
              data-testid="blast-progress-target-marker"
              aria-hidden="true"
              className={cn(
                'absolute top-0 bottom-0 w-[2px] -translate-x-1/2 transition-colors',
                goalMet ? 'bg-neo-lime shadow-[0_0_6px_rgba(191,255,0,0.9)]' : 'bg-white/55',
              )}
              style={{ left: `${BLAST_WAVE_GOAL_PCT}%` }}
            />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-white tabular-nums">
            {tilesCleared}/{totalTiles} {t('blast.cleared')}
          </span>
        </div>
      </div>
    </div>
  );
}
