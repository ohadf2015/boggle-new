'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { getCell, type BoardSize } from '../board';
import { type SupportedLocale } from '../tileBag';
import { type DictionaryCheck } from '../moveValidator';
import { normalizeHebrewWord, normalizeSpanishWord } from '@/shared/utils/wordNormalization';
import type { PlacedTile, RackTile } from '../types';
import {
  buildInitialGemHunt,
  gemHuntReducer,
  validateGemMove,
} from './gemHuntReducer';
import type { AbilityCard, GemColor, GemRarity } from './types';

export interface UseGemHuntOptions {
  seed?: number;
  dict: Set<string> | null;
  locale?: SupportedLocale;
  boardSize?: BoardSize;
  scoreBonus?: { letters: Set<string>; multiplier: number } | null;
}

export function useGemHunt({ seed = 1, dict, locale = 'en', boardSize = 11, scoreBonus = null }: UseGemHuntOptions) {
  const initialState = useMemo(
    () => buildInitialGemHunt({ seed, locale, boardSize }),
    // initial state captured once at mount; flips trigger RESET in the effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const [state, dispatch] = useReducer(gemHuntReducer, initialState);

  // Locale/board flip mid-session → restart so bag matches alphabet.
  const resetKey = useRef(`${locale}|${boardSize}`);
  useEffect(() => {
    const key = `${locale}|${boardSize}`;
    if (resetKey.current === key) return;
    resetKey.current = key;
    dispatch({ type: 'RESET', seed, locale, boardSize });
  }, [locale, boardSize, seed]);

  const isWordValid: DictionaryCheck = useCallback(
    (w: string) => {
      if (!dict) return false;
      const candidates = new Set<string>([w, w.toLowerCase(), w.toUpperCase()]);
      if (locale === 'he') {
        const norm = normalizeHebrewWord(w);
        candidates.add(norm); candidates.add(norm.toLowerCase()); candidates.add(norm.toUpperCase());
      }
      if (locale === 'es') {
        const norm = normalizeSpanishWord(w);
        candidates.add(norm); candidates.add(norm.toLowerCase()); candidates.add(norm.toUpperCase());
      }
      for (const c of candidates) if (dict.has(c)) return true;
      return false;
    },
    [dict, locale],
  );

  const selectRackTile = useCallback(
    (id: string | null) => dispatch({ type: 'SELECT_RACK_TILE', id }),
    [],
  );

  const placeOnBoard = useCallback(
    (row: number, col: number) => {
      if (state.outcome !== null) return;
      if (!state.selectedRackTileId) return;
      if (getCell(state.board, row, col).tile) return;
      if (state.pendingPlacements.some((p) => p.row === row && p.col === col)) return;
      const tile = state.rack.find((t: RackTile) => t.id === state.selectedRackTileId);
      if (!tile) return;
      const placement: PlacedTile = {
        row, col,
        letter: tile.letter,
        value: tile.value,
        isBlank: tile.isBlank,
        rackTileId: tile.id,
      };
      dispatch({ type: 'PLACE_PENDING', placement });
    },
    [state.outcome, state.selectedRackTileId, state.board, state.pendingPlacements, state.rack],
  );

  const recallTile = useCallback((id: string) => dispatch({ type: 'RECALL_PENDING', rackTileId: id }), []);
  const recallAll = useCallback(() => dispatch({ type: 'CLEAR_PENDING' }), []);

  const submitMove = useCallback(() => {
    if (state.outcome !== null) return;
    if (!dict) { dispatch({ type: 'SET_ERROR', message: 'DICT_LOADING' }); return; }
    const result = validateGemMove(state.board, state.pendingPlacements, isWordValid);
    if (!result.ok) { dispatch({ type: 'SET_ERROR', message: result.reason }); return; }
    let score = result.score;
    if (scoreBonus) {
      const hasBonus = state.pendingPlacements.some((p) => scoreBonus.letters.has(p.letter.toUpperCase()));
      if (hasBonus) score = Math.round(score * scoreBonus.multiplier);
    }
    dispatch({ type: 'COMMIT', words: result.words, score });
  }, [dict, state.outcome, state.board, state.pendingPlacements, isWordValid, scoreBonus]);

  const buyAbility = useCallback((card: AbilityCard) => dispatch({ type: 'BUY_ABILITY', card }), []);
  const rerollShop = useCallback((card: AbilityCard) => dispatch({ type: 'REROLL_SHOP', card }), []);
  const transmuteGem = useCallback(
    (color: GemColor, rarity: GemRarity) => dispatch({ type: 'TRANSMUTE', color, rarity }),
    [],
  );

  return {
    state,
    selectRackTile,
    placeOnBoard,
    recallTile,
    recallAll,
    submitMove,
    buyAbility,
    rerollShop,
    transmuteGem,
  };
}
