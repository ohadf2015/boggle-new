/**
 * MP two-client gate — one full round per auto-rotated MP mode.
 *
 * For EACH mode in ALL_GAME_MODES (classic, blast, word-hunt, wheel-rush):
 *   host creates → joiner joins → host starts (mode forced via startGame.gameMode)
 *   → both clients report countdownComplete → both score a VALID word (derived
 *   from the dealt board / wheel with the server's own solver + real dictionary)
 *   → joiner DROPS mid-round and comes back on a NEW socket re-emitting `join`
 *   with the exact payload the client sends (hooks/useMultiplayerSocket.ts
 *   onConnect: `{ gameCode, username }`, guest = no token)
 *   → the reconnected joiner must get `joined{reconnected}` + `startGame{reconnect}`
 *   carrying its non-zero score AND the leaderboard, plus `updateLeaderboard`
 *   → host ends the round → both clients receive the same `validatedScores`,
 *   equal to the server's final `playerScores` AND to the live leaderboard the
 *   clients were shown in-round, non-zero for both.
 *
 * Real dictionary, real solver, real start coordinator — only external I/O
 * (classroom Redis lookups) is mocked. Pitfall classes 2/3 (stale state, reconnect
 * payload asymmetry) are what this gate exists to catch.
 */

import { vi, describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment } from '../helpers/socketTestHelper';
import { ALL_GAME_MODES } from '../../modules/gameModeSelector';
import { findAllWords, getCachedTrie, getTrieNode } from '../../modules/boggleSolver';
import { getOrInitPlayerBoard } from '../../modules/blastModeManager';
import { isWordShapeWeird } from '@/shared/utils/wordShapeFilter';
import { WHEEL_RUSH_MIN_WORD_LEN } from '@/shared/constants/wheelRushConstants';

// Classroom lookups hit Redis — no classroom in these rooms.
vi.mock('../../modules/classroomGameManager', async (importOriginal) => ({
  ...(await importOriginal()),
  beginClassroomRound: vi.fn().mockResolvedValue(null),
  getClassroomGame: vi.fn().mockResolvedValue(null),
  getClassroomGameByCode: vi.fn().mockResolvedValue(null),
  updateClassroomGameState: vi.fn().mockResolvedValue(undefined),
}));

vi.setConfig({ testTimeout: 60000 });

const HOST = 'GateHost';
const JOINER = 'GateJoiner';
const LB_THROTTLE_SETTLE_MS = 700; // > LEADERBOARD_THROTTLE_MS (500) trailing edge

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getGame = (code) => globalThis.__gameStateManager.getGame(code);

/**
 * MockIO / MockSocket gaps vs. real socket.io that would otherwise masquerade as
 * product bugs (patched here, not in the shared helper):
 *  - `io.to(room).volatile.emit` (every live `updateLeaderboard` broadcast)
 *  - `io.sockets.sockets.get(id)` (getSocketById)
 *  - `socket.to(room).emit` (broadcastToRoomExceptSender)
 */
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

/** Real transport drop: handlers run, then socket.io forgets the socket entirely. */
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
  return socket.getEmittedEvents()
    .map((e) => `${e.event}${e.event === 'error' || e.event.startsWith('word') ? ':' + JSON.stringify(e.data) : ''}`)
    .slice(-25)
    .join(' | ');
}
function lbToMap(leaderboard) {
  return Object.fromEntries((leaderboard || []).map((p) => [p.username, p.score]));
}
function resultsToMap(payload) {
  return Object.fromEntries((payload?.scores || []).map((p) => [p.username, p.totalScore]));
}

/** Board words for one player, distinct from `exclude`, shape-clean, 3-5 letters. */
function boardCandidates(grid, exclude) {
  const trie = getCachedTrie('en');
  return findAllWords(grid, 'en', { minLength: 3, maxLength: 5, maxWords: 2000, trie })
    .map((w) => w.toLowerCase())
    .filter((w) => !exclude.has(w) && !isWordShapeWeird(w, 'en').weird);
}

