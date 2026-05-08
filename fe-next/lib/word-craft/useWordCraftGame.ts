'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { createBoard, getCell, isFirstMove, type Board } from './board';
import { createBag, draw, RACK_SIZE, remaining, swap as swapBag, type SupportedLocale, type TileBag } from './tileBag';
import { validateAndScoreMove, type DictionaryCheck } from './moveValidator';
import { findBestBotMove } from './botMove';
import type { PlacedTile, PlayerState, RackTile } from './types';

export type Turn = 'player' | 'bot' | 'over';

interface MoveHistoryEntry {
  who: 'player' | 'bot';
  words: string[];
  score: number;
  placedTileIds: string[];
}

export interface WordCraftState {
  board: Board;
  bag: TileBag;
  player: PlayerState;
  bot: PlayerState;
  turn: Turn;
  pendingPlacements: PlacedTile[];
  selectedRackTileId: string | null;
  history: MoveHistoryEntry[];
  lastError: string | null;
  consecutivePasses: number;
  heat: number;
  overdrive: boolean;
  overdriveWarns: number;
  burnout: boolean;
}

type Action =
  | { type: 'SELECT_RACK_TILE'; id: string | null }
  | { type: 'PLACE_PENDING'; placement: PlacedTile }
  | { type: 'RECALL_PENDING'; rackTileId: string }
  | { type: 'CLEAR_PENDING' }
  | { type: 'COMMIT_PLAYER'; placements: PlacedTile[]; score: number; words: string[] }
  | { type: 'COMMIT_BOT'; placements: PlacedTile[]; score: number; words: string[] }
  | { type: 'SET_ERROR'; message: string | null }
  | { type: 'PASS' }
  | { type: 'SWAP'; tilesToReturn: RackTile[]; replacements: RackTile[] }
  | { type: 'END_GAME' }
  | { type: 'BURNOUT_SKIP' };

const BOT_NAME = 'WordBot';

function buildInitial(init: number | { seed: number; boardSize?: 13 | 15; locale?: SupportedLocale }): WordCraftState {
  const seed = typeof init === 'number' ? init : init.seed;
  const boardSize = typeof init === 'number' ? 15 : (init.boardSize ?? 15);
  const locale = typeof init === 'number' ? 'en' : (init.locale ?? 'en');
  const bag = createBag({ seed, locale });
  const playerRack = draw(bag, RACK_SIZE);
  const botRack = draw(bag, RACK_SIZE);
  return {
    board: createBoard(boardSize),
    bag,
    player: { id: 'player', name: 'You', score: 0, rack: playerRack, isBot: false },
    bot: { id: 'bot', name: BOT_NAME, score: 0, rack: botRack, isBot: true },
    turn: 'player',
    pendingPlacements: [],
    selectedRackTileId: null,
    history: [],
    lastError: null,
    consecutivePasses: 0,
    heat: 0,
    overdrive: false,
    overdriveWarns: 0,
    burnout: false,
  };
}

function commitMove(
  state: WordCraftState,
  who: 'player' | 'bot',
  placements: PlacedTile[],
  score: number,
  words: string[],
): WordCraftState {
  const playedIds = new Set(placements.map((p) => p.rackTileId));
  const owner = who === 'player' ? state.player : state.bot;
  const remainingRack = owner.rack.filter((t) => !playedIds.has(t.id));
  const replenish = draw(state.bag, RACK_SIZE - remainingRack.length);
  const newRack = [...remainingRack, ...replenish];
  const updatedOwner: PlayerState = { ...owner, score: owner.score + score, rack: newRack };
  const newBoardCells = state.board.cells.map((row) => row.map((c) => ({ ...c })));
  for (const p of placements) {
    newBoardCells[p.row][p.col].tile = p;
  }
  const newBoard: Board = { cells: newBoardCells };
  const next: WordCraftState = {
    ...state,
    board: newBoard,
    player: who === 'player' ? updatedOwner : state.player,
    bot: who === 'bot' ? updatedOwner : state.bot,
    pendingPlacements: [],
    selectedRackTileId: null,
    history: [...state.history, { who, words, score, placedTileIds: placements.map((p) => p.rackTileId) }],
    lastError: null,
    consecutivePasses: 0,
    turn: who === 'player' ? 'bot' : 'player',
  };
  if (newRack.length === 0) {
    next.turn = 'over';
  }
  return next;
}

