import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({ game: null as unknown, code: 'ROOM' as string | null, user: 'ana' as string | null }));

vi.mock('../gameStateManager.js', () => ({
  getGameBySocketId: () => state.code,
  getUsernameBySocketId: () => state.user,
  getGame: () => state.game,
}));

import { registerRivalSync } from '../rivalSync';
import { resetRivalsForNewRound } from '../rivalPairs';

function fakeSocket() {
  const handlers: Record<string, () => void> = {};
  const emitted: Array<{ event: string; data: unknown }> = [];
  const socket = {
    id: 'sock-ana',
    on: (event: string, fn: () => void) => { handlers[event] = fn; },
    emit: (event: string, data: unknown) => emitted.push({ event, data }),
  };
  return { socket: socket as never, handlers, emitted };
}

const io = { to: () => ({ emit: () => undefined }) } as never;

describe('rivalSync', () => {
  beforeEach(() => {
    state.code = 'ROOM';
    state.user = 'ana';
    const game = {
      users: { ana: { socketId: 'sock-ana', avatar: null }, bo: { socketId: 'sock-bo', avatar: null } },
      playerScores: { ana: 4, bo: 1 },
      gameSessionId: 9,
      gameState: 'in-progress',
    };
    resetRivalsForNewRound(game as never, { enabled: true, mode: 'classic', seed: 's', abilities: {} });
    state.game = game;
  });

  it('Given a paired student mid-round, When their chip asks to sync, Then they get their rival with both scores', () => {
    const { socket, handlers, emitted } = fakeSocket();
    registerRivalSync(io, socket);
    handlers.rivalSync();
    expect(emitted).toEqual([{
      event: 'rivalUpdate',
      data: { gameSessionId: 9, rival: { rivalName: 'bo', rivalAvatar: null, myScore: 4, rivalScore: 1 } },
    }]);
  });

  it('Given a socket with no game, When it asks, Then it gets an empty answer rather than silence', () => {
    state.code = null;
    const { socket, handlers, emitted } = fakeSocket();
    registerRivalSync(io, socket);
    handlers.rivalSync();
    expect(emitted).toEqual([{ event: 'rivalUpdate', data: { gameSessionId: null, rival: null } }]);
  });
});
