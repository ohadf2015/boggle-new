/**
 * A seat that joins while the host's start is still dealing the board waits for
 * that start, then gets the real board and the full round clock: never the
 * restart-recovery path with an empty grid and a stale remaining time.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment } from '../helpers/socketTestHelper';
import { beginClassroomRound } from '../../modules/classroomGameManager';
import { hasGameTimer } from '../../utils/timerManager';
import gameStartCoordinator from '../../utils/gameStartCoordinator';

vi.mock('../../modules/classroomGameManager', async (importOriginal) => ({
  ...(await importOriginal()),
  beginClassroomRound: vi.fn().mockResolvedValue(null),
  getClassroomGame: vi.fn().mockResolvedValue(null),
  getClassroomGameByCode: vi.fn().mockResolvedValue(null),
  updateClassroomGameState: vi.fn().mockResolvedValue(undefined),
}));

vi.setConfig({ testTimeout: 60000 });

const HOST = 'StartRaceHost';
const FIRST = 'StartRaceFirst';
const LATE = 'StartRaceLate';
const getGame = (code) => globalThis.__gameStateManager.getGame(code);
const ticks = async (n = 20) => { for (let i = 0; i < n; i++) await new Promise((r) => setImmediate(r)); };

function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

describe('join during a round start', () => {
  let env;
  const codes = [];
  beforeEach(() => {
    env = createTestEnvironment();
    env.io.sockets.sockets = env.io.sockets;
  });
  afterEach(() => {
    for (const code of codes.splice(0)) gameStartCoordinator.cleanupSequence(code);
    globalThis.__clearAllGameTimers?.();
    env.cleanup();
  });

  it('Given a start still dealing the board, When a seat joins, Then it waits and gets the real board and the full clock', async () => {
    const host = env.createSocket();
    const gameData = env.createGameData({ hostUsername: HOST });
    const { gameCode } = gameData;
    codes.push(gameCode);
    await host.receiveEvent('createGame', gameData);
    await env.createSocket().receiveEvent('join', env.createJoinData(gameCode, { username: FIRST }));
    const game = getGame(gameCode);
    game.remainingTime = 76;

    const gate = deferred();
    beginClassroomRound.mockImplementationOnce(() => gate.promise.then(() => null));
    const starting = host.receiveEvent('startGame', { timerSeconds: 180, language: 'en', gameMode: 'classic' });
    await vi.waitFor(() => expect(beginClassroomRound).toHaveBeenCalled(), { timeout: 30000 });

    const late = env.createSocket();
    const joining = late.receiveEvent('join', env.createJoinData(gameCode, { username: LATE }));
    await ticks();

    expect(hasGameTimer(gameCode), 'join started the round clock as restart recovery').toBe(false);
    expect(late.getEmittedEventsByName('startGame')).toHaveLength(0);

    gate.resolve();
    await starting;
    await joining;

    const starts = late.getEmittedEventsByName('startGame').map((e) => e.data);
    expect(starts.length).toBeGreaterThan(0);
    for (const start of starts) {
      expect(start.letterGrid?.length).toBeGreaterThan(0);
      expect(start.letterGrid).toEqual(getGame(gameCode).letterGrid);
      expect(start.timerSeconds).toBe(180);
    }
    expect(hasGameTimer(gameCode), 'clock ran before the countdown').toBe(false);
  });

  it('Given a start still dealing the board, When a seated player asks for the game state, Then no clock starts and no empty board is sent', async () => {
    const host = env.createSocket();
    const gameData = env.createGameData({ hostUsername: HOST });
    const { gameCode } = gameData;
    codes.push(gameCode);
    await host.receiveEvent('createGame', gameData);
    const first = env.createSocket();
    await first.receiveEvent('join', env.createJoinData(gameCode, { username: FIRST }));
    getGame(gameCode).remainingTime = 76;

    const gate = deferred();
    beginClassroomRound.mockImplementationOnce(() => gate.promise.then(() => null));
    const starting = host.receiveEvent('startGame', { timerSeconds: 180, language: 'en', gameMode: 'classic' });
    await vi.waitFor(() => expect(beginClassroomRound).toHaveBeenCalled(), { timeout: 30000 });

    await first.receiveEvent('requestGameState');
    expect(hasGameTimer(gameCode), 'recovery started the clock mid-start').toBe(false);
    for (const e of first.getEmittedEventsByName('startGame')) expect(e.data.letterGrid?.length).toBeGreaterThan(0);

    gate.resolve();
    await starting;
    await vi.waitFor(() => expect(first.getEmittedEventsByName('startGame').length).toBeGreaterThan(1));
    for (const e of first.getEmittedEventsByName('startGame')) expect(e.data.letterGrid).toEqual(getGame(gameCode).letterGrid);
  });
});