/** Dictionary words buildable from the wheel (each letter once, must use center).
 *  Shape-filtered for parity with boardCandidates: vowel-less trie junk would be
 *  rejected by live validation (and zeroed at final scoring) anyway. */
function wheelCandidates(puzzle, exclude) {
  const trie = getCachedTrie('en');
  const letters = puzzle.allLetters.map((l) => l.toLowerCase());
  const center = puzzle.centerLetter.toLowerCase();
  const out = [];
  const used = new Array(letters.length).fill(false);
  const walk = (prefix) => {
    if (out.length >= 40 || prefix.length > 6) return;
    const node = getTrieNode(trie, prefix);
    if (!node) return;
    if (prefix.length >= WHEEL_RUSH_MIN_WORD_LEN && node.isWord && prefix.includes(center)
        && !exclude.has(prefix) && !isWordShapeWeird(prefix, 'en').weird) {
      out.push(prefix);
    }
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

/**
 * Submit words through the REAL client event until the server credits one.
 * Returns the accepted word. Throws with the socket's event log on failure.
 */
async function scoreOneWord(mode, socket, gameCode, username, taken, clientView = null) {
  const game = getGame(gameCode);
  // clientView = what THIS client was handed (board / wheel) — used after a
  // reconnect so a wrong or missing resume payload fails the gate.
  const candidates = mode === 'wheel-rush'
    ? wheelCandidates(clientView?.puzzle ?? game.wheelRushState.puzzle, taken)
    : boardCandidates(
      clientView?.grid
        ?? (mode === 'blast' ? getOrInitPlayerBoard(game.blastModeState, username).grid : game.letterGrid),
      taken,
    );
  // Per-socket wordSubmit limiter is 5/s — pace and cap attempts.
  for (const word of candidates.slice(0, 8)) {
    const before = getGame(gameCode).playerScores[username] || 0;
    if (mode === 'wheel-rush') {
      await socket.receiveEvent('submitWheelWord', { word: word.toUpperCase() });
    } else {
      await socket.receiveEvent('submitWord', { word });
    }
    const after = getGame(gameCode).playerScores[username] || 0;
    const accepted = mode === 'wheel-rush'
      ? lastEvent(socket, 'wheelWordResult')?.accepted === true
      : socket.getEmittedEventsByName('wordAccepted').some((e) => e.data?.word === word);
    if (accepted && after > before) {
      taken.add(word);
      return word;
    }
    await sleep(220);
  }
  throw new Error(`[${mode}] ${username} could not score any of ${JSON.stringify(candidates.slice(0, 8))}. Events: ${eventDump(socket)}`);
}

describe('MP two-client gate: score → drop → rejoin → end, per auto-rotated mode', () => {
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

  it('rotation pool is exactly the four gated modes', () => {
    expect([...ALL_GAME_MODES].sort()).toEqual(['blast', 'classic', 'wheel-rush', 'word-hunt']);
  });

  const runRound = async (mode) => {
    const host = shimSocket(env.createSocket(), env.io);
    const joiner = shimSocket(env.createSocket(), env.io);
    const gameData = env.createGameData({ hostUsername: HOST });
    const { gameCode } = gameData;

    // ---- lobby ----
    await host.receiveEvent('createGame', gameData);
    expect(lastEvent(host, 'joined')?.success, eventDump(host)).toBe(true);
    await joiner.receiveEvent('join', env.createJoinData(gameCode, { username: JOINER }));
    expect(lastEvent(joiner, 'joined')?.success, eventDump(joiner)).toBe(true);

    // ---- start (mode forced the way a host pick does) ----
    await host.receiveEvent('startGame', { timerSeconds: 120, language: 'en', gameMode: mode });
    const hostStart = lastEvent(host, 'startGame');
    const joinerStart = lastEvent(joiner, 'startGame');
    expect(hostStart, eventDump(host)).toBeTruthy();
    expect(joinerStart, eventDump(joiner)).toBeTruthy();
    expect(getGame(gameCode).gameMode).toBe(mode);
    expect(joinerStart.gameMode).toBe(mode);

    // Real clients report the end of the 3-2-1 animation; this starts the clock.
    await host.receiveEvent('countdownComplete', { messageId: hostStart.messageId });
    await joiner.receiveEvent('countdownComplete', { messageId: joinerStart.messageId });
    expect(getGame(gameCode).gameState).toBe('in-progress');

    // ---- both score (distinct words: a repeat is 50% confirmation credit) ----
    const taken = new Set();
    await scoreOneWord(mode, host, gameCode, HOST, taken);
    const joinerPreDropWord = await scoreOneWord(mode, joiner, gameCode, JOINER, taken);

    const joinerScoreBeforeDrop = getGame(gameCode).playerScores[JOINER];
    expect(joinerScoreBeforeDrop).toBeGreaterThan(0);

    // ---- joiner drops mid-round, comes back on a NEW socket ----
    await dropSocket(env.io, joiner);
    expect(getGame(gameCode).users[JOINER]?.disconnected).toBe(true);

    const rejoined = shimSocket(env.createSocket(), env.io);
    // Exactly what useMultiplayerSocket.onConnect re-emits for a guest.
    await rejoined.receiveEvent('join', { gameCode, username: JOINER });

    const joined = lastEvent(rejoined, 'joined');
    expect(joined?.success, eventDump(rejoined)).toBe(true);
    expect(joined.reconnected).toBe(true);
    expect(joined.username).toBe(JOINER);

    // Real socket.io serializes; snapshot so later server mutation can't rewrite what the client saw.
    const snap = (v) => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
    const resumeStart = snap(lastEvent(rejoined, 'startGame'));
    expect(resumeStart, eventDump(rejoined)).toBeTruthy();
    expect((resumeStart.myFoundWords || []).map((w) => w.toLowerCase())).toContain(joinerPreDropWord);
    expect(resumeStart.reconnect).toBe(true);
    expect(resumeStart.gameMode).toBe(mode);
    const payloadLb = lbToMap(resumeStart.leaderboard);
    expect(payloadLb[JOINER]).toBe(joinerScoreBeforeDrop);
    expect(payloadLb[HOST]).toBe(getGame(gameCode).playerScores[HOST]);
    expect(payloadLb[HOST]).toBeGreaterThan(0);
    const reconnectLb = lbToMap(lastEvent(rejoined, 'updateLeaderboard')?.leaderboard);
    expect(reconnectLb[JOINER]).toBe(joinerScoreBeforeDrop);
    expect(getGame(gameCode).users[JOINER]?.disconnected).toBe(false);

    // The reconnected client must be able to keep playing from what IT was handed.
    let clientView;
    if (mode === 'wheel-rush') {
      // WheelRushView emits this on mount/reconnect (components/multiplayer/WheelRushView.tsx:357).
      await rejoined.receiveEvent('requestWheelRushState');
      const init = snap(lastEvent(rejoined, 'wheelRushInit'));
      expect(init?.puzzle, eventDump(rejoined)).toBeTruthy();
      expect((init.myWords || []).map((w) => w.toLowerCase())).toContain(joinerPreDropWord);
      clientView = { puzzle: init.puzzle };
    } else if (mode === 'blast') {
      // The joiner's board already cascaded once: the resume must carry THEIR board.
      expect(resumeStart.blastGrid, 'reconnect startGame lacks blastGrid').toBeTruthy();
      clientView = { grid: resumeStart.blastGrid };
    } else {
      expect(resumeStart.letterGrid).toEqual(snap(getGame(gameCode).letterGrid));
      clientView = { grid: resumeStart.letterGrid };
    }
    await scoreOneWord(mode, rejoined, gameCode, JOINER, taken, clientView);

    // ---- settle throttled live leaderboard, snapshot what clients were shown ----
    await sleep(LB_THROTTLE_SETTLE_MS);
    const liveServer = { ...getGame(gameCode).playerScores };
    const hostLiveLb = lbToMap(lastEvent(host, 'updateLeaderboard')?.leaderboard);
    const joinerLiveLb = lbToMap(lastEvent(rejoined, 'updateLeaderboard')?.leaderboard);
    expect(hostLiveLb).toEqual(liveServer);
    expect(joinerLiveLb).toEqual(liveServer);

    // ---- end the round ----
    const hostResults = host.waitForEvent('validatedScores', 15000);
    const joinerResults = rejoined.waitForEvent('validatedScores', 15000);
    await host.receiveEvent('endGame');
    const [{ data: hostPayload }, { data: joinerPayload }] = await Promise.all([hostResults, joinerResults]);
    const serverFinal = { ...getGame(gameCode).playerScores };
    const hostFinal = resultsToMap(hostPayload);
    const joinerFinal = resultsToMap(joinerPayload);

    // Both clients see the same results, equal to server state...
    expect(hostFinal).toEqual(joinerFinal);
    expect(hostFinal).toEqual(serverFinal);
    // ...both non-zero...
    expect(hostFinal[HOST]).toBeGreaterThan(0);
    expect(hostFinal[JOINER]).toBeGreaterThan(0);
    // ...and the results page matches the live leaderboard the players watched.
    expect(hostFinal).toEqual(liveServer);
    return { gameCode, host, rejoined };
  };

  it('classic', () => runRound('classic'));
  it('blast', () => runRound('blast'));
  it('word-hunt', () => runRound('word-hunt'));
  it('wheel-rush', () => runRound('wheel-rush'));

  // Regression (was KNOWN BUG): blast tile bonuses are fractional multipliers
  // (BLAST_TILE_BONUSES gold 1.5, bomb 1.25 ...). The live total used to sum the
  // raw fractions while results rounded per word, so live != results. The server
  // now scores each word ONCE (backend/modules/wordScore.ts) as an integer and
  // both paths read that number. Deterministic fixture: every tile gold,
  // odd-length word => raw tile bonus n*1.5 is x.5.
  it('blast: results total equals live leaderboard when a word crosses a gold tile', async () => {
    const host = shimSocket(env.createSocket(), env.io);
    const joiner = shimSocket(env.createSocket(), env.io);
    const gameData = env.createGameData({ hostUsername: HOST });
    const { gameCode } = gameData;
    await host.receiveEvent('createGame', gameData);
    await joiner.receiveEvent('join', env.createJoinData(gameCode, { username: JOINER }));
    await host.receiveEvent('startGame', { timerSeconds: 120, language: 'en', gameMode: 'blast' });
    expect(getGame(gameCode).gameMode).toBe('blast');

    // Fixture: the joiner's whole board is gold tiles.
    const board = getOrInitPlayerBoard(getGame(gameCode).blastModeState, JOINER);
    board.grid.forEach((row, r) => row.forEach((_, c) => board.overlayMap.set(`${r},${c}`, 'gold')));
    const word = boardCandidates(board.grid, new Set()).find((w) => w.length % 2 === 1);
    expect(word).toBeTruthy();
    await joiner.receiveEvent('submitWord', { word });
    expect(joiner.getEmittedEventsByName('wordAccepted').some((e) => e.data?.word === word), eventDump(joiner)).toBe(true);

    await sleep(LB_THROTTLE_SETTLE_MS);
    const liveLb = lbToMap(lastEvent(joiner, 'updateLeaderboard')?.leaderboard);
    expect(Number.isInteger(liveLb[JOINER]), `live score ${liveLb[JOINER]}`).toBe(true);
    const accepted = joiner.getEmittedEventsByName('wordAccepted').find((e) => e.data?.word === word).data;
    expect(Number.isInteger(accepted.score)).toBe(true);
    const results = joiner.waitForEvent('validatedScores', 15000);
    await host.receiveEvent('endGame');
    const { data } = await results;
    expect(resultsToMap(data)[JOINER]).toBe(liveLb[JOINER]);
  });
});
