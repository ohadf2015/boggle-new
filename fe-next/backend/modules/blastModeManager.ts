/**
 * Blast Mode Manager
 * Handles blast mode overlay generation, tile bonuses, and move tracking
 * for multiplayer blast games.
 */

import type { BlastTileOverlay, BlastModeState, BlastPlayerStats, BlastPlayerBoard } from '@/shared/types/game';

import type { BlastTileType, BlastTileState } from '@/shared/types/blast';

import {
  BLAST_BONUS_MOVE_COMBO_THRESHOLD,
  BLAST_TILE_BONUSES,
} from '@/shared/constants/blastMultiplayerConstants';

import { getWaveConfig, getWaveDistribution } from '@/components/blast/legacy/utils/blastWaveConfig';
import { rollSpecialType, createSeededRandom } from '@/components/blast/legacy/utils/blastLetterGenerator';
import { overlayToTileStates } from '@/components/blast/legacy/utils/blastOverlayToTileStates';
import { processTilesForWord } from '@/components/blast/legacy/utils/clearTilesProcessor';
import { computeGravityResult } from '@/components/blast/legacy/utils/blastGravity';
import { normalizeWordForLanguage, normalizeLetterForLanguage } from './wordValidator.js';
import { buildOverlayMap } from './gameState/reviveBlastState';
import { blastCollectionScore } from '@/shared/utils/blastCollectionScore';
import type { Language } from '@/shared/types';

// H2: per-game mutex set guarding the check→advance→broadcast sequence so a
// second concurrent caller cannot double-advance on the same cleared snapshot.
const waveAdvancing = new Set<string>();

/**
 * Attempt to claim the wave-advance lock for `gameCode`. Returns true on success
 * (caller must later call `endWaveAdvance`), false if another caller already holds it.
 */
export function tryBeginWaveAdvance(gameCode: string): boolean {
  if (waveAdvancing.has(gameCode)) return false;
  waveAdvancing.add(gameCode);
  return true;
}

/** Release the wave-advance lock. Safe to call when no lock is held. */
export function endWaveAdvance(gameCode: string): void {
  waveAdvancing.delete(gameCode);
}

/**
 * Derive a deterministic unsigned 32-bit seed from an arbitrary string (e.g. gameCode).
 * Uses a simple djb2-style hash so the same code always produces the same seed.
 */
export function hashStringToSeed(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash || 1; // avoid 0
}

/**
 * Generate the blast tile overlay for a grid with the same wave spawn rate and
 * bomb/coin split as singleplayer.
 *
 * @param seed - Optional seed for deterministic overlay generation (multiplayer). When
 *               omitted, Math.random is used.
 * @returns Array of special tile overlays (standard tiles omitted)
 */
export function generateBlastOverlay(grid: string[][], wave = 1, seed?: number): BlastTileOverlay[] {
  const overlay: BlastTileOverlay[] = [];
  const waveConfig = getWaveConfig(wave);
  const distribution = getWaveDistribution(waveConfig);
  const rng = seed !== undefined ? createSeededRandom(seed) : Math.random;

  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const type = rollSpecialType(waveConfig.specialTileChance, distribution, 0, rng);
      if (type !== 'standard') overlay.push({ row, col, type });
    }
  }
  return overlay;
}

/** Sum the per-tile bonus multipliers from BLAST_TILE_BONUSES along a word path. */
export function calculateBlastTileBonus(tilesOnPath: BlastTileType[]): number {
  return tilesOnPath.reduce((total, type) => total + BLAST_TILE_BONUSES[type], 0);
}

/**
 * Build BlastTileState[][] from overlay + grid size. Delegates to the shared
 * helper used by useBlastMultiplayerBridge so client + server agree byte-for-byte.
 */
function buildTileStatesFromOverlay(overlay: BlastTileOverlay[], gridSize: number): BlastTileState[][] {
  return overlayToTileStates(overlay, gridSize);
}

