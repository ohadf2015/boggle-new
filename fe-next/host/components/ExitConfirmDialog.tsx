import React, { memo } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import type { ClassroomExitPhase } from './exitConfirmModel';
import type { EndRoundRequest } from '../hooks/useEndRoundRequest';
import { CLASSROOM_FOOTER, DESTRUCTIVE, QUIET, RoundExitConfirm } from './RoundExitConfirm';

interface ExitConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, params?: Record<string, string | number>) => string;
  /** Classroom host: no host hand-off exists, so the copy says the room closes. */
  classroom?: boolean;
  /** Classroom only: `lobby` before any round, `round` while one runs, `game` on results. */
  phase?: ClassroomExitPhase;
  /** Classroom `round` phase: ends the round for everyone instead of closing the room. */
  endRound?: EndRoundRequest;
  /** Lobby with a known empty roster: confirm, and tell the teacher to share the code. */
  emptyLobby?: boolean;
  gameCode?: string;
}

const CLASSROOM_KEYS = {
  game: { title: 'eduLive.exit.title', body: 'eduLive.exit.body', stay: 'eduLive.exit.stay', confirm: 'eduLive.exit.confirm' },
  lobby: { title: 'eduLive.exit.lobbyTitle', body: 'eduLive.exit.lobbyBody', stay: 'eduLive.exit.lobbyStay', confirm: 'eduLive.exit.lobbyConfirm' },
} as const;

const CLASSROOM_CONTENT = 'bg-neo-navy text-neo-cream border-[3px] border-neo-cream shadow-hard-lg';

export const ExitConfirmDialog: React.FC<ExitConfirmDialogProps> = memo(function ExitConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  t,
  classroom = false,
  phase = 'game',
  endRound,
  emptyLobby = false,
  gameCode = '',
}) {
  if (!classroom) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="bg-white text-neo-black dark:bg-neo-navy dark:text-white border-red-500/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">{t('hostView.confirmExit')}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-gray-300">{t('hostView.exitWarning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-neo-navy/30 dark:bg-neo-navy text-slate-900 dark:text-white border-neo-white/30 dark:border-neo-black/50">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={onConfirm} className={DESTRUCTIVE}>
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  if (phase === 'round' && endRound) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent data-testid="classroom-exit-confirm" data-phase="round" className={CLASSROOM_CONTENT}>
          {/* Keyed on open so a reopened dialog starts on the first question. */}
          <RoundExitConfirm key={String(open)} t={t} endRound={endRound} onCloseRoom={onConfirm} />
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  const keys = CLASSROOM_KEYS[phase === 'lobby' ? 'lobby' : 'game'];
  const empty = phase === 'lobby' && emptyLobby;
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        data-testid="classroom-exit-confirm"
        data-phase={phase}
        data-empty={empty ? 'true' : 'false'}
        className={CLASSROOM_CONTENT}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="font-neo-display font-black uppercase text-neo-cream">
            {t(empty ? 'eduLive.exit.emptyTitle' : keys.title)}
          </AlertDialogTitle>
          <AlertDialogDescription className="font-bold text-neo-cream/90">
            {t(empty ? 'eduLive.exit.emptyBody' : keys.body, empty ? { code: gameCode } : undefined)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* Empty lobby: staying open leads, so a mis-tap does not end the room before anyone sits. */}
        <AlertDialogFooter className={CLASSROOM_FOOTER}>
          {empty ? (
            <AlertDialogCancel className={`mt-0 min-h-12 bg-neo-lime text-neo-black font-black border-3 border-neo-black shadow-hard`}>
              {t('eduLive.exit.emptyStay')}
            </AlertDialogCancel>
          ) : null}
          <AlertDialogAction onClick={onConfirm} className={`min-h-12 font-neo-display text-base font-black ${DESTRUCTIVE}`}>
            {t(empty ? 'eduLive.exit.emptyConfirm' : keys.confirm)}
          </AlertDialogAction>
          {empty ? null : (
            <AlertDialogCancel className={`mt-0 min-h-12 ${QUIET}`}>
              {t(keys.stay)}
            </AlertDialogCancel>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});
