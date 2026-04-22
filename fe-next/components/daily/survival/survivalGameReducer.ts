/**
 * Reducer for useSurvivalGameLogic
 * Consolidates multiple useState calls into a single reducer for cleaner state management
 */

import type { FeedbackType } from '../WordFeedbackToast';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import type { WordDiscovery, TargetAttempt, AutoClueNotificationData } from './types';
import type { LetterFeedback } from '@/utils/wordHuntFeedback';
import { INITIAL_LIFE } from './constants';

// ============================================================================
// State Types
// ============================================================================

export interface SurvivalReducerState {
  // Life state
  lifePoints: number;
  isGameOver: boolean;
  hasWon: boolean;
  isLifeGaining: boolean;
  lifeGainAmount: number | null;

  // Game progress
  discoveredWords: WordDiscovery[];
  clueTokens: number;
  attempts: TargetAttempt[];
  latestAttemptFeedback: LetterFeedback[] | null;
  showFeedbackOverlay: boolean;

  // UI state
  formedWord: string;
  letterCount: number;
  showShop: boolean;
  showShopHint: boolean;
  showQuitConfirm: boolean;

  // Feedback/notifications
  feedbackType: FeedbackType | null;
  feedbackMessage: string;
  feedbackWord: string | null;
  activeNotifications: AutoClueNotificationData[];

  // WordFormingArea feedback
  wordFeedback: WordFeedback | null;

  // Session
  gameSessionId: string | null;
}

// ============================================================================
// Action Types
// ============================================================================

export type SurvivalAction =
  // Life actions
  | { type: 'DRAIN_LIFE'; payload: { drainRate: number; lifeFloor?: number } }
  | { type: 'ADJUST_LIFE'; payload: { delta: number } }
  | { type: 'RESTORE_LIFE'; payload: { amount: number } }
  | { type: 'SET_LIFE_GAIN_ANIMATION'; payload: { amount: number | null; isGaining: boolean } }
  | { type: 'STOP_LIFE_ANIMATION' }

  // Game over
  | { type: 'GAME_OVER'; payload: { won: boolean } }

  // Word discovery
  | { type: 'DISCOVER_WORD'; payload: { discovery: WordDiscovery; newLife: number } }

  // Target attempts
  | { type: 'ADD_ATTEMPT'; payload: { attempt: TargetAttempt } }
  | { type: 'SET_FEEDBACK_OVERLAY'; payload: { show: boolean; feedback?: LetterFeedback[] | null } }

  // Tokens
  | { type: 'ADJUST_TOKENS'; payload: { delta: number } }

  // UI state
  | { type: 'SET_FORMED_WORD'; payload: { word: string; count: number } }
  | { type: 'SET_SHOW_SHOP'; payload: boolean }
  | { type: 'SET_SHOW_SHOP_HINT'; payload: boolean }
  | { type: 'SET_SHOW_QUIT_CONFIRM'; payload: boolean }

  // Toast feedback
  | { type: 'SHOW_TOAST'; payload: { type: FeedbackType; message: string; word?: string } }
  | { type: 'CLOSE_TOAST' }

  // Notifications
  | { type: 'ADD_NOTIFICATION'; payload: AutoClueNotificationData }
  | { type: 'DISMISS_NOTIFICATION'; payload: { id: string } }

  // WordFormingArea feedback
  | { type: 'SET_WORD_FEEDBACK'; payload: WordFeedback }
  | { type: 'CLEAR_WORD_FEEDBACK' }

  // Session
  | { type: 'SET_GAME_SESSION_ID'; payload: string | null };

// ============================================================================
// Initial State Factory
// ============================================================================

export function createInitialState(): SurvivalReducerState {
  return {
    // Life state
    lifePoints: INITIAL_LIFE,
    isGameOver: false,
    hasWon: false,
    isLifeGaining: false,
    lifeGainAmount: null,

    // Game progress
    discoveredWords: [],
    clueTokens: 0,
    attempts: [],
    latestAttemptFeedback: null,
    showFeedbackOverlay: false,

    // UI state
    formedWord: '',
    letterCount: 0,
    showShop: false,
    showShopHint: false,
    showQuitConfirm: false,

    // Feedback/notifications
    feedbackType: null,
    feedbackMessage: '',
    feedbackWord: null,
    activeNotifications: [],

    // WordFormingArea feedback
    wordFeedback: null,

    // Session
    gameSessionId: null,
  };
}

