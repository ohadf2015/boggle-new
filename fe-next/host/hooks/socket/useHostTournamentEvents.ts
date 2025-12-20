/**
 * Host Tournament Events Hook
 * Handles tournament-related socket events
 */
import { useEffect, MutableRefObject } from 'react';
import { Socket } from 'socket.io-client';
import { neoSuccessToast, neoErrorToast, neoInfoToast } from '../../../components/NeoToast';
import { triggerTournamentCompleteCelebration } from '@/shared/utils/gameEventUtils';

interface TournamentData {
  currentRound?: number;
  totalRounds?: number;
  standings?: any[];
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

    const handleTournamentCreated = (data: any) => {
      if (tournamentTimeoutRef.current) {
        clearTimeout(tournamentTimeoutRef.current);
        tournamentTimeoutRef.current = null;
      }
      setTournamentCreating(false);
      setTournamentData(data.tournament);
      neoSuccessToast(`${t('hostView.tournamentMode')}: ${data.tournament.totalRounds} ${t('hostView.rounds')}`, {
        icon: '🏆',
        duration: 4000,
      });
      setTimeout(() => {
        socket.emit('startTournamentRound');
      }, 1500);
    };

    const handleTournamentRoundStarting = (data: any) => {
      setTournamentData(prev => ({
        ...prev,
        currentRound: data.roundNumber,
        standings: data.standings,
      }));
      neoInfoToast(`${t('hostView.tournamentRound')} ${data.roundNumber}/${data.totalRounds}`, {
        icon: '🏁',
        duration: 3000,
      });
    };

    const handleTournamentRoundCompleted = (data: any) => {
      setTournamentData(prev => ({
        ...prev,
        standings: data.standings,
        isComplete: data.isComplete,
      }));

      if (data.isComplete) {
        triggerTournamentCompleteCelebration();
        neoSuccessToast(t('hostView.tournamentComplete'), {
          icon: '🏆',
          duration: 5000,
        });
      }
    };

    const handleTournamentComplete = (data: any) => {
      setTournamentData(prev => ({
        ...prev,
        standings: data.standings,
        isComplete: true,
      }));
      triggerTournamentCompleteCelebration();
    };

    const handleTournamentCancelled = () => {
      setTournamentData(null);
      neoErrorToast('Tournament cancelled', {
        icon: '🚫',
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