function reducer(state: WordCraftState, action: Action): WordCraftState {
  switch (action.type) {
    case 'SELECT_RACK_TILE':
      return { ...state, selectedRackTileId: action.id, lastError: null };
    case 'PLACE_PENDING':
      return {
        ...state,
        pendingPlacements: [...state.pendingPlacements, action.placement],
        selectedRackTileId: null,
        lastError: null,
      };
    case 'RECALL_PENDING':
      return {
        ...state,
        pendingPlacements: state.pendingPlacements.filter(
          (p) => p.rackTileId !== action.rackTileId,
        ),
      };
    case 'CLEAR_PENDING':
      return { ...state, pendingPlacements: [], selectedRackTileId: null };
    case 'COMMIT_PLAYER': {
      const base = commitMove(state, 'player', action.placements, action.score, action.words);
      const wasOverdrive = state.overdrive;
      if (wasOverdrive) {
        // Cashing overdrive: reset heat to 60, clear overdrive state
        return {
          ...base,
          heat: 60,
          overdrive: false,
          overdriveWarns: 0,
          burnout: false,
        };
      }
      const heatGain = Math.min(Math.floor(action.score / 5), 25);
      const newHeat = Math.min(state.heat + heatGain, 100);
      const newOverdrive = newHeat >= 100;
      return {
        ...base,
        heat: newHeat,
        overdrive: newOverdrive,
        overdriveWarns: 0,
        burnout: false,
      };
    }
    case 'COMMIT_BOT': {
      const base = commitMove(state, 'bot', action.placements, action.score, action.words);
      // Bot moves do not affect heat state
      return {
        ...base,
        heat: state.heat,
        overdrive: state.overdrive,
        overdriveWarns: state.overdriveWarns,
        burnout: state.burnout,
      };
    }
    case 'SET_ERROR':
      return { ...state, lastError: action.message };
    case 'PASS': {
      const passes = state.consecutivePasses + 1;
      const turn: Turn = passes >= 2 ? 'over' : state.turn === 'player' ? 'bot' : 'player';
      const newWarns = state.overdrive ? state.overdriveWarns + 1 : state.overdriveWarns;
      const burnout = state.overdrive && newWarns >= 2;
      return {
        ...state,
        pendingPlacements: [],
        selectedRackTileId: null,
        consecutivePasses: passes,
        turn,
        overdriveWarns: newWarns,
        burnout,
        history: [...state.history, { who: state.turn === 'player' ? 'player' : 'bot', words: [], score: 0, placedTileIds: [] }],
      };
    }
    case 'SWAP': {
      const owner = state.turn === 'player' ? state.player : state.bot;
      const returnedIds = new Set(action.tilesToReturn.map((t) => t.id));
      const remainingRack = owner.rack.filter((t) => !returnedIds.has(t.id));
      const newRack = [...remainingRack, ...action.replacements];
      const updatedOwner: PlayerState = { ...owner, rack: newRack };
      return {
        ...state,
        player: state.turn === 'player' ? updatedOwner : state.player,
        bot: state.turn === 'bot' ? updatedOwner : state.bot,
        pendingPlacements: [],
        selectedRackTileId: null,
        turn: state.turn === 'player' ? 'bot' : 'player',
        consecutivePasses: 0,
      };
    }
    case 'END_GAME':
      return { ...state, turn: 'over' };
    // Player skips turn during burnout — heat resets to 40, turn passes to bot.
    case 'BURNOUT_SKIP':
      return { ...state, burnout: false, heat: 40, overdrive: false, overdriveWarns: 0, turn: 'bot' };
    default:
      return state;
  }
}

export interface UseWordCraftGameOptions {
  seed?: number;
  dict: Set<string> | null;
  locale?: SupportedLocale;
  boardSize?: 13 | 15;
}

export { reducer as wordCraftReducer, buildInitial as buildInitialState }

