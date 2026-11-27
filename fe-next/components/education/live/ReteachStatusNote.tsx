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
        <p data-testid="edu-replay-ready" role="status" className="font-neo-body text-sm font-bold text-neo-lime edu-sky:text-edu-lime-ink">
          {t('eduLiveRoom.hostResults.replayReady')}
        </p>
      )}
      {status === 'failed' && (
        <p data-testid="edu-replay-failed" role="alert" className="font-neo-body text-sm font-bold text-neo-pink edu-sky:text-edu-pink-ink">
          {t('eduLiveRoom.hostResults.replayFailed')}
        </p>
      )}
      {status === 'unconfirmed' && (
        <p data-testid="edu-replay-unconfirmed" role="status" className="font-neo-body text-sm font-bold text-neo-cream edu-sky:text-edu-ink">
          {t('eduLiveRoom.hostResults.replayUnconfirmed')}
        </p>
      )}
      {status === 'restoreFailed' && (
        <p data-testid="edu-full-list-failed" role="alert" className="font-neo-body text-sm font-bold text-neo-pink edu-sky:text-edu-pink-ink">
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
          className={cn('focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-black',
            'inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-neo-cream edu-sky:border-edu-line bg-neo-navy-elevated edu-sky:bg-edu-surface px-3 py-1.5',
            'font-neo-body text-sm font-bold text-neo-cream edu-sky:text-edu-ink hover:bg-neo-navy-light edu-sky:hover:bg-edu-surface transition-colors disabled:opacity-60'
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
