'use client';

import { Grid3x3 } from 'lucide-react';
import type { CrosswordPuzzle } from '@/lib/crossword/types';
import { useCrosswordMp, type CrosswordMpSocketLike, type CrosswordStanding } from '@/components/multiplayer/crossword/useCrosswordMp';
import { useClassroomPressure } from '@/hooks/gameState/classroomPressureStore';
import { isLeaderboardHidden, isStudentTimerHidden, trimLeaderboardForPressure } from '@/shared/utils/classroomPressure';
import type { Translate } from './eduLiveStyles';

const CARD = 'rounded-neo-lg border-4 border-neo-cream bg-neo-navy-light shadow-hard-lg';
const MAX_ROWS = 8;

function formatClock(sec: number | null | undefined): string {
  const s = Math.max(0, Math.floor(sec ?? 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The grid's shape and numbers only: the wall never shows an answer. */
function GridSilhouette({ puzzle, t }: { puzzle: CrosswordPuzzle; t: Translate }) {
  return (
    <div className="grid h-full w-full place-items-center [container-type:size]">
      <div
        data-testid="crossword-silhouette"
        role="img"
        aria-label={t('eduCrossword.gridLabel')}
        dir={puzzle.rtl ? 'rtl' : 'ltr'}
        className="grid aspect-square w-[min(100cqw,100cqh)] gap-[2px] rounded-neo border-[3px] border-neo-black bg-neo-black p-[2px]"
        style={{ gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))` }}
      >
        {puzzle.cells.map((cell) => (
          <span
            key={`${cell.row},${cell.col}`}
            className={`relative ${cell.block ? 'bg-neo-navy' : 'bg-neo-cream'}`}
          >
            {cell.number != null && (
              <span className="absolute start-[6%] top-[2%] font-neo-display text-[min(2.2cqmin,1.25rem)] font-black leading-none text-neo-black">
                {cell.number}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

function StandingRow({ row, t }: { row: CrosswordStanding; t: Translate }) {
  return (
    <li className="flex min-h-0 items-center gap-3 overflow-hidden rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-3 py-1">
      <span className="w-8 shrink-0 font-neo-display text-xl font-black tabular-nums text-neo-cream/70">{row.rank}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-neo-display text-lg font-black md:text-2xl">{row.username}</span>
        <span className="mt-1 block h-2 overflow-hidden rounded-full bg-neo-black/60" aria-hidden="true">
          <span
            className={`block h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300 ${row.solved ? 'bg-neo-lime' : 'bg-neo-cyan'}`}
            style={{ width: `${row.percent}%` }}
          />
        </span>
      </span>
      <span dir="ltr" className={`shrink-0 font-neo-display text-lg font-black tabular-nums md:text-2xl ${row.solved ? 'text-neo-lime' : 'text-neo-cream'}`}>
        {row.solved ? t('eduCrossword.done') : t('eduCrossword.percent', { percent: row.percent })}
      </span>
    </li>
  );
}

interface ProjectorCrosswordStageProps {
  socket: CrosswordMpSocketLike | null;
  remainingTime?: number | null;
  t: Translate;
}

/** The teacher's wall during a classroom crossword: the grid's shape and the race to finish it. */
export function ProjectorCrosswordStage({ socket, remainingTime, t }: ProjectorCrosswordStageProps) {
  const mp = useCrosswordMp(socket);
  const pressure = useClassroomPressure();
  const leaderboardHidden = pressure ? isLeaderboardHidden(pressure) : false;
  const timerHidden = pressure ? isStudentTimerHidden(pressure) : false;
  const finished = mp.standings.filter((s) => s.solved).length;
  const visible = pressure ? trimLeaderboardForPressure(mp.standings, pressure) : mp.standings;
  const shown = visible.slice(0, MAX_ROWS);
  const hiddenCount = visible.length - shown.length;

  return (
    <div data-testid="projector-crossword-stage" className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-neo-navy p-3 font-neo-body text-neo-cream md:gap-4 md:p-5">
      <div className="flex shrink-0 flex-wrap items-center gap-3 md:flex-nowrap md:gap-5">
        <span className="inline-flex shrink-0 items-center gap-2 rounded-neo border-[3px] border-neo-black bg-neo-cyan px-3 py-1.5 font-neo-display text-base font-black uppercase text-neo-black shadow-hard md:text-2xl">
          <Grid3x3 className="size-5 md:size-7" aria-hidden="true" />
          {t('eduCrossword.name')}
        </span>
        <span data-testid="crossword-finished" className="font-neo-display text-sm font-black uppercase md:text-xl">
          {t('eduCrossword.finished', { count: finished, total: mp.standings.length })}
        </span>
        {!timerHidden && (
          <span data-testid="race-clock" className="ms-auto shrink-0 rounded-neo border-[3px] border-neo-cream bg-neo-navy-light px-4 py-1 font-neo-display text-2xl font-black tabular-nums shadow-hard md:text-5xl">
            {formatClock(remainingTime)}
          </span>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:grid-rows-1 md:gap-4">
        <div className={`min-h-0 overflow-hidden p-3 ${CARD}`}>
          {mp.puzzle ? (
            <GridSilhouette puzzle={mp.puzzle} t={t} />
          ) : (
            <p className="grid h-full place-items-center font-neo-display text-xl font-black motion-safe:animate-pulse">{t('eduCrossword.waiting')}</p>
          )}
        </div>

        <div className={`min-h-0 overflow-hidden p-3 ${CARD}`}>
          {leaderboardHidden ? (
            <p data-testid="leaderboard-reveal-note" className="grid h-full place-items-center p-4 text-center font-neo-display text-xl font-black md:text-3xl">
              {t('education.classroomGame.pressure.revealAtEnd')}
            </p>
          ) : (
            <ol
              data-testid="crossword-standings"
              aria-label={t('eduCrossword.standingsLabel')}
              className="grid h-full gap-2 overflow-hidden"
              style={{ gridTemplateRows: `repeat(${Math.max(MAX_ROWS, shown.length) + 1}, minmax(0, 1fr))` }}
            >
              {shown.map((row) => <StandingRow key={row.username} row={row} t={t} />)}
              {hiddenCount > 0 && (
                <li className="grid min-h-0 place-items-center font-neo-display text-lg font-black text-neo-cream/70">{t('eduCrossword.more', { count: hiddenCount })}</li>
              )}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectorCrosswordStage;
