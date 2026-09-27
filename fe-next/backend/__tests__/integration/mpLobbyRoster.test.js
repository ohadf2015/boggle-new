/**
 * Lobby roster — the host must see a human joiner in the player list payload.
 *
 * Baseline QA defect #2 (.gauntlet/baseline 08_lobby_host_with_joiner_*): the
 * host's PLAYERS IN ROOM showed Host + bots only. The screenshot was taken while
 * the host's socket was mid-reconnect ("Getting you back..."), so both the live
 * path (joiner arrives while host is connected) and the reconnect path (joiner
 * arrives while host is dropped, host re-emits `join`) are pinned here.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestEnvironment } from '../helpers/socketTestHelper';

vi.mock('../../modules/classroomGameManager', async (importOriginal) => ({
  ...(await importOriginal()),
  beginClassroomRound: vi.fn().mockResolvedValue(null),
  getClassroomGame: vi.fn().mockResolvedValue(null),
  getClassroomGameByCode: vi.fn().mockResolvedValue(null),
  updateClassroomGameState: vi.fn().mockResolvedValue(undefined),
}));

const HOST = 'RosterHost';
const JOINER = 'RosterJoiner';

function lastEvent(socket, name) {
  const evs = socket.getEmittedEventsByName(name);
  return evs.length ? evs[evs.length - 1].data : undefined;
}
const names = (users) => (users || []).map((u) => u.username);

describe('MP lobby roster: host sees human joiners', () => {
  let env;
  beforeEach(() => { env = createTestEnvironment(); });
  afterEach(() => { globalThis.__clearAllGameTimers?.(); env.cleanup(); });

  async function hostWithBots() {
    const host = env.createSocket();
    const gameData = env.createGameData({ hostUsername: HOST });
    await host.receiveEvent('createGame', gameData);
    expect(lastEvent(host, 'joined')?.success).toBe(true);
    await host.receiveEvent('addBot', { difficulty: 'easy' });
    await host.receiveEvent('addBot', { difficulty: 'medium' });
    return { host, gameCode: gameData.gameCode };
  }

  it('connected host receives updateUsers containing the joiner (with bots present)', async () => {
    const { host, gameCode } = await hostWithBots();
    const joiner = env.createSocket();
    await joiner.receiveEvent('join', env.createJoinData(gameCode, { username: JOINER }));
    expect(lastEvent(joiner, 'joined')?.success).toBe(true);

    const hostRoster = names(lastEvent(host, 'updateUsers')?.users);
    expect(hostRoster).toContain(JOINER);
    expect(hostRoster).toContain(HOST);
    expect(hostRoster.length).toBeGreaterThanOrEqual(4); // host + 2 bots + joiner
  });

  it('host that was dropped while the joiner arrived gets the joiner in its reconnect roster', async () => {
    const { host, gameCode } = await hostWithBots();
    host.connected = false;
    await host.receiveEvent('disconnect', 'transport close');

    const joiner = env.createSocket();
    await joiner.receiveEvent('join', env.createJoinData(gameCode, { username: JOINER }));
    expect(lastEvent(joiner, 'joined')?.success).toBe(true);

    const back = env.createSocket();
    await back.receiveEvent('join', { gameCode, username: HOST });
    const joined = lastEvent(back, 'joined');
    expect(joined?.success).toBe(true);
    expect(joined.isHost).toBe(true);
    expect(names(joined.users)).toContain(JOINER);
    // ...and the room-wide roster broadcast reaches the reconnected host socket too.
    expect(names(lastEvent(back, 'updateUsers')?.users)).toContain(JOINER);
  });
});
