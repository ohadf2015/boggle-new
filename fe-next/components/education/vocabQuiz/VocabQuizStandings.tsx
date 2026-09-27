/**
 * Live Vocab Quiz — standings list.
 *
 * Shared by the student's between-question strip and the host projector's
 * top-five. The server sorts; this only renders, so the phone and the board at
 * the front of the room can never disagree about who is winning.
 *
 * At the END of the quiz it stages the top three on the same podium the board
 * modes use (`podium`), so Vocab Quiz finishes on a moment rather than a list.
 * Mid-quiz it stays a plain list — a podium celebrating a lead that is still
 * moving reads as a result, and it isn't one yet.
 */

'use client';

import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResultsPodium } from '../results/ResultsPodium';
import type { VocabQuizStanding, TranslateFn } from '@/shared/types/vocabQuiz';

const MEDALS = ['🥇', '🥈', '🥉'];

export interface VocabQuizStandingsProps {
  standings: VocabQuizStanding[];
  /** Highlight this player's own row. */
  meUsername?: string;
  limit?: number;
  /** Larger type for the projector. */
  size?: 'compact' | 'projector';
  /** End of the quiz: top three on plinths, the rest listed underneath. */
  podium?: boolean;
  t: TranslateFn;
}

export function VocabQuizStandings({
  standings,
  meUsername,
  limit = 5,
  size = 'compact',
  podium = false,
  t,
}: VocabQuizStandingsProps) {
  const shown = standings.slice(0, limit);
  const projector = size === 'projector';

  if (shown.length === 0) {
    return (
      <p className={cn('text-neo-white/60 font-neo-body', projector ? 'text-xl' : 'text-sm')}>
        {t('vocabQuiz.standings.empty')}
      </p>
    );
  }

  const top = podium ? shown.slice(0, 3) : [];
  const rest = podium ? shown.slice(3) : shown;
  // Rows below a podium keep their true placing, so 4th reads as 4.
  const rankOffset = podium ? top.length : 0;

  return (
    <div className="space-y-4">
      {/*
        The rank passed down is the array index, NOT a second ranking. The
        server sorts `standings` and every client renders that order verbatim
        (same contract as the board modes' server-built `podium`), so there is
        one ranking in the system, not two that can drift.
      */}
      {top.length > 0 && (
        <ResultsPodium
          size={projector ? 'projector' : 'card'}
          entries={top.map((player, index) => ({
            username: player.username,
            score: player.score,
            rank: index + 1,
            detail: t('education.results.podium.correct', { count: player.correctCount }),
          }))}
          t={t}
        />
      )}

      {rest.length > 0 && (
        <ol className="space-y-2" aria-label={t('vocabQuiz.standings.title')}>
          {rest.map((player, index) => {
            const rank = index + rankOffset;
            const isMe = !!meUsername && player.username === meUsername;
            return (
              <li
                key={player.username}
                className={cn(
                  'flex items-center gap-3 rounded-neo border-[2px] border-neo-black px-3',
                  projector ? 'py-3' : 'py-2',
                  isMe
                    ? 'bg-neo-lime text-neo-black shadow-hard'
                    : 'bg-neo-navy-elevated text-neo-white shadow-hard-sm'
                )}
              >
                <span
                  className={cn(
                    'shrink-0 font-neo-display font-bold',
                    projector ? 'text-2xl w-10' : 'text-base w-7'
                  )}
                  aria-hidden
                >
                  {MEDALS[rank] ?? rank + 1}
                </span>
                <span
                  className={cn(
                    'flex-1 min-w-0 truncate font-neo-body font-bold',
                    projector ? 'text-2xl' : 'text-base'
                  )}
                >
                  {player.username}
                </span>
                {player.streak > 1 && (
                  <span
                    className={cn(
                      'flex items-center gap-1 shrink-0 text-neo-orange',
                      projector ? 'text-xl' : 'text-sm'
                    )}
                    aria-label={t('vocabQuiz.streak.label', { count: player.streak })}
                  >
                    <Flame className={projector ? 'w-6 h-6' : 'w-4 h-4'} aria-hidden />
                    {player.streak}
                  </span>
                )}
                <span
                  className={cn(
                    'shrink-0 font-neo-display font-bold tabular-nums',
                    projector ? 'text-3xl' : 'text-lg'
                  )}
                >
                  {player.score}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default VocabQuizStandings;