/**
 * Initialize blast mode state for a new game.
 * Generates overlay, initializes move tracking for all players.
 *
 * @param grid - The letter grid
 * @param players - Player usernames
 * @param wave - Current wave number (defaults to 1); passed to generateBlastOverlay for tile gating
 * @param overlaySeed - Optional seed for deterministic overlay generation. Derive from gameCode via
 *                      hashStringToSeed() so all players in a session share an identical overlay.
 */
export function initBlastModeState(
  grid: string[][],
  players: string[],
  wave = 1,
  overlaySeed?: number
): BlastModeState {
  const overlay = generateBlastOverlay(grid, wave, overlaySeed);

  const playerMoves: Record<string, number> = {};
  const playerBonusMoves: Record<string, number> = {};
  const playerStats: Record<string, BlastPlayerStats> = {};

  for (const player of players) {
    playerMoves[player] = 0;
    playerBonusMoves[player] = 0;
    playerStats[player] = emptyPlayerStats();
  }

  // Refill seed for gravity RNG.
  // MP: derive deterministically from overlaySeed so reconnecting clients (and
  //     all peers) can reproduce refill sequence. XOR with golden-ratio constant
  //     (0x9E3779B9) to decorrelate from the overlay seed itself.
  // Solo: keep non-deterministic (no multi-peer sync requirement).
  // Use >>> 0 for unsigned 32-bit; || 1 avoids zero.
  const seed = overlaySeed !== undefined
    ? ((overlaySeed ^ 0x9E3779B9) >>> 0) || 1
    : ((Date.now() ^ Math.floor(Math.random() * 0xFFFFFFFF)) >>> 0) || 1;

  const overlayMap = buildOverlayMap(overlay);

  // Build server-authoritative tileStates from overlay
  const tileStates = buildTileStatesFromOverlay(overlay, grid.length);

  return { overlay, overlayMap, playerMoves, playerBonusMoves, playerStats, seed, grid, tileStates, totalMoves: 0, wave, playerBoards: {} };
}

/**
 * Get (or lazily create) a player's INDEPENDENT blast board. The first call for
 * a username clones the shared template (grid/tileStates/overlay/seed) so every
 * player STARTS with the identical board but evolves it independently — one
 * player's clears never touch another's. Subsequent calls return the same
 * evolving board reference. Handles late-joiners (cloned from the same template).
 */
export function getOrInitPlayerBoard(state: BlastModeState, username: string): BlastPlayerBoard {
  if (!state.playerBoards) state.playerBoards = {};
  const existing = state.playerBoards[username];
  if (existing) return existing;
  const board: BlastPlayerBoard = {
    // Deep-clone the template so mutations stay isolated per player.
    grid: (state.grid ?? []).map((row) => [...row]),
    tileStates: (state.tileStates ?? []).map((row) => row.map((t) => ({ ...t }))),
    overlay: (state.overlay ?? []).map((o) => ({ ...o })),
    overlayMap: buildOverlayMap(state.overlay),
    seed: state.seed ?? 0,
    totalMoves: 0,
    refillCount: 0,
  };
  state.playerBoards[username] = board;
  return board;
}

/**
 * Apply a played word's tile-clears + gravity to ONE player's board, in place.
 * Extracted from wordValidationHandler so it operates on a per-player board (not
 * the shared state) and is unit-testable with the real cascade. refill=false:
 * the board SHRINKS until cleared (regeneration handled separately on exhaust).
 */
