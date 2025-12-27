/**
 * useGameState - Centralized game state management hook
 *
 * This hook centralizes common game state used across PlayerView and HostView,
 * reducing prop drilling and ensuring consistent state management.
 */

import { useReducer, useCallback, useRef, useMemo } from 'react';
import type { LetterGrid, LeaderboardEntry, Language, WordDetail } from '@/shared/types/game';
import type { XpGainedPayload, LevelUpPayload, AchievementPayload, BoardTheme } from '@/shared/types/socket';
import { gameStateReducer, INITIAL_STATE } from './reducer';
import type { Player, TournamentData, TournamentStanding, UseGameStateReturn } from './types';

// ==========================================
// Constants
// ==========================================

const COMBO_TIMEOUT_MS = 8000; // 8 seconds to maintain combo

// ==========================================
// Hook Implementation
// ==========================================

export function useGameState(): UseGameStateReturn {
  const [state, dispatch] = useReducer(gameStateReducer, INITIAL_STATE);

  // Refs for use in callbacks
  const comboLevelRef = useRef(0);
  const lastWordTimeRef = useRef<number | null>(null);
  const comboTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs in sync with state
  comboLevelRef.current = state.combo.level;
  lastWordTimeRef.current = state.combo.lastWordTime;

  // ==========================================
  // Core Game Actions
  // ==========================================

  const setGameActive = useCallback((value: React.SetStateAction<boolean>) => {
    dispatch({ type: 'SET_GAME_ACTIVE', payload: value });
  }, []);

  const setLetterGrid = useCallback((value: React.SetStateAction<LetterGrid | null>) => {
    dispatch({ type: 'SET_LETTER_GRID', payload: value });
  }, []);

  const setRemainingTime = useCallback((value: React.SetStateAction<number | null>) => {
    dispatch({ type: 'SET_REMAINING_TIME', payload: value });
  }, []);

  const setGameLanguage = useCallback((value: React.SetStateAction<Language | null>) => {
    dispatch({ type: 'SET_GAME_LANGUAGE', payload: value });
  }, []);

  const setMinWordLength = useCallback((value: React.SetStateAction<number>) => {
    dispatch({ type: 'SET_MIN_WORD_LENGTH', payload: value });
  }, []);

  // ==========================================
  // Player Actions
  // ==========================================

  const setPlayers = useCallback((value: React.SetStateAction<Player[]>) => {
    dispatch({ type: 'SET_PLAYERS', payload: value });
  }, []);

  const updatePlayer = useCallback((username: string, updates: Partial<Player>) => {
    dispatch({ type: 'UPDATE_PLAYER', payload: { username, updates } });
  }, []);

  const addPlayer = useCallback((player: Player) => {
    dispatch({ type: 'ADD_PLAYER', payload: player });
  }, []);

  const removePlayer = useCallback((username: string) => {
    dispatch({ type: 'REMOVE_PLAYER', payload: username });
  }, []);

  const setLeaderboard = useCallback((value: React.SetStateAction<LeaderboardEntry[]>) => {
    dispatch({ type: 'SET_LEADERBOARD', payload: value });
  }, []);

  // ==========================================
  // Word Actions
  // ==========================================

  const addFoundWord = useCallback((word: WordDetail) => {
    dispatch({ type: 'ADD_FOUND_WORD', payload: word });
  }, []);

  const setFoundWords = useCallback((value: React.SetStateAction<WordDetail[]>) => {
    dispatch({ type: 'SET_FOUND_WORDS', payload: value });
  }, []);

  const addAchievement = useCallback((achievement: AchievementPayload) => {
    dispatch({ type: 'ADD_ACHIEVEMENT', payload: achievement });
  }, []);

  const setAchievements = useCallback((value: React.SetStateAction<AchievementPayload[]>) => {
    dispatch({ type: 'SET_ACHIEVEMENTS', payload: value });
  }, []);

  // ==========================================
  // UI Actions
  // ==========================================

  const setWaitingForResults = useCallback((value: React.SetStateAction<boolean>) => {
    dispatch({ type: 'SET_WAITING_FOR_RESULTS', payload: value });
  }, []);

  const setShowStartAnimation = useCallback((value: React.SetStateAction<boolean>) => {
    dispatch({ type: 'SET_SHOW_START_ANIMATION', payload: value });
  }, []);

  const setShufflingGrid = useCallback((value: React.SetStateAction<LetterGrid | null>) => {
    dispatch({ type: 'SET_SHUFFLING_GRID', payload: value });
  }, []);

  const setHighlightedCells = useCallback((value: React.SetStateAction<Array<{ row: number; col: number }>>) => {
    dispatch({ type: 'SET_HIGHLIGHTED_CELLS', payload: value });
  }, []);

  // ==========================================
  // Combo Actions
  // ==========================================

  const incrementCombo = useCallback(() => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
    }
    dispatch({ type: 'INCREMENT_COMBO' });
    comboTimeoutRef.current = setTimeout(() => {
      dispatch({ type: 'RESET_COMBO' });
    }, COMBO_TIMEOUT_MS);
  }, []);

  const resetCombo = useCallback(() => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
    dispatch({ type: 'RESET_COMBO' });
  }, []);

  const useComboShield = useCallback((): boolean => {
    dispatch({ type: 'USE_COMBO_SHIELD' });
    return true;
  }, []);

  const updateLastWordTime = useCallback(() => {
    dispatch({ type: 'UPDATE_LAST_WORD_TIME' });
  }, []);

  // ==========================================
  // Tournament Actions
  // ==========================================

  const setTournamentData = useCallback((value: React.SetStateAction<TournamentData | null>) => {
    dispatch({ type: 'SET_TOURNAMENT_DATA', payload: value });
  }, []);

  const setTournamentStandings = useCallback((value: React.SetStateAction<TournamentStanding[]>) => {
    dispatch({ type: 'SET_TOURNAMENT_STANDINGS', payload: value });
  }, []);

  const setShowTournamentStandings = useCallback((value: React.SetStateAction<boolean>) => {
    dispatch({ type: 'SET_SHOW_TOURNAMENT_STANDINGS', payload: value });
  }, []);

  // ==========================================
  // XP/Level Actions
  // ==========================================

  const setXpGainedData = useCallback((value: React.SetStateAction<XpGainedPayload | null>) => {
    dispatch({ type: 'SET_XP_GAINED_DATA', payload: value });
  }, []);

  const setLevelUpData = useCallback((value: React.SetStateAction<LevelUpPayload | null>) => {
    dispatch({ type: 'SET_LEVEL_UP_DATA', payload: value });
  }, []);

  // ==========================================
  // Board Theme Actions
  // ==========================================

  const setBoardTheme = useCallback((value: React.SetStateAction<BoardTheme | null>) => {
    dispatch({ type: 'SET_BOARD_THEME', payload: value });
  }, []);

  // ==========================================
  // Total Board Words Actions
  // ==========================================

  const setTotalBoardWords = useCallback((value: React.SetStateAction<number | null>) => {
    dispatch({ type: 'SET_TOTAL_BOARD_WORDS', payload: value });
  }, []);

  // ==========================================
  // Reset Actions
  // ==========================================

  const resetForNewRound = useCallback(() => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
    dispatch({ type: 'RESET_FOR_NEW_ROUND' });
  }, []);

  const resetAll = useCallback(() => {
    if (comboTimeoutRef.current) {
      clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = null;
    }
    dispatch({ type: 'RESET_ALL' });
  }, []);

  // ==========================================
  // Return Value
  // ==========================================

  return useMemo(() => ({
    ...state,
    setGameActive,
    setLetterGrid,
    setRemainingTime,
    setGameLanguage,
    setMinWordLength,
    setPlayers,
    updatePlayer,
    addPlayer,
    removePlayer,
    setLeaderboard,
    addFoundWord,
    setFoundWords,
    addAchievement,
    setAchievements,
    setWaitingForResults,
    setShowStartAnimation,
    setShufflingGrid,
    setHighlightedCells,
    incrementCombo,
    resetCombo,
    useComboShield,
    updateLastWordTime,
    setTournamentData,
    setTournamentStandings,
    setShowTournamentStandings,
    setXpGainedData,
    setLevelUpData,
    setBoardTheme,
    setTotalBoardWords,
    resetForNewRound,
    resetAll,
    refs: {
      comboLevel: comboLevelRef,
      lastWordTime: lastWordTimeRef,
      comboTimeout: comboTimeoutRef,
    },
  }), [
    state,
    setGameActive,
    setLetterGrid,
    setRemainingTime,
    setGameLanguage,
    setMinWordLength,
    setPlayers,
    updatePlayer,
    addPlayer,
    removePlayer,
    setLeaderboard,
    addFoundWord,
    setFoundWords,
    addAchievement,
    setAchievements,
    setWaitingForResults,
    setShowStartAnimation,
    setShufflingGrid,
    setHighlightedCells,
    incrementCombo,
    resetCombo,
    useComboShield,
    updateLastWordTime,
    setTournamentData,
    setTournamentStandings,
    setShowTournamentStandings,
    setXpGainedData,
    setLevelUpData,
    setBoardTheme,
    setTotalBoardWords,
    resetForNewRound,
    resetAll,
  ]);
}
