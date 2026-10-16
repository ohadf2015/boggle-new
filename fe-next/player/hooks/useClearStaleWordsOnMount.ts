import { useEffect } from 'react';
import { useGameStore } from '@/hooks/gameState';

/**
 * A freshly mounted player view drops words left from an older room — but never
 * the running round's: a remount (StrictMode, a phase swap) right after a reload
 * restore would otherwise blank the list while the score survives.
 */
export function useClearStaleWordsOnMount(): void {
  useEffect(() => {
    localStorage.removeItem('boggle_player_state');
    const store = useGameStore.getState();
    // The resume restore confirms the mode in the same update as the words; a finished round resets both.
    if (!store.gameActive && !store.gameModeConfirmed) store.setFoundWords([]);
  }, []);
}
