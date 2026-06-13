'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { createBoard, getCell, isFirstMove, type Board, type BoardSize } from './board';
import { createBag, draw, RACK_SIZE, remaining, swap as swapBag, type SupportedLocale, type TileBag } from './tileBag';
import { validateAndScoreMove, type DictionaryCheck } from './moveValidator';
import { findBestBotMove } from './botMove';
import { botTuning, DEFAULT_BOT_DIFFICULTY, type BotDifficulty } from './botDifficulty';
import { rollModifier, toScoreModifier, modifierCaptureSpread, type WordCraftModifier } from './modifiers';
import { normalizeHebrewWord, normalizeSpanishWord } from '@/shared/utils/wordNormalization';
import { getBoardDims, type BoardDims } from './boardDimensions';
import { applyClaims, endgameTerritoryBonus, resolveCaptures, type Coord, type Owner } from './territory';
import { assignBlankLetter, hasUnassignedBlank } from './blankAssign';
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
  /**
   * Consecutive valid-commit count per side. Resets on PASS for the
   * passing side. Used by the celebration tier resolver to escalate
   * "on-fire" feedback. Capped at 99 to prevent state runaway.
   */
  streaks: { player: number; bot: number };
  /**
   * Remaining player clues. Every game grants {@link STARTING_CLUES} free
   * clues; once spent, the player can watch a rewarded ad to earn one more.
   */
  cluesRemaining: number;
  /**
   * Per-game scoring modifier, rolled at init from the seed for variety. Applied
   * symmetrically to player + bot scoring via {@link toScoreModifier}.
   */
  modifier: WordCraftModifier;
}

/** Free clues granted at the start of every WordCraft game. */
export const STARTING_CLUES = 2;

