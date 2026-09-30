/**
 * Live classroom Wordcraft — per-student race sessions, server-side and pure.
 *
 * The mode in one paragraph: every student in the room plays their OWN
 * Wordcraft board against a personal bot (the Baron), dealt from the SAME
 * lesson word list with the homework workshop's nudged deal (the opening rack
 * holds the first lesson target; refills steer toward the next unbuilt one).
 * Scores flow into the room's normal leaderboard through the handler, so the
 * projector shows a live class race and the round ends through the standard
 * classroom results path. Boards are per-student and independent — there is
 * no shared grid to fight over, which is what makes 30 simultaneous games
 * tractable, and the bot gives each board its own opponent-pressure drama.
 *
 * Kept pure (no socket.io, no Redis) so the whole loop is testable without a
 * server: the handler only validates envelopes and broadcasts what these
 * functions return. The engine pieces (board, move validation, scoring, the
 * bot, the lesson deal) are the shipped solo engine reused unchanged.
 */

import {
  createBoard,
  placeTiles,
  type Board,
  type BoardSize,
} from '@/lib/word-craft/board';
import {
  createBag,
  RACK_SIZE,
  type SupportedLocale,
  type TileBag,
} from '@/lib/word-craft/tileBag';
import {
  wordCraftLocaleFor,
  lessonTargetsWithDrops,
  seedOpeningRack,
  drawTowardTarget,
  nextLessonTarget,
} from '@/lib/word-craft/lessonBag';
import {
  validateAndScoreMove,
  type DictionaryCheck,
} from '@/lib/word-craft/moveValidator';
import { findBestBotMove } from '@/lib/word-craft/botMove';
import { hashStringToSeed } from '@/lib/blast/v2/prng';
import logger from '../utils/logger';
import type { PlacedTile, RackTile } from '@/lib/word-craft/types';
import type {
  WordcraftLiveCell,
  WordcraftLiveSnapshot,
  WordcraftLiveTarget,
} from '@/shared/types/wordcraftLive';

/**
 * The classroom board. Smaller than the solo 15×15 so a 5-minute round holds
 * several moves per student; premiums stay ON — a triple-word lesson word is
 * the room's loudest moment.
 */
export const WORDCRAFT_LIVE_BOARD_SIZE: BoardSize = 9;

/**
 * The live rack spans the board, not the Scrabble-standard 7: a classroom
 * round lives or dies on the LESSON's words, and real vocabulary runs long
 * ("juxtapose" is 9). A target that cannot fit the rack can never be placed,
 * so the deal width is also the target ceiling in `lessonTargetsFor`.
 */
export const WORDCRAFT_LIVE_RACK_SIZE = 9;

export interface WordcraftLiveHistoryEntry {
  who: 'player' | 'bot';
  words: string[];
}

export interface WordcraftLivePlayer {
  board: Board;
  rack: RackTile[];
  bag: TileBag;
  botRack: RackTile[];
  botScore: number;
  history: WordcraftLiveHistoryEntry[];
  moves: number;
  /** Per-cell ownership for the student's own view (`row,col` → who placed it). */
  cellOwners: Map<string, 'player' | 'bot'>;
}

export interface WordcraftLiveSession {
  gameCode: string;
  locale: SupportedLocale;
  /** Lesson words as tile strings, easiest first — what the deal steers toward. */
  targets: string[];
  boardSize: BoardSize;
  players: Record<string, WordcraftLivePlayer>;
  seed: string;
  startedAt: number;
}

export interface CreateWordcraftLiveSessionOptions {
  gameCode: string;
  vocabularyWords: readonly string[];
  /** The LESSON's language — it picks the tile bag, not the UI language. */
  language: string;
  usernames: readonly string[];
  seed?: string;
  now?: number;
}

