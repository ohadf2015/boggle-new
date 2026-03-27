'use client';

import { X, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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

  const moveColorClass = movesRemaining <= 2
    ? 'text-neo-red animate-pulse'
    : movesRemaining <= 5
    ? 'text-neo-yellow'
    : 'text-neo-white';

  return (
    <div
      className="flex items-center justify-between gap-2 px-3 py-1.5 bg-neo-navy-light border-b border-white/10"
      data-testid="blast-hud"
    >
      {/* Left: wave badge + score */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="shrink-0 text-[10px] font-black uppercase tracking-wider bg-white/10 text-neo-white px-1.5 py-0.5 rounded"
          aria-label={`${t('blast.wave')} ${waveNumber}`}
        >
          W{waveNumber}
        </span>
        <span className="text-lg font-black bg-gradient-to-r from-neo-lime to-lime-300 bg-clip-text text-transparent tabular-nums truncate">
          {score.toLocaleString()}
        </span>
        {comboLevel >= 2 && (
          <span className="text-[10px] font-bold text-neo-cyan tabular-nums">
            x{comboLevel}
          </span>
        )}
      </div>

      {/* Center: move counter */}
      <div className="flex flex-col items-center" aria-live="polite">
        {isFiniteMoves ? (
          <>
            <span className={cn('text-lg font-black tabular-nums leading-none', moveColorClass)}>
              {movesRemaining}
            </span>
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">
              {t('blast.moves') ?? 'moves'}
            </span>
          </>
        ) : (
          <span className="text-xs font-bold text-white/40">
            {wordsFoundCount} {t('blast.words') ?? 'words'}
          </span>
        )}
      </div>

      {/* Right: tiles progress + controls */}
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-white/60 tabular-nums">
            {clearPct}%
          </span>
          <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-neo-lime rounded-full transition-all duration-300"
              style={{ width: `${clearPct}%` }}
            />
          </div>
        </div>
        {onShowHelp && (
          <button
            onClick={onShowHelp}
            className="text-white/40 hover:text-white/70 transition-colors"
            aria-label={t('blast.help') ?? 'Help'}
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={onQuit}
          className="text-white/40 hover:text-neo-red transition-colors"
          aria-label={t('common.quit') ?? 'Quit'}
          data-testid="blast-quit-btn"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
