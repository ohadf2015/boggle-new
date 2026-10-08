/**
 * Beta MP modes (crossword, word-tower) — one full round each through the real
 * socket flow: start → mode init → play → drop + rejoin → end → results, plus
 * bots carried into a human-only round and crossword's locale gate.
 */

import { vi, describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment } from '../helpers/socketTestHelper';
import { getCachedTrie, getTrieNode } from '../../modules/boggleSolver';
import { getGameBots } from '../../modules/botManager';
import { isBuildable } from '@/lib/wordTower/wordTowerManager';
import { WORD_TOWER_VERSUS_MATCH_S } from '@/shared/constants/wordTowerConstants';

vi.mock('../../modules/classroomGameManager', async (importOriginal) => ({
  ...(await importOriginal()),
  beginClassroomRound: vi.fn().mockResolvedValue(null),
  getClassroomGame: vi.fn().mockResolvedValue(null),
  getClassroomGameByCode: vi.fn().mockResolvedValue(null),
  updateClassroomGameState: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../modules/botBehaviorCache', async (importOriginal) => ({
  ...(await importOriginal()),
  getCachedPlayerWords: vi.fn().mockResolvedValue([]),
  getCachedBlacklist: vi.fn().mockResolvedValue(new Set()),
  getCachedWrongWords: vi.fn().mockResolvedValue([]),
  getCachedDifficultyParams: vi.fn().mockResolvedValue(null),
}));
vi.mock('../../cache/wordCache', () => ({
  getCachedWordValidation: vi.fn().mockResolvedValue(null),
  setCachedWordValidation: vi.fn().mockResolvedValue(undefined),
}));

vi.setConfig({ testTimeout: 60000 });

const HOST = 'BetaHost';
const JOINER = 'BetaJoiner';
const LATE = 'BetaLate';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getGame = (code) => globalThis.__gameStateManager.getGame(code);
const snap = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

function shimIo(io) {
  const origTo = io.to.bind(io);
  io.to = (room) => {
    const target = origTo(room);
    return { ...target, volatile: { emit: target.emit } };
  };
  io.in = io.to;
  io.sockets.sockets = io.sockets;
}
function shimSocket(socket, io) {
  socket.to = (room) => ({
    emit: (event, data) => {
      for (const s of io._getSocketsInRoom(room)) if (s !== socket) s.emit(event, data);
    },
  });
  return socket;
}
async function dropSocket(io, socket) {
  socket.connected = false;
  await socket.receiveEvent('disconnect', 'transport close');
  for (const [room, set] of io.rooms) {
    set.delete(socket);
    if (set.size === 0) io.rooms.delete(room);
  }
  io.sockets.delete(socket.id);
}
function lastEvent(socket, name) {
  const evs = socket.getEmittedEventsByName(name);
  return evs.length ? evs[evs.length - 1].data : undefined;
}
function eventDump(socket) {
  return socket.getEmittedEvents().map((e) => `${e.event}${e.event === 'error' ? ':' + JSON.stringify(e.data) : ''}`).slice(-25).join(' | ');
}
const resultsToMap = (payload) => Object.fromEntries((payload?.scores || []).map((p) => [p.username, p.totalScore]));

async function lobby(env, extraUsers = [JOINER]) {
  const host = shimSocket(env.createSocket(), env.io);
  const gameData = env.createGameData({ hostUsername: HOST });
  await host.receiveEvent('createGame', gameData);
  const others = [];
  for (const username of extraUsers) {
    const s = shimSocket(env.createSocket(), env.io);
    await s.receiveEvent('join', env.createJoinData(gameData.gameCode, { username }));
    expect(lastEvent(s, 'joined')?.success, eventDump(s)).toBe(true);
    others.push(s);
  }
  return { host, others, gameCode: gameData.gameCode };
}

async function startRound(host, others, gameCode, mode, language = 'en') {
  await host.receiveEvent('startGame', { timerSeconds: 120, language, gameMode: mode });
  const hostStart = lastEvent(host, 'startGame');
  expect(hostStart?.gameMode, eventDump(host)).toBe(mode);
  await host.receiveEvent('countdownComplete', { messageId: hostStart.messageId });
  for (const s of others) {
    await s.receiveEvent('countdownComplete', { messageId: lastEvent(s, 'startGame').messageId });
  }
  expect(getGame(gameCode).gameState).toBe('in-progress');
}

