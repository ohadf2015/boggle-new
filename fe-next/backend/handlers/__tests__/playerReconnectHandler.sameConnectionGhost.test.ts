import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { handleExistingAuthConnectionJoin } from '../playerReconnectHandler';
import { getAuthUserConnection } from '../../modules/gameStateManager';
import { getSocketById, disconnectSocket, safeEmit } from '../../utils/socketHelpers';

vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../../modules/gameStateManager');
vi.mock('../../utils/socketHelpers');
vi.mock('../../utils/timerManager', () => ({
  __esModule: true,
  default: { clearTimer: vi.fn(), setTimeout: vi.fn() },
  clearGameTimer: vi.fn(),
}));
vi.mock('../../modules/tournamentManager', () => ({
  addPlayerMidTournament: vi.fn(),
  getTournament: vi.fn(),
  getTournamentStandings: vi.fn(),
}));
vi.mock('../../modules/botManager', () => ({ cleanupGameBots: vi.fn() }));

const io = {} as any;
const HOST = { gameCode: 'JU35M6', username: 'Nate Taylor', isHost: true };

function makeSocket(id: string, conn: object) {
  return { id, conn, connected: true, data: {} as Record<string, unknown>, emit: vi.fn(), rooms: new Set([id, 'game-JU35M6']), leave: vi.fn() } as any;
}

describe('handleExistingAuthConnectionJoin: two sockets on one connection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    (disconnectSocket as Mock).mockImplementation(() => {});
  });
  afterEach(() => vi.useRealTimers());

  it('given a ghost socket on the joining socket\'s own connection, when two host joins arrive in the same tick, then the connection is never torn down', async () => {
    const conn = {};
    const ghost = makeSocket('o1j8X', conn);
    const live = makeSocket('b-bwn', conn);
    (getAuthUserConnection as Mock).mockReturnValue({ ...HOST, socketId: ghost.id });
    (getSocketById as Mock).mockImplementation((_io, id) => (id === ghost.id ? ghost : live));

    const [first, second] = await Promise.all([
      handleExistingAuthConnectionJoin(io, live, 'teacher-1', 'JU35M6', 'Nate Taylor'),
      handleExistingAuthConnectionJoin(io, live, 'teacher-1', 'JU35M6', 'Nate Taylor'),
    ]);
    vi.advanceTimersByTime(500);

    expect(disconnectSocket).not.toHaveBeenCalled();
    expect(safeEmit).not.toHaveBeenCalledWith(ghost, 'sessionTakenOver', expect.anything());
    expect(first).toEqual({ handled: true, existingUsername: 'Nate Taylor', isHost: true });
    expect(second).toEqual(first);
    expect(ghost.data.migrating).toBe(true);
    expect(ghost.leave).toHaveBeenCalledWith('game-JU35M6');
    expect(ghost.leave).not.toHaveBeenCalledWith(ghost.id);
  });

  it('given the old socket is another tab\'s connection, when the account joins the same room, then that tab is still taken over', async () => {
    const oldTab = makeSocket('old-tab', {});
    const newTab = makeSocket('new-tab', {});
    (getAuthUserConnection as Mock).mockReturnValue({ ...HOST, socketId: oldTab.id });
    (getSocketById as Mock).mockReturnValue(oldTab);

    await handleExistingAuthConnectionJoin(io, newTab, 'teacher-1', 'JU35M6', 'Nate Taylor');
    vi.advanceTimersByTime(500);

    expect(safeEmit).toHaveBeenCalledWith(oldTab, 'sessionTakenOver', expect.anything());
    expect(disconnectSocket).toHaveBeenCalledWith(oldTab, true);
  });

  it('given a ghost on the same connection in another room, when the account joins a new room, then the shared connection survives', async () => {
    const conn = {};
    const ghost = makeSocket('ghost', conn);
    const live = makeSocket('live', conn);
    (getAuthUserConnection as Mock).mockReturnValue({ gameCode: 'OLD123', username: 'P', isHost: false, socketId: ghost.id });
    (getSocketById as Mock).mockReturnValue(ghost);

    await handleExistingAuthConnectionJoin(io, live, 'player-1', 'NEW456', 'P');

    expect(disconnectSocket).not.toHaveBeenCalled();
    expect(safeEmit).not.toHaveBeenCalledWith(ghost, 'sessionMigrated', expect.anything());
  });
});
