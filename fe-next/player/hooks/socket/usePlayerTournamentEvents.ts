/**
 * Player Tournament Events Hook
 * Handles tournament-related socket events
 *
 * REFACTORED: Now uses GameStateContext instead of prop drilling
 */
import { useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { neoSuccessToast, neoErrorToast, neoInfoToast, TOAST_ICONS } from '../../../components/NeoToast';
import { triggerTournamentCompleteCelebration } from '@/shared/utils/gameEventUtils';
import { useGameActions } from '@/hooks/gameState';
import type { TournamentData, TournamentStanding } from '@/hooks/gameState/types';

interface UsePlayerTournamentEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
}

interface TournamentCreatedPayload { tournament: TournamentData }
interface TournamentRoundStartingPayload {
  tournament?: TournamentData;
  standings?: TournamentStanding[];
}
interface TournamentRoundCompletedPayload {
  tournament?: TournamentData;
  standings?: TournamentStanding[];
}
interface TournamentCompletePayload {
  tournament?: TournamentData;
  standings?: TournamentStanding[];
}
interface TournamentCancelledPayload { message?: string }

/**
 * Hook for managing player tournament socket events
 */
export function usePlayerTournamentEvents({
  socket,
  t,
}: UsePlayerTournamentEventsProps): void {
  // Get state setters from Zustand store (actions never trigger re-renders)
  const { setTournamentData, setTournamentStandings, setShowTournamentStandings } = useGameActions();
  useEffect(() => {
    if (!socket) return;

    const handleTournamentCreated = (data: TournamentCreatedPayload) => {
      setTournamentData(data.tournament);
      neoSuccessToast(t('hostView.tournamentCreated') || 'Tournament created!', { icon: TOAST_ICONS.trophy, duration: 3000 });
    };

    const handleTournamentRoundStarting = (data: TournamentRoundStartingPayload) => {
      if (data.tournament) {
        setTournamentData(data.tournament);
      }
      if (data.standings) {
        setTournamentStandings(data.standings);
      }
      const roundNum = data.tournament?.currentRound || 1;
      const totalRounds = data.tournament?.totalRounds || 3;
      neoInfoToast(`${t('hostView.tournamentRound')} ${roundNum}/${totalRounds}`, { icon: TOAST_ICONS.target, duration: 3000 });
    };

    const handleTournamentRoundCompleted = (data: TournamentRoundCompletedPayload) => {
      if (data.standings) {
        setTournamentStandings(data.standings);
        setShowTournamentStandings(true);
      }
      if (data.tournament) {
        setTournamentData(data.tournament);
      }
    };

    const handleTournamentComplete = (data: TournamentCompletePayload) => {
      if (data.standings) {
        setTournamentStandings(data.standings);
        setShowTournamentStandings(true);
      }
      if (data.tournament) {
        setTournamentData(data.tournament);
      }
      const winner = data.standings?.[0];
      if (winner) {
        triggerTournamentCompleteCelebration();
        neoSuccessToast(`${winner.username} ${t('hostView.wonTournament')}!`, { icon: TOAST_ICONS.trophy, duration: 5000 });
      }
    };

    const handleTournamentCancelled = (data: TournamentCancelledPayload) => {
      setTournamentData(null);
      setTournamentStandings([]);
      setShowTournamentStandings(false);
      neoErrorToast(data?.message || t('hostView.tournamentCancelled'), { icon: TOAST_ICONS.xCircle, duration: 3000 });
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
    // Setters are stable from context (wrapped in useCallback), no need in deps
  }, [socket, t, setTournamentData, setTournamentStandings, setShowTournamentStandings]);
}
