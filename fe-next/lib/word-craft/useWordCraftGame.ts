'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { createBoard, getCell, isFirstMove, type Board, type BoardSize } from './board';
import { createBag, draw, RACK_SIZE, remaining, swap as swapBag, type SupportedLocale, type TileBag } from './tileBag';
import { validateAndScoreMove, type DictionaryCheck } from './moveValidator';
import { findBestBotMove } from './botMove';
import { normalizeHebrewWord, normalizeSpanishWord } from '@/shared/utils/wordNormalization';
import { getBoardDims } from './boardDimensions';
import { applyClaims, endgameTerritoryBonus, resolveCaptures, type Coord, type Owner } from './territory';
import type { PlacedTile, PlayerState, RackTile } from './types';

export type Turn = 'player' | 'bot' | 'over';

interface MoveHistoryEntry {
  who: 'player' | 'bot';
  words: string[];
  score: number;
  placedTileIds: string[];
}

export interface LastCapture {
  by: Owner;
  cells: Coord[];
  bonus: number;
  turnIndex: number;
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
  territoryEnabled: boolean;
  lastCapture: LastCapture | null;
  /**
   * Hot-seat (pass-and-play): the "bot" side is a second human on the same
   * device and the auto-bot is disabled. Heat/overdrive is neutralized so one
   * side doesn't get a lopsided advantage.
   */
  hotseat: boolean;
}

type Action =
  | { type: 'SELECT_RACK_TILE'; id: string | null }
  | { type: 'PLACE_PENDING'; placement: PlacedTile }
  | { type: 'RECALL_PENDING'; rackTileId: string }
  | { type: 'CLEAR_PENDING' }
  | { type: 'COMMIT_PLAYER'; placements: PlacedTile[]; score: number; words: string[]; wordCells?: Coord[][] }
  | { type: 'COMMIT_BOT'; placements: PlacedTile[]; score: number; words: string[]; wordCells?: Coord[][] }
  | { type: 'SET_ERROR'; message: string | null }
  | { type: 'PASS' }
  | { type: 'SWAP'; tilesToReturn: RackTile[]; replacements: RackTile[] }
  | { type: 'END_GAME' }
  | { type: 'BURNOUT_SKIP' }
  | { type: 'RESET'; seed: number; boardSize: 13 | 15; locale: SupportedLocale; territoryEnabled?: boolean; hotseat?: boolean };

const BOT_NAME = 'WordBot';

function buildInitial(init: number | { seed: number; boardSize?: 13 | 15; locale?: SupportedLocale; viewportDims?: { size: BoardSize; bagSize: number }; territoryEnabled?: boolean; hotseat?: boolean }): WordCraftState {
  const seed = typeof init === 'number' ? init : init.seed;
  const boardSize = typeof init === 'number' ? 15 : (init.boardSize ?? 15);
  const locale = typeof init === 'number' ? 'en' : (init.locale ?? 'en');
  const viewportDims = typeof init === 'number' ? undefined : init.viewportDims;
  const territoryEnabled = typeof init === 'number' ? true : (init.territoryEnabled ?? true);
  const hotseat = typeof init === 'number' ? false : (init.hotseat ?? false);

  const finalBoardSize = viewportDims?.size ?? boardSize;
  const bag = createBag({ seed, locale, bagSize: viewportDims?.bagSize });
  const playerRack = draw(bag, RACK_SIZE);
  const botRack = draw(bag, RACK_SIZE);
  return {
    board: createBoard(finalBoardSize),
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
    territoryEnabled,
    lastCapture: null,
    hotseat,
  };
}

function commitMove(
  state: WordCraftState,
  who: 'player' | 'bot',
  placements: PlacedTile[],
  baseScore: number,
  words: string[],
  wordCells: Coord[][] | undefined,
): WordCraftState {
  const playedIds = new Set(placements.map((p) => p.rackTileId));
  const owner = who === 'player' ? state.player : state.bot;
  const remainingRack = owner.rack.filter((t) => !playedIds.has(t.id));
  const replenish = draw(state.bag, RACK_SIZE - remainingRack.length);
  const newRack = [...remainingRack, ...replenish];

  // Stamp newly-placed tiles into the board first so capture logic walks an
  // accurate snapshot. Territory claim is applied next.
  const tilePlacedCells = state.board.cells.map((row) => row.map((c) => ({ ...c })));
  for (const p of placements) {
    tilePlacedCells[p.row][p.col].tile = p;
  }
  const tilePlacedBoard: Board = { cells: tilePlacedCells, size: state.board.size };

  let captureBonus = 0;
  let lastCapture: LastCapture | null = state.lastCapture;
  let nextBoard: Board = tilePlacedBoard;
  if (state.territoryEnabled) {
    const lists = wordCells ?? [];
    // resolveCaptures must see the PRIOR board (before claiming this turn's
    // placements) so newly-placed cells aren't flagged as "anchors of the
    // opponent". Use state.board, not tilePlacedBoard.
    const capture = resolveCaptures(state.board, placements, lists, who);
    captureBonus = capture.bonus;
    nextBoard = applyClaims(tilePlacedBoard, placements, capture.capturedCells, who);
    if (capture.capturedCells.length > 0) {
      lastCapture = {
        by: who,
        cells: capture.capturedCells,
        bonus: capture.bonus,
        turnIndex: state.history.length,
      };
    }
  }

  const totalScore = baseScore + captureBonus;
  const updatedOwner: PlayerState = { ...owner, score: owner.score + totalScore, rack: newRack };
  const next: WordCraftState = {
    ...state,
    board: nextBoard,
    player: who === 'player' ? updatedOwner : state.player,
    bot: who === 'bot' ? updatedOwner : state.bot,
    pendingPlacements: [],
    selectedRackTileId: null,
    history: [...state.history, { who, words, score: totalScore, placedTileIds: placements.map((p) => p.rackTileId) }],
    lastError: null,
    consecutivePasses: 0,
    turn: who === 'player' ? 'bot' : 'player',
    lastCapture,
  };
  if (newRack.length === 0) {
    next.turn = 'over';
  }
  if (next.turn === 'over' && state.territoryEnabled) {
    return applyEndgameTerritory(next);
  }
  return next;
}

