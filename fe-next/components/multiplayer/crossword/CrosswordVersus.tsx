'use client';

/**
 * Crossword race — Versus mount. Parallel-race: every player solves the SAME
 * server-broadcast puzzle; this client runs the existing solo crossword engine
 * (useCrosswordGame) and reports progress on each word solved. A live standings
 * rail shows rivals' completion. Renders the stateless crossword sub-components
 * directly so it never edits the (churning) solo CrosswordView. Mirrors the
 * WordTower/Shiritori/SealedBid versus mounts.
 */
import { useEffect, useMemo } from 'react';
import type { Socket } from 'socket.io-client';
import { CheckCheck, Lightbulb, Eye } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import ExitRoomButton from '@/components/ExitRoomButton';
import type { CrosswordPuzzle } from '@/lib/crossword/types';
import { useCrosswordGame } from '@/hooks/useCrosswordGame';
import { crosswordStats, solvedSlotIds } from '@/lib/crossword/stats';
import { crosswordScore } from '@/lib/solo/soloReward';
import { CrosswordGrid } from '@/components/crossword/CrosswordGrid';
import { CrosswordKeyboard } from '@/components/crossword/CrosswordKeyboard';
import { ClueBar } from '@/components/crossword/ClueBar';
import { CrosswordClueList } from '@/components/crossword/CrosswordClueList';
import { useCrosswordMp, type CrosswordMpSocketLike, type CrosswordStanding } from './useCrosswordMp';

interface CrosswordVersusProps {
  socket: Socket | null;
  username: string;
  onQuit?: () => void;
}