/** Dictionary words spellable from a tower wheel (each tile once). */
function towerCandidates(tray, exclude) {
  const trie = getCachedTrie('en');
  const letters = tray.map((l) => l.toLowerCase());
  const out = [];
  const used = new Array(letters.length).fill(false);
  const walk = (prefix) => {
    if (out.length >= 40 || prefix.length > 6) return;
    const node = getTrieNode(trie, prefix);
    if (!node) return;
    if (prefix.length >= 3 && node.isWord && !exclude.has(prefix) && isBuildable(prefix.toUpperCase(), tray, 'en')) out.push(prefix);
    for (let i = 0; i < letters.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      walk(prefix + letters[i]);
      used[i] = false;
    }
  };
  walk('');
  return [...new Set(out)];
}

async function buildFloor(socket) {
  await socket.receiveEvent('requestTowerState');
  const sync = lastEvent(socket, 'towerStateSync');
  expect(sync?.you?.tray, eventDump(socket)).toBeTruthy();
  const tried = new Set();
  for (const word of towerCandidates(sync.you.tray, tried).slice(0, 10)) {
    tried.add(word);
    await socket.receiveEvent('submitTowerWord', { word: word.toUpperCase() });
    if (lastEvent(socket, 'towerWordResult')?.accepted) return word;
    await sleep(220);
  }
  throw new Error(`no tower word accepted from ${sync.you.tray.join('')}. Events: ${eventDump(socket)}`);
}

const towerHeights = (gameCode) => Object.fromEntries(
  Object.values(getGame(gameCode).wordTowerVersusState.players).map((p) => [p.username, Math.round(p.game.heightM)]),
);

