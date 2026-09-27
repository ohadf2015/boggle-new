'use client';

import type { ReactElement } from 'react';
import { Mascot } from '@/components/ui/Mascot';
import { currentPlayer, type PartyState } from '@/lib/party';

interface PartyHandoffProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  state: PartyState;
  onReady: () => void;
}

export function PartyHandoff({ t, state, onReady }: PartyHandoffProps): ReactElement {
  const player = currentPlayer(state);
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 p-6 text-center">
      <div
        className="flex h-24 w-24 items-center justify-center rounded-full border-neo border-black text-4xl shadow-hard"
        style={{ background: player.color }}
        aria-hidden
      >
        {player.emoji}
      </div>
      <Mascot variant="waiting" size="sm" animated={false} />
      <h1 className="font-neo-display text-3xl font-bold text-neo-lime">
        {t('passAndPlay.passTo', { name: player.name })}
      </h1>
      <p className="text-neo-cream/80">
        {t('passAndPlay.roundN', { n: state.roundIndex + 1, total: state.setup.roundCount })}
      </p>
      <button
        type="button"
        onClick={onReady}
        className="rounded-neo border-neo border-black bg-neo-lime px-8 py-3 font-neo-display text-lg font-bold uppercase text-black shadow-hard"
      >
        {t('passAndPlay.ready')}
      </button>
    </div>
  );
}