function applyEndgameTerritory(state: WordCraftState): WordCraftState {
  const playerBonus = endgameTerritoryBonus(state.board, 'player');
  const botBonus = endgameTerritoryBonus(state.board, 'bot');
  if (playerBonus === 0 && botBonus === 0) return state;
  return {
    ...state,
    player: { ...state.player, score: state.player.score + playerBonus },
    bot: { ...state.bot, score: state.bot.score + botBonus },
  };
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
      const base = commitMove(state, 'player', action.placements, action.score, action.words, action.wordCells);
      // Hot-seat: both humans submit through the player/bot seats; heat would
      // only ever accrue for seat 1, a lopsided overdrive edge. Keep it inert.
      if (state.hotseat) {
        return base;
      }
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
      const base = commitMove(state, 'bot', action.placements, action.score, action.words, action.wordCells);
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
    // Used when locale or board size changes mid-session — wipes the game so a
    // Hebrew player who switched from /en doesn't keep the English bag.
    case 'RESET':
      return buildInitial({ seed: action.seed, boardSize: action.boardSize, locale: action.locale, territoryEnabled: action.territoryEnabled ?? state.territoryEnabled, hotseat: action.hotseat ?? state.hotseat });
    default:
      return state;
  }
}

export interface UseWordCraftGameOptions {
  seed?: number;
  dict: Set<string> | null;
  locale?: SupportedLocale;
  boardSize?: 13 | 15;
  territoryEnabled?: boolean;
  /**
   * Bot difficulty. 0 = always optimal; higher = picks from a wider pool of
   * top words so it occasionally plays sub-optimally. Default 0.5 (top-3
   * words) makes the single-player bot beatable without feeling broken.
   */
  botSkillVariance?: number;
  /**
   * Hot-seat (pass-and-play) mode: the "bot" seat is a second human, the
   * auto-bot is disabled, and both seats take input on their own turn.
   */
  hotseat?: boolean;
}

export { reducer as wordCraftReducer, buildInitial as buildInitialState }

