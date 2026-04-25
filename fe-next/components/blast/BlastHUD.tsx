'use client';

import { useState, useEffect, useRef } from 'react';
import { X, HelpCircle, Shield, Bomb, Zap } from 'lucide-react';
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
  t: (key: string) => string | undefined;
}

/**
 * BlastHUD — compact top-bar showing score, moves, wave, and tile progress.
 * Neo-brutalist styling with urgency states for low moves.
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
  t,
}: BlastHUDProps) {
  const clearPct = totalTiles > 0 ? Math.round((tilesCleared / totalTiles) * 100) : 0;
  const isFiniteMoves = isFinite(totalMoves);
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
      {/* Top row: wave + controls */}
      <div className="flex items-center justify-between px-3 py-1.5 pt-safe">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border-2 border-neo-cyan/40 text-neo-cyan"
            style={NO_TEXT_SHADOW_STYLE}
            aria-label={`${t('blast.wave')} ${waveNumber}`}
          >
            W{waveNumber}
          </span>
          {activeBuff && (() => {
            const meta = BUFF_META[activeBuff];
            const Icon = meta.Icon;
            return (
              <span
                data-testid="blast-active-buff-chip"
                data-consumed={buffConsumed ? 'true' : 'false'}
                className={cn(
                  'shrink-0 inline-flex items-center gap-1.5 rounded-lg border-2 border-black px-2.5 py-1 text-xs font-black uppercase tracking-wider text-neo-navy shadow-hard transition-all animate-neo-pop',
                  buffConsumed ? 'bg-white/20 text-white/40 line-through opacity-60 shadow-none' : `${meta.bg} blast-heartbeat`,
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

        <div className="flex items-center gap-1.5">
          {onShowHelp && (
            <button
              onClick={onShowHelp}
              className="text-white/30 hover:text-white/60 transition-colors"
              aria-label={t('blast.help')}
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onQuit}
            className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/8 hover:bg-neo-red/25 text-white/50 hover:text-neo-red transition-colors"
            aria-label={t('common.quit')}
            data-testid="blast-quit-btn"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bottom row: score | moves + combo | progress */}
      <div className="flex items-center px-3 py-2 gap-3">
        {/* Score */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0" aria-label={`${t('blast.score')}: ${animatedScore}`}>
          <span className="text-amber-400 text-base shrink-0">★</span>
          <span
            className={cn(
              'text-2xl font-black tabular-nums truncate transition-transform duration-150 text-neo-cream',
              scorePulse && 'scale-[1.15]',
            )}
          >
            {animatedScore.toLocaleString()}
          </span>
        </div>

        {/* Move counter + combo streak — same row */}
        <div className="flex items-center gap-2 shrink-0" aria-live="polite">
          {isFiniteMoves ? (
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  'w-14 h-14 rounded-full flex flex-col items-center justify-center border-2',
                  movesRemaining <= 3 ? 'border-neo-red/80 bg-neo-red/15' : 'border-white/25 bg-white/8',
                )}
              >
                <span className={cn('text-2xl font-black tabular-nums leading-none', moveColorClass)}>
                  {movesRemaining}
                </span>
              </div>
              <span className={cn('text-[9px] font-bold uppercase tracking-wider leading-none', movesRemaining <= 3 ? 'text-neo-red' : 'text-white/50')}>
                {t('blast.movesLeft')}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-2xl font-black text-neo-cream tabular-nums">
                {wordsFoundCount}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-white/50">
                {t('blast.words')}
              </span>
            </div>
          )}
          {comboStreak && comboStreakArcRef && (
            <BlastComboStreakBadge streak={comboStreak} arcRef={comboStreakArcRef} />
          )}
        </div>

        {/* Tile clear progress */}
        <div className="flex flex-col items-end gap-1 flex-1">
          <span className="text-sm font-black text-neo-cream tabular-nums">
            {clearPct}%
          </span>
          <div className="w-full h-3.5 bg-white/10 rounded-full overflow-hidden border border-white/10">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${clearPct}%`,
                background: clearPct >= 50
                  ? 'linear-gradient(90deg, #BFFF00, #D9FF66)'
                  : 'linear-gradient(90deg, #00FFFF, #66FFFF)',
              }}
            />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">
            {tilesCleared}/{totalTiles} {t('blast.cleared')}
          </span>
        </div>
      </div>
    </div>
  );
}
