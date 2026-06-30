'use client';

import { useState, useEffect, useRef } from 'react';
import { HelpCircle, Shield, Bomb, Zap, Sparkles, Clock, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import ExitRoomButton from '@/components/ExitRoomButton';
import { formatTimeMMSS } from '@/shared/utils/timeFormatting';
import { computeTimerUrgency } from '@/lib/cosy/timerUrgency';
import { useSuppressTimerUrgency } from '@/contexts/AccessibilityContext';
import { BlastComboStreakBadge } from './BlastComboStreakBadge';
import { BLAST_MAX_LIVES } from './utils/blastLives';
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

/**
 * Tracks tile-clear progress and fires a short "pulse" + the delta whenever the
 * cleared count jumps, so emptying the board feels rewarding (the bar glows, the
 * count pops, a "+N" floats up) instead of a silent number tick.
 */
function useClearPulse(value: number) {
  const [pulse, setPulse] = useState(false);
  const [delta, setDelta] = useState(0);
  const [burstKey, setBurstKey] = useState(0);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value > prevRef.current) {
      setDelta(value - prevRef.current);
      setPulse(true);
      setBurstKey(k => k + 1);
      prevRef.current = value;
      const id = setTimeout(() => setPulse(false), 650);
      return () => clearTimeout(id);
    }
    prevRef.current = value;
    return undefined;
  }, [value]);

  return { pulse, delta, burstKey };
}

/**
 * Compact countdown pill for the HUD top row (multiplayer only).
 *
 * MP Blast used to float a large CircularTimer in its own band below the HUD,
 * which crowded the board and read as a detached element. Since the wave chip
 * is hidden in MP, the top-row left slot is empty — so we dock the timer there
 * instead: balanced chrome, the board reclaims that vertical space, and the
 * countdown sits beside the rest of the stats where players already look.
 *
 * Urgency escalates the colour (cyan → yellow → red) and pulses when critical,
 * mirroring CircularTimer. Calm/Cosy mode suppresses the escalation.
 */
function BlastHUDTimer({
  remainingTime,
  totalTime,
  t,
}: {
  remainingTime: number;
  totalTime: number;
  t: (key: string) => string | undefined;
}) {
  const suppressUrgency = useSuppressTimerUrgency();
  const { state } = computeTimerUrgency(remainingTime, suppressUrgency);
  const danger = state === 'veryLow' || state === 'critical';

  const colorClass =
    state === 'critical' || state === 'veryLow'
      ? 'border-neo-red/70 text-neo-red'
      : state === 'low'
        ? 'border-neo-yellow/70 text-neo-yellow'
        : 'border-neo-cyan/50 text-neo-cyan';

  return (
    <div
      data-testid="blast-mp-timer"
      data-urgency={state}
      role="timer"
      aria-label={`${t('blast.time') ?? 'Time'}: ${formatTimeMMSS(Math.max(0, Math.round(remainingTime)))}`}
      className={cn(
        'shrink-0 inline-flex items-center gap-1.5 rounded-lg border-2 bg-black/25 px-2 py-0.5',
        colorClass,
        danger && 'blast-heartbeat',
      )}
      style={NO_TEXT_SHADOW_STYLE}
      title={`${totalTime}s ${t('blast.time') ?? 'Time'}`}
    >
      <Clock className="h-3.5 w-3.5 shrink-0" strokeWidth={3} />
      <div className="flex flex-col items-start leading-none">
        <span className="text-[8px] font-black uppercase tracking-[0.18em] opacity-70">
          {t('blast.time') ?? 'Time'}
        </span>
        <span className="text-sm font-black tabular-nums leading-tight">
          {formatTimeMMSS(Math.max(0, Math.round(remainingTime)))}
        </span>
      </div>
    </div>
  );
}

