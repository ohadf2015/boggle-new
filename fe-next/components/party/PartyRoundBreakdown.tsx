'use client';

import type { ReactElement } from 'react';
import type { PartyState } from '@/lib/party';

interface PartyRoundBreakdownProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  state: PartyState;
  onContinue: () => void;
}

export function PartyRoundBreakdown({ t, state, onContinue }: PartyRoundBreakdownProps): ReactElement {
  const round = state.roundResults[state.roundIndex] ?? [];
  const last = state.roundIndex >= state.setup.roundCount - 1;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4">
      <h1 className="text-center font-neo-display text-2xl font-bold text-neo-lime">
        {t('passAndPlay.roundBreakdown')}
      </h1>
      <p className="text-center text-sm text-neo-cream/80">
        {t('passAndPlay.roundN', { n: state.roundIndex + 1, total: state.setup.roundCount })}
      </p>
      <ul className="flex flex-col gap-3">
        {state.setup.players.map((player) => {
          const row = round.find((r) => r.playerId === player.id);
          return (
            <li key={player.id} className="rounded-neo border-neo border-black bg-neo-navy-light p-3 shadow-hard">
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-2 font-bold">
                  <span aria-hidden>{player.emoji}</span>
                  {player.name}
                </span>
                <span>
                  {t('passAndPlay.score')}: {row?.roundScore ?? 0}
                </span>
              </div>
              <p className="text-xs text-neo-cream/70">
                {t('passAndPlay.found')}: {row?.words.filter((w) => w.unique).map((w) => w.word).join(', ') || '—'}
              </p>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onContinue}
        className="rounded-neo border-neo border-black bg-neo-lime px-4 py-3 font-neo-display font-bold uppercase text-black shadow-hard"
      >
        {last ? t('passAndPlay.seePodium') : t('passAndPlay.nextRound')}
      </button>
    </div>
  );
}
