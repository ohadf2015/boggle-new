/**
 * MP Blast board sync through the real socket flow: a dragged path cascades the
 * player's own board, and a word rejected while the teacher has paused is healed
 * by the board request the client sends when no ack arrives.
 */

import { vi, describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment } from '../helpers/socketTestHelper';
import { getCachedTrie, getTrieNode } from '../../modules/boggleSolver';

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

const HOST = 'BlastHost';
const JOINER = 'BlastJoiner';

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

/** First dictionary word (3+ letters) traceable on the grid, with its cell path. */
function findWordWithPath(grid, exclude = new Set()) {
  const trie = getCachedTrie('en');
  const rows = grid.length;
  const cols = grid[0].length;
  const seen = new Set();
  let found = null;
  const walk = (r, c, prefix, path) => {
    if (found) return;
    const word = prefix + String(grid[r][c]).toLowerCase();
    const node = getTrieNode(trie, word);
    if (!node) return;
    const next = [...path, { row: r, col: c }];
    if (word.length >= 3 && node.isWord && !exclude.has(word)) { found = { word, path: next }; return; }
    seen.add(`${r},${c}`);
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr; const nc = c + dc;
      if ((dr || dc) && nr >= 0 && nc >= 0 && nr < rows && nc < cols && !seen.has(`${nr},${nc}`) && grid[nr][nc]) walk(nr, nc, word, next);
    }
    seen.delete(`${r},${c}`);
  };
  for (let r = 0; r < rows && !found; r++) for (let c = 0; c < cols && !found; c++) if (grid[r][c]) walk(r, c, '', []);
  return found;
}

describe('MP blast board sync (real socket flow)', () => {
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

  it('cascades the dragged path, and a paused-round word is healed by a board request', async () => {
    const { host, others: [joiner], gameCode } = await lobby(env);
    await startRound(host, [joiner], gameCode, 'blast');

    const board = () => snap(getGame(gameCode).blastModeState.playerBoards?.[JOINER] ?? getGame(gameCode).blastModeState);
    const hit = findWordWithPath(board().grid);
    expect(hit, 'no traceable word on the blast board').toBeTruthy();

    await joiner.receiveEvent('submitWord', { word: hit.word, path: hit.path });
    const ack = snap(lastEvent(joiner, 'blastBoardUpdate'));
    expect(ack?.clearedBy, eventDump(joiner)).toBe(JOINER);
    expect(ack.grid).toEqual(board().grid);

    getGame(gameCode).isPaused = true;
    const updatesBefore = joiner.getEmittedEventsByName('blastBoardUpdate').length;
    const second = findWordWithPath(board().grid, new Set([hit.word]));
    await joiner.receiveEvent('submitWord', { word: second?.word ?? 'cat', path: second?.path });
    expect(lastEvent(joiner, 'wordRejected')?.reason).toBe('paused');
    expect(joiner.getEmittedEventsByName('blastBoardUpdate').length).toBe(updatesBefore);

    await joiner.receiveEvent('blastRequestBoard');
    const resync = snap(lastEvent(joiner, 'blastBoardUpdate'));
    expect(resync.clearedBy).toBe('__server_resync__');
    expect(resync.grid).toEqual(board().grid);
    expect(resync.tileStates).toEqual(board().tileStates);
    expect(resync.totalMoves).toBe(ack.totalMoves);
  });
});
