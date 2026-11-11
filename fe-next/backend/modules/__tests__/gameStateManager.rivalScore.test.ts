/** Every score write goes through gameStateManager, so the duel hook there must reach both rivals' own sockets. */
vi.mock('../supabaseServer', () => ({ getSupabase: vi.fn().mockReturnValue(null) }));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../gameState/persistence', () => ({
  persistGameState: vi.fn(),
  persistGameStateNow: vi.fn().mockResolvedValue(undefined),
  restoreGameFromRedis: vi.fn().mockResolvedValue(null),
  restoreAllGamesFromRedis: vi.fn().mockResolvedValue(0),
  getAllGameCodesFromRedis: vi.fn().mockResolvedValue([]),
  deleteGameFromRedis: vi.fn(),
  clearPersistTimer: vi.fn(),
}));
vi.mock('../../services/gameLifecycle/gameResults', () => ({ clearEngagementTimeouts: vi.fn() }));

import { vi } from 'vitest';
import gsm from '../gameStateManager';
import { startRivalRound } from '../rivalSocket';
import { RIVAL_EVENTS } from '@/shared/types/rivalry';

const emitted: Array<{ to: string; event: string; payload: unknown }> = [];
const io = { to: (to: string) => ({ emit: (event: string, payload: unknown) => { emitted.push({ to, event, payload }); } }) };

function duelRoom() {
  const game = gsm.createGame('DUEL1', { hostSocketId: 'socket-teacher', hostUsername: 'Teacher', hostPlayerId: 'p-t', roomName: 'R', language: 'en', isRanked: false });
  gsm.addUserToGame('DUEL1', 'Teacher', 'socket-teacher');
  gsm.addUserToGame('DUEL1', 'Ana', 'socket-ana', { authUserId: 'auth-ana' } as never);
  gsm.addUserToGame('DUEL1', 'Ben', 'socket-ben', { authUserId: 'auth-ben' } as never);
  game.users.Teacher.isHost = true;
  game.gameMode = 'classic';
  game.gameSessionId = 1;
  startRivalRound(io as never, 'DUEL1', game, { classroomId: undefined, settings: {} } as never, {});
  emitted.length = 0;
  return game;
}

describe('rival duel score hook', () => {
  afterEach(() => { gsm.clearAllGames(); });

  it('Given Ana and Ben are rivals, When Ana scores, Then each of them hears the new duel on their own socket and the teacher hears nothing', () => {
    duelRoom();
    gsm.updatePlayerScore('DUEL1', 'Ana', 6, true);
    const updates = emitted.filter((e) => e.event === RIVAL_EVENTS.update);
    expect(updates.map((u) => u.to).sort()).toEqual(['socket-ana', 'socket-ben']);
    expect(updates.find((u) => u.to === 'socket-ana')?.payload).toMatchObject({ rival: { rivalName: 'Ben', myScore: 6, rivalScore: 0 } });
    expect(emitted.some((e) => e.to === 'socket-teacher')).toBe(false);
  });

  it('Given a peer-rejected word, When its points come off, Then the duel is re-sent', () => {
    duelRoom();
    gsm.updatePlayerScore('DUEL1', 'Ana', 6, true);
    emitted.length = 0;
    gsm.removePeerRejectedWordScore('DUEL1', 'zzz', 'Ana');
    expect(emitted.filter((e) => e.event === RIVAL_EVENTS.update).map((u) => u.to).sort()).toEqual(['socket-ana', 'socket-ben']);
  });
});
