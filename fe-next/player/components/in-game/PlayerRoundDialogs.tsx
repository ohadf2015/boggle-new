'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import TournamentStandings from '@/components/TournamentStandings';
import type { TournamentStanding } from '@/shared/types/game';
import type { PlayerTournamentData } from './types';

interface Props {
  t: (key: string) => string;
  tournamentData: PlayerTournamentData | null;
  tournamentStandings: TournamentStanding[];
  showTournamentStandings: boolean;
  setShowTournamentStandings: (show: boolean) => void;
  showExitConfirm: boolean;
  setShowExitConfirm: (show: boolean) => void;
  onConfirmExit: () => void;
}

/**
 * The joiner's in-round dialogs: tournament standings and "leave the round?".
 * Dark-only surfaces (hardcoded navy — no white/cream-then-dark pair).
 */
export function PlayerRoundDialogs({
  t,
  tournamentData,
  tournamentStandings,
  showTournamentStandings,
  setShowTournamentStandings,
  showExitConfirm,
  setShowExitConfirm,
  onConfirmExit,
}: Props) {
  const complete = tournamentData?.status === 'completed';
  return (
    <>
      <Dialog open={showTournamentStandings} onOpenChange={setShowTournamentStandings}>
        <DialogContent noDescription className="max-w-4xl max-h-[90vh] overflow-y-auto overscroll-contain scrollable-area bg-neo-navy-light text-neo-white border-3 border-neo-black shadow-hard-lg">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-black text-neo-pink">
              {complete ? t('hostView.tournamentComplete') : t('hostView.tournamentStandings')}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <TournamentStandings
              standings={tournamentStandings}
              currentRound={tournamentData?.currentRound ?? 0}
              totalRounds={tournamentData?.totalRounds ?? 0}
              isComplete={complete}
            />
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              onClick={() => setShowTournamentStandings(false)}
              className="w-full bg-neo-pink text-neo-cream font-bold border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed"
            >
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent className="bg-neo-navy-light text-neo-white border-3 border-neo-black shadow-hard-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-neo-display text-neo-white">{t('playerView.exitConfirmation')}</AlertDialogTitle>
            <AlertDialogDescription className="text-neo-white/70">{t('playerView.exitWarning')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-neo-navy text-neo-white border-2 border-neo-black">{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmExit}
              className="bg-neo-red text-neo-cream font-bold border-3 border-neo-black shadow-hard hover:shadow-hard-lg active:shadow-hard-pressed"
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
