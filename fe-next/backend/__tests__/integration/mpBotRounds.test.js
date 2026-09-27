/**
 * Bots across rounds — every auto-rotated MP mode.
 *
 * Pitfall class 2: bots are REUSED across rounds. Blast bots once froze at 0
 * because the only per-round reset lived on the classic path, so a reused bot
 * kept last round's score and the score gate rejected every word.
 *
 * Per mode, through the real socket flow (host + one bot):
 *   round 1: bot scores > 0 (host scores too)
 *   host ends the round, starts round 2 (auto-reset path)
 *   round 2: bot state is zeroed at the boundary (score, found words, live score)
 *            → a human scores (relative score target is now in force)
 *            → the bot scores > 0 again.
 *
 * Fake timers drive the bot schedulers; the dictionary is loaded first.
 */

import { vi, describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment } from '../helpers/socketTestHelper';
import { ALL_GAME_MODES } from '../../modules/gameModeSelector';
import { findAllWords, getCachedTrie, getTrieNode } from '../../modules/boggleSolver';
import { getOrInitPlayerBoard } from '../../modules/blastModeManager';
import { getGameBots } from '../../modules/botManager';
import { isWordShapeWeird } from '@/shared/utils/wordShapeFilter';
import { WHEEL_RUSH_MIN_WORD_LEN } from '@/shared/constants/wheelRushConstants';

vi.mock('../../modules/classroomGameManager', async (importOriginal) => ({
  ...(await importOriginal()),
  beginClassroomRound: vi.fn().mockResolvedValue(null),
  getClassroomGame: vi.fn().mockResolvedValue(null),
  getClassroomGameByCode: vi.fn().mockResolvedValue(null),
  updateClassroomGameState: vi.fn().mockResolvedValue(undefined),
}));

// Bot setup awaits these Supabase-backed caches BEFORE it schedules any move.
// Left real, each round waited on a live network call (DNS to the test
// Supabase host) that fake timers cannot advance: under a loaded full-suite
// run the call outlived the 30s fake-timer window, the bot's scheduler was
// registered after it, and the round read "bot frozen" (repro: 1 in 8 runs
// with 8 files in parallel). Resolve them deterministically — the empty
// corpus/blacklist paths are the ones the code already falls back to.
vi.mock('../../modules/botBehaviorCache', async (importOriginal) => ({
  ...(await importOriginal()),
  getCachedPlayerWords: vi.fn().mockResolvedValue([]),
  getCachedBlacklist: vi.fn().mockResolvedValue(new Set()),
  getCachedWrongWords: vi.fn().mockResolvedValue([]),
  getCachedDifficultyParams: vi.fn().mockResolvedValue(null),
}));

// submitWord's dictionary check (isValidWordCached) awaits a Redis cache read
// (cache/wordCache). ioredis implements connect/command timeouts and the
// offline-queue reconnect with setTimeout — which this file FAKES. With no
// Redis (CI, or any env without one) the first submitWord's cache read waits
// on a reconnect that fake time never reaches → real-time 60s timeout, for
// classic/blast/word-hunt (wheel-rush validates against the puzzle, not the
// dictionary). Miss-to-real-dictionary keeps the assertion hermetic.
vi.mock('../../cache/wordCache', () => ({
  getCachedWordValidation: vi.fn().mockResolvedValue(null),
  setCachedWordValidation: vi.fn().mockResolvedValue(undefined),
}));

vi.setConfig({ testTimeout: 60000 });

const HOST = 'BotRoundHost';
const getGame = (code) => globalThis.__gameStateManager.getGame(code);
const lastEvent = (socket, name) => {
  const evs = socket.getEmittedEventsByName(name);
  return evs.length ? evs[evs.length - 1].data : undefined;
};

function shimIo(io) {
  const origTo = io.to.bind(io);
  io.to = (room) => {
    const target = origTo(room);
    return { ...target, volatile: { emit: target.emit } };
  };
  io.in = io.to;
  io.sockets.sockets = io.sockets;
}

