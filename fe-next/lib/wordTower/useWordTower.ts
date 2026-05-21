/**
 * Word Tower — Solo client store (Phase 1).
 *
 * Wraps the pure {@link wordTowerManager} in a useReducer. Word validation is
 * client-side (injected dictionary predicate), so submitting a word is instant
 * with no server round-trip.
 *
 * NOTE: this is SESSION-ONLY endless — the tower resets on refresh/remount.
 * Cross-session persistence is Phase 2 (see spec §2.1 / §14).
 */
import { useMemo, useReducer, useRef } from 'react';
import type { Language } from '@/shared/types/game';
import {
  initWordTowerState,
  validateTowerWord,
  applyTowerWord,
  scrambleTray,
  type WordTowerPlayerState,
  type ApplyResult,
  type ValidationError,
} from './wordTowerManager';

export interface WordTowerUIState {
  game: WordTowerPlayerState;
  /** Indices into game.tray, in tap order, that form the word after the anchor. */
  selected: number[];
  /** Last accepted word's result — drives celebration FX. */
  lastResult: ApplyResult | null;
  /** Bumps on every accepted word so effects can react to "new floor". */
  resultKey: number;
  /** Last rejection reason — drives the error toast/shake. */
  lastError: ValidationError | null;
  /** Bumps on every rejection so the shake animation re-fires. */
  errorKey: number;
}

type Action =
  | { type: 'selectTile'; index: number }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'submit'; isInDictionary: (canonWord: string) => boolean }
  | { type: 'scramble' }
  | { type: 'reset'; game: WordTowerPlayerState };

/** Word currently being built: anchor letter + the selected tray tiles. */
export function currentWord(state: WordTowerUIState): string {
  return state.game.anchorLetter + state.selected.map((i) => state.game.tray[i]).join('');
}

function reducer(state: WordTowerUIState, action: Action): WordTowerUIState {
  switch (action.type) {
    case 'selectTile': {
      if (action.index < 0 || action.index >= state.game.tray.length) return state;
      if (state.selected.includes(action.index)) return state; // each tile once
      return { ...state, selected: [...state.selected, action.index] };
    }
    case 'backspace':
      if (state.selected.length === 0) return state;
      return { ...state, selected: state.selected.slice(0, -1) };
    case 'clear':
      if (state.selected.length === 0) return state;
      return { ...state, selected: [] };
    case 'submit': {
      const word = currentWord(state);
      const v = validateTowerWord(state.game, word, action.isInDictionary);
      if (!v.accepted) {
        return { ...state, lastError: v.error ?? null, errorKey: state.errorKey + 1, selected: [] };
      }
      const { state: nextGame, result } = applyTowerWord(state.game, word);
      return {
        ...state,
        game: nextGame,
        selected: [],
        lastResult: result,
        resultKey: state.resultKey + 1,
        lastError: null,
      };
    }
    case 'scramble':
      return { ...state, game: scrambleTray(state.game), selected: [] };
    case 'reset':
      return makeInitial(action.game);
    default:
      return state;
  }
}

function makeInitial(game: WordTowerPlayerState): WordTowerUIState {
  return { game, selected: [], lastResult: null, resultKey: 0, lastError: null, errorKey: 0 };
}

export interface UseWordTowerOpts {
  language: Language;
  /** Stable session id so trays are deterministic for this run. */
  sessionId?: string;
  /** Canonical-word membership predicate (client dictionary). */
  isInDictionary: (canonWord: string) => boolean;
}

export function useWordTower(opts: UseWordTowerOpts) {
  const { language, sessionId = 'solo', isInDictionary } = opts;
  const dictRef = useRef(isInDictionary);
  dictRef.current = isInDictionary;

  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => makeInitial(initWordTowerState({ gameCode: sessionId, playerId: 'solo', language })),
  );

  const handlers = useMemo(
    () => ({
      selectTile: (index: number) => dispatch({ type: 'selectTile', index }),
      backspace: () => dispatch({ type: 'backspace' }),
      clear: () => dispatch({ type: 'clear' }),
      submit: () => dispatch({ type: 'submit', isInDictionary: dictRef.current }),
      scramble: () => dispatch({ type: 'scramble' }),
      reset: () =>
        dispatch({ type: 'reset', game: initWordTowerState({ gameCode: sessionId, playerId: 'solo', language }) }),
    }),
    [language, sessionId],
  );

  return { state, word: currentWord(state), ...handlers };
}
