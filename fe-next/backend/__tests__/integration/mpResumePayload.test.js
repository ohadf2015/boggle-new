/**
 * Resume payloads — every door back into a running round hands the client the
 * SAME state, per auto-rotated mode.
 *
 * Three server paths emit a mid-round `startGame`: the `join` re-emit
 * (reconnect), a late join, and the `requestGameState` watchdog (recovery).
 * Pitfall class 3: they were three hand-built payloads and drifted — recovery
 * sent the Blast TEMPLATE board instead of the player's own evolved board, and
 * no found words. One builder now serves all of them (and the fresh start).
 */

import { vi, describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment } from '../helpers/socketTestHelper';
import { ALL_GAME_MODES } from '../../modules/gameModeSelector';
import { findAllWords, getCachedTrie, getTrieNode } from '../../modules/boggleSolver';
import { getOrInitPlayerBoard } from '../../modules/blastModeManager';
import { isWordShapeWeird } from '@/shared/utils/wordShapeFilter';
import { WHEEL_RUSH_MIN_WORD_LEN } from '@/shared/constants/wheelRushConstants';

vi.mock('../../modules/classroomGameManager', async (importOriginal) => ({
  ...(await importOriginal()),
  beginClassroomRound: vi.fn().mockResolvedValue(null),
  getClassroomGame: vi.fn().mockResolvedValue(null),
  getClassroomGameByCode: vi.fn().mockResolvedValue(null),
  updateClassroomGameState: vi.fn().mockResolvedValue(undefined),
}));

vi.setConfig({ testTimeout: 60000 });

const HOST = 'ResumeHost';
const JOINER = 'ResumeJoiner';
const LATE = 'ResumeLate';
const getGame = (code) => globalThis.__gameStateManager.getGame(code);
const snap = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
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

function candidates(mode, game, username) {
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
  const grid = mode === 'blast' ? getOrInitPlayerBoard(game.blastModeState, username).grid : game.letterGrid;
  return findAllWords(grid, 'en', { minLength: 3, maxLength: 5, maxWords: 500, trie })
    .map((w) => w.toLowerCase())
    .filter((w) => !isWordShapeWeird(w, 'en').weird);
}

async function scoreOne(mode, socket, gameCode, username) {
  for (const word of candidates(mode, getGame(gameCode), username).slice(0, 8)) {
    const before = getGame(gameCode).playerScores[username] || 0;
    if (mode === 'wheel-rush') await socket.receiveEvent('submitWheelWord', { word: word.toUpperCase() });
    else await socket.receiveEvent('submitWord', { word });
    if ((getGame(gameCode).playerScores[username] || 0) > before) return word;
    await new Promise((r) => setTimeout(r, 220));
  }
  throw new Error(`[${mode}] ${username} could not score`);
}

const FLAG_KEYS = ['reconnect', 'lateJoin', 'messageId'];
const shapeOf = (payload) => Object.keys(payload).filter((k) => !FLAG_KEYS.includes(k)).sort();

describe('MP resume payloads: reconnect == late join == recovery, per mode', () => {
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
  });

  for (const mode of ALL_GAME_MODES) {
    it(`${mode}: every resume door carries the same, player-specific state`, async () => {
      const host = shimSocket(env.createSocket(), env.io);
      const joiner = shimSocket(env.createSocket(), env.io);
      const gameData = env.createGameData({ hostUsername: HOST });
      const { gameCode } = gameData;
      await host.receiveEvent('createGame', gameData);
      await joiner.receiveEvent('join', env.createJoinData(gameCode, { username: JOINER }));
      await host.receiveEvent('startGame', { timerSeconds: 120, language: 'en', gameMode: mode });
      const start = lastEvent(host, 'startGame');
      await host.receiveEvent('countdownComplete', { messageId: start.messageId });
      await joiner.receiveEvent('countdownComplete', { messageId: lastEvent(joiner, 'startGame').messageId });
      const word = await scoreOne(mode, joiner, gameCode, JOINER);

      // ---- recovery (watchdog) on the live socket ----
      await joiner.receiveEvent('requestGameState');
      const recovery = snap(lastEvent(joiner, 'startGame'));
      expect(recovery.reconnect).toBe(true);

      // ---- reconnect (join re-emit on a new socket) ----
      await dropSocket(env.io, joiner);
      const back = shimSocket(env.createSocket(), env.io);
      await back.receiveEvent('join', { gameCode, username: JOINER });
      const reconnect = snap(lastEvent(back, 'startGame'));
      expect(reconnect.reconnect).toBe(true);

      // ---- late join (a brand-new player mid-round) ----
      const late = shimSocket(env.createSocket(), env.io);
      await late.receiveEvent('join', env.createJoinData(gameCode, { username: LATE }));
      const lateJoin = snap(lastEvent(late, 'startGame'));
      expect(lateJoin?.lateJoin, 'late joiner got no startGame').toBe(true);

      // Same shape through every door.
      expect(shapeOf(recovery)).toEqual(shapeOf(reconnect));
      expect(shapeOf(lateJoin)).toEqual(shapeOf(reconnect));

      // Player-specific state, identical on recovery and reconnect.
      for (const p of [recovery, reconnect]) {
        expect(p.gameMode).toBe(mode);
        expect((p.myFoundWords || []).map((w) => w.toLowerCase())).toContain(word);
        expect(Object.fromEntries(p.leaderboard.map((e) => [e.username, e.score]))[JOINER])
          .toBe(getGame(gameCode).playerScores[JOINER]);
      }
      if (mode === 'blast') {
        // The joiner's board already cascaded: every door must hand back THEIR board.
        const own = snap(getOrInitPlayerBoard(getGame(gameCode).blastModeState, JOINER));
        expect(recovery.blastGrid).toEqual(own.grid);
        expect(reconnect.blastGrid).toEqual(own.grid);
        expect(recovery.blastTileStates).toEqual(own.tileStates);
      }
    });
  }
});