export function cascadeBlastWord(
  board: BlastPlayerBoard,
  wordPath: Array<{ row: number; col: number }>,
  word: string,
  wave: number,
  language: Language,
): { clearedCount: number; totalMoves: number; coinsCollected: number; diamondsCollected: number; bombsPopped: number } {
  const gridSize = board.grid.length;
  const totalMoves = (board.totalMoves ?? 0) + 1;
  board.totalMoves = totalMoves;
  const rng = createSeededRandom((board.seed ?? 0) + totalMoves);
  const processResult = processTilesForWord({
    prev: board.tileStates,
    path: wordPath,
    word,
    baseScore: word.length - 1,
    gridSize,
    currentWave: wave,
    rng,
  });
  const gravityResult = computeGravityResult(
    board.grid,
    processResult.next,
    gridSize,
    language,
    getWaveConfig(wave).specialTileChance,
    undefined,
    0,
    rng,
    false,
  );
  board.grid = gravityResult.newGrid;
  board.tileStates = gravityResult.newTileStates;
  return {
    clearedCount: processResult.newlyClearedCount,
    totalMoves,
    coinsCollected: processResult.clearedTypeCounts.gold ?? 0,
    diamondsCollected: processResult.diamondsCollected,
    bombsPopped: processResult.clearedTypeCounts.bomb ?? 0,
  };
}

/**
 * Deep-clone a player's blast board so a cascade can run on a throwaway copy and
 * be committed only if it succeeds. Mirrors the clone shape in getOrInitPlayerBoard.
 */
export function cloneBlastBoard(board: BlastPlayerBoard): BlastPlayerBoard {
  return {
    grid: board.grid.map((row) => [...row]),
    tileStates: board.tileStates.map((row) => row.map((t) => ({ ...t }))),
    overlay: board.overlay.map((o) => ({ ...o })),
    overlayMap: buildOverlayMap(board.overlay),
    seed: board.seed,
    totalMoves: board.totalMoves,
    refillCount: board.refillCount,
  };
}

/**
 * Cascade a played word with crash isolation. cascadeBlastWord mutates the board
 * IN PLACE, so a mid-cascade throw would otherwise leave the authoritative board
 * half-written. We cascade on a CLONE and commit only on success:
 *   - ok:true  → `board` is the new committed board (caller stores + emits it).
 *   - ok:false → `board` is the ORIGINAL authoritative board, byte-for-byte intact,
 *                so the caller can still resync the client to server truth.
 * The cascade fn is injectable purely so the failure path is deterministically
 * testable; production always uses the real cascadeBlastWord.
 */
export function safeCascadeBlastWord(
  liveBoard: BlastPlayerBoard,
  wordPath: Array<{ row: number; col: number }>,
  word: string,
  wave: number,
  language: Language,
  cascadeFn: typeof cascadeBlastWord = cascadeBlastWord,
): { board: BlastPlayerBoard; clearedCount: number; totalMoves: number; coinsCollected: number; diamondsCollected: number; bombsPopped: number; ok: boolean } {
  const work = cloneBlastBoard(liveBoard);
  try {
    const { clearedCount, totalMoves, coinsCollected, diamondsCollected, bombsPopped } = cascadeFn(work, wordPath, word, wave, language);
    return { board: work, clearedCount, totalMoves, coinsCollected, diamondsCollected, bombsPopped, ok: true };
  } catch {
    // Discard the half-mutated clone; hand back the untouched authoritative board.
    return { board: liveBoard, clearedCount: 0, totalMoves: liveBoard.totalMoves ?? 0, coinsCollected: 0, diamondsCollected: 0, bombsPopped: 0, ok: false };
  }
}

/**
 * Record a blast move for a player.
 * Increments moves and grants bonus move if combo is high enough.
 */
export function recordBlastMove(
  state: BlastModeState,
  username: string,
  comboLevel: number,
  word?: string,
  tilesCleared?: number,
  tileBonus?: number,
): { movesUsed: number; bonusMove: boolean } {
  // Initialize if unknown player
  if (state.playerMoves[username] === undefined) {
    state.playerMoves[username] = 0;
  }
  if (state.playerBonusMoves[username] === undefined) {
    state.playerBonusMoves[username] = 0;
  }

  state.playerMoves[username] += 1;

  const bonusMove = comboLevel >= BLAST_BONUS_MOVE_COMBO_THRESHOLD;
  if (bonusMove) {
    state.playerBonusMoves[username] += 1;
  }

  // Update rich per-player stats (initialize lazily for late-joining players)
  if (!state.playerStats[username]) {
    state.playerStats[username] = emptyPlayerStats();
  }
  const stats = state.playerStats[username];
  if (comboLevel > stats.maxCombo) stats.maxCombo = comboLevel;
  if (word) {
    stats.wordsFound.push(word);
    if (word.length > stats.bestWord.length) stats.bestWord = word;
  }
  if (tilesCleared) stats.tilesCleared += tilesCleared;
  if (tileBonus) stats.totalTileBonus = (stats.totalTileBonus || 0) + tileBonus;

  return {
    movesUsed: state.playerMoves[username],
    bonusMove,
  };
}

