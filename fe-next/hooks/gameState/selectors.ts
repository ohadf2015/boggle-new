/**
 * Zustand Selector Hooks
 *
 * Pre-made selector hooks for cleaner API and maximum performance.
 * Each hook subscribes to only the specific slice it needs,
 * so components only re-render when that slice changes.
 */

import { useGameStore, type GameStore } from './store';

// Core game selectors
export const useGameActive = (): boolean => useGameStore((state) => state.gameActive);
export const useLetterGrid = () => useGameStore((state) => state.letterGrid);
export const useRemainingTime = () => useGameStore((state) => state.remainingTime);
export const useGameDuration = () => useGameStore((state) => state.gameDuration);
export const useGameLanguage = () => useGameStore((state) => state.gameLanguage);
export const useMinWordLength = (): number => useGameStore((state) => state.minWordLength);
export const useTotalBoardWords = () => useGameStore((state) => state.totalBoardWords);

// Player selectors
export const usePlayers = () => useGameStore((state) => state.players);
export const useLeaderboard = () => useGameStore((state) => state.leaderboard);

// Word selectors
export const useFoundWords = () => useGameStore((state) => state.foundWords);
export const useAchievements = () => useGameStore((state) => state.achievements);

// UI selectors
export const useWaitingForResults = (): boolean => useGameStore((state) => state.waitingForResults);
export const useShowStartAnimation = (): boolean => useGameStore((state) => state.showStartAnimation);
export const useShufflingGrid = () => useGameStore((state) => state.shufflingGrid);
export const useHighlightedCells = () => useGameStore((state) => state.highlightedCells);

// Combo selectors
export const useCombo = () => useGameStore((state) => state.combo);
export const useComboLevel = (): number => useGameStore((state) => state.combo.level);

// Tournament selectors
export const useTournamentData = () => useGameStore((state) => state.tournamentData);
export const useTournamentStandings = () => useGameStore((state) => state.tournamentStandings);
export const useShowTournamentStandings = (): boolean => useGameStore((state) => state.showTournamentStandings);

// XP/Level selectors
export const useXpGainedData = () => useGameStore((state) => state.xpGainedData);
export const useLevelUpData = () => useGameStore((state) => state.levelUpData);

// Board theme selector
export const useBoardTheme = () => useGameStore((state) => state.boardTheme);

// Game mode selector
export const useGameMode = () => useGameStore((state) => state.gameMode);
export const useGameModeConfirmed = (): boolean => useGameStore((state) => state.gameModeConfirmed);
export const useHostSelectedGameMode = () => useGameStore((state) => state.hostSelectedGameMode);

// Blast multiplayer selectors
export const useBlastTileOverlay = () => useGameStore((state) => state.blastTileOverlay);
export const useBlastBoardClears = (): number => useGameStore((state) => state.blastBoardClears);
export const useBlastTotalTileBonus = (): number => useGameStore((state) => state.blastTotalTileBonus);
export const useBlastTotalTilesCleared = (): number => useGameStore((state) => state.blastTotalTilesCleared);
export const useBlastSeed = () => useGameStore((state) => state.blastSeed);
export const useBlastComboSync = () => useGameStore((state) => state.blastComboSync);
export const useBlastOpponentActivity = () => useGameStore((state) => state.blastOpponentActivity);
export const useBlastPlayerStats = () => useGameStore((state) => state.blastPlayerStats);
export const useWheelRushPlayerStats = () => useGameStore((state) => state.wheelRushPlayerStats);
export const useBlastBoardClearedByLocal = (): boolean => useGameStore((state) => state.blastBoardClearedByLocal);

// Word Hunt multiplayer selectors
export const useWordHuntTargetLength = (): number => useGameStore((state) => state.wordHuntTargetLength);
export const useWordHuntTargetCategory = (): string | null => useGameStore((state) => state.wordHuntTargetCategory);
export const useWordHuntMyLife = (): number => useGameStore((state) => state.wordHuntMyLife);
export const useWordHuntPlayerLives = () => useGameStore((state) => state.wordHuntPlayerLives);
export const useWordHuntTargetAttempts = () => useGameStore((state) => state.wordHuntTargetAttempts);
export const useWordHuntTargetFound = (): boolean => useGameStore((state) => state.wordHuntTargetFound);
export const useWordHuntTargetFoundBy = (): string | null => useGameStore((state) => state.wordHuntTargetFoundBy);
export const useWordHuntEliminatedPlayers = () => useGameStore((state) => state.wordHuntEliminatedPlayers);
export const useWordHuntDiscoveryClues = () => useGameStore((state) => state.wordHuntDiscoveryClues);
export const useWordHuntKnownLetters = () => useGameStore((state) => state.wordHuntKnownLetters);

