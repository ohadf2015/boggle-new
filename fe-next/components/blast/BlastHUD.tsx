'use client';

import { useState, useEffect, useRef } from 'react';
import { X, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  comboLevel: number;
  tilesCleared: number;
  totalTiles: number;
  onQuit: () => void;
  onShowHelp?: () => void;
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
  comboLevel,
  tilesCleared,
  totalTiles,
  onQuit,
  onShowHelp,
  t,
}: BlastHUDProps) {
  const clearPct = totalTiles > 0 ? Math.round((tilesCleared / totalTiles) * 100) : 0;
  const isFiniteMoves = isFinite(totalMoves);
  const { display: animatedScore, pulse: scorePulse } = useAnimatedScore(score);

  const moveColorClass = movesRemaining <= 2
    ? 'text-neo-red blast-heartbeat'
    : movesRemaining <= 3
    ? 'text-neo-red'
    : movesRemaining <= 5
    ? 'text-neo-yellow'
    : 'text-neo-white';

  return (
    <div
      className="flex items-center justify-between gap-2 px-3 py-2 pt-safe"
      style={{
        background: 'linear-gradient(180deg, rgba(15,12,41,0.85) 0%, rgba(15,12,41,0.6) 100%)',
        backdropFilter: 'blur(8px)',
      }}
      data-testid="blast-hud"
    >
      {/* Left: wave shield + score */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border-2 border-neo-cyan/40 text-neo-cyan"
          style={{ textShadow: '0 0 6px rgba(0,255,255,0.4)' }}
          aria-label={`${t('blast.wave')} ${waveNumber}`}
        >
          W{waveNumber}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-amber-400 text-sm">★</span>
          <span
            className={cn(
              'text-xl font-black tabular-nums truncate transition-transform duration-150',
              scorePulse && 'scale-[1.15]',
            )}
            style={{
              background: 'linear-gradient(180deg, #FFE566 0%, #FFD700 50%, #B8860B 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: 'none',
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))',
            }}
          >
            {animatedScore.toLocaleString()}
          </span>
        </div>
        {comboLevel >= 2 && (
          <span
            className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-neo-lime text-neo-black border-2 border-neo-black animate-neo-pop"
          >
            x{comboLevel}
          </span>
        )}
      </div>

      {/* Center: move counter in circle */}
      <div className="flex flex-col items-center" aria-live="polite">
        {isFiniteMoves ? (
          <div
            className={cn(
              'w-10 h-10 rounded-full flex flex-col items-center justify-center border-2',
              movesRemaining <= 3 ? 'border-neo-red/80 bg-neo-red/15' : 'border-white/20 bg-white/5',
            )}
          >
            <span className={cn('text-lg font-black tabular-nums leading-none', moveColorClass)}>
              {movesRemaining}
            </span>
          </div>
        ) : (
          <span className="text-xs font-bold text-white/50 tabular-nums">
            {wordsFoundCount} {t('blast.words') ?? 'words'}
          </span>
        )}
      </div>

      {/* Right: progress + controls */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-white/60 tabular-nums">
            {clearPct}%
          </span>
          <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${clearPct}%`,
                background: clearPct >= 50
                  ? 'linear-gradient(90deg, #BFFF00, #D9FF66)'
                  : 'linear-gradient(90deg, #00FFFF, #66FFFF)',
                boxShadow: clearPct >= 50
                  ? '0 0 6px rgba(191,255,0,0.5)'
                  : '0 0 6px rgba(0,255,255,0.5)',
              }}
            />
          </div>
        </div>
        {onShowHelp && (
          <button
            onClick={onShowHelp}
            className="text-white/30 hover:text-white/60 transition-colors"
            aria-label={t('blast.help') ?? 'Help'}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onQuit}
          className="text-white/30 hover:text-neo-red transition-colors"
          aria-label={t('common.quit') ?? 'Quit'}
          data-testid="blast-quit-btn"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