/**
 * Resolve an ordered list of grid positions for each letter in a word,
 * preferring unused positions to handle duplicate letters correctly.
 * Falls back to the first position when all positions for a letter are exhausted.
 */
function resolveWordPositions(
  word: string,
  letterPositions: Map<string, [number, number][]>,
): Array<[number, number]> {
  const usedPositions = new Set<string>();
  const result: Array<[number, number]> = [];

  for (const letter of word.toLowerCase()) {
    const positions = letterPositions.get(letter);
    if (!positions || positions.length === 0) continue;

    let chosen = positions[0];
    for (const pos of positions) {
      const key = `${pos[0]},${pos[1]}`;
      if (!usedPositions.has(key)) {
        usedPositions.add(key);
        chosen = pos;
        break;
      }
    }
    result.push(chosen);
  }

  return result;
}

/**
 * Tile types along a path, read from the player's LIVE board — the starting
 * overlay goes stale once gravity moves tiles or a rare word spawns a diamond.
 */
export function getTilesOnBoardPath(
  tileStates: BlastTileState[][],
  path: ReadonlyArray<{ row: number; col: number }>,
): BlastTileType[] {
  return path.map(({ row, col }) => tileStates[row]?.[col]?.type ?? 'standard');
}

/**
 * Check whether the blast board is fully cleared (MP win condition).
 * Returns true when every tile in tileStates has isCleared === true.
 * Empty grid is vacuously cleared.
 */
export function isBlastBoardCleared(tileStates: BlastTileState[][]): boolean {
  for (const row of tileStates) {
    for (const tile of row) {
      if (!tile.isCleared) return false;
    }
  }
  return true;
}

/**
 * Regenerate the blast board in place (pure; caller applies via Object.assign).
 * Used when a board is fully cleared mid-timer: fresh overlay + tileStates, no
 * wave concept. Preserves cumulative playerStats. Seed is derived deterministically
 * from gameCode + refillCount so all peers reproduce the same board.
 */
export function regenerateBlastBoard(
  state: BlastModeState,
  gameCode: string,
  grid: string[][],
): BlastModeState {
  const refillCount = (state.refillCount ?? 0) + 1;
  const overlaySeed = hashStringToSeed(`${gameCode}:refill${refillCount}`);
  const players = Object.keys(state.playerStats);
  const fresh = initBlastModeState(grid, players, 1, overlaySeed);
  fresh.playerStats = state.playerStats; // preserve cumulative stats
  fresh.refillCount = refillCount;
  return fresh;
}

/**
 * Regenerate ONE player's board in place with a fresh full grid (per-player
 * refill on exhaust). Same start-recipe as init, seeded per player+refill so it
 * stays deterministic. Mutates `board`; preserves cumulative totalMoves.
 */
export function regeneratePlayerBoard(
  board: BlastPlayerBoard,
  gameCode: string,
  username: string,
  freshGrid: string[][],
): void {
  const refillCount = (board.refillCount ?? 0) + 1;
  const overlaySeed = hashStringToSeed(`${gameCode}:${username}:refill${refillCount}`);
  const fresh = initBlastModeState(freshGrid, [username], 1, overlaySeed);
  board.grid = fresh.grid as string[][];
  board.overlay = fresh.overlay;
  board.overlayMap = fresh.overlayMap;
  board.tileStates = fresh.tileStates as BlastPlayerBoard['tileStates'];
  board.seed = fresh.seed as number;
  board.refillCount = refillCount;
}

