/**
 * usePlayerViewState - Centralized state management for PlayerView
 *
 * This hook consolidates all PlayerView state into a single manageable hook,
 * reducing the number of props passed to child components and socket event handlers.
 *
 * Architecture Pattern: Composition over individual useState calls
 * Wraps the shared useGameState hook and adds player-specific state.
 */

import { useState, useCallback, useRef, useMemo, MutableRefObject, RefObject } from 'react';
import { useGameState, type UseGameStateReturn, type Player } from '@/hooks/useGameState';
import type { Language, Avatar, GridPosition, LetterGrid } from '@/types';

// ==========================================
// Type Definitions
// ==========================================

export interface FoundWord {
  word: string;
  isValid?: boolean | null;
  score?: number;
  duplicate?: boolean;
  timestamp?: number;
}

export interface WordToVote {
  word: string;
  submittedBy: string;
  submitterAvatar?: {
    emoji?: string;
    color?: string;
    profilePictureUrl?: string;
  };
  timeoutSeconds: number;
  gameCode: string;
  language: string;
}

export interface PlayerViewUIState {
  // UI dialogs
  showQR: boolean;
  showExitConfirm: boolean;

  // Word feedback
  showWordFeedback: boolean;
  wordToVote: WordToVote | null;
}

export interface PlayerViewRefs {
  inputRef: RefObject<HTMLInputElement | null>;
  intentionalExitRef: MutableRefObject<boolean>;
  hasTriggeredUrgentMusicRef: MutableRefObject<boolean>;
}

export interface PlayerViewActions {
  // UI actions
  setShowQR: (show: boolean) => void;
  setShowExitConfirm: (show: boolean) => void;

  // Word feedback actions
  setShowWordFeedback: (show: boolean) => void;
  setWordToVote: (word: WordToVote | null) => void;

  // Player actions
  setPlayersReady: React.Dispatch<React.SetStateAction<Player[]>>;
  updatePlayer: (username: string, updates: Partial<Player>) => void;

  // Found words actions (local state, more granular than useGameState)
  setFoundWords: React.Dispatch<React.SetStateAction<FoundWord[]>>;
  addFoundWord: (word: FoundWord) => void;
  updateFoundWord: (word: string, updates: Partial<FoundWord>) => void;
  removeFoundWord: (word: string) => void;

  // Game session tracking
  setWasInActiveGame: (was: boolean) => void;

  // Shuffling grid for lobby animation
  setShufflingGrid: (grid: LetterGrid | null) => void;

  // Reset all state
  resetPlayerState: () => void;
}

export interface UsePlayerViewStateReturn extends Omit<UseGameStateReturn, 'foundWords'> {
  // Player-specific state
  playersReady: Player[];
  foundWords: FoundWord[];  // Overrides UseGameStateReturn.foundWords with player-specific type
  wasInActiveGame: boolean;
  shufflingGrid: LetterGrid | null;

  // UI state
  ui: PlayerViewUIState;

  // Human player count (excludes bots)
  humanPlayerCount: number;

  // Actions
  playerActions: PlayerViewActions;
}

// ==========================================
// Hook Implementation
// ==========================================

interface UsePlayerViewStateOptions {
  initialPlayers?: Player[];
}

export function usePlayerViewState(options: UsePlayerViewStateOptions = {}): UsePlayerViewStateReturn {
  const { initialPlayers = [] } = options;

  // Use the shared game state hook
  const gameState = useGameState();

  // Player-specific state (not in shared useGameState)
  const [playersReady, setPlayersReady] = useState<Player[]>(initialPlayers);
  const [foundWords, setFoundWords] = useState<FoundWord[]>([]);
  const [wasInActiveGame, setWasInActiveGame] = useState<boolean>(false);
  const [shufflingGrid, setShufflingGrid] = useState<LetterGrid | null>(null);

  // UI state
  const [showQR, setShowQR] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [showWordFeedback, setShowWordFeedback] = useState<boolean>(false);
  const [wordToVote, setWordToVote] = useState<WordToVote | null>(null);

  // Computed values
  const humanPlayerCount = useMemo(() => {
    return playersReady.filter(p => !p.isBot && !p.disconnected).length;
  }, [playersReady]);

  // UI state object
  const ui = useMemo<PlayerViewUIState>(() => ({
    showQR,
    showExitConfirm,
    showWordFeedback,
    wordToVote,
  }), [showQR, showExitConfirm, showWordFeedback, wordToVote]);

  // ==========================================
  // Actions
  // ==========================================

  const updatePlayer = useCallback((username: string, updates: Partial<Player>) => {
    setPlayersReady(prev => prev.map(p =>
      p.username === username ? { ...p, ...updates } : p
    ));
  }, []);

  const addFoundWord = useCallback((word: FoundWord) => {
    setFoundWords(prev => [...prev, word]);
  }, []);

  const updateFoundWord = useCallback((word: string, updates: Partial<FoundWord>) => {
    setFoundWords(prev => prev.map(fw =>
      fw.word.toLowerCase() === word.toLowerCase()
        ? { ...fw, ...updates }
        : fw
    ));
  }, []);

  const removeFoundWord = useCallback((word: string) => {
    setFoundWords(prev => prev.filter(fw =>
      fw.word.toLowerCase() !== word.toLowerCase()
    ));
  }, []);

  const resetPlayerState = useCallback(() => {
    setPlayersReady([]);
    setFoundWords([]);
    setWasInActiveGame(false);
    setShufflingGrid(null);
    setShowQR(false);
    setShowExitConfirm(false);
    setShowWordFeedback(false);
    setWordToVote(null);
    gameState.resetAll();
  }, [gameState]);

  // Actions object
  const playerActions = useMemo<PlayerViewActions>(() => ({
    setShowQR,
    setShowExitConfirm,
    setShowWordFeedback,
    setWordToVote,
    setPlayersReady,
    updatePlayer,
    setFoundWords,
    addFoundWord,
    updateFoundWord,
    removeFoundWord,
    setWasInActiveGame,
    setShufflingGrid,
    resetPlayerState,
  }), [updatePlayer, addFoundWord, updateFoundWord, removeFoundWord, resetPlayerState]);

  // ==========================================
  // Return Value
  // ==========================================

  return useMemo(() => ({
    // Spread all game state
    ...gameState,

    // Player-specific state
    playersReady,
    foundWords,
    wasInActiveGame,
    shufflingGrid,

    // UI state
    ui,

    // Computed
    humanPlayerCount,

    // Actions
    playerActions,
  }), [
    gameState,
    playersReady,
    foundWords,
    wasInActiveGame,
    shufflingGrid,
    ui,
    humanPlayerCount,
    playerActions,
  ]);
}

export default usePlayerViewState;