export function useWordCraftGame({ seed = 1, dict, locale = 'en', boardSize = 15 }: UseWordCraftGameOptions) {
  const initArg = useMemo(() => ({ seed, boardSize, locale }), [seed, boardSize, locale]);
  const [state, dispatch] = useReducer(reducer, initArg, buildInitial);
  const isWordValid: DictionaryCheck = useCallback(
    (w: string) => (dict ? dict.has(w.toLowerCase()) || dict.has(w.toUpperCase()) : false),
    [dict],
  );

  const selectRackTile = useCallback(
    (id: string | null) => dispatch({ type: 'SELECT_RACK_TILE', id }),
    [],
  );

  const placeOnBoard = useCallback(
    (row: number, col: number) => {
      if (state.turn !== 'player') return;
      if (!state.selectedRackTileId) return;
      if (getCell(state.board, row, col).tile) return;
      if (state.pendingPlacements.some((p) => p.row === row && p.col === col)) return;
      const tile = state.player.rack.find((t) => t.id === state.selectedRackTileId);
      if (!tile) return;
      const placement: PlacedTile = {
        row,
        col,
        letter: tile.letter,
        value: tile.value,
        isBlank: tile.isBlank,
        rackTileId: tile.id,
      };
      dispatch({ type: 'PLACE_PENDING', placement });
    },
    [state.turn, state.selectedRackTileId, state.board, state.pendingPlacements, state.player.rack],
  );

  // Drag-to-place bypass: caller provides the tile id directly so we don't depend
  // on the async-updating selectedRackTileId. Used by the pointer-drag flow.
  const placeTileOnBoard = useCallback(
    (rackTileId: string, row: number, col: number) => {
      if (state.turn !== 'player') return;
      if (getCell(state.board, row, col).tile) return;
      if (state.pendingPlacements.some((p) => p.row === row && p.col === col)) return;
      if (state.pendingPlacements.some((p) => p.rackTileId === rackTileId)) return;
      const tile = state.player.rack.find((t) => t.id === rackTileId);
      if (!tile) return;
      const placement: PlacedTile = {
        row,
        col,
        letter: tile.letter,
        value: tile.value,
        isBlank: tile.isBlank,
        rackTileId: tile.id,
      };
      dispatch({ type: 'PLACE_PENDING', placement });
      dispatch({ type: 'SELECT_RACK_TILE', id: null });
    },
    [state.turn, state.board, state.pendingPlacements, state.player.rack],
  );

  const recallTile = useCallback(
    (rackTileId: string) => dispatch({ type: 'RECALL_PENDING', rackTileId }),
    [],
  );

  const recallAll = useCallback(() => dispatch({ type: 'CLEAR_PENDING' }), []);

  const submitMove = useCallback(() => {
    if (state.turn !== 'player') return;
    if (!dict) {
      dispatch({ type: 'SET_ERROR', message: 'DICT_LOADING' });
      return;
    }
    const result = validateAndScoreMove(state.board, state.pendingPlacements, isWordValid);
    if (!result.ok) {
      dispatch({
        type: 'SET_ERROR',
        message: result.invalidWord ? `INVALID_WORD:${result.invalidWord}` : (result.reason ?? 'INVALID'),
      });
      return;
    }
    dispatch({
      type: 'COMMIT_PLAYER',
      placements: state.pendingPlacements,
      score: result.score ?? 0,
      words: result.words?.map((w) => w.word) ?? [],
    });
  }, [dict, state.turn, state.board, state.pendingPlacements, isWordValid]);

  const pass = useCallback(() => dispatch({ type: 'PASS' }), []);

  const burnoutSkip = useCallback(() => dispatch({ type: 'BURNOUT_SKIP' }), []);

  const swap = useCallback(
    (tilesToReturn: RackTile[]) => {
      if (state.turn !== 'player' && state.turn !== 'bot') return;
      const replacements = swapBag(state.bag, tilesToReturn);
      if (!replacements) {
        dispatch({ type: 'SET_ERROR', message: 'BAG_TOO_SMALL_TO_SWAP' });
        return;
      }
      dispatch({ type: 'SWAP', tilesToReturn, replacements });
    },
    [state.turn, state.bag],
  );

  const botTurnRunning = useRef(false);
  useEffect(() => {
    if (state.turn !== 'bot') return;
    if (!dict) return;
    if (botTurnRunning.current) return;
    botTurnRunning.current = true;
    const handle = setTimeout(() => {
      const move = findBestBotMove(state.board, state.bot.rack, isWordValid, { maxLength: 5 });
      if (move) {
        const result = validateAndScoreMove(state.board, move.placements, isWordValid);
        if (result.ok) {
          dispatch({
            type: 'COMMIT_BOT',
            placements: move.placements,
            score: result.score ?? 0,
            words: result.words?.map((w) => w.word) ?? [],
          });
        } else {
          dispatch({ type: 'PASS' });
        }
      } else {
        dispatch({ type: 'PASS' });
      }
      botTurnRunning.current = false;
    }, 500);
    return () => {
      clearTimeout(handle);
      botTurnRunning.current = false;
    };
  }, [state.turn, dict, state.board, state.bot.rack, isWordValid]);

  const isFirstMoveOfGame = useMemo(() => isFirstMove(state.board), [state.board]);
  const tilesRemaining = useMemo(() => remaining(state.bag), [state.bag]);

  return {
    state,
    selectRackTile,
    placeOnBoard,
    placeTileOnBoard,
    recallTile,
    recallAll,
    submitMove,
    pass,
    burnoutSkip,
    swap,
    isFirstMoveOfGame,
    tilesRemaining,
  };
}