// ============================================================================
// Reducer
// ============================================================================

export function survivalGameReducer(
  state: SurvivalReducerState,
  action: SurvivalAction
): SurvivalReducerState {
  switch (action.type) {
    // Life actions
    case 'DRAIN_LIFE': {
      const floor = action.payload.lifeFloor ?? 0;
      const newLife = Math.max(floor, state.lifePoints - action.payload.drainRate);
      return { ...state, lifePoints: newLife };
    }

    case 'ADJUST_LIFE': {
      const newLife = Math.max(0, Math.min(INITIAL_LIFE, state.lifePoints + action.payload.delta));
      return { ...state, lifePoints: newLife };
    }

    case 'RESTORE_LIFE': {
      const newLife = Math.max(0, Math.min(INITIAL_LIFE, action.payload.amount));
      return { ...state, lifePoints: newLife };
    }

    case 'SET_LIFE_GAIN_ANIMATION':
      return {
        ...state,
        lifeGainAmount: action.payload.amount,
        isLifeGaining: action.payload.isGaining,
      };

    case 'STOP_LIFE_ANIMATION':
      return { ...state, isLifeGaining: false };

    // Game over
    case 'GAME_OVER':
      return {
        ...state,
        isGameOver: true,
        hasWon: action.payload.won,
      };

    // Word discovery
    case 'DISCOVER_WORD':
      return {
        ...state,
        discoveredWords: [...state.discoveredWords, action.payload.discovery],
        lifePoints: action.payload.newLife,
        clueTokens: state.clueTokens + action.payload.discovery.tokensGained,
      };

    // Target attempts
    case 'ADD_ATTEMPT':
      return {
        ...state,
        attempts: [...state.attempts, action.payload.attempt],
      };

    case 'SET_FEEDBACK_OVERLAY':
      return {
        ...state,
        showFeedbackOverlay: action.payload.show,
        latestAttemptFeedback: action.payload.feedback !== undefined
          ? action.payload.feedback
          : state.latestAttemptFeedback,
      };

    // Tokens
    case 'ADJUST_TOKENS':
      return {
        ...state,
        clueTokens: Math.max(0, state.clueTokens + action.payload.delta),
      };

    // UI state
    case 'SET_FORMED_WORD':
      return {
        ...state,
        formedWord: action.payload.word,
        letterCount: action.payload.count,
      };

    case 'SET_SHOW_SHOP':
      return { ...state, showShop: action.payload };

    case 'SET_SHOW_SHOP_HINT':
      return { ...state, showShopHint: action.payload };

    case 'SET_SHOW_QUIT_CONFIRM':
      return { ...state, showQuitConfirm: action.payload };

    // Toast feedback
    case 'SHOW_TOAST':
      return {
        ...state,
        feedbackType: action.payload.type,
        feedbackMessage: action.payload.message,
        feedbackWord: action.payload.word ?? null,
      };

    case 'CLOSE_TOAST':
      return {
        ...state,
        feedbackType: null,
        feedbackMessage: '',
        feedbackWord: null,
      };

    // Notifications
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        activeNotifications: [...state.activeNotifications, action.payload],
      };

    case 'DISMISS_NOTIFICATION':
      return {
        ...state,
        activeNotifications: state.activeNotifications.filter(n => n.id !== action.payload.id),
      };

    // WordFormingArea feedback
    case 'SET_WORD_FEEDBACK':
      return { ...state, wordFeedback: action.payload };

    case 'CLEAR_WORD_FEEDBACK':
      return { ...state, wordFeedback: null };

    // Session
    case 'SET_GAME_SESSION_ID':
      return { ...state, gameSessionId: action.payload };

    default:
      return state;
  }
}