function StandingsRail({ standings, me, t }: { standings: CrosswordStanding[]; me: string; t: (k: string, fallbackOrParams?: string | Record<string, string | number>) => string }) {
  return (
    <ul className="flex flex-col gap-1.5" aria-label={t('crossword.mp.standings')}>
      {standings.map((s) => (
        <li key={s.username} className={`rounded-neo border-neo border-black px-2.5 py-1.5 shadow-hard ${s.username === me ? 'bg-neo-cyan/20' : 'bg-neo-navy-light'}`}>
          <div className="flex items-center justify-between gap-2">
            <span className={`font-neo-display text-xs font-bold ${s.username === me ? 'text-neo-cyan' : 'text-neo-white'}`}>
              {s.solved ? <span aria-hidden="true">🏁 </span> : ''}{s.username}
            </span>
            <span className="font-neo-body text-[10px] tabular-nums text-neo-cream/60">{s.solved ? t('crossword.mp.done') : `${s.percent}%`}</span>
          </div>
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-black/40">
            <div className="h-full rounded-full bg-neo-cyan transition-all" style={{ width: `${s.percent}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Inner — only mounts once the puzzle exists so useCrosswordGame seeds correctly. */
function CrosswordRace({
  puzzle, username, standings, raceOver,
  submitProgress, onQuit,
}: {
  puzzle: CrosswordPuzzle;
  username: string;
  standings: CrosswordStanding[];
  raceOver: boolean;
  submitProgress: (u: { percent: number; solved: boolean; elapsedMs: number; score: number }) => void;
  onQuit?: () => void;
}) {
  const { t, dir } = useLanguage();
  const game = useCrosswordGame(puzzle, {});
  const stats = crosswordStats(game.state);
  const solved = game.state.status === 'solved';
  const mySolvedSlotIds = useMemo(() => solvedSlotIds(game.state), [game.state]);
  const hintsUsed = game.state.revealed.length;

  // Report progress on each newly-solved word + on final solve (word-granularity,
  // no keystroke spam). elapsedMs is read at emit time, not a dep, so the per-second
  // timer tick doesn't re-fire this.
  useEffect(() => {
    submitProgress({
      percent: stats.percent,
      solved,
      elapsedMs: game.elapsedMs,
      score: solved ? crosswordScore(game.elapsedMs, hintsUsed, stats.wordsTotal) : 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats.wordsSolved, solved]);

  return (
    <div className="fixed inset-0 flex h-[100dvh] flex-col bg-neo-navy p-3" dir={dir}>
      {/* Header: exit + progress + timer */}
      <div className="flex items-center gap-3">
        {onQuit && <ExitRoomButton onClick={onQuit} label={t('common.backToHome')} />}
        <span className="font-neo-display text-sm font-bold text-neo-cyan">{t('crossword.mp.title')}</span>
        <span className="ms-auto font-neo-body text-xs tabular-nums text-neo-cream/70">
          {stats.wordsSolved}{t('crossword.mp.statSeparator', '/')}{stats.wordsTotal} {t('crossword.mp.statPercent', '{{percent}}%', { percent: stats.percent })}
        </span>
      </div>

      <div className="mt-2 flex flex-1 flex-col gap-3 overflow-hidden lg:grid lg:grid-cols-[1fr_15rem]">
        {/* Board + clue + keyboard */}
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          <CrosswordGrid state={game.state} onSelect={game.focusCell} t={t} solved={solved} />
          <ClueBar slot={game.activeSlot} rtl={puzzle.rtl} onPrev={() => game.nextSlot(-1)} onNext={() => game.nextSlot(1)} onToggleDir={game.toggleDir} t={t} />
          <div className="flex items-center justify-center gap-2">
            <button type="button" onClick={game.checkAll} aria-label={t('crossword.check')} className="flex min-h-[44px] items-center gap-1 rounded-neo border-neo border-black bg-neo-navy-light px-3 py-2 font-neo-body text-xs font-bold text-neo-white shadow-hard">
              <CheckCheck className="h-4 w-4" aria-hidden="true" /> {t('crossword.check')}
            </button>
            <button type="button" onClick={game.revealCell} aria-label={t('crossword.revealLetter')} className="flex min-h-[44px] items-center gap-1 rounded-neo border-neo border-black bg-neo-navy-light px-3 py-2 font-neo-body text-xs font-bold text-neo-white shadow-hard">
              <Lightbulb className="h-4 w-4" aria-hidden="true" /> {t('crossword.revealLetter')}
            </button>
            <button type="button" onClick={game.revealWord} aria-label={t('crossword.revealWord')} className="flex min-h-[44px] items-center gap-1 rounded-neo border-neo border-black bg-neo-navy-light px-3 py-2 font-neo-body text-xs font-bold text-neo-white shadow-hard">
              <Eye className="h-4 w-4" aria-hidden="true" /> {t('crossword.revealWord')}
            </button>
          </div>
          <div className="shrink-0 lg:hidden">
            <CrosswordKeyboard locale={puzzle.locale} onLetter={game.inputLetter} onBackspace={game.backspace} disabled={solved} backspaceLabel={t('crossword.backspace')} />
          </div>
          <details className="lg:hidden rounded-neo border-neo border-black bg-neo-navy-light shadow-hard">
            <summary className="cursor-pointer list-none px-3 py-2.5 font-neo-body text-xs font-bold text-neo-white">{t('crossword.allClues')}</summary>
            <CrosswordClueList slots={puzzle.slots} activeSlotId={game.activeSlot?.id ?? null} onSelect={(slot) => game.focusSlot(slot.id)} t={t} capturedSlotIds={mySolvedSlotIds} />
          </details>
        </div>

        {/* Standings rail */}
        <aside className="shrink-0 overflow-y-auto">
          <h3 className="mb-1.5 font-neo-display text-[11px] font-bold uppercase tracking-wide text-neo-cream/50">{t('crossword.mp.standings')}</h3>
          <StandingsRail standings={standings} me={username} t={t} />
        </aside>
      </div>

      {/* Race-over / you-solved banner (non-blocking — grid stays visible) */}
      {(raceOver || solved) && (
        <div className="pointer-events-none absolute inset-x-0 top-14 z-20 flex justify-center">
          <div className="rounded-neo border-neo-thick border-black bg-neo-yellow px-5 py-2 font-neo-display font-bold text-black shadow-hard" role="status">
            {raceOver
              ? (standings[0]?.username === username ? t('crossword.mp.youWin') : t('crossword.mp.winner', { winner: standings[0]?.username ?? '' }))
              : t('crossword.mp.youFinished')}
          </div>
        </div>
      )}
    </div>
  );
}

export function CrosswordVersus({ socket, username, onQuit }: CrosswordVersusProps) {
  const { t, dir } = useLanguage();
  const versusSocket = socket as unknown as CrosswordMpSocketLike | null;
  const mp = useCrosswordMp(versusSocket);

  if (!mp.puzzle) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-neo-navy" dir={dir}>
        <p className="animate-pulse font-neo-display text-xl text-neo-cyan">{t('crossword.mp.waiting')}</p>
      </div>
    );
  }

  return (
    <CrosswordRace
      puzzle={mp.puzzle}
      username={username}
      standings={mp.standings}
      raceOver={mp.raceOver}
      submitProgress={mp.submitProgress}
      onQuit={onQuit}
    />
  );
}

export default CrosswordVersus;
