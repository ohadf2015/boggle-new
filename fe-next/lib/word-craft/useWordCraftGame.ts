'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { createBoard, getCell, isFirstMove, type Board, type BoardSize } from './board';
import { createBag, draw, remaining, swap as swapBag, type SupportedLocale, type TileBag } from './tileBag';
import { validateAndScoreMove, type DictionaryCheck } from './moveValidator';
import { findBestBotMove } from './botMove';
import { botTuning, shouldBotSkipTurn, DEFAULT_BOT_DIFFICULTY, type BotDifficulty } from './botDifficulty';
import { rollModifier, toScoreModifier, modifierCaptureSpread, modifierRackSize, isGoldenTile, WORDCRAFT_MODIFIERS, type WordCraftModifier } from './modifiers';
import { normalizeHebrewWord, normalizeSpanishWord } from '@/shared/utils/wordNormalization';
import { getBoardDims, type BoardDims } from './boardDimensions';
import { applyClaims, endgameTerritoryBonus, resolveCaptures, type Coord, type Owner } from './territory';
import { assignBlankLetter, hasUnassignedBlank } from './blankAssign';
import { centerOpeningMove, clueAnchors } from './placement';
import { foundLessonWords, lessonDraw, nextLessonTarget } from './lesson';
import type { Language } from '@/shared/types/game';
import { MAX_SURPRISES, openSurprise, spawnSurprise, surprisesCovered, surpriseValue, type SurpriseBox, type SurpriseKind } from './surprises';
import type { PlacedTile, PlayerState, RackTile } from './types';
import {
  trackWordCraftSubmitBlockedDictLoading,
  trackWordCraftSubmitBlockedBlankUnassigned,
} from '@/components/word-craft/wordCraftTelemetry';

export type Turn = 'player' | 'bot' | 'over';

export interface MoveHistoryEntry {
  who: 'player' | 'bot';
  words: string[];
  score: number;
  placedTileIds: string[];
  /**
   * What the turn was. Absent on committed plays (legacy shape). `skip` is a
   * pass that does NOT count toward the two-pass game end (the bot's
   * voluntary easy-mode skip, or a solver failure) — the UI announces it.
   */
  kind?: 'pass' | 'skip' | 'swap';
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
  /**
   * Rack capacity for this game — 7 normally, 5 under quick_draw. Drives the
   * opening deal, post-commit refills, and the swap guard symmetrically.
   */
  rackSize: number;
  /**
   * The game's seed. Stored so pure per-tile rules (golden_tiles) can be
   * recomputed anywhere — rack UI, board UI, commit, bot ranking — from
   * (seed, tileId) with zero extra plumbing.
   */
  seed: number;
  /**
   * The game's very first tile-select auto-places that tile on the center cell
   * (recallable) to remove the blank-board "where do I start?" decision. This
   * flag flips after that one nudge so a recall hands full control back.
   */
  autoCenterDone: boolean;
  /** Unopened surprise boxes on the board (see ./surprises). */
  surprises: SurpriseBox[];
  /** The most recent box opened — drives the reveal toast. */
  lastSurprise: LastSurprise | null;
  /**
   * Classroom mode: the teacher's words (canonical) and which the player has
   * built. Steers the player's draws toward the next unfound word. Null in a
   * normal game.
   */
  lesson: LessonState | null;
}

export interface LessonState {
  targets: string[];
  language: Language;
  found: string[];
}

export interface LessonInit {
  targets: string[];
  language: Language;
}

export interface LastSurprise {
  by: Owner;
  kind: SurpriseKind;
  /** Squares painted or stolen (0 for a clue). */
  count: number;
  row: number;
  col: number;
  turnIndex: number;
}

