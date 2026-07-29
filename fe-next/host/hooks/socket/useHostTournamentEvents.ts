/**
 * Host Tournament Events Hook
 * Handles tournament-related socket events
 */
import { useEffect, MutableRefObject } from 'react';
import { Socket } from 'socket.io-client';
import { neoSuccessToast, neoErrorToast, neoInfoToast, TOAST_ICONS } from '../../../components/NeoToast';
import { triggerTournamentCompleteCelebration } from '@/shared/utils/gameEventUtils';
import type {
  TournamentCreatedPayload,
  TournamentRoundPayload,
  TournamentCompletePayload,
} from '@/shared/types/socket';
import type { TournamentStanding } from '@/shared/types/game';

interface TournamentData {
  currentRound?: number;
  totalRounds?: number;
  standings?: TournamentStanding[];
  isComplete?: boolean;
}

interface UseHostTournamentEventsProps {
  socket: Socket | null;
  t: (key: string) => string;

  // State setters
  setTournamentData: React.Dispatch<React.SetStateAction<TournamentData | null>>;
  setTournamentCreating: React.Dispatch<React.SetStateAction<boolean>>;

  // Tournament timeout ref
  tournamentTimeoutRef: MutableRefObject<NodeJS.Timeout | null>;
}

/**
 * Hook for managing host tournament socket events
 */
export function useHostTournamentEvents({
  socket,
  t,
  setTournamentData,
  setTournamentCreating,
  tournamentTimeoutRef,
}: UseHostTournamentEventsProps): void {
  useEffect(() => {
    if (!socket) return;

    const handleTournamentCreated = (data: TournamentCreatedPayload) => {
      if (tournamentTimeoutRef.current) {
        clearTimeout(tournamentTimeoutRef.current);
        tournamentTimeoutRef.current = null;
      }
      setTournamentCreating(false);
      setTournamentData({
        currentRound: data.tournament.currentRound,
        totalRounds: data.tournament.totalRounds,
        standings: data.standings,
      });
      neoSuccessToast(`${t('hostView.tournamentMode')}: ${data.tournament.totalRounds} ${t('hostView.rounds')}`, {
        icon: TOAST_ICONS.trophy,
        duration: 4000,
      });
      setTimeout(() => {
        socket.emit('startTournamentRound');
      }, 1500);
    };

    const handleTournamentRoundStarting = (data: TournamentRoundPayload) => {
      setTournamentData(prev => ({
        ...prev,
        currentRound: data.tournament.currentRound,
        totalRounds: data.tournament.totalRounds,
        standings: data.standings,
      }));
      neoInfoToast(`${t('hostView.tournamentRound')} ${data.tournament.currentRound}/${data.tournament.totalRounds}`, {
        icon: TOAST_ICONS.flag,
        duration: 3000,
      });
    };

    const handleTournamentRoundCompleted = (data: TournamentRoundPayload) => {
      setTournamentData(prev => ({
        ...prev,
        currentRound: data.tournament.currentRound,
        totalRounds: data.tournament.totalRounds,
        standings: data.standings,
      }));
    };

    const handleTournamentComplete = (data: TournamentCompletePayload) => {
      setTournamentData(prev => ({
        ...prev,
        currentRound: data.tournament.currentRound,
        totalRounds: data.tournament.totalRounds,
        standings: data.standings,
        isComplete: true,
      }));
      triggerTournamentCompleteCelebration();
      neoSuccessToast(t('hostView.tournamentComplete'), {
        icon: TOAST_ICONS.trophy,
        duration: 5000,
      });
    };

    const handleTournamentCancelled = () => {
      setTournamentData(null);
      neoErrorToast('Tournament cancelled', {
        icon: TOAST_ICONS.ban,
        duration: 3000,
      });
    };

    // Register listeners
    socket.on('tournamentCreated', handleTournamentCreated);
    socket.on('tournamentRoundStarting', handleTournamentRoundStarting);
    socket.on('tournamentRoundCompleted', handleTournamentRoundCompleted);
    socket.on('tournamentComplete', handleTournamentComplete);
    socket.on('tournamentCancelled', handleTournamentCancelled);

    return () => {
      socket.off('tournamentCreated', handleTournamentCreated);
      socket.off('tournamentRoundStarting', handleTournamentRoundStarting);
      socket.off('tournamentRoundCompleted', handleTournamentRoundCompleted);
      socket.off('tournamentComplete', handleTournamentComplete);
      socket.off('tournamentCancelled', handleTournamentCancelled);
    };
  }, [
    socket,
    t,
    setTournamentData,
    setTournamentCreating,
    tournamentTimeoutRef,
  ]);
}
