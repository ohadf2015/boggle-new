/**
 * Game start — the mode-agnostic pieces of dealing a round, pulled out of the
 * startGame handler so it reads as a sequence of steps. Nothing here branches
 * on a mode: per-mode differences come from backend/modes (rules + modules).
 */

import type { Server, Socket } from 'socket.io';
import type { GameMode, Language, LetterGrid } from '@/shared/types';
import type { GameState } from '../modules/gameState/types.js';
import { getGame, updateGame } from '../modules/gameStateManager.js';
import { broadcastToRoom, getGameRoom, getSocketById, safeEmit } from '../utils/socketHelpers.js';
import { makePositionsMap, isWordOnBoard } from '../modules/wordValidator.js';
import { generateRandomTable } from '../utils/gameUtils.js';
import { generateRichBoard } from '../utils/boardSelection.js';
import { getCachedTrie } from '../modules/boggleSolver.js';
import { findAllWordsAsync } from '../modules/wordValidatorPool.js';
import { canAccessInWorkMode } from '@/lib/auth/inWorkModeAccess';
import { getSupabase } from '../modules/supabase/client.js';
import { verifyBoostToken } from '../utils/boostToken.js';
import { setClassroomGamePlacedVocabulary, saveClassroomTeams, type ClassroomGame } from '../modules/classroomGameManager.js';
import { buildClassroomLiveContext } from '@/shared/utils/classroomLiveContext';
import { getGameModeRules } from '../modes/index.js';
import logger from '../utils/logger.js';

/** Board words of at least this length count toward the "N words on board" chip. */
const MIN_DISPLAY_WORD_LENGTH = 5;

/**
 * Beta (in-work) modes: the host must be an admin or beta tester, and some
 * modes only ship curated content for a few languages. Returns the refusal
 * message, or null when the start may proceed. Non-beta modes always pass.
 */
export async function checkInWorkModeAccess(socket: Socket, game: GameState, mode: GameMode, boardLang: Language): Promise<string | null> {
  const rules = getGameModeRules(mode);
  if (!rules.betaName) return null;
  const hostUser = Object.values(game.users).find((u) => u.isHost);
  const hostAuthId = hostUser?.authUserId || (socket.data?.verifiedUserId as string | undefined);
  const supabase = getSupabase();
  let allowed = false;
  if (!supabase) {
    allowed = true; // dev/test (no Supabase) → allow
  } else if (hostAuthId) {
    const { data: profile } = await supabase.from('profiles').select('is_admin, is_beta_tester').eq('id', hostAuthId).single();
    allowed = canAccessInWorkMode(profile);
  }
  if (allowed && rules.languages && !rules.languages.includes(boardLang)) allowed = false;
  return allowed ? null : `${rules.betaName} is in beta`;
}

/**
 * Register a boost token bundled with startGame, atomically with the state
 * transition (a separate `boost:apply` emit used to race the first word).
 */
export function applyStartBoostToken(socket: Socket, game: GameState, gameCode: string, boostToken: string | undefined): void {
  if (!boostToken || !game.hostUsername) return;
  try {
    const verification = verifyBoostToken(boostToken, gameCode);
    if (!verification.valid) {
      logger.warn('BOOST', `Invalid boost token in startGame for ${gameCode}: ${verification.reason}`);
      return;
    }
    if (!game.playerBoosts) game.playerBoosts = {};
    const existing = game.playerBoosts[game.hostUsername];
    if (existing && existing.sessionId === gameCode) return;
    game.playerBoosts[game.hostUsername] = { sessionId: gameCode, token: boostToken };
    socket.emit('boost:applied', { success: true, boostType: verification.boostType });
    logger.info('BOOST', `Applied ${verification.boostType} for ${game.hostUsername} via startGame`);
  } catch (err) {
    logger.warn('BOOST', `Boost apply error in startGame: ${(err as Error).message}`);
  }
}

/** Deal a fresh rich board, embedding lesson words when there are any. */
export function dealBoard(rows: number, cols: number, language: Language, vocabToEmbed: string[]): LetterGrid {
  return generateRichBoard(
    () => (vocabToEmbed.length > 0
      ? generateRandomTable(rows, cols, language, vocabToEmbed)
      : generateRandomTable(rows, cols, language)),
    language,
    rows,
    cols,
  ) as LetterGrid;
}

/** Install a board on the room (grid + position index), on the live object too. */
export function installBoard(gameCode: string, game: GameState, letterGrid: LetterGrid): void {
  game.letterGrid = letterGrid;
  updateGame(gameCode, { letterGrid });
  game.letterPositions = makePositionsMap(letterGrid);
}

/** 2-3 random "golden" cells (+25% on words that use their letters). */
export function pickGoldenLetters(letterGrid: LetterGrid): Array<{ row: number; col: number }> {
  const rows = letterGrid.length;
  const cols = (letterGrid[0] as unknown[])?.length || 0;
  const count = Math.min(rows >= 6 ? 3 : 2, rows * cols);
  const picked: Array<{ row: number; col: number }> = [];
  const used = new Set<string>();
  while (picked.length < count) {
    const row = Math.floor(Math.random() * rows);
    const col = Math.floor(Math.random() * cols);
    const key = `${row},${col}`;
    if (used.has(key)) continue;
    used.add(key);
    picked.push({ row, col });
  }
  return picked;
}