type Action =
  | { type: 'SELECT_RACK_TILE'; id: string | null }
  | { type: 'PLACE_PENDING'; placement: PlacedTile }
  | { type: 'RECALL_PENDING'; rackTileId: string }
  | { type: 'ASSIGN_BLANK'; rackTileId: string; letter: string }
  | { type: 'CLEAR_PENDING' }
  | { type: 'COMMIT_PLAYER'; placements: PlacedTile[]; score: number; words: string[]; wordCells?: Coord[][] }
  | { type: 'COMMIT_BOT'; placements: PlacedTile[]; score: number; words: string[]; wordCells?: Coord[][] }
  | { type: 'SET_ERROR'; message: string | null }
  | { type: 'PASS' }
  | { type: 'SWAP'; tilesToReturn: RackTile[]; replacements: RackTile[] }
  | { type: 'END_GAME' }
  | { type: 'USE_CLUE' }
  | { type: 'GRANT_CLUE' }
  | { type: 'BURNOUT_SKIP' }
  | { type: 'RESET'; seed: number; boardSize: 13 | 15; locale: SupportedLocale; territoryEnabled?: boolean; hotseat?: boolean; viewportDims?: { size: BoardSize; bagSize: number } };

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
    // Conquest mode: a neutral grid with no premium squares and no center
    // star. Every cell is plain until a player claims it.
    board: createBoard(finalBoardSize, { premiums: false }),
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
    streaks: { player: 0, bot: 0 },
    cluesRemaining: STARTING_CLUES,
    modifier: rollModifier(seed),
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
    // opponent". Use state.board, not tilePlacedBoard. land_grab spreads each
    // capture by one ring (symmetric — applies to whoever is committing).
    const capture = resolveCaptures(state.board, placements, lists, who, {
      spreadToNeighbors: modifierCaptureSpread(state.modifier),
    });
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
  const nextStreaks = {
    ...state.streaks,
    [who]: Math.min(state.streaks[who] + 1, 99),
  };
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
    streaks: nextStreaks,
  };
  // The sack is the game clock: the game finishes the moment it empties (or
  // the active player exhausts their rack). `state.bag` was already drained by
  // the `draw` above, so `remaining` reflects the post-refill count.
  if (newRack.length === 0 || remaining(state.bag) === 0) {
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
    case 'ASSIGN_BLANK':
      return {
        ...state,
        pendingPlacements: state.pendingPlacements.map((p) =>
          p.rackTileId === action.rackTileId ? assignBlankLetter(p, action.letter) : p,
        ),
        lastError: null,
      };
    case 'CLEAR_PENDING':
      return { ...state, pendingPlacements: [], selectedRackTileId: null };
    // Conquest mode has no heat / overdrive / burnout — territory captures are
    // the only momentum system. Commits leave the (inert) heat fields untouched.
    case 'COMMIT_PLAYER':
      return commitMove(state, 'player', action.placements, action.score, action.words, action.wordCells);
    case 'COMMIT_BOT':
      return commitMove(state, 'bot', action.placements, action.score, action.words, action.wordCells);
    case 'SET_ERROR':
      return { ...state, lastError: action.message };
    case 'PASS': {
      const passes = state.consecutivePasses + 1;
      const turn: Turn = passes >= 2 ? 'over' : state.turn === 'player' ? 'bot' : 'player';
      const passingSide = state.turn === 'player' ? 'player' : 'bot';
      return {
        ...state,
        pendingPlacements: [],
        selectedRackTileId: null,
        consecutivePasses: passes,
        turn,
        history: [...state.history, { who: passingSide, words: [], score: 0, placedTileIds: [] }],
        streaks: { ...state.streaks, [passingSide]: 0 },
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
    case 'USE_CLUE':
      return { ...state, cluesRemaining: Math.max(0, state.cluesRemaining - 1) };
    case 'GRANT_CLUE':
      return { ...state, cluesRemaining: state.cluesRemaining + 1 };
    // Burnout no longer triggers in Conquest mode; kept as an inert no-op so
    // any stale dispatch can't wedge the turn.
    case 'BURNOUT_SKIP':
      return state;
    // Used when locale or board size changes mid-session — wipes the game so a
    // Hebrew player who switched from /en doesn't keep the English bag.
    case 'RESET':
      // viewportDims carries the locked board size + solo bag size so a
      // play-again (or locale switch) keeps the same tight bag instead of
      // silently falling back to the full default 100-tile bag.
      return buildInitial({ seed: action.seed, boardSize: action.boardSize, locale: action.locale, territoryEnabled: action.territoryEnabled ?? state.territoryEnabled, hotseat: action.hotseat ?? state.hotseat, viewportDims: action.viewportDims });
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
   * Bot difficulty preset. Drives both the max word length the bot considers
   * (capping bingos) and its skill variance. Defaults to 'easy' so the
   * out-of-the-box opponent is beatable. See {@link botTuning}.
   */
  difficulty?: BotDifficulty;
  /**
   * Explicit skill-variance override (tests / tuning). When omitted the value
   * is derived from `difficulty`. Higher = picks from a wider pool of top
   * words so it plays sub-optimally more often.
   */
  botSkillVariance?: number;
  /**
   * Hot-seat (pass-and-play) mode: the "bot" seat is a second human, the
   * auto-bot is disabled, and both seats take input on their own turn.
   */
  hotseat?: boolean;
  /**
   * Force the board dimensions instead of deriving them from the viewport.
   * Used by duels: the invitee MUST play the challenger's exact board, which
   * means matching size + bag — both read from the device viewport otherwise.
   * When omitted, dims come from `window.innerWidth` (the normal solo path).
   */
  forcedDims?: BoardDims;
}

export { reducer as wordCraftReducer, buildInitial as buildInitialState }

export function useWordCraftGame({ seed = 1, dict, locale = 'en', boardSize = 15, territoryEnabled = true, difficulty = DEFAULT_BOT_DIFFICULTY, botSkillVariance, hotseat = false, forcedDims }: UseWordCraftGameOptions) {
  const tuning = botTuning(difficulty);
  const effectiveVariance = botSkillVariance ?? tuning.skillVariance;
  // Capture dims at initialization and lock them for the game lifetime. A duel
  // forces the challenger's dims so both players share one board; otherwise we
  // read the device viewport.
  const initialDimsRef = useRef(
    forcedDims ?? getBoardDims(typeof window === 'undefined' ? 1024 : window.innerWidth)
  );
  const initialDims = initialDimsRef.current;

  const initArg = useMemo(() => ({ seed, boardSize, locale, viewportDims: initialDims, territoryEnabled, hotseat }), [seed, boardSize, locale, initialDims, territoryEnabled, hotseat]);
  const [state, dispatch] = useReducer(reducer, initArg, buildInitial);

  // Active per-game scoring modifier, applied symmetrically to player commits,
  // bot commits, and the bot's internal candidate ranking.
  const modifierSpec = useMemo(() => toScoreModifier(state.modifier), [state.modifier]);

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
    dispatch({ type: 'RESET', seed, boardSize, locale, territoryEnabled, viewportDims: initialDimsRef.current });
  }, [locale, boardSize, seed, territoryEnabled]);

  // Public play-again: re-rolls a fresh game (optionally with a new seed so the
  // board differs), preserving the locked board + tight solo bag. Wired to the
  // game-over Play Again CTA.
  const reset = useCallback(
    (nextSeed?: number) => {
      dispatch({
        type: 'RESET',
        seed: nextSeed ?? seed,
        boardSize,
        locale,
        territoryEnabled,
        hotseat,
        viewportDims: initialDimsRef.current,
      });
    },
    [seed, boardSize, locale, territoryEnabled, hotseat],
  );

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

  const assignBlank = useCallback(
    (rackTileId: string, letter: string) => dispatch({ type: 'ASSIGN_BLANK', rackTileId, letter }),
    [],
  );

  const submitMove = useCallback(() => {
    if (hotseat ? state.turn === 'over' : state.turn !== 'player') return;
    if (!dict) {
      dispatch({ type: 'SET_ERROR', message: 'DICT_LOADING' });
      return;
    }
    // A joker (blank) must carry a chosen letter before it can play, otherwise
    // the validator would build the word with a literal '_' and always reject.
    if (hasUnassignedBlank(state.pendingPlacements)) {
      dispatch({ type: 'SET_ERROR', message: 'BLANK_UNASSIGNED' });
      return;
    }
    // requireFirstMoveCenter=false → Conquest has no center star; the opening
    // word may be placed anywhere.
    const result = validateAndScoreMove(state.board, state.pendingPlacements, isWordValid, modifierSpec, false);
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
  }, [hotseat, dict, state.turn, state.board, state.pendingPlacements, isWordValid, modifierSpec]);

  const pass = useCallback(() => dispatch({ type: 'PASS' }), []);

  // Clue: surface the strongest word the PLAYER could play right now (capped at
  // length 5 so it's a nudge, not a free bingo) plus its starting cell. Spends a
  // clue only when a playable word actually exists. The reveal is intentionally
  // hint-not-autoplay — the player still has to place the tiles.
  const requestClue = useCallback((): { word: string; row: number; col: number } | null => {
    if (state.cluesRemaining <= 0) return null;
    if (!dict) return null;
    const move = findBestBotMove(state.board, state.player.rack, isWordValid, { maxLength: 5 });
    if (!move) return null;
    dispatch({ type: 'USE_CLUE' });
    const start = move.placements[0];
    return { word: move.word, row: start?.row ?? -1, col: start?.col ?? -1 };
  }, [state.cluesRemaining, state.board, state.player.rack, dict, isWordValid]);

  // Rewarded-ad outcome (or web free-grant fallback): top up one clue.
  const grantClue = useCallback(() => dispatch({ type: 'GRANT_CLUE' }), []);

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
        // bot doesn't ignore juicy flips. Scaled by the difficulty's
        // captureAggression so easy stops hunting the player's cells. No-op when
        // territory is disabled.
        extraScore: state.territoryEnabled
          ? (placements, wordCells) =>
              resolveCaptures(state.board, placements, wordCells, 'bot', {
                spreadToNeighbors: modifierCaptureSpread(state.modifier),
              }).bonus * tuning.captureAggression
          : undefined,
        // Difficulty: cap word length (easy/medium kill bingos) and pick from a
        // wider, weaker pool so the bot is beatable. Both derived from the
        // selected difficulty preset (default 'easy').
        maxLength: tuning.maxLength,
        skillVariance: effectiveVariance,
        // Press the pick toward the weakest pooled word on lower difficulties.
        selectionSkew: tuning.selectionSkew,
        scoreModifier: modifierSpec,
      });
      if (move) {
        const result = validateAndScoreMove(state.board, move.placements, isWordValid, modifierSpec, false);
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
  }, [hotseat, state.turn, dict, state.board, state.bot.rack, state.territoryEnabled, isWordValid, tuning.maxLength, effectiveVariance, tuning.selectionSkew, tuning.captureAggression, state.modifier, modifierSpec]);

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
    assignBlank,
    submitMove,
    pass,
    burnoutSkip,
    swap,
    reset,
    requestClue,
    grantClue,
    isFirstMoveOfGame,
    tilesRemaining,
    isHotseat: hotseat,
    activePlayer,
    // The dims actually played — duels embed these in the share link so the
    // invitee reproduces the identical board.
    dims: initialDims,
  };
}