// ==========================================
// Actions Object (static, no re-renders)
// ==========================================

// CRITICAL FIX for React Error #185 (Maximum update depth exceeded):
// Instead of using a selector that creates a new object on every call,
// we extract actions once as a static object. Zustand actions are stable
// (they don't change), so we can safely cache them.
const getActions = (state: GameStore) => ({
  setGameActive: state.setGameActive,
  setLetterGrid: state.setLetterGrid,
  setRemainingTime: state.setRemainingTime,
  setGameLanguage: state.setGameLanguage,
  setMinWordLength: state.setMinWordLength,
  setTotalBoardWords: state.setTotalBoardWords,
  setPlayers: state.setPlayers,
  updatePlayer: state.updatePlayer,
  addPlayer: state.addPlayer,
  removePlayer: state.removePlayer,
  setLeaderboard: state.setLeaderboard,
  addFoundWord: state.addFoundWord,
  setFoundWords: state.setFoundWords,
  addAchievement: state.addAchievement,
  setAchievements: state.setAchievements,
  setWaitingForResults: state.setWaitingForResults,
  setShowStartAnimation: state.setShowStartAnimation,
  setShufflingGrid: state.setShufflingGrid,
  setHighlightedCells: state.setHighlightedCells,
  incrementCombo: state.incrementCombo,
  resetCombo: state.resetCombo,
  updateLastWordTime: state.updateLastWordTime,
  setTournamentData: state.setTournamentData,
  setTournamentStandings: state.setTournamentStandings,
  setShowTournamentStandings: state.setShowTournamentStandings,
  setXpGainedData: state.setXpGainedData,
  setLevelUpData: state.setLevelUpData,
  setBoardTheme: state.setBoardTheme,
  setGameMode: state.setGameMode,
  setHostSelectedGameMode: state.setHostSelectedGameMode,
  setBlastTileOverlay: state.setBlastTileOverlay,
  setBlastBoardClears: state.setBlastBoardClears,
  setBlastTotalTileBonus: state.setBlastTotalTileBonus,
  setBlastTotalTilesCleared: state.setBlastTotalTilesCleared,
  setBlastSeed: state.setBlastSeed,
  setBlastComboSync: state.setBlastComboSync,
  pushBlastOpponentActivity: state.pushBlastOpponentActivity,
  setBlastPlayerStats: state.setBlastPlayerStats,
  setWheelRushPlayerStats: state.setWheelRushPlayerStats,
  setBlastBoardUpdate: state.setBlastBoardUpdate,
  setBlastBoardClearedByLocal: state.setBlastBoardClearedByLocal,
  setWordHuntTargetLength: state.setWordHuntTargetLength,
  setWordHuntMyLife: state.setWordHuntMyLife,
  setWordHuntPlayerLives: state.setWordHuntPlayerLives,
  setWordHuntTargetAttempts: state.setWordHuntTargetAttempts,
  setWordHuntTargetFound: state.setWordHuntTargetFound,
  setWordHuntTargetFoundBy: state.setWordHuntTargetFoundBy,
  setWordHuntEliminatedPlayers: state.setWordHuntEliminatedPlayers,
  addWordHuntDiscoveryClues: state.addWordHuntDiscoveryClues,
  batchStartGame: state.batchStartGame,
  resetForNewRound: state.resetForNewRound,
  resetAll: state.resetAll,
});

// Cache the actions object - it never changes since Zustand actions are stable
let cachedActions: ReturnType<typeof getActions> | null = null;

/**
 * Get game actions (stable reference, never causes re-renders)
 *
 * This hook returns a stable object containing all store actions.
 * Unlike state selectors, actions don't change, so we cache the result.
 */
export function useGameActions(): ReturnType<typeof getActions> {
  if (!cachedActions) {
    cachedActions = getActions(useGameStore.getState());
  }
  return cachedActions;
}
