'use client';

import { ListRestart } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReteachStatus } from './useReteachRound';

interface ReteachStatusNoteProps {
  status: ReteachStatus;
  onRestoreFull?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export function ReteachStatusNote({ status, onRestoreFull, t }: ReteachStatusNoteProps) {
  const offerFullList = status === 'ready' || status === 'unconfirmed' || status === 'restoring' || status === 'restoreFailed';
  if (!offerFullList && status !== 'failed') return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'ready' && (
        <p data-testid="edu-replay-ready" role="status" className="font-neo-body text-sm font-bold text-neo-lime">
          {t('eduLiveRoom.hostResults.replayReady')}
        </p>
      )}
      {status === 'failed' && (
        <p data-testid="edu-replay-failed" role="alert" className="font-neo-body text-sm font-bold text-neo-pink">
          {t('eduLiveRoom.hostResults.replayFailed')}
        </p>
      )}
      {status === 'unconfirmed' && (
        <p data-testid="edu-replay-unconfirmed" role="status" className="font-neo-body text-sm font-bold text-neo-cream">
          {t('eduLiveRoom.hostResults.replayUnconfirmed')}
        </p>
      )}
      {status === 'restoreFailed' && (
        <p data-testid="edu-full-list-failed" role="alert" className="font-neo-body text-sm font-bold text-neo-pink">
          {t('eduLiveRoom.hostResults.fullListFailed')}
        </p>
      )}
      {offerFullList && onRestoreFull && (
        <button
          type="button"
          data-testid="edu-use-full-list"
          disabled={status === 'restoring'}
          aria-busy={status === 'restoring'}
          onClick={onRestoreFull}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-neo-cream bg-neo-navy-elevated px-3 py-1.5',
            'font-neo-body text-sm font-bold text-neo-cream hover:bg-neo-navy-light transition-colors disabled:opacity-60'
          )}
        >
          <ListRestart className="size-4 shrink-0" aria-hidden="true" />
          {t('eduLiveRoom.hostResults.useFullList')}
        </button>
      )}
    </div>
  );
}

export default ReteachStatusNote;
