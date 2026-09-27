'use client';

import type { ReactElement } from 'react';
import { Mascot } from '@/components/ui/Mascot';
import { rankPlayers, type PartyState } from '@/lib/party';

interface PartyPodiumProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  state: PartyState;
  onPlayAgain: () => void;
  onNewGame: () => void;
}

export function PartyPodium({ t, state, onPlayAgain, onNewGame }: PartyPodiumProps): ReactElement {
  const ranked = rankPlayers(state.setup.players, state.totals);
  const top = ranked[0];
  const tied = ranked.filter((r) => r.place === 1).length > 1;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 p-4 text-center">
      <Mascot variant="trophy" size="sm" animated={false} />
      <h1 className="font-neo-display text-3xl font-bold text-neo-lime">{t('passAndPlay.podium')}</h1>
      <p className="text-lg">
        {tied ? t('passAndPlay.tie') : t('passAndPlay.winner', { name: top?.player.name ?? '' })}
      </p>
      <ol className="flex w-full flex-col gap-2">
        {ranked.map((row) => (
          <li
            key={row.player.id}
            className="flex items-center justify-between rounded-neo border-neo border-black bg-neo-navy-light px-3 py-2 shadow-hard"
          >
            <span className="flex items-center gap-2 font-bold">
              <span>{row.place}</span>
              <span aria-hidden>{row.player.emoji}</span>
              {row.player.name}
            </span>
            <span>
              {t('passAndPlay.score')}: {row.score}
            </span>
          </li>
        ))}
      </ol>
      <div className="flex w-full gap-2">
        <button
          type="button"
          onClick={onPlayAgain}
          className="flex-1 rounded-neo border-neo border-black bg-neo-lime px-3 py-3 font-bold text-black shadow-hard"
        >
          {t('passAndPlay.playAgain')}
        </button>
        <button
          type="button"
          onClick={onNewGame}
          className="flex-1 rounded-neo border-neo border-black bg-neo-cyan px-3 py-3 font-bold text-black shadow-hard"
        >
          {t('passAndPlay.newGame')}
        </button>
      </div>
    </div>
  );
}
