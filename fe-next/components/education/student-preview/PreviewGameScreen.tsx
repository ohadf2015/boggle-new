import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GameMode } from '@/shared/types/game';
import type { PreviewBoardResult } from '@/lib/education/previewBoard';
import { formatCountdown, gameModeLabel, type Translate } from './previewLabels';

interface PreviewGameScreenProps {
  t: Translate;
  board: PreviewBoardResult;
  gameMode: GameMode;
  timerMinutes: number;
  minWordLength: number;
}

/** In-game screen: countdown, mode, the letter grid with one hidden word lit up. */
export function PreviewGameScreen({
  t,
  board,
  gameMode,
  timerMinutes,
  minWordLength,
}: PreviewGameScreenProps) {
  const cols = board.grid[0]?.length ?? 0;
  const sample = board.placements[0];
  const litCells = new Set(sample?.path.map(([r, c]) => `${r},${c}`) ?? []);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span
          dir="ltr"
          className="inline-flex items-center gap-1 rounded-neo border-2 border-neo-black bg-neo-cream px-2 py-1 font-mono text-sm font-black text-neo-navy shadow-hard-sm"
          aria-label={t('education.studentPreview.game.timeLeft')}
        >
          <Timer className="h-4 w-4" aria-hidden="true" />
          {formatCountdown(timerMinutes)}
        </span>
        <span className="rounded-neo border-2 border-neo-black bg-neo-pink px-2 py-1 font-neo-display text-[11px] font-black uppercase tracking-wide text-neo-black shadow-hard-sm">
          {gameModeLabel(t, gameMode)}
        </span>
      </div>

      <div
        data-testid="student-preview-board"
        role="img"
        aria-label={t('education.studentPreview.game.boardLabel')}
        dir="ltr"
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {board.grid.map((row, r) =>
          row.map((letter, c) => {
            const lit = litCells.has(`${r},${c}`);
            return (
              <span
                key={`${r}-${c}`}
                data-testid="student-preview-tile"
                className={cn(
                  'flex aspect-square items-center justify-center rounded-neo-sm border-2 border-neo-black font-neo-display text-base font-black',
                  lit ? 'bg-neo-lime text-neo-navy shadow-hard-sm' : 'bg-neo-cream text-neo-navy'
                )}
              >
                {letter}
              </span>
            );
          })
        )}
      </div>

      {sample && (
        <p className="text-center text-[11px] text-neo-lime">
          {t('education.studentPreview.game.samplePath', { word: sample.word })}
        </p>
      )}

      <div className="mt-auto rounded-neo border-2 border-neo-white/20 bg-neo-navy-light px-3 py-2 text-center text-xs text-neo-white/80">
        {t('education.studentPreview.game.minLength', { count: minWordLength })}
      </div>
    </div>
  );
}