function dealPlayer(sessionSeed: string, username: string, targets: string[], locale: SupportedLocale, boardSize: BoardSize): WordcraftLivePlayer {
  // One bag per student: boards evolve independently from the first move, so a
  // shared sack would only couple students who never see each other's tiles.
  const bag = createBag({ seed: hashStringToSeed(`${sessionSeed}:${username}`), locale });
  if (targets.length) bag.tiles = seedOpeningRack(bag.tiles, targets[0], locale);
  const rack = bag.tiles.splice(0, WORDCRAFT_LIVE_RACK_SIZE);
  // The rival plays by the classic 7-tile rules: findBestBotMove enumerates
  // rack permutations, and 9 tiles blow that search past a second even before
  // scoring. The student's wider rack is the lesson boost; the Baron's is not.
  const botRack = bag.tiles.splice(0, RACK_SIZE);
  return {
    board: createBoard(boardSize),
    rack,
    bag,
    botRack,
    botScore: 0,
    history: [],
    moves: 0,
    cellOwners: new Map(),
  };
}

export function createWordcraftLiveSession(
  opts: CreateWordcraftLiveSessionOptions,
): WordcraftLiveSession {
  // The lesson's language picks the bag; a language Wordcraft has no bag for
  // (ru) deals stock English and is explicitly unseeded — lessonBag's rule.
  const { locale } = wordCraftLocaleFor(opts.language, opts.language);
  const { targets, dropped } = lessonTargetsWithDrops(opts.vocabularyWords, locale, WORDCRAFT_LIVE_RACK_SIZE);
  // Some-but-not-all dropped is the quiet failure: the round plays fine, the
  // teacher just never sees their hardest word. Name what fell out (the
  // all-dropped case warns separately on the classic-downgrade path).
  if (dropped.length > 0 && targets.length > 0) {
    logger.warn(
      'WORDCRAFT',
      `Game ${opts.gameCode}: ${dropped.length} lesson word(s) do not fit the ${WORDCRAFT_LIVE_RACK_SIZE}-tile rack and were dropped: ${dropped.join(', ')}`,
    );
  }
  const seed = opts.seed ?? opts.gameCode;
  const session: WordcraftLiveSession = {
    gameCode: opts.gameCode,
    locale,
    targets,
    boardSize: WORDCRAFT_LIVE_BOARD_SIZE,
    players: {},
    seed,
    startedAt: opts.now ?? Date.now(),
  };
  for (const username of opts.usernames) {
    session.players[username] = dealPlayer(seed, username, targets, locale, session.boardSize);
  }
  return session;
}

/**
 * The seat for a student, creating it for a late joiner. A reconnecting
 * student gets their EXISTING seat back — the board they built survives the
 * refresh (recurring pitfall class 3: reconnect must restore, not restart).
 */
export function ensureWordcraftPlayer(
  session: WordcraftLiveSession,
  username: string,
): WordcraftLivePlayer {
  const existing = session.players[username];
  if (existing) return existing;
  const seat = dealPlayer(session.seed, username, session.targets, session.locale, session.boardSize);
  session.players[username] = seat;
  return seat;
}

export interface WordcraftMoveAccept {
  ok: true;
  words: { word: string; score: number }[];
  /** Move total INCLUDING the bingo bonus — the number the leaderboard gains. */
  score: number;
  bingo: boolean;
  /** The part of `score` that belongs to no word (the +50) — recorded apart so
   *  the end-of-round word recompute lands on this same total. */
  bingoBonus: number;
  /** The Baron's answering move, or null when his rack held no word. */
  bot: { word: string; score: number } | null;
}

export interface WordcraftMoveReject {
  ok: false;
  error: string;
  invalidWord?: string;
}

/**
 * Rack-membership gate. `validateAndScoreMove` checks geometry and words but
 * not provenance: a crafted client could place letters it never drew. Every
 * placement must name a tile actually sitting in the player's rack, and a
 * non-blank tile must still carry the letter it was dealt with. (A blank may
 * be assigned any letter — that is what blanks are.)
 */
function claimRackTiles(
  rack: RackTile[],
  placements: PlacedTile[],
): RackTile[] | null {
  const pool = rack.slice();
  const claimed: RackTile[] = [];
  for (const p of placements) {
    const i = pool.findIndex((t) => t.id === p.rackTileId);
    if (i < 0) return null;
    const tile = pool.splice(i, 1)[0];
    if (!tile.isBlank && tile.letter !== p.letter) return null;
    claimed.push(tile);
  }
  return claimed;
}

