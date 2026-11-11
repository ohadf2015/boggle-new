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

interface ExitConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, params?: Record<string, string | number>) => string;
  /** Classroom host: no host hand-off exists, so the copy says the room closes. */
  classroom?: boolean;
  /** Classroom only: `lobby` when no round has started, so the copy never offers to "keep playing". */
  phase?: 'lobby' | 'game';
}

const CLASSROOM_KEYS = {
  game: { title: 'eduLive.exit.title', body: 'eduLive.exit.body', stay: 'eduLive.exit.stay', confirm: 'eduLive.exit.confirm' },
  lobby: { title: 'eduLive.exit.lobbyTitle', body: 'eduLive.exit.lobbyBody', stay: 'eduLive.exit.lobbyStay', confirm: 'eduLive.exit.lobbyConfirm' },
} as const;

const DESTRUCTIVE = 'bg-neo-red text-neo-cream font-bold border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed';

export const ExitConfirmDialog: React.FC<ExitConfirmDialogProps> = memo(function ExitConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  t,
  classroom = false,
  phase = 'game',
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

  const keys = CLASSROOM_KEYS[phase];
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        data-testid="classroom-exit-confirm"
        data-phase={phase}
        className="bg-neo-navy text-neo-cream border-[3px] border-neo-cream shadow-hard-lg"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="font-neo-display font-black uppercase text-neo-cream">{t(keys.title)}</AlertDialogTitle>
          <AlertDialogDescription className="font-bold text-neo-cream/90">{t(keys.body)}</AlertDialogDescription>
        </AlertDialogHeader>
        {/* The host pressed exit, so the exit leads: first in reading order (LTR and RTL) and the only filled button. */}
        <AlertDialogFooter className="flex-col gap-3 sm:flex-row sm:justify-start sm:space-x-0">
          <AlertDialogAction onClick={onConfirm} className={`min-h-12 font-neo-display text-base font-black ${DESTRUCTIVE}`}>
            {t(keys.confirm)}
          </AlertDialogAction>
          <AlertDialogCancel className="mt-0 min-h-12 border-2 border-neo-cream/60 bg-transparent font-bold text-neo-cream shadow-none! hover:translate-x-0 hover:translate-y-0 hover:bg-neo-navy-light hover:text-neo-cream hover:shadow-none! active:shadow-none!">
            {t(keys.stay)}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});