describe('MP beta modes (real socket flow)', () => {
  let env;

  beforeAll(async () => {
    const { ensureLanguageLoaded } = await import('../../dictionary');
    await ensureLanguageLoaded('en');
  });

  beforeEach(() => {
    env = createTestEnvironment();
    shimIo(env.io);
    globalThis.__resetBroadcastThrottle?.();
  });

  afterEach(() => {
    globalThis.__clearAllGameTimers?.();
    env.cleanup();
    globalThis.__resetBroadcastThrottle?.();
  });

  describe('crossword', () => {
    it('every player solving ends the round with results that carry the crossword scores', async () => {
      const { host, others: [joiner], gameCode } = await lobby(env);
      await startRound(host, [joiner], gameCode, 'crossword');
      const init = lastEvent(joiner, 'crosswordMpInit');
      expect(init?.puzzle, eventDump(joiner)).toBeTruthy();
      expect(init.players.sort()).toEqual([HOST, JOINER].sort());

      await joiner.receiveEvent('submitCrosswordProgress', { percent: 40, solved: false, elapsedMs: 10000, score: 0 });

      await dropSocket(env.io, joiner);
      const rejoined = shimSocket(env.createSocket(), env.io);
      await rejoined.receiveEvent('join', { gameCode, username: JOINER });
      expect(lastEvent(rejoined, 'joined')?.reconnected, eventDump(rejoined)).toBe(true);
      expect(lastEvent(rejoined, 'startGame')?.gameMode).toBe('crossword');
      await rejoined.receiveEvent('requestCrosswordMpState');
      const resume = snap(lastEvent(rejoined, 'crosswordMpInit'));
      expect(resume?.puzzle?.id).toBe(init.puzzle.id);
      expect(resume.standings.find((s) => s.username === JOINER)?.percent).toBe(40);

      const hostEnd = host.waitForEvent('validatedScores', 15000);
      const joinerEnd = rejoined.waitForEvent('validatedScores', 15000);
      await host.receiveEvent('submitCrosswordProgress', { percent: 100, solved: true, elapsedMs: 20000, score: 60 });
      await rejoined.receiveEvent('submitCrosswordProgress', { percent: 100, solved: true, elapsedMs: 30000, score: 45 });
      expect(lastEvent(host, 'crosswordRaceOver')).toBeTruthy();

      const [{ data: hostPayload }, { data: joinerPayload }] = await Promise.all([hostEnd, joinerEnd]);
      expect(host.getEmittedEventsByName('endGame').length).toBeGreaterThan(0);
      expect(resultsToMap(hostPayload)).toEqual({ [HOST]: 60, [JOINER]: 45 });
      expect(resultsToMap(joinerPayload)).toEqual(resultsToMap(hostPayload));
      expect(hostPayload.scores[0].username).toBe(HOST);
      expect(hostPayload.gameMode).toBe('crossword');
    });

    it('a host-ended round ranks by crossword standings, not by (absent) words', async () => {
      const { host, others: [joiner], gameCode } = await lobby(env);
      await startRound(host, [joiner], gameCode, 'crossword');
      await joiner.receiveEvent('submitCrosswordProgress', { percent: 100, solved: true, elapsedMs: 15000, score: 70 });
      await host.receiveEvent('submitCrosswordProgress', { percent: 50, solved: false, elapsedMs: 15000, score: 20 });

      const results = host.waitForEvent('validatedScores', 15000);
      await host.receiveEvent('endGame');
      const { data } = await results;
      expect(resultsToMap(data)).toEqual({ [HOST]: 20, [JOINER]: 70 });
      expect(data.scores[0].username).toBe(JOINER);
    });

    it('a late joiner is seated in the race', async () => {
      const { host, others: [joiner], gameCode } = await lobby(env);
      await startRound(host, [joiner], gameCode, 'crossword');
      const late = shimSocket(env.createSocket(), env.io);
      await late.receiveEvent('join', env.createJoinData(gameCode, { username: LATE }));
      expect(lastEvent(late, 'joined')?.success, eventDump(late)).toBe(true);
      await late.receiveEvent('requestCrosswordMpState');
      expect(lastEvent(late, 'crosswordMpInit')?.players).toContain(LATE);
      await late.receiveEvent('submitCrosswordProgress', { percent: 30, solved: false, elapsedMs: 5000, score: 5 });
      expect(getGame(gameCode).crosswordMpState.progress[LATE]?.percent).toBe(30);
    });

    it('play again deals a fresh race (no carried-over progress)', async () => {
      const { host, others: [joiner], gameCode } = await lobby(env);
      await startRound(host, [joiner], gameCode, 'crossword');
      const end = host.waitForEvent('validatedScores', 15000);
      await host.receiveEvent('submitCrosswordProgress', { percent: 100, solved: true, elapsedMs: 9000, score: 50 });
      await joiner.receiveEvent('submitCrosswordProgress', { percent: 100, solved: true, elapsedMs: 9500, score: 40 });
      await end;

      await startRound(host, [joiner], gameCode, 'crossword');
      const progress = getGame(gameCode).crosswordMpState.progress;
      expect(progress[HOST]).toMatchObject({ percent: 0, solved: false, score: 0 });
      expect(getGame(gameCode).playerScores[HOST] || 0).toBe(0);
    });

    it('a watching TV host is not seated in the race', async () => {
      const { host, others: [joiner], gameCode } = await lobby(env);
      await host.receiveEvent('startGame', { timerSeconds: 120, language: 'en', gameMode: 'crossword', tvMode: true });
      expect(getGame(gameCode).crosswordMpState.players).toEqual([JOINER]);
    });

    it.each(['es'])('refuses to start in %s (no or too few puzzles) instead of dealing an English grid', async (lang) => {
      const { host, gameCode } = await lobby(env);
      await host.receiveEvent('startGame', { timerSeconds: 120, language: lang, gameMode: 'crossword' });
      expect(getGame(gameCode).gameState).toBe('waiting');
      expect(lastEvent(host, 'startGame')).toBeUndefined();
      const err = lastEvent(host, 'error');
      expect(err?.message).toMatch(/language/i);
    });

    it('starts in Hebrew with a Hebrew RTL puzzle', async () => {
      const { host, others: [joiner], gameCode } = await lobby(env);
      await host.receiveEvent('startGame', { timerSeconds: 120, language: 'he', gameMode: 'crossword' });
      const init = lastEvent(joiner, 'crosswordMpInit');
      expect(init?.puzzle?.locale, eventDump(joiner)).toBe('he');
      expect(init.puzzle.rtl).toBe(true);
    });

    it.each(['sv', 'ja'])('starts in %s with a puzzle of that locale', async (lang) => {
      const { host, others: [joiner] } = await lobby(env);
      await host.receiveEvent('startGame', { timerSeconds: 120, language: lang, gameMode: 'crossword' });
      const init = lastEvent(joiner, 'crosswordMpInit');
      expect(init?.puzzle?.locale, eventDump(joiner)).toBe(lang);
      expect(init.puzzle.rtl).toBe(false);
    });
  });

  describe('word-tower', () => {
    it('round: live score is tower height, survives a rejoin, and results equal the heights', async () => {
      const { host, others: [joiner], gameCode } = await lobby(env);
      await startRound(host, [joiner], gameCode, 'word-tower');
      expect(getGame(gameCode).timerSeconds).toBe(WORD_TOWER_VERSUS_MATCH_S);
      expect(lastEvent(joiner, 'towerMatchReady')).toBeTruthy();

      await buildFloor(host);
      await buildFloor(joiner);
      expect(getGame(gameCode).playerScores).toMatchObject(towerHeights(gameCode));

      await dropSocket(env.io, joiner);
      const rejoined = shimSocket(env.createSocket(), env.io);
      await rejoined.receiveEvent('join', { gameCode, username: JOINER });
      expect(lastEvent(rejoined, 'joined')?.reconnected, eventDump(rejoined)).toBe(true);
      await buildFloor(rejoined);

      const heights = towerHeights(gameCode);
      const liveStandings = Object.fromEntries(
        lastEvent(host, 'towerStandings').standings.map((s) => [s.username, Math.round(s.heightM)]),
      );
      expect(liveStandings).toEqual(heights);

      const results = host.waitForEvent('validatedScores', 15000);
      await host.receiveEvent('endGame');
      const { data } = await results;
      expect(resultsToMap(data)).toEqual(heights);
      expect(data.scores[0].totalScore).toBeGreaterThanOrEqual(data.scores[1].totalScore);
    });

    it('a bomb lowers the target\'s live score with its tower', async () => {
      const { host, others: [joiner], gameCode } = await lobby(env);
      await startRound(host, [joiner], gameCode, 'word-tower');
      await buildFloor(joiner);
      await buildFloor(joiner);
      const state = getGame(gameCode).wordTowerVersusState;
      state.players[HOST].game = { ...state.players[HOST].game, heightM: state.players[JOINER].game.heightM + 100, bombCharge: 999, scramblesLeft: 5 };
      await host.receiveEvent('sendTowerBomb', { targetPlayerId: JOINER });
      expect(lastEvent(host, 'towerBombResult')?.sent, eventDump(host)).toBe(true);
      expect(getGame(gameCode).playerScores[JOINER]).toBe(towerHeights(gameCode)[JOINER]);
      // Both towers changed: each side's own view must refresh without waiting for its next word.
      expect(Math.round(lastEvent(joiner, 'towerTrayUpdate')?.state?.heightM ?? -1)).toBe(towerHeights(gameCode)[JOINER]);
      expect(lastEvent(host, 'towerTrayUpdate')?.state?.bombCharge).toBe(getGame(gameCode).wordTowerVersusState.players[HOST].game.bombCharge);
    });

    it('a late joiner gets a tower', async () => {
      const { host, others: [joiner], gameCode } = await lobby(env);
      await startRound(host, [joiner], gameCode, 'word-tower');
      const late = shimSocket(env.createSocket(), env.io);
      await late.receiveEvent('join', env.createJoinData(gameCode, { username: LATE }));
      expect(lastEvent(late, 'joined')?.success, eventDump(late)).toBe(true);
      await buildFloor(late);
    });

    it('a solo host plays alone — no bots auto-added into towers they cannot play', async () => {
      const { host, gameCode } = await lobby(env, []);
      await startRound(host, [], gameCode, 'word-tower');
      expect(getGameBots(gameCode)).toHaveLength(0);
      expect(Object.keys(getGame(gameCode).wordTowerVersusState.players)).toEqual([HOST]);
    });
  });
});

describe('MP beta modes: bots left in the room from an earlier round', () => {
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

  it.each(['crossword', 'word-tower'])('%s: bots do not play board words and cannot outrank the humans', async (mode) => {
    const { host, gameCode } = await lobby(env, []);
    await host.receiveEvent('addBot', { difficulty: 'hard' });
    const [bot] = getGameBots(gameCode);
    expect(bot).toBeTruthy();

    await startRound(host, [], gameCode, mode);
    await vi.advanceTimersByTimeAsync(55_000);
    expect(getGame(gameCode).playerWords[bot.username] || []).toEqual([]);
    expect(getGame(gameCode).playerScores[bot.username] || 0).toBe(0);
  });
});