interface BlastHUDProps {
  score: number;
  wordsFoundCount: number;
  movesRemaining: number;
  totalMoves: number;
  waveNumber: number;
  /** Run-level lives left (3-lives model). Undefined hides the hearts (e.g. MP). */
  livesRemaining?: number;
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
  /** MP countdown — seconds remaining. Rendered as a compact pill in the top row
   *  (the slot the wave chip would occupy in SP). Omitted in single-player. */
  remainingTime?: number | null;
  /** MP round length in seconds — drives the urgency calc + a11y label. */
  totalTime?: number;
  /** True when this HUD is the center canvas of the desktop 3-column shell.
   *  The shell's left-rail badge already renders the (server-synced) countdown,
   *  so the HUD must NOT render its own — two timers drifted apart otherwise. */
  isDesktopCanvas?: boolean;
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
  livesRemaining,
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
  remainingTime = null,
  totalTime,
  isDesktopCanvas = false,
  t,
}: BlastHUDProps) {
  const showTimer =
    !isDesktopCanvas &&
    isMultiplayer && remainingTime !== null && remainingTime !== undefined && (totalTime ?? 0) > 0;
  const clearPct = totalTiles > 0 ? Math.round((tilesCleared / totalTiles) * 100) : 0;
  const isFiniteMoves = isFinite(totalMoves);
  const goalMet = clearPct >= BLAST_WAVE_GOAL_PCT;
  const { display: animatedScore, pulse: scorePulse } = useAnimatedScore(score);
  const { pulse: clearPulse, delta: clearDelta, burstKey: clearBurstKey } = useClearPulse(tilesCleared);

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
      <div className="flex items-center justify-between px-3 py-0.5 pt-safe min-h-[28px]">
        <div className="flex items-center gap-2 min-w-0">
          {/* MP countdown — docked into the top row where the wave chip would
              sit in SP, so the board no longer shares space with a floating timer. */}
          {showTimer && (
            <BlastHUDTimer remainingTime={remainingTime as number} totalTime={totalTime as number} t={t} />
          )}
          {/* Wave chip — hidden in MP (timer-era, no waves) */}
          {!isMultiplayer && (
            <span
              className="shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border-2 border-neo-cyan text-neo-cyan tabular-nums"
              style={NO_TEXT_SHADOW_STYLE}
              aria-label={`${t('blast.wave')} ${waveNumber}`}
            >
              W{waveNumber}
            </span>
          )}
          {/* Lives — 3-lives model. Hidden in MP (no lives) and until plumbed. */}
          {!isMultiplayer && livesRemaining !== undefined && (
            <span
              data-testid="blast-lives-chip"
              className="shrink-0 inline-flex items-center gap-0.5 rounded-lg border-2 border-black bg-neo-navy-light px-1.5 py-0.5 shadow-hard"
              aria-label={t('blast.livesLabel')?.replace('{lives}', String(livesRemaining)) ?? `${livesRemaining} lives`}
            >
              {Array.from({ length: BLAST_MAX_LIVES }).map((_, i) => (
                <Heart
                  key={`life-${i}`}
                  className={cn('h-3.5 w-3.5', i < livesRemaining ? 'text-neo-pink' : 'text-white/20')}
                  fill="currentColor"
                  strokeWidth={2}
                />
              ))}
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
          <ExitRoomButton
            onClick={onQuit}
            label={t('common.quit') ?? 'Quit'}
            data-testid="blast-quit-btn"
            className="w-7 h-7 min-w-0 min-h-0"
          />
        </div>
      </div>

      {/* Bottom row: score | moves + combo | progress.
          Each cell uses fixed basis/min-width so digit growth or chip toggles
          don't shove neighbours around. */}
      <div className="flex items-stretch px-3 py-1 gap-2">
        {/* Score — fixed minimum width room for 5 digits. Labelled so the lone
            star + number reads unambiguously as the player's score. */}
        <div
          className="flex flex-col justify-center basis-1/3 min-w-0"
          aria-label={`${t('blast.score')}: ${animatedScore}`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-amber-400 text-sm shrink-0">★</span>
            <span
              className={cn(
                'text-xl font-black tabular-nums truncate transition-transform duration-150 text-neo-white origin-left',
                scorePulse && 'scale-[1.15]',
              )}
              style={{ minWidth: '5ch' }}
            >
              {animatedScore.toLocaleString()}
            </span>
          </div>
          <span
            data-testid="blast-score-label"
            className="text-[9px] font-bold uppercase tracking-wider text-white leading-none mt-0.5"
          >
            {t('blast.score')}
          </span>
        </div>

        {/* Moves + reserved combo slot */}
        <div className="flex items-center gap-2 shrink-0" aria-live="polite">
          {isFiniteMoves ? (
            <div className="flex flex-col items-center gap-0.5 w-[56px]">
              <div
                className={cn(
                  'w-11 h-11 rounded-full flex flex-col items-center justify-center border-2 transition-colors',
                  movesRemaining <= 3 ? 'border-neo-red/80 bg-neo-red/15' : 'border-white/25 bg-white/8',
                )}
              >
                <span className={cn('text-xl font-black tabular-nums leading-none', moveColorClass)}>
                  {movesRemaining}
                </span>
              </div>
              <span className={cn('text-[9px] font-bold uppercase tracking-wider leading-none', movesRemaining <= 3 ? 'text-neo-red' : 'text-white')}>
                {t('blast.movesLeft')}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5 w-[56px]">
              <span className="text-xl font-black text-neo-white tabular-nums">
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

        {/* Tile-clear progress. The old "X% / 90%" label + 90% marker confused
            players, so the goal is now signalled implicitly: the bar fills, then
            flips lime + shows a ✓ once ≥90% (goalMet) is reached. The concrete
            X/Y cleared count stays as the only number. */}
        <div className="relative flex flex-col items-end gap-0.5 basis-1/3 min-w-0">
          {/* Floating "+N" that pops each time tiles clear — the satisfying beat. */}
          {clearPulse && clearDelta > 0 && (
            <span
              key={clearBurstKey}
              data-testid="blast-clear-delta"
              aria-hidden="true"
              className="blast-clear-delta-pop pointer-events-none absolute right-1 top-0 text-sm font-black text-neo-lime drop-shadow-[0_1px_0_rgba(0,0,0,0.6)]"
            >
              +{clearDelta}
            </span>
          )}
          {/* Reserved ready-mark row — keeps height stable; shows ✓ only at goal. */}
          <span
            data-testid="blast-progress-label"
            aria-hidden="true"
            className="h-3.5 text-sm font-black leading-none text-neo-lime"
          >
            {goalMet ? '✓' : ' '}
          </span>
          <div
            className={cn(
              'relative w-full h-2.5 bg-white/10 rounded-full overflow-hidden border transition-all duration-200',
              clearPulse ? 'border-neo-lime shadow-hard-sm scale-y-150' : 'border-white/10',
            )}
          >
            <div
              data-testid="blast-progress-fill"
              data-goal-met={goalMet ? 'true' : 'false'}
              className={cn(
                'h-full rounded-full transition-all duration-300',
                goalMet && 'blast-progress-shimmer',
                clearPulse && 'brightness-150',
              )}
              style={{
                width: `${clearPct}%`,
                background: goalMet
                  ? 'linear-gradient(90deg, #BFFF00, #D9FF66)'
                  : 'linear-gradient(90deg, #00FFFF, #66FFFF)',
              }}
            />
          </div>
          <span
            className={cn(
              'text-[9px] font-bold uppercase tracking-wider tabular-nums transition-transform duration-150 origin-right',
              goalMet ? 'text-neo-lime' : 'text-white',
              clearPulse && 'scale-[1.35] text-neo-lime',
            )}
          >
            {tilesCleared}/{totalTiles} {t('blast.cleared')}
          </span>
        </div>
      </div>
    </div>
  );
}
