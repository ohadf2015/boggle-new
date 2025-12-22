/**
 * Player Tournament Events Hook
 * Handles tournament-related socket events
 *
 * REFACTORED: Now uses GameStateContext instead of prop drilling
 */
import { useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { neoSuccessToast, neoErrorToast, neoInfoToast } from '../../../components/NeoToast';
import { triggerTournamentCompleteCelebration } from '@/shared/utils/gameEventUtils';
import { useGameStateContext } from '@/contexts/GameStateContext';

interface UsePlayerTournamentEventsProps {
  socket: Socket | null;
  t: (key: string) => string;
}

/**
 * Hook for managing player tournament socket events
 */
export function usePlayerTournamentEvents({
  socket,
  t,
}: UsePlayerTournamentEventsProps): void {
  // Get state setters from context (no more prop drilling!)
  const { setTournamentData, setTournamentStandings, setShowTournamentStandings } = useGameStateContext();
  useEffect(() => {
    if (!socket) return;

    const handleTournamentCreated = (data: any) => {
      setTournamentData(data.tournament);
      neoSuccessToast(t('hostView.tournamentCreated') || 'Tournament created!', { icon: '🏆', duration: 3000 });
    };

    const handleTournamentRoundStarting = (data: any) => {
      if (data.tournament) {
        setTournamentData(data.tournament);
      }
      if (data.standings) {
        setTournamentStandings(data.standings);
      }
      const roundNum = data.tournament?.currentRound || 1;
      const totalRounds = data.tournament?.totalRounds || 3;
      neoInfoToast(`${t('hostView.tournamentRound')} ${roundNum}/${totalRounds}`, { icon: '🎯', duration: 3000 });
    };

    const handleTournamentRoundCompleted = (data: any) => {
      if (data.standings) {
        setTournamentStandings(data.standings);
        setShowTournamentStandings(true);
      }
      if (data.tournament) {
        setTournamentData(data.tournament);
      }
    };

    const handleTournamentComplete = (data: any) => {
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
        neoSuccessToast(`🏆 ${winner.username} ${t('hostView.wonTournament')}!`, { duration: 5000 });
      }
    };

    const handleTournamentCancelled = (data: any) => {
      setTournamentData(null);
      setTournamentStandings([]);
      setShowTournamentStandings(false);
      neoErrorToast(data?.message || t('hostView.tournamentCancelled'), { icon: '❌', duration: 3000 });
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
