/**
 * Round lifecycle pieces for the joiner: the one batched store update a start
 * (fresh, retry, late join or reconnect) applies, and the store reset between games.
 */
import type { StartGameBroadcast } from '@/shared/types/socket';
import { useGameStore, type useGameActions } from '@/hooks/gameState';
import type { StartGameBroadcastExt } from './playerGameEventTypes';

export function buildStartGameStoreUpdates(
  data: StartGameBroadcast,
  ext: StartGameBroadcastExt,
  username: string,
  isSameSessionRetry: boolean,
): { storeUpdates: Record<string, unknown>; isReconnect: boolean } {
  // Batch all Zustand store updates into a single setState call
  // This prevents cascading re-renders (was 15+ individual updates)
  const isReconnect = data.reconnect === true;
  const storeUpdates: Record<string, unknown> = {};
  // A returning player can come back as a late join (seat dropped) and still own words this round.
  const resumesWithWords = (isReconnect || data.lateJoin === true) && (ext.myFoundWords?.length ?? 0) > 0;
  if (!isReconnect && !resumesWithWords) {
    // Fresh game: clear words + achievements
    storeUpdates.foundWords = [];
    storeUpdates.achievements = [];
  } else if (resumesWithWords && ext.myFoundWords) {
    // Reconnect snapshot: replay player's own words. Per-word score is not
    // persisted server-side (only the string list); total score is restored
    // separately via updateLeaderboard. score:0 is a UX placeholder.
    storeUpdates.foundWords = ext.myFoundWords.map((word) => ({
      word,
      score: 0,
      validated: true,
      isDuplicate: false,
    }));
  }
  if (isReconnect && ext.leaderboard && ext.leaderboard.length > 0) {
    // Atomic score restore. Total score lives ONLY in leaderboard[]; pulling
    // it from the reconnect payload here (same batched setState as the board)
    // means a dropped/raced/reset separate updateLeaderboard never strands the
    // player at "0 PUNTOS". Guarded on isReconnect so a fresh start — which
    // legitimately has no scores yet — is never stomped.
    storeUpdates.leaderboard = ext.leaderboard;
  }
  if (data.letterGrid) storeUpdates.letterGrid = data.letterGrid;
  if (data.timerSeconds) {
    storeUpdates.remainingTime = data.timerSeconds;
    storeUpdates.gameDuration = data.timerSeconds;
  }
  if (data.language) storeUpdates.gameLanguage = data.language;
  storeUpdates.minWordLength = data.minWordLength ?? 2;
  if (ext.boardTheme) storeUpdates.boardTheme = ext.boardTheme;
  if (data.gameMode) {
    // Authoritative server mode for this round. Set mode + open the render gate
    // in the SAME batched setState so PlayerInGameView mounts already on the
    // correct mode — never the optimistic/stale one that swaps mid-load.
    storeUpdates.gameMode = data.gameMode;
    storeUpdates.gameModeConfirmed = true;
  }
  if (ext.blastTileOverlay) {
    storeUpdates.blastTileOverlay = ext.blastTileOverlay;
    const reconnectMoves = ext.blastPlayerMoves;
    const myMoves = reconnectMoves?.[username] ?? 0;
    if (ext.blastSeed != null) storeUpdates.blastSeed = ext.blastSeed;
    // Reconnect/late-join: apply current server board state if available
    if (ext.blastGrid && ext.blastTileStates) {
      storeUpdates.blastBoardUpdate = {
        grid: ext.blastGrid,
        tileStates: ext.blastTileStates,
        clearedBy: '__server_reconnect__',
        word: '',
        clearedCount: 0,
        totalMoves: myMoves,
      };
    }
  }
  if (ext.wordHuntTargetLength != null && ext.wordHuntTargetLength > 0) {
    // Target length + category are immutable per session — apply unconditionally
    // so recovery/reconnect/late-join can heal a client that missed the original
    // startGame (was: clue tiles missing). isSameSessionRetry only gates resetting
    // in-flight state below.
    storeUpdates.wordHuntTargetLength = ext.wordHuntTargetLength;
    storeUpdates.wordHuntTargetCategory = ext.wordHuntTargetCategory ?? null;
    if (!isSameSessionRetry) {
      const serverLife = ext.wordHuntPlayerLives?.[username];
      storeUpdates.wordHuntMyLife = typeof serverLife === 'number' ? serverLife : 100;
      storeUpdates.wordHuntPlayerLives = ext.wordHuntPlayerLives || {};
      storeUpdates.wordHuntTargetAttempts = [];
      storeUpdates.wordHuntTargetFound = false;
      storeUpdates.wordHuntTargetFoundBy = null;
      storeUpdates.wordHuntEliminatedPlayers = ext.wordHuntEliminatedPlayers || [];
      storeUpdates.wordHuntDiscoveryClues = [];
      storeUpdates.wordHuntKnownLetters = [];
    }
  }
  return { storeUpdates, isReconnect };
}

type GameActions = ReturnType<typeof useGameActions>;

/** Every per-game store field back to its lobby value (resetGame). */
export function resetRoundStoreForNewGame(a: GameActions): void {
  a.setFoundWords([]);
  a.setAchievements([]);
  a.setLeaderboard([]);
  a.setRemainingTime(null);
  a.setWaitingForResults(false);
  a.setLetterGrid(null);
  a.setShufflingGrid(null);
  a.setShowStartAnimation(false);
  a.setTournamentData(null);
  a.setTournamentStandings([]);
  a.setShowTournamentStandings(false);
  a.setXpGainedData(null);
  a.setLevelUpData(null);
  a.setTotalBoardWords(null);

  a.setWordHuntEliminatedPlayers([]);
  a.setWordHuntTargetFound(false);
  a.setWordHuntTargetAttempts([]);
  a.setWordHuntPlayerLives({});
  a.setWordHuntMyLife(100);
  useGameStore.setState({ wordHuntDiscoveryClues: [], wordHuntKnownLetters: [] });

  const blast = useGameStore.getState();
  blast.setBlastTileOverlay([]);
  blast.setBlastTotalTileBonus(0);
  blast.setBlastTotalTilesCleared(0);
  blast.setBlastSeed(null);
  blast.setBlastComboSync(null);
  useGameStore.setState({ blastOpponentActivity: [] });
}
