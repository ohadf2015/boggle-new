/**
 * In-round feed events for the joiner: opponents' words and combos (Blast feed),
 * the server's Blast board, board word count and Word Hunt lives/targets.
 */
import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { applyBlastBoardUpdate } from '@/hooks/gameState/applyBlastBoardUpdate';
import { useGameActions, useGameStore } from '@/hooks/gameState';
import { neoSuccessToast, TOAST_ICONS } from '../../../components/NeoToast';
import type { BlastComboSyncPayload } from '@/shared/types/socket';
import type { LetterFeedback } from '@/shared/types/game';
import logger from '@/utils/logger';

interface Params {
  socket: Socket | null;
  t: (key: string, fallback?: string) => string;
  username: string;
}

export function usePlayerRoundFeedEvents({ socket, t, username }: Params): void {
  const {
    setTotalBoardWords,
    setBlastComboSync,
    setWordHuntMyLife,
    setWordHuntPlayerLives,
    setWordHuntTargetAttempts,
    setWordHuntTargetFound,
    setWordHuntTargetFoundBy,
    setWordHuntEliminatedPlayers,
    addWordHuntDiscoveryClues,
  } = useGameActions();

  useEffect(() => {
    if (!socket) return;

    // Handle combo sync from another player — triggers BlastComboFlash overlay for spectators.
    // Only fires for other players' combos; local player sees their own flash immediately.
    const handleBlastComboSync = (data: BlastComboSyncPayload) => {
      logger.log('[PLAYER] Blast combo sync from:', data.username, 'combo:', data.comboType);
      // Only show flash for other players' combos (not our own)
      if (data.username !== username) {
        setBlastComboSync({ ...data, id: `combo-sync-${Date.now()}` });
        // Also push to opponent activity feed
        useGameStore.getState().pushBlastOpponentActivity({
          id: `combo-${Date.now()}`,
          username: data.username,
          type: 'combo',
          message: data.comboType,
        });
      }
    };

    // Handle playerFoundWord — shows opponent word activity in blast MP feed.
    // `seq` disambiguates ids within a single coalesced batch (all items are
    // processed in the same millisecond, so Date.now() alone would collide).
    const handlePlayerFoundWord = (data: { username: string; word: string; score: number; comboLevel: number; wordCount: number; comboSync?: { comboType: string; username: string } }, seq = 0) => {
      // Handle merged comboSync (Fix 2) — extract from playerFoundWord instead of separate event
      if (data.comboSync && data.comboSync.username !== username) {
        setBlastComboSync({ ...data.comboSync, id: `combo-sync-${Date.now()}-${seq}` });
        useGameStore.getState().pushBlastOpponentActivity({
          id: `combo-${Date.now()}-${seq}`,
          username: data.comboSync.username,
          type: 'combo',
          message: data.comboSync.comboType,
        });
      }

      if (data.username === username) return; // Skip own words
      const store = useGameStore.getState();
      store.pushBlastOpponentActivity({
        id: `word-${Date.now()}-${seq}-${data.username}`,
        username: data.username,
        type: 'word',
        word: data.word,
        score: data.score,
        comboLevel: data.comboLevel,
      });
      // Milestone alerts at score thresholds
      if (data.score > 0 && data.score % 500 < 50 && data.score >= 500) {
        store.pushBlastOpponentActivity({
          id: `milestone-${Date.now()}-${seq}-${data.username}`,
          username: data.username,
          type: 'milestone',
          score: data.score,
          message: `${data.score}+ pts!`,
        });
      }
    };

    // playerFoundWord is coalesced server-side into playerFoundWordBatch.
    const handlePlayerFoundWordBatch = (data: { words?: Array<Parameters<typeof handlePlayerFoundWord>[0]> }) => {
      data.words?.forEach((w, i) => handlePlayerFoundWord(w, i));
    };

    // Handle total board words count (for "words remaining" display)
    const handleTotalBoardWords = (data: { count: number }) => {
      logger.log('[PLAYER] Received totalBoardWords:', data.count);
      setTotalBoardWords(data.count);
    };

    // Word Hunt event handlers
    const handleWordHuntLifeUpdate = (data: { playerLives: Record<string, number>; eliminatedPlayers?: string[] }) => {
      logger.log('[PLAYER] Word hunt life update:', data);
      setWordHuntPlayerLives(data.playerLives);
      if (data.playerLives[username] !== undefined) {
        setWordHuntMyLife(data.playerLives[username]);
      }
      // Reconcile eliminatedPlayers from server (handles reconnect and missed events)
      if (data.eliminatedPlayers) {
        setWordHuntEliminatedPlayers(data.eliminatedPlayers);
      }
    };

    const handleWordHuntTargetResult = (data: { guess: string; feedback: LetterFeedback[]; correct: boolean; isFirstFinder: boolean; bonus: number; livesRemaining: number; isDiscovery?: boolean }) => {
      logger.log('[PLAYER] Word hunt target result:', data);
      setWordHuntTargetAttempts((prev) => [...prev, { guess: data.guess, feedback: data.feedback, isDiscovery: data.isDiscovery || false }]);
      setWordHuntMyLife(data.livesRemaining);
      if (data.correct) {
        setWordHuntTargetFound(true);
      }
    };

    const handleWordHuntTargetFound = (data: { username: string; targetWord: string; isFirstFinder: boolean }) => {
      logger.log('[PLAYER] Word hunt target found by:', data.username);
      // Mark target as found for all players (disables input for non-finders too)
      setWordHuntTargetFound(true);
      // Store WHO found it so the overlay can distinguish "I found it" vs "someone else found it"
      setWordHuntTargetFoundBy(data.username);
      // Show notification about who found it
      neoSuccessToast(`${data.username} ${t('wordHunt.foundTarget')}!`, { icon: TOAST_ICONS.target, duration: 3000 });
    };

    const handleWordHuntEliminated = (data: { username: string }) => {
      logger.log('[PLAYER] Word hunt player eliminated:', data.username);
      setWordHuntEliminatedPlayers((prev) => [...prev, data.username]);
    };

    const handleWordHuntDiscoveryClues = (data: { word: string; greenPositions: Array<{ position: number; letter: string }>; knownLetters: string[] }) => {
      logger.log('[PLAYER] Word hunt discovery clues:', data);
      addWordHuntDiscoveryClues(data.greenPositions, data.knownLetters);
    };

    socket.on('totalBoardWords', handleTotalBoardWords);
    socket.on('blastComboSync', handleBlastComboSync);
    socket.on('playerFoundWordBatch', handlePlayerFoundWordBatch);
    socket.on('blastBoardUpdate', applyBlastBoardUpdate);
    socket.on('wordHuntLifeUpdate', handleWordHuntLifeUpdate);
    socket.on('wordHuntTargetResult', handleWordHuntTargetResult);
    socket.on('wordHuntTargetFound', handleWordHuntTargetFound);
    socket.on('wordHuntEliminated', handleWordHuntEliminated);
    socket.on('wordHuntDiscoveryClues', handleWordHuntDiscoveryClues);

    return () => {
      socket.off('totalBoardWords', handleTotalBoardWords);
      socket.off('blastComboSync', handleBlastComboSync);
      socket.off('playerFoundWordBatch', handlePlayerFoundWordBatch);
      socket.off('blastBoardUpdate', applyBlastBoardUpdate);
      socket.off('wordHuntLifeUpdate', handleWordHuntLifeUpdate);
      socket.off('wordHuntTargetResult', handleWordHuntTargetResult);
      socket.off('wordHuntTargetFound', handleWordHuntTargetFound);
      socket.off('wordHuntEliminated', handleWordHuntEliminated);
      socket.off('wordHuntDiscoveryClues', handleWordHuntDiscoveryClues);
    };
  }, [
    socket, t, username, setTotalBoardWords, setBlastComboSync, setWordHuntMyLife, setWordHuntPlayerLives,
    setWordHuntTargetAttempts, setWordHuntTargetFound, setWordHuntTargetFoundBy, setWordHuntEliminatedPlayers,
    addWordHuntDiscoveryClues,
  ]);
}
