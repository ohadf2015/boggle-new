'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { createBoard, getCell, isFirstMove, type Board } from './board';
import { createBag, draw, RACK_SIZE, remaining, swap as swapBag, type TileBag } from './tileBag';
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
  | { type: 'END_GAME' };

const BOT_NAME = 'WordBot';

function buildInitial(seed: number): WordCraftState {
  const bag = createBag({ seed });
  const playerRack = draw(bag, RACK_SIZE);
  const botRack = draw(bag, RACK_SIZE);
  return {
    board: createBoard(),
    bag,
    player: { id: 'player', name: 'You', score: 0, rack: playerRack, isBot: false },
    bot: { id: 'bot', name: BOT_NAME, score: 0, rack: botRack, isBot: true },
    turn: 'player',
    pendingPlacements: [],
    selectedRackTileId: null,
    history: [],
    lastError: null,
    consecutivePasses: 0,
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
    case 'COMMIT_PLAYER':
      return commitMove(state, 'player', action.placements, action.score, action.words);
    case 'COMMIT_BOT':
      return commitMove(state, 'bot', action.placements, action.score, action.words);
    case 'SET_ERROR':
      return { ...state, lastError: action.message };
    case 'PASS': {
      const passes = state.consecutivePasses + 1;
      const turn: Turn = passes >= 2 ? 'over' : state.turn === 'player' ? 'bot' : 'player';
      return {
        ...state,
        pendingPlacements: [],
        selectedRackTileId: null,
        consecutivePasses: passes,
        turn,
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
    default:
      return state;
  }
}

export interface UseWordCraftGameOptions {
  seed?: number;
  dict: Set<string> | null;
}

export function useWordCraftGame({ seed = 1, dict }: UseWordCraftGameOptions) {
  const [state, dispatch] = useReducer(reducer, seed, buildInitial);
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
    recallTile,
    recallAll,
    submitMove,
    pass,
    swap,
    isFirstMoveOfGame,
    tilesRemaining,
  };
}