export interface WordCraftClue {
  word: string;
  /** Start cell of the first tile to place. */
  row: number;
  col: number;
  /** Every cell of the suggested word, in reading order. */
  cells: { row: number; col: number; letter: string }[];
  /** Existing board letters the word builds through. */
  anchors: { row: number; col: number; letter: string }[];
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
  | { type: 'PASS'; voluntary?: boolean }
  | { type: 'SWAP'; tilesToReturn: RackTile[]; replacements: RackTile[] }
  | { type: 'END_GAME' }
  | { type: 'USE_CLUE' }
  | { type: 'GRANT_CLUE' }
  | { type: 'BURNOUT_SKIP' }
  | { type: 'RESET'; seed: number; boardSize: 13 | 15; locale: SupportedLocale; territoryEnabled?: boolean; hotseat?: boolean; viewportDims?: { size: BoardSize; bagSize: number }; modifierOverride?: WordCraftModifier };

const BOT_NAME = 'WordBot';

function buildInitial(init: number | { seed: number; boardSize?: 13 | 15; locale?: SupportedLocale; viewportDims?: { size: BoardSize; bagSize: number }; territoryEnabled?: boolean; hotseat?: boolean; modifierOverride?: WordCraftModifier; lesson?: LessonInit | null }): WordCraftState {
  const seed = typeof init === 'number' ? init : init.seed;
  const boardSize = typeof init === 'number' ? 15 : (init.boardSize ?? 15);
  const locale = typeof init === 'number' ? 'en' : (init.locale ?? 'en');
  const viewportDims = typeof init === 'number' ? undefined : init.viewportDims;
  const territoryEnabled = typeof init === 'number' ? true : (init.territoryEnabled ?? true);
  const hotseat = typeof init === 'number' ? false : (init.hotseat ?? false);
  const modifierOverride = typeof init === 'number' ? undefined : init.modifierOverride;
  const lessonInit = typeof init === 'number' ? null : init.lesson ?? null;

  const finalBoardSize = viewportDims?.size ?? boardSize;
  const bag = createBag({ seed, locale, bagSize: viewportDims?.bagSize });
  // Modifier resolves BEFORE dealing — quick_draw shrinks both opening racks.
  const modifier =
    modifierOverride && WORDCRAFT_MODIFIERS.includes(modifierOverride)
      ? modifierOverride
      : rollModifier(seed);
  const rackSize = modifierRackSize(modifier);
  // Lesson mode: the opening rack carries the first lesson word's letters.
  const opening = lessonDraw(bag.tiles, rackSize, [], lessonInit?.targets[0] ?? null);
  bag.tiles = opening.rest;
  const playerRack = opening.drawn;
  const botRack = draw(bag, rackSize);
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
    // A player-picked modifier (setup screen) wins; otherwise the seeded
    // surprise roll — resolved above, before racks were dealt.
    modifier,
    rackSize,
    seed,
    autoCenterDone: false,
    surprises: [],
    lastSurprise: null,
    lesson: lessonInit ? { targets: lessonInit.targets, language: lessonInit.language, found: [] } : null,
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
  // Draw replenishments WITHOUT mutating the incoming bag. The old in-place
  // `draw()` splice kept `state.bag` referentially identical across commits,
  // which (a) froze the HUD's memoized sack count — the "sack stays 40" bug —
  // and (b) double-drained the sack under React StrictMode's double-invoke.
  // Cloning the tile list and carrying a FRESH bag object fixes both.
  const drawCount = Math.max(0, state.rackSize - remainingRack.length);
  // Lesson mode: a lesson word just played is found; the player's refill then
  // pulls the next unfound word's letters.
  let lesson = state.lesson;
  if (lesson && who === 'player') {
    const hits = foundLessonWords(words, lesson.targets, lesson.language).filter((w) => !lesson!.found.includes(w));
    if (hits.length > 0) lesson = { ...lesson, found: [...lesson.found, ...hits] };
  }
  const target = lesson && who === 'player' ? nextLessonTarget(lesson.targets, lesson.found) : null;
  const { drawn: replenish, rest: nextBagTiles } = lessonDraw(state.bag.tiles, drawCount, remainingRack, target);
  const nextBag: TileBag = { ...state.bag, tiles: nextBagTiles };
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
    // golden_tiles: each golden tile placed this turn ring-captures around
    // its own cell — symmetric for whichever seat commits.
    const goldenCenters =
      state.modifier === 'golden_tiles'
        ? placements
            .filter((p) => isGoldenTile(state.seed, p.rackTileId))
            .map((p) => ({ row: p.row, col: p.col }))
        : undefined;
    const capture = resolveCaptures(state.board, placements, lists, who, {
      spreadToNeighbors: modifierCaptureSpread(state.modifier),
      ringCenters: goldenCenters,
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

  // Surprise boxes: covering one opens it for whoever committed; a fresh box
  // drops after each bot/second-seat move so the player always sees it first.
  let surprises = state.surprises;
  let lastSurprise = state.lastSurprise;
  let bonusClues = 0;
  if (state.territoryEnabled) {
    for (const box of surprisesCovered(surprises, placements)) {
      const opened = openSurprise(nextBoard, box, who);
      nextBoard = opened.board;
      if (opened.clue) bonusClues += 1;
      lastSurprise = { by: who, kind: opened.kind, count: opened.cells.length, row: box.row, col: box.col, turnIndex: state.history.length };
    }
    surprises = surprises.filter((b) => !placements.some((p) => p.row === b.row && p.col === b.col));
    if (who === 'bot' && surprises.length < MAX_SURPRISES) {
      const box = spawnSurprise(nextBoard, surprises, state.seed, state.history.length + 1);
      if (box) surprises = [...surprises, box];
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
    bag: nextBag,
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
    surprises,
    lastSurprise,
    cluesRemaining: state.cluesRemaining + bonusClues,
    lesson,
  };
  // The sack is the game clock: the game finishes the moment it empties (or
  // the active player exhausts their rack). Check the post-refill bag.
  if (newRack.length === 0 || remaining(nextBag) === 0) {
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
    case 'SELECT_RACK_TILE': {
      // Opening nudge: the game's very first tile-select drops the tile onto
      // the center cell as a normal (recallable) pending placement, killing
      // the "where do I even start?" blank-board decision. Strictly once per
      // game — a recall hands full control back (no auto-replace tug-of-war).
      if (action.id && !state.autoCenterDone && state.pendingPlacements.length === 0 && isFirstMove(state.board)) {
        const activeRack = state.turn === 'bot' ? state.bot.rack : state.player.rack;
        const tile = activeRack.find((t) => t.id === action.id);
        const center = Math.floor(state.board.size / 2);
        if (tile && !state.board.cells[center][center].tile) {
          const placement: PlacedTile = {
            row: center,
            col: center,
            letter: tile.letter,
            value: tile.value,
            isBlank: tile.isBlank,
            rackTileId: tile.id,
          };
          return {
            ...state,
            pendingPlacements: [placement],
            selectedRackTileId: null,
            lastError: null,
            autoCenterDone: true,
          };
        }
      }
      return { ...state, selectedRackTileId: action.id, lastError: null };
    }
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
      // A voluntary skip hands the turn over without advancing the two-pass
      // game end — otherwise "player passes, easy bot skips" ended the game.
      const passes = action.voluntary ? state.consecutivePasses : state.consecutivePasses + 1;
      const turn: Turn = passes >= 2 ? 'over' : state.turn === 'player' ? 'bot' : 'player';
      const passingSide = state.turn === 'player' ? 'player' : 'bot';
      return {
        ...state,
        pendingPlacements: [],
        selectedRackTileId: null,
        consecutivePasses: passes,
        turn,
        history: [...state.history, { who: passingSide, words: [], score: 0, placedTileIds: [], kind: action.voluntary ? 'skip' : 'pass' }],
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
        history: [...state.history, { who: state.turn === 'bot' ? 'bot' : 'player', words: [], score: 0, placedTileIds: [], kind: 'swap' }],
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
      return buildInitial({ seed: action.seed, boardSize: action.boardSize, locale: action.locale, territoryEnabled: action.territoryEnabled ?? state.territoryEnabled, hotseat: action.hotseat ?? state.hotseat, viewportDims: action.viewportDims, modifierOverride: action.modifierOverride, lesson: state.lesson });
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
  /**
   * Player-picked per-game modifier (setup screen "twist"). When omitted the
   * modifier is the seeded surprise roll. Duels must NEVER pass this — both
   * duel boards must derive the identical modifier from the shared seed.
   */
  modifierOverride?: WordCraftModifier;
  /** Classroom mode — see {@link LessonState}. Must be referentially stable. */
  lesson?: LessonInit | null;
}

export { reducer as wordCraftReducer, buildInitial as buildInitialState }

export function useWordCraftGame({ seed = 1, dict, locale = 'en', boardSize = 15, territoryEnabled = true, difficulty = DEFAULT_BOT_DIFFICULTY, botSkillVariance, hotseat = false, forcedDims, modifierOverride, lesson = null }: UseWordCraftGameOptions) {
  const tuning = botTuning(difficulty);
  const effectiveVariance = botSkillVariance ?? tuning.skillVariance;
  // Capture dims at initialization and lock them for the game lifetime. A duel
  // forces the challenger's dims so both players share one board; otherwise we
  // read the device viewport.
  const initialDimsRef = useRef(
    forcedDims ?? getBoardDims(typeof window === 'undefined' ? 1024 : window.innerWidth)
  );
  const initialDims = initialDimsRef.current;

  const initArg = useMemo(() => ({ seed, boardSize, locale, viewportDims: initialDims, territoryEnabled, hotseat, modifierOverride, lesson }), [seed, boardSize, locale, initialDims, territoryEnabled, hotseat, modifierOverride, lesson]);
  const [state, dispatch] = useReducer(reducer, initArg, buildInitial);

  // Active per-game scoring modifier, applied symmetrically to player commits,
  // bot commits, and the bot's internal candidate ranking.
  const modifierSpec = useMemo(() => toScoreModifier(state.modifier), [state.modifier]);

  // Locale-aware dict lookup. Hebrew dict is loaded with sofit→regular
  // normalization (see lib/word-craft/dictionary.ts) but player tiles still carry
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
        modifierOverride,
      });
    },
    [seed, boardSize, locale, territoryEnabled, hotseat, modifierOverride],
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
      trackWordCraftSubmitBlockedDictLoading({ pendingTiles: state.pendingPlacements.length });
      dispatch({ type: 'SET_ERROR', message: 'DICT_LOADING' });
      return;
    }
    // A joker (blank) must carry a chosen letter before it can play, otherwise
    // the validator would build the word with a literal '_' and always reject.
    if (hasUnassignedBlank(state.pendingPlacements)) {
      trackWordCraftSubmitBlockedBlankUnassigned({ pendingTiles: state.pendingPlacements.length });
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
  // length 5 so it's a nudge, not a free bingo), ranked with the same board
  // context the bot uses (territory steals) so the tip fits the live board.
  // Returns every cell of the word plus the existing letters it hooks onto so
  // the board can mark the path. Spends a clue only when a word exists. Hint,
  // not autoplay — the player still places the tiles.
  const requestClue = useCallback((): WordCraftClue | null => {
    if (state.cluesRemaining <= 0) return null;
    if (!dict) return null;
    const move = findBestBotMove(state.board, state.player.rack, isWordValid, {
      maxLength: 5,
      scoreModifier: modifierSpec,
      extraScore: state.territoryEnabled
        ? (placements, wordCells) =>
            resolveCaptures(state.board, placements, wordCells, 'player', {
              spreadToNeighbors: modifierCaptureSpread(state.modifier),
            }).bonus + surpriseValue(state.surprises, placements)
        : undefined,
    });
    if (!move) return null;
    dispatch({ type: 'USE_CLUE' });
    const placements = centerOpeningMove(state.board, move.placements);
    const start = placements[0];
    const result = validateAndScoreMove(state.board, placements, isWordValid, modifierSpec, false);
    const main = result.words?.find((w) => w.word === move.word) ?? result.words?.[0];
    const letterAt = new Map(placements.map((p) => [`${p.row},${p.col}`, p.letter]));
    const cells = main
      ? main.cells.map((c) => ({
          row: c.row,
          col: c.col,
          letter: letterAt.get(`${c.row},${c.col}`) ?? state.board.cells[c.row]?.[c.col]?.tile?.letter ?? '',
        }))
      : placements.map((p) => ({ row: p.row, col: p.col, letter: p.letter }));
    return {
      word: move.word,
      row: start?.row ?? -1,
      col: start?.col ?? -1,
      cells,
      anchors: main ? clueAnchors(state.board, placements, main.cells) : [],
    };
  }, [state.cluesRemaining, state.board, state.player.rack, state.territoryEnabled, state.modifier, state.surprises, dict, isWordValid, modifierSpec]);

  // Rewarded-ad outcome (or web free-grant fallback): top up one clue.
  const grantClue = useCallback(() => dispatch({ type: 'GRANT_CLUE' }), []);

  const burnoutSkip = useCallback(() => dispatch({ type: 'BURNOUT_SKIP' }), []);

  const swap = useCallback(
    (tilesToReturn: RackTile[]) => {
      if (state.turn !== 'player' && state.turn !== 'bot') return;
      const replacements = swapBag(state.bag, tilesToReturn, state.rackSize);
      if (!replacements) {
        dispatch({ type: 'SET_ERROR', message: 'BAG_TOO_SMALL_TO_SWAP' });
        return;
      }
      dispatch({ type: 'SWAP', tilesToReturn, replacements });
    },
    [state.turn, state.bag, state.rackSize],
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
      // Difficulty-driven voluntary skip: on easier settings the bot regularly
      // passes, gifting the player a free turn to seize ground. This is the
      // difficulty lever a player actually feels in a territory game (claims
      // scale with tiles placed, so word-length nerfs barely register).
      if (shouldBotSkipTurn(tuning)) {
        dispatch({ type: 'PASS', voluntary: true });
        botTurnRunning.current = false;
        return;
      }
      try {
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
                  // Keep the bot's valuation symmetric with commit-time rules:
                  // golden placements ring-capture, so it should chase them too.
                  ringCenters:
                    state.modifier === 'golden_tiles'
                      ? placements
                          .filter((p) => isGoldenTile(state.seed, p.rackTileId))
                          .map((p) => ({ row: p.row, col: p.col }))
                      : undefined,
                }).bonus * tuning.captureAggression +
                // Boxes too, scaled the same way: easy leaves them for you.
                surpriseValue(state.surprises, placements) * tuning.captureAggression
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
          const placements = centerOpeningMove(state.board, move.placements);
          const result = validateAndScoreMove(state.board, placements, isWordValid, modifierSpec, false);
          if (result.ok) {
            dispatch({
              type: 'COMMIT_BOT',
              placements,
              score: result.score ?? 0,
              words: result.words?.map((w) => w.word) ?? [],
              wordCells: result.words?.map((w) => w.cells) ?? [],
            });
          } else {
            dispatch({ type: 'PASS', voluntary: true });
          }
        } else {
          // Stuck rack: exchange it like a real player would instead of a
          // silent pass that also advanced the two-pass game end.
          const replacements = swapBag(state.bag, state.bot.rack, state.rackSize);
          if (replacements) dispatch({ type: 'SWAP', tilesToReturn: state.bot.rack, replacements });
          else dispatch({ type: 'PASS' });
        }
      } catch (err) {
        // A solver throw used to leave botTurnRunning stuck true with turn
        // parked on 'bot' forever. Skip the turn instead.
        console.error('[wordcraft] bot move failed', err);
        dispatch({ type: 'PASS', voluntary: true });
      } finally {
        botTurnRunning.current = false;
      }
    }, 500);
    return () => {
      clearTimeout(handle);
      botTurnRunning.current = false;
    };
    // `tuning` is a stable module-level object keyed by difficulty (see
    // botDifficulty's TUNING record), so listing it whole is both correct and
    // satisfies exhaustive-deps for the shouldBotSkipTurn(tuning) call.
  }, [hotseat, state.turn, dict, state.board, state.bot.rack, state.territoryEnabled, isWordValid, tuning, effectiveVariance, state.modifier, state.seed, modifierSpec, state.bag, state.rackSize, state.surprises]);

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