/**
 * Add what a player's word collected (known only after the cascade runs) and
 * return the collection points it earned — the server credits these to the score.
 */
export function recordBlastCollection(
  state: BlastModeState,
  username: string,
  collected: { coins: number; diamonds: number; bombs: number },
): number {
  if (!state.playerStats[username]) state.playerStats[username] = emptyPlayerStats();
  const stats = state.playerStats[username];
  stats.coinsCollected = (stats.coinsCollected ?? 0) + collected.coins;
  stats.diamondsCollected = (stats.diamondsCollected ?? 0) + collected.diamonds;
  stats.gemsCollected += collected.diamonds;
  stats.bombsPopped = (stats.bombsPopped ?? 0) + collected.bombs;
  return blastCollectionScore(collected).total;
}

/**
 * Record that `username` fully cleared the board (timer-era bonus event).
 */
export function recordBlastBoardClear(state: BlastModeState, username: string): void {
  if (!state.playerStats[username]) {
    state.playerStats[username] = emptyPlayerStats();
  }
  state.playerStats[username].boardClears = (state.playerStats[username].boardClears ?? 0) + 1;
}

/**
 * Get word path positions for server-side tile processing.
 */
export function getWordPath(
  word: string,
  letterPositions: Map<string, [number, number][]>,
): Array<{ row: number; col: number }> {
  return resolveWordPositions(word, letterPositions).map(([r, c]) => ({ row: r, col: c }));
}

/**
 * Validate a client-supplied dragged path for a blast word against the board.
 *
 * Why this exists: the blast MP client knows WHICH cells the player dragged
 * through, but historically submitted only the word string — the server then
 * reconstructed an ARBITRARY matching path via DFS (getWordPath). Whenever a
 * word has more than one valid path (common with repeated letters), the
 * server's path could skip the special tiles the player actually used: the
 * client optimistically cracked ice / detonated the bomb, the authoritative
 * cascade did not, and the follow-up blastBoardUpdate visibly "resurrected"
 * the special tiles — the reported "ice and bomb don't break or explode" bug.
 *
 * A path is valid iff: one cell per normalized word letter, in bounds, no
 * reused cells, 8-directional adjacency between consecutive cells, and the
 * board letters (language-normalized) match the word exactly — the same
 * semantics as searchWordPath in wordValidator.
 *
 * @returns the sanitized path when valid, or null when missing/invalid —
 *          callers must fall back to getWordPath reconstruction (legacy
 *          clients, or a stale board mid-cascade) and never reject the word.
 */
export function validateBlastWordPath(
  word: string,
  path: ReadonlyArray<{ row: number; col: number }> | null | undefined,
  grid: string[][],
  language: Language | string,
): Array<{ row: number; col: number }> | null {
  if (!path || !Array.isArray(path) || !grid || grid.length === 0) return null;
  const wordNormalized = normalizeWordForLanguage(word, language);
  if (path.length !== wordNormalized.length) return null;

  const seen = new Set<string>();
  for (let i = 0; i < path.length; i++) {
    const cell = path[i];
    const row = cell?.row;
    const col = cell?.col;
    if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
    if (row < 0 || row >= grid.length || col < 0 || col >= (grid[row]?.length ?? 0)) return null;
    const key = `${row},${col}`;
    if (seen.has(key)) return null; // cell reuse is not a legal path
    seen.add(key);
    if (i > 0) {
      const prev = path[i - 1];
      if (Math.abs(prev.row - row) > 1 || Math.abs(prev.col - col) > 1) return null;
    }
    const cellLetter = normalizeLetterForLanguage(grid[row][col] ?? '', language);
    if (cellLetter !== wordNormalized[i]) return null;
  }
  return path.map(({ row, col }) => ({ row, col }));
}

function emptyPlayerStats(): BlastPlayerStats {
  return { maxCombo: 0, gemsCollected: 0, coinsCollected: 0, diamondsCollected: 0, bombsPopped: 0, wordsFound: [], bestWord: '', tilesCleared: 0, totalTileBonus: 0, boardClears: 0 };
}
