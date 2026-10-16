import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../../modules/gameStateManager', () => ({
  getGame: vi.fn(),
  getGameBySocketId: vi.fn(),
  getUsernameBySocketId: vi.fn(),
}));
vi.mock('../../utils/rateLimiter', () => ({ checkRateLimit: vi.fn(() => true) }));

import { getGame, getGameBySocketId, getUsernameBySocketId } from '../../modules/gameStateManager';
import { registerBlastBoardResyncHandler } from '../blastBoardResyncHandler';
import { initBlastModeState } from '../../modules/blastModeManager';

function fakeSocket() {
  const handlers: Record<string, () => void> = {};
  return {
    id: 's1',
    connected: true,
    handlers,
    on: vi.fn((ev: string, fn: () => void) => { handlers[ev] = fn; }),
    emit: vi.fn(),
  };
}

const GRID = [['c', 'a', 't'], ['d', 'o', 'g'], ['b', 'e', 'e']];

describe('blastRequestBoard', () => {
  beforeEach(() => vi.clearAllMocks());

  it("answers with the requesting player's own evolved board", () => {
    const state = initBlastModeState(GRID, ['ana', 'ben'], 1, 42);
    state.playerBoards = {
      ana: { ...JSON.parse(JSON.stringify({ grid: [['x', 'a', 't'], ['d', 'o', 'g'], ['b', 'e', 'e']], tileStates: [] })), totalMoves: 4 } as never,
    };
    (getGameBySocketId as ReturnType<typeof vi.fn>).mockReturnValue('ROOM');
    (getUsernameBySocketId as ReturnType<typeof vi.fn>).mockReturnValue('ana');
    (getGame as ReturnType<typeof vi.fn>).mockReturnValue({ gameMode: 'blast', blastModeState: state });

    const socket = fakeSocket();
    registerBlastBoardResyncHandler(socket as never);
    socket.handlers.blastRequestBoard();

    expect(socket.emit).toHaveBeenCalledWith('blastBoardUpdate', expect.objectContaining({
      grid: [['x', 'a', 't'], ['d', 'o', 'g'], ['b', 'e', 'e']],
      clearedBy: '__server_resync__',
      totalMoves: 4,
    }));
  });

  it('stays quiet outside a blast round', () => {
    (getGameBySocketId as ReturnType<typeof vi.fn>).mockReturnValue('ROOM');
    (getUsernameBySocketId as ReturnType<typeof vi.fn>).mockReturnValue('ana');
    (getGame as ReturnType<typeof vi.fn>).mockReturnValue({ gameMode: 'classic' });

    const socket = fakeSocket();
    registerBlastBoardResyncHandler(socket as never);
    socket.handlers.blastRequestBoard();

    expect(socket.emit).not.toHaveBeenCalled();
  });
});