function hostWordCandidates(mode, game) {
  const trie = getCachedTrie('en');
  if (mode === 'wheel-rush') {
    const { allLetters, centerLetter } = game.wheelRushState.puzzle;
    const letters = allLetters.map((l) => l.toLowerCase());
    const center = centerLetter.toLowerCase();
    const out = [];
    const used = new Array(letters.length).fill(false);
    const walk = (prefix) => {
      if (out.length >= 20 || prefix.length > 6) return;
      const node = getTrieNode(trie, prefix);
      if (!node) return;
      if (prefix.length >= WHEEL_RUSH_MIN_WORD_LEN && node.isWord && prefix.includes(center)) out.push(prefix);
      letters.forEach((l, i) => {
        if (used[i]) return;
        used[i] = true; walk(prefix + l); used[i] = false;
      });
    };
    walk('');
    return [...new Set(out)];
  }
  const grid = mode === 'blast' ? getOrInitPlayerBoard(game.blastModeState, HOST).grid : game.letterGrid;
  return findAllWords(grid, 'en', { minLength: 3, maxLength: 5, maxWords: 500, trie })
    .map((w) => w.toLowerCase())
    .filter((w) => !isWordShapeWeird(w, 'en').weird);
}

async function hostScores(mode, host, gameCode) {
  for (const word of hostWordCandidates(mode, getGame(gameCode)).slice(0, 8)) {
    const before = getGame(gameCode).playerScores[HOST] || 0;
    if (mode === 'wheel-rush') await host.receiveEvent('submitWheelWord', { word: word.toUpperCase() });
    else await host.receiveEvent('submitWord', { word });
    if ((getGame(gameCode).playerScores[HOST] || 0) > before) return;
    await vi.advanceTimersByTimeAsync(250); // per-socket submit limiter
  }
  throw new Error(`[${mode}] host could not score`);
}

async function playRound(mode, host, gameCode) {
  await host.receiveEvent('startGame', { timerSeconds: 90, language: 'en', gameMode: mode });
  const start = lastEvent(host, 'startGame');
  expect(getGame(gameCode).gameMode).toBe(mode);
  await host.receiveEvent('countdownComplete', { messageId: start.messageId });
  expect(getGame(gameCode).gameState).toBe('in-progress');
}

async function endRound(host, gameCode) {
  const results = host.waitForEvent('validatedScores', 20000);
  await host.receiveEvent('endGame');
  await vi.advanceTimersByTimeAsync(3000);
  await results;
  expect(getGame(gameCode).gameState).toBe('finished');
}

describe('MP bots: per-round reset + scoring, every auto-rotated mode', () => {
  let env;

  beforeAll(async () => {
    const { ensureLanguageLoaded } = await import('../../dictionary');
    await ensureLanguageLoaded('en');
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    env = createTestEnvironment();
    shimIo(env.io);
    globalThis.__resetBroadcastThrottle?.();
  });

  afterEach(() => {
    globalThis.__clearAllGameTimers?.();
    env.cleanup();
    vi.useRealTimers();
  });

  for (const mode of ALL_GAME_MODES) {
    it(`${mode}: bot scores in round 1, is reset at the boundary, and scores again in round 2`, async () => {
      const host = env.createSocket();
      const gameData = env.createGameData({ hostUsername: HOST });
      const { gameCode } = gameData;
      await host.receiveEvent('createGame', gameData);
      await host.receiveEvent('addBot', { difficulty: 'hard' });
      const [bot] = getGameBots(gameCode);
      expect(bot, 'addBot created no bot').toBeTruthy();

      // ---- round 1 ----
      await playRound(mode, host, gameCode);
      await hostScores(mode, host, gameCode);
      await vi.advanceTimersByTimeAsync(30_000);
      const round1BotScore = getGame(gameCode).playerScores[bot.username] || 0;
      expect(round1BotScore, `[${mode}] bot never scored in round 1`).toBeGreaterThan(0);
      await endRound(host, gameCode);

      // ---- round 2: the boundary reset ----
      await playRound(mode, host, gameCode);
      const [bot2] = getGameBots(gameCode);
      expect(bot2).toBe(bot); // the SAME object is reused — hence the reset
      expect(bot.score).toBe(0);
      expect(bot.wordsFound).toEqual([]);
      expect(getGame(gameCode).playerScores[bot.username] || 0).toBe(0);

      // A human scores first so the relative score target (not the grace
      // window) gates the bot — the case a stale score used to freeze.
      await hostScores(mode, host, gameCode);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(getGame(gameCode).playerScores[bot.username] || 0, `[${mode}] bot frozen in round 2`).toBeGreaterThan(0);
    });
  }
});