/**
 * Count and broadcast the board's words (PERF-012: through the worker pool so
 * the DFS doesn't block the event loop on the start path).
 */
export async function emitTotalBoardWords(io: Server, gameCode: string, letterGrid: LetterGrid, gameLang: Language, minWordLength: number): Promise<void> {
  try {
    const allWords = await findAllWordsAsync(letterGrid, gameLang, {
      minLength: minWordLength, maxLength: 15, maxWords: 10000, trie: getCachedTrie(gameLang),
    });
    const totalBoardWords = allWords.filter((word: string) => word.length >= MIN_DISPLAY_WORD_LENGTH).length;
    const currentGame = getGame(gameCode);
    if (currentGame) currentGame.totalBoardWords = totalBoardWords;
    broadcastToRoom(io, getGameRoom(gameCode), 'totalBoardWords', { count: totalBoardWords });
    logger.debug('SOCKET', `Game ${gameCode} has ${totalBoardWords} possible words on board`);
  } catch (err: unknown) {
    logger.error('SOCKET', `Failed to calculate total board words for ${gameCode}`, err as Error);
  }
}

/** Best-effort async pick of the 1-2 longest board words as hidden "special" words. */
export function scheduleSpecialWords(gameCode: string, letterGrid: LetterGrid, gameLang: Language): void {
  void (async () => {
    try {
      const allWords = await findAllWordsAsync(letterGrid, gameLang, {
        minLength: 4, maxLength: 12, maxWords: 5000, trie: getCachedTrie(gameLang),
      });
      if (allWords.length === 0) return;
      const specialWords = [...allWords].sort((a: string, b: string) => b.length - a.length)
        .slice(0, Math.min(2, allWords.length))
        .map((word: string) => ({ word }));
      const cg = getGame(gameCode);
      if (cg) {
        cg.specialWords = specialWords;
        updateGame(gameCode, { specialWords });
      }
      logger.debug('ROUND_EVENT', `Game ${gameCode}: special words set: ${specialWords.map((w) => w.word).join(', ')}`);
    } catch (err: unknown) {
      logger.error('ROUND_EVENT', `Failed to compute special words for ${gameCode}: ${(err as Error).message}`);
    }
  })();
}

/**
 * Record which lesson words the FINAL board carries (embedding is best-effort)
 * and re-send each student their own word bank. Per-socket, not a broadcast:
 * `classroomLevel` differs per student (pitfall class 3).
 */
export function recordClassroomWordBank(io: Server, gameCode: string, game: GameState, letterGrid: LetterGrid, gameLang: Language, vocabToEmbed: string[]): void {
  const finalPositions = makePositionsMap(letterGrid, gameLang);
  const placedVocabulary = vocabToEmbed.filter((word) => isWordOnBoard(word, letterGrid, finalPositions, gameLang));
  void setClassroomGamePlacedVocabulary(gameCode, placedVocabulary).then(() => {
    for (const user of Object.values(game.users || {})) {
      const memberSocket = getSocketById(io, (user as { socketId?: string })?.socketId ?? '');
      if (!memberSocket) continue;
      safeEmit(memberSocket, 'classroomContext', {
        classroomLevel: ((memberSocket.data as Record<string, unknown>)?.classroomLevel as string) ?? 'core',
        classroomWordBank: placedVocabulary,
      });
    }
  }).catch((err) => {
    // Never silent: a word bank degrading to the full lesson list must leave a trace (class 4).
    logger.warn('CLASSROOM_GAME', `Word-bank refresh failed for ${gameCode}: ${err}`);
  });
}

/**
 * Classroom fields that ride every start-shaped payload of this round: SPED
 * accessibility (large type / audio cues from the first frame) and the live
 * context (lesson, round, team rosters) the projector paints.
 */
export function buildClassroomStartExtras(gameCode: string, classroomGame: ClassroomGame | null, humanUsernames: string[]): Record<string, unknown> {
  const extras: Record<string, unknown> = {};
  const accessibility = classroomGame?.settings?.accessibility;
  if (accessibility && (accessibility.largeText || accessibility.audioCues)) {
    extras.accessibility = { largeText: !!accessibility.largeText, audioCues: !!accessibility.audioCues };
  }
  const classroomLive = buildClassroomLiveContext({ game: classroomGame, humanUsernames });
  if (classroomLive) {
    extras.classroom = classroomLive;
    if (classroomLive.teams) {
      // Pre-2026-09-16 shape kept so older clients still get the team count.
      extras.teamBattle = { teamCount: classroomLive.teamCount };
      // Fire-and-forget: the round must start whether or not Redis answers.
      void saveClassroomTeams(gameCode, classroomLive.teams);
    }
  }
  return extras;
}