/**
 * Apply one student's placement to their own board: validate + score it,
 * refill the rack toward the next lesson target, then let the Baron answer.
 * On any rejection nothing moves — board, rack, bag and bot are untouched.
 */
export function applyWordcraftMove(
  session: WordcraftLiveSession,
  username: string,
  placements: PlacedTile[],
  isWordValid: DictionaryCheck,
): WordcraftMoveAccept | WordcraftMoveReject {
  const player = session.players[username];
  if (!player) return { ok: false, error: 'NOT_SEATED' };
  if (!placements.length) return { ok: false, error: 'NO_TILES' };

  const claimed = claimRackTiles(player.rack, placements);
  if (!claimed) return { ok: false, error: 'NOT_IN_RACK' };

  // Scores are computed from the DEALT tiles' values, never the payload's —
  // the client picks letters for its blanks but does not get to reprice tiles.
  const honestPlacements: PlacedTile[] = placements.map((p, i) => ({
    ...p,
    value: claimed[i].value,
    isBlank: claimed[i].isBlank,
  }));

  // The classroom board has no center star: like the homework workshop, the
  // first word may land anywhere (it still needs two tiles and, later moves,
  // a connection).
  const result = validateAndScoreMove(player.board, honestPlacements, isWordValid, undefined, false);
  if (!result.ok || !result.words || result.score === undefined) {
    return { ok: false, error: result.reason ?? 'INVALID_WORD', invalidWord: result.invalidWord };
  }

  placeTiles(player.board, honestPlacements);
  for (const p of honestPlacements) player.cellOwners.set(`${p.row},${p.col}`, 'player');

  const words = result.words.map((w) => ({ word: w.word, score: w.score }));
  player.history.push({ who: 'player', words: words.map((w) => w.word) });
  player.moves += 1;

  // Refill toward the next unbuilt lesson target — the homework deal's rule,
  // so the round stays about the teacher's words all the way down the sack.
  const remainingRack = player.rack.filter((t) => !claimed.includes(t));
  const drawCount = Math.max(0, WORDCRAFT_LIVE_RACK_SIZE - remainingRack.length);
  const target = nextLessonTarget(session.targets, player.history);
  const { drawn, rest } = drawTowardTarget(player.bag.tiles, drawCount, remainingRack, target, session.locale);
  player.bag = { ...player.bag, tiles: rest };
  player.rack = [...remainingRack, ...drawn];

  // The Baron answers immediately on the same board — the personal rival the
  // student must out-craft while the class leaderboard climbs above them both.
  let bot: { word: string; score: number } | null = null;
  const botMove = findBestBotMove(player.board, player.botRack, isWordValid, {
    // A classroom rival must be beatable: pick from a small pool of good words
    // rather than always the single best one.
    skillVariance: 1,
  });
  if (botMove) {
    placeTiles(player.board, botMove.placements);
    for (const p of botMove.placements) player.cellOwners.set(`${p.row},${p.col}`, 'bot');
    player.botScore += botMove.score;
    player.history.push({ who: 'bot', words: [botMove.word] });
    const botRemaining = player.botRack.filter(
      (t) => !botMove.placements.some((p) => p.rackTileId === t.id),
    );
    const botDrawCount = Math.max(0, RACK_SIZE - botRemaining.length);
    const { drawn: botDrawn, rest: botRest } = drawTowardTarget(
      player.bag.tiles, botDrawCount, botRemaining, null, session.locale,
    );
    player.bag = { ...player.bag, tiles: botRest };
    player.botRack = [...botRemaining, ...botDrawn];
    bot = { word: botMove.word, score: botMove.score };
  }

  const wordSum = words.reduce((s, w) => s + w.score, 0);
  return {
    ok: true,
    words,
    score: result.score,
    bingo: result.bingo === true,
    bingoBonus: result.score - wordSum,
    bot,
  };
}

/**
 * The student's personal view of their race. Carries NO bot rack and no bag
 * contents — a student's devtools must never hold their own answer key.
 */
