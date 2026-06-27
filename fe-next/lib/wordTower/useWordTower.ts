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
  isTowerWordUsed,
  applyTowerWord,
  scrambleTray,
  spinWheelPaid,
  rerollStart,
  damageTower,
  type WordTowerPlayerState,
  type ApplyResult,
  type ValidationError,
} from './wordTowerManager';
import type { HazardEvent, HazardKind } from './hazards';

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
  /** Last environmental-hazard strike — drives the "tower ruined" banner + FX. */
  lastHazard: HazardEvent | null;
  /** Bumps on every hazard strike so the banner/FX re-fire. */
  hazardKey: number;
  /** Crane Stack: a validated word held for placement, awaiting the drop. */
  pendingWord: string | null;
}

type Action =
  | { type: 'selectTile'; index: number }
  | { type: 'deselectTile'; index: number }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'submit'; isInDictionary: (canonWord: string) => boolean }
  | { type: 'hold'; isInDictionary: (canonWord: string) => boolean }
  | { type: 'commitPlacement'; multiplier: number }
  | { type: 'cancelPlacement' }
  | { type: 'scramble' }
  | { type: 'scramblePaid' }
  | { type: 'rerollStart'; isViable?: (wheel: string[]) => boolean }
  | { type: 'hazard'; floors: number; kind: HazardKind; ids: string[] }
  | { type: 'reset'; game: WordTowerPlayerState };

/** Word currently being built: the selected wheel tiles, in tap/drag order. */
export function currentWord(state: WordTowerUIState): string {
  return state.selected.map((i) => state.game.tray[i]).join('');
}

function reducer(state: WordTowerUIState, action: Action): WordTowerUIState {
  switch (action.type) {
    case 'selectTile': {
      if (action.index < 0 || action.index >= state.game.tray.length) return state;
      if (state.selected.includes(action.index)) return state; // each tile once
      return { ...state, selected: [...state.selected, action.index] };
    }
    case 'deselectTile': {
      // Tap an already-chosen tile to UNSELECT it (founder ask 2026-06-20). We
      // rewind the path to just BEFORE that tile — dropping it and everything
      // chosen after — so the remaining selection stays a clean, contiguous
      // prefix (no holes in the spell path / connecting polyline).
      const at = state.selected.indexOf(action.index);
      if (at === -1) return state;
      return { ...state, selected: state.selected.slice(0, at) };
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
    case 'hold': {
      // Crane step 1: validate the built word and hand it to the crane. The word
      // is NOT committed yet — the drop (commitPlacement) finalises it.
      const word = currentWord(state);
      const v = validateTowerWord(state.game, word, action.isInDictionary);
      if (!v.accepted) {
        return { ...state, lastError: v.error ?? null, errorKey: state.errorKey + 1, selected: [] };
      }
      return { ...state, pendingWord: word, selected: [], lastError: null };
    }
    case 'commitPlacement': {
      // Crane step 2: drop. Apply the held word scaled by the placement quality.
      if (!state.pendingWord) return state;
      // Defense-in-depth against the "same word over and over" report: `hold`
      // validated this word, but the drop is otherwise an unguarded apply. If the
      // word was already placed by another path between hold and drop (or a stale
      // drop re-fires), refuse it here so a duplicate can NEVER land twice. Normal
      // play is unaffected — a freshly-held word is never in usedWords yet.
      if (isTowerWordUsed(state.game, state.pendingWord)) {
        return { ...state, pendingWord: null, lastError: 'duplicate', errorKey: state.errorKey + 1 };
      }
      const { state: nextGame, result } = applyTowerWord(state.game, state.pendingWord, action.multiplier);
      return {
        ...state,
        game: nextGame,
        pendingWord: null,
        lastResult: result,
        resultKey: state.resultKey + 1,
        lastError: null,
      };
    }
    case 'cancelPlacement':
      if (!state.pendingWord) return state;
      return { ...state, pendingWord: null };
    case 'hazard': {
      // Always record the ids as fired (so the strike never re-triggers), even if
      // there were no floors left to topple.
      const firedHazards = new Set(state.game.firedHazards);
      action.ids.forEach((id) => firedHazards.add(id));
      const { state: damaged, removed, metersLost } = damageTower(state.game, action.floors);
      const game = { ...damaged, firedHazards };
      if (removed === 0) return { ...state, game };
      return {
        ...state,
        game,
        selected: [],
        lastHazard: { kind: action.kind, removed, metersLost },
        hazardKey: state.hazardKey + 1,
      };
    }
    case 'scramble':
      return { ...state, game: scrambleTray(state.game), selected: [] };
    case 'scramblePaid':
      return { ...state, game: spinWheelPaid(state.game), selected: [] };
    case 'rerollStart':
      return { ...state, game: rerollStart(state.game, action.isViable), selected: [], lastError: null };
    case 'reset':
      return makeInitial(action.game);
    default:
      return state;
  }
}

function makeInitial(game: WordTowerPlayerState): WordTowerUIState {
  return { game, selected: [], lastResult: null, resultKey: 0, lastError: null, errorKey: 0, lastHazard: null, hazardKey: 0, pendingWord: null };
}

export interface UseWordTowerOpts {
  language: Language;
  /** Stable session id so trays are deterministic for this run. */
  sessionId?: string;
  /** Canonical-word membership predicate (client dictionary). */
  isInDictionary: (canonWord: string) => boolean;
  /** Restored tower to resume from (Phase 2 persistence). */
  initialGame?: WordTowerPlayerState;
}

export function useWordTower(opts: UseWordTowerOpts) {
  const { language, sessionId = 'solo', isInDictionary, initialGame } = opts;
  const dictRef = useRef(isInDictionary);
  dictRef.current = isInDictionary;

  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => makeInitial(initialGame ?? initWordTowerState({ gameCode: sessionId, playerId: 'solo', language })),
  );

  const handlers = useMemo(
    () => ({
      selectTile: (index: number) => dispatch({ type: 'selectTile', index }),
      deselectTile: (index: number) => dispatch({ type: 'deselectTile', index }),
      backspace: () => dispatch({ type: 'backspace' }),
      clear: () => dispatch({ type: 'clear' }),
      submit: () => dispatch({ type: 'submit', isInDictionary: dictRef.current }),
      hold: () => dispatch({ type: 'hold', isInDictionary: dictRef.current }),
      commitPlacement: (multiplier: number) => dispatch({ type: 'commitPlacement', multiplier }),
      cancelPlacement: () => dispatch({ type: 'cancelPlacement' }),
      scramble: () => dispatch({ type: 'scramble' }),
      scramblePaid: () => dispatch({ type: 'scramblePaid' }),
      reroll: (isViable?: (wheel: string[]) => boolean) => dispatch({ type: 'rerollStart', isViable }),
      hazard: (floors: number, kind: HazardKind, ids: string[]) => dispatch({ type: 'hazard', floors, kind, ids }),
      reset: () =>
        dispatch({ type: 'reset', game: initWordTowerState({ gameCode: sessionId, playerId: 'solo', language }) }),
      /** Replace the live tower with a specific state (e.g. after applying async
       *  wrecks on session start). Reuses the reset reducer path. */
      restore: (game: WordTowerPlayerState) => dispatch({ type: 'reset', game }),
    }),
    [language, sessionId],
  );

  return { state, word: currentWord(state), ...handlers };
}