export function useWordCraftGame({ seed = 1, dict, locale = 'en', boardSize = 15, territoryEnabled = true, botSkillVariance = 0.5, hotseat = false }: UseWordCraftGameOptions) {
  // Capture viewport dims at initialization and lock them for the game lifetime
  const initialDimsRef = useRef(
    getBoardDims(typeof window === 'undefined' ? 1024 : window.innerWidth)
  );
  const initialDims = initialDimsRef.current;

  const initArg = useMemo(() => ({ seed, boardSize, locale, viewportDims: initialDims, territoryEnabled, hotseat }), [seed, boardSize, locale, initialDims, territoryEnabled, hotseat]);
  const [state, dispatch] = useReducer(reducer, initArg, buildInitial);

  // Locale-aware dict lookup. Hebrew dict is loaded with sofit→regular
  // normalization (see /api/word-craft/wordlist) but player tiles still carry
  // sofit forms (ך ם ן ף ץ), so we must normalize the player's word too. Same
  // story for Spanish accents (ESTÁ vs ESTA).
  const isWordValid: DictionaryCheck = useCallback(
    (w: string) => {
      if (!dict) return false;
      const candidates = new Set<string>();
      const lower = w.toLowerCase();
      const upper = w.toUpperCase();
      candidates.add(lower);
      candidates.add(upper);
      if (locale === 'he') {
        const norm = normalizeHebrewWord(w);
        candidates.add(norm);
        candidates.add(norm.toLowerCase());
        candidates.add(norm.toUpperCase());
      }
      if (locale === 'es') {
        const norm = normalizeSpanishWord(w);
        candidates.add(norm);
        candidates.add(norm.toLowerCase());
        candidates.add(norm.toUpperCase());
      }
      for (const c of candidates) {
        if (dict.has(c)) return true;
      }
      return false;
    },
    [dict, locale],
  );

  // Locale or board-size flipping mid-session must restart the game so the
  // bag matches the active alphabet. (useReducer init is a one-shot so the
  // useMemo above isn't enough.)
  const previousResetKeyRef = useRef(`${locale}|${boardSize}|${territoryEnabled}`);
  useEffect(() => {
    const key = `${locale}|${boardSize}|${territoryEnabled}`;
    if (previousResetKeyRef.current === key) return;
    previousResetKeyRef.current = key;
    dispatch({ type: 'RESET', seed, boardSize, locale, territoryEnabled });
  }, [locale, boardSize, seed, territoryEnabled]);

  const selectRackTile = useCallback(
    (id: string | null) => dispatch({ type: 'SELECT_RACK_TILE', id }),
    [],
  );

  const placeOnBoard = useCallback(
    (row: number, col: number) => {
      // Hot-seat: either seat may act on its own turn; bot-mode: player only.
      if (hotseat ? state.turn === 'over' : state.turn !== 'player') return;
      if (!state.selectedRackTileId) return;
      if (getCell(state.board, row, col).tile) return;
      if (state.pendingPlacements.some((p) => p.row === row && p.col === col)) return;
      const activeRack = state.turn === 'bot' ? state.bot.rack : state.player.rack;
      const tile = activeRack.find((t) => t.id === state.selectedRackTileId);
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
    [hotseat, state.turn, state.selectedRackTileId, state.board, state.pendingPlacements, state.player.rack, state.bot.rack],
  );

  // Drag-to-place bypass: caller provides the tile id directly so we don't depend
  // on the async-updating selectedRackTileId. Used by the pointer-drag flow.
  const placeTileOnBoard = useCallback(
    (rackTileId: string, row: number, col: number) => {
      if (hotseat ? state.turn === 'over' : state.turn !== 'player') return;
      if (getCell(state.board, row, col).tile) return;
      if (state.pendingPlacements.some((p) => p.row === row && p.col === col)) return;
      if (state.pendingPlacements.some((p) => p.rackTileId === rackTileId)) return;
      const activeRack = state.turn === 'bot' ? state.bot.rack : state.player.rack;
      const tile = activeRack.find((t) => t.id === rackTileId);
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
    [hotseat, state.turn, state.board, state.pendingPlacements, state.player.rack, state.bot.rack],
  );

  const recallTile = useCallback(
    (rackTileId: string) => dispatch({ type: 'RECALL_PENDING', rackTileId }),
    [],
  );

  const recallAll = useCallback(() => dispatch({ type: 'CLEAR_PENDING' }), []);

  const submitMove = useCallback(() => {
    if (hotseat ? state.turn === 'over' : state.turn !== 'player') return;
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
    // Route the commit to whichever seat is acting. In bot-mode the turn is
    // always 'player' here; in hot-seat the second human commits as 'bot'.
    dispatch({
      type: state.turn === 'bot' ? 'COMMIT_BOT' : 'COMMIT_PLAYER',
      placements: state.pendingPlacements,
      score: result.score ?? 0,
      words: result.words?.map((w) => w.word) ?? [],
      wordCells: result.words?.map((w) => w.cells) ?? [],
    });
  }, [hotseat, dict, state.turn, state.board, state.pendingPlacements, isWordValid]);

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
    // Hot-seat: the second seat is a human — never auto-play it.
    if (hotseat) return;
    if (state.turn !== 'bot') return;
    if (!dict) return;
    if (botTurnRunning.current) return;
    botTurnRunning.current = true;
    const handle = setTimeout(() => {
      // Inherit botMove's DEFAULT_MAX_LENGTH (7) — old call passed an explicit
      // 5 that capped the bot below bingo length and made it feel weak.
      const move = findBestBotMove(state.board, state.bot.rack, isWordValid, {
        // Territory bias: rank candidate by score + capture potential so the
        // bot doesn't ignore juicy flips. No-op when territory is disabled.
        extraScore: state.territoryEnabled
          ? (placements, wordCells) => resolveCaptures(state.board, placements, wordCells, 'bot').bonus
          : undefined,
        // Difficulty: pick from the top-N words instead of always the best,
        // so the bot is beatable. Bingo capability is preserved.
        skillVariance: botSkillVariance,
      });
      if (move) {
        const result = validateAndScoreMove(state.board, move.placements, isWordValid);
        if (result.ok) {
          dispatch({
            type: 'COMMIT_BOT',
            placements: move.placements,
            score: result.score ?? 0,
            words: result.words?.map((w) => w.word) ?? [],
            wordCells: result.words?.map((w) => w.cells) ?? [],
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
  }, [hotseat, state.turn, dict, state.board, state.bot.rack, state.territoryEnabled, isWordValid, botSkillVariance]);

  const isFirstMoveOfGame = useMemo(() => isFirstMove(state.board), [state.board]);
  const tilesRemaining = useMemo(() => remaining(state.bag), [state.bag]);
  // The seat whose turn it is — drives which rack the UI shows in hot-seat.
  const activePlayer = state.turn === 'bot' ? state.bot : state.player;

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
    isHotseat: hotseat,
    activePlayer,
  };
}