export function wordcraftSnapshotFor(
  session: WordcraftLiveSession,
  username: string,
  myScore = 0,
): WordcraftLiveSnapshot {
  const player = session.players[username];
  if (!player) {
    return {
      gameCode: session.gameCode,
      boardSize: session.boardSize,
      rack: [],
      cells: [],
      botScore: 0,
      myScore: 0,
      moves: 0,
      bagCount: 0,
      targets: session.targets.map((word) => ({ word, built: false })),
    };
  }

  const cells: WordcraftLiveCell[] = [];
  for (let r = 0; r < player.board.size; r++) {
    for (let c = 0; c < player.board.size; c++) {
      const cell = player.board.cells[r][c];
      if (!cell.tile) continue;
      cells.push({
        row: r,
        col: c,
        letter: cell.tile.letter,
        value: cell.tile.value,
        isBlank: cell.tile.isBlank,
        by: player.cellOwners.get(`${r},${c}`) ?? 'player',
      });
    }
  }

  const built = new Set(
    player.history.filter((h) => h.who === 'player').flatMap((h) => h.words.map((w) => w.toUpperCase())),
  );
  const targets: WordcraftLiveTarget[] = session.targets.map((word) => ({
    word,
    built: built.has(word),
  }));

  return {
    gameCode: session.gameCode,
    boardSize: session.boardSize,
    rack: player.rack,
    cells,
    botScore: player.botScore,
    myScore,
    moves: player.moves,
    bagCount: player.bag.tiles.length,
    targets,
  };
}

/** Which lesson words the CLASS has built — the projector's teaching ticker. */export function wordcraftTargetsProgress(
  session: WordcraftLiveSession,
): { target: string; builtBy: string[] }[] {
  return session.targets.map((target) => ({
    target,
    builtBy: Object.entries(session.players)
      .filter(([, p]) =>
        p.history.some((h) => h.who === 'player' && h.words.map((w) => w.toUpperCase()).includes(target)),
      )
      .map(([name]) => name),
  }));
}

// ---------------------------------------------------------------------------
// startGame branch
// ---------------------------------------------------------------------------

export interface ResolveWordcraftStartInput {
  /** The mode the host's startGame payload asked for. */
  resolvedMode: string;
  /** The Redis classroom record for this room, when it is one. */
  classroomGame: {
    vocabularyWords?: readonly string[];
    settings?: { gameMode?: string };
  } | null;
  gameCode: string;
  /** Increments every round — salts the deal so a rematch gets fresh racks. */
  gameSessionId: number | string;
  playerUsernames: readonly string[];
  language: string;
}

export type WordcraftClassroomStart =
  | { mode: 'wordcraft'; session: WordcraftLiveSession }
  | { mode: string; session?: undefined };

/**
 * The one decision the startGame handler needs for this mode.
 *
 * Wordcraft is classroom-only: the race is dealt from a LESSON, and outside a
 * classroom there is no lesson. The Redis classroom record — the teacher's
 * actual choice — is authoritative over the socket payload, so a crafted
 * startGame cannot talk a non-wordcraft room into the mode, and a wordcraft
 * payload landing in a public room falls back to the board game it can
 * honestly play.
 */
export function resolveWordcraftClassroomStart(
  input: ResolveWordcraftStartInput,
): WordcraftClassroomStart {
  if (input.resolvedMode !== 'wordcraft') return { mode: input.resolvedMode };
  const recordMode = input.classroomGame?.settings?.gameMode;
  if (!input.classroomGame) return { mode: 'classic' };
  if (recordMode !== 'wordcraft') return { mode: recordMode ?? 'classic' };
  const session = createWordcraftLiveSession({
    gameCode: input.gameCode,
    vocabularyWords: input.classroomGame.vocabularyWords ?? [],
    language: input.language,
    usernames: input.playerUsernames,
    seed: `${input.gameCode}:${input.gameSessionId}`,
  });
  // A lesson whose every word outgrows the rack has no playable target; an
  // empty race would sit at 0 until the clock dies (pitfall class 4), so the
  // room falls back to the board game that CAN drill those words.
  if (session.targets.length === 0) {
    logger.warn(
      'WORDCRAFT',
      `Game ${input.gameCode}: no lesson word fits the ${WORDCRAFT_LIVE_RACK_SIZE}-tile rack — downgrading to classic`,
    );
    return { mode: 'classic' };
  }
  return { mode: 'wordcraft', session };
}
