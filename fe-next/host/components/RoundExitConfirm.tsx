import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import type { EndRoundRequest, EndRoundStatus } from '../hooks/useEndRoundRequest';

type Translate = (path: string) => string;

export const CLASSROOM_FOOTER = 'flex-col gap-3 sm:flex-row sm:justify-start sm:space-x-0';
export const DESTRUCTIVE = 'bg-neo-red text-neo-cream font-bold border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed';
export const QUIET = 'border-2 border-neo-cream/60 bg-transparent font-bold text-neo-cream shadow-none! hover:translate-x-0 hover:translate-y-0 hover:bg-neo-navy-light hover:text-neo-cream hover:shadow-none! active:shadow-none!';
const BUTTON = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-neo px-4 font-neo-display text-base font-black disabled:opacity-70';
const PRIMARY = 'bg-neo-lime text-neo-black border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed';
const TITLE = 'font-neo-display font-black uppercase text-neo-cream';
const BODY = 'font-bold text-neo-cream/90';

const PROBLEM: Partial<Record<EndRoundStatus, string>> = {
  rejected: 'eduLive.exit.endRejected',
  rateLimited: 'eduLive.exit.endRateLimited',
  timeout: 'eduLive.exit.endTimeout',
  offline: 'eduLive.exit.reconnecting',
};

/** Mid-round classroom exit: end the round (stays open until it really ended), or close the room behind a second confirm. */
export function RoundExitConfirm({ t, endRound, onCloseRoom }: { t: Translate; endRound: EndRoundRequest; onCloseRoom: () => void }) {
  const [confirmClose, setConfirmClose] = useState(false);
  const { status } = endRound;

  if (confirmClose) {
    return (
      <>
        <AlertDialogHeader>
          <AlertDialogTitle className={TITLE}>{t('eduLive.exit.lobbyTitle')}</AlertDialogTitle>
          <AlertDialogDescription className={BODY}>{t('eduLive.exit.closeMidRoundBody')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={CLASSROOM_FOOTER}>
          <button type="button" data-testid="classroom-exit-close-room-confirm" onClick={onCloseRoom} className={`${BUTTON} ${DESTRUCTIVE}`}>
            {t('eduLive.exit.closeRoom')}
          </button>
          <button type="button" onClick={() => setConfirmClose(false)} className={`${BUTTON} ${QUIET}`}>
            {t('eduLive.exit.back')}
          </button>
        </AlertDialogFooter>
      </>
    );
  }

  const pending = status === 'pending';
  const problem = PROBLEM[status];
  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className={TITLE}>{t('eduLive.exit.roundTitle')}</AlertDialogTitle>
        <AlertDialogDescription className={BODY}>{t('eduLive.exit.roundBody')}</AlertDialogDescription>
      </AlertDialogHeader>
      {problem && (
        <p role="alert" className="flex flex-wrap items-center gap-2 font-neo-body font-bold text-neo-yellow">
          {t(problem)}
          {status === 'offline' && (
            <button type="button" onClick={endRound.reconnect} className="min-h-11 rounded-neo border-2 border-neo-cream/60 px-3 font-neo-display text-sm font-black text-neo-cream">
              {t('eduLive.exit.reconnect')}
            </button>
          )}
        </p>
      )}
      <AlertDialogFooter className={CLASSROOM_FOOTER}>
        <button
          type="button"
          data-testid="classroom-exit-end-round"
          onClick={endRound.request}
          disabled={pending || status === 'offline'}
          aria-busy={pending}
          className={`${BUTTON} ${PRIMARY}`}
        >
          {pending && <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />}
          {t(pending ? 'eduLive.exit.endingRound' : 'eduLive.exit.roundConfirm')}
        </button>
        <AlertDialogCancel className={`mt-0 min-h-12 ${QUIET}`}>{t('eduLive.exit.stay')}</AlertDialogCancel>
        <button
          type="button"
          data-testid="classroom-exit-close-room"
          onClick={() => setConfirmClose(true)}
          className={`${BUTTON} border-2 border-neo-red/70 bg-transparent text-neo-cream sm:ms-auto`}
        >
          {t('eduLive.exit.closeRoom')}
        </button>
      </AlertDialogFooter>
    </>
  );
}
