import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { handleExistingAuthConnection } from '../gameLifecycleHandler';
import { getAuthUserConnection, getGame, deleteGame } from '../../modules/gameStateManager';
import { getSocketById, disconnectSocket, safeEmit } from '../../utils/socketHelpers';

vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../../modules/gameStateManager');
vi.mock('../../utils/socketHelpers');
vi.mock('../../utils/timerManager', () => ({
  __esModule: true,
  default: { clearTimer: vi.fn(), setTimeout: vi.fn() },
  clearGameTimer: vi.fn(),
}));

const io = {} as any;

function makeSocket(id: string, conn: object) {
  return { id, conn, connected: true, data: {} as Record<string, unknown>, emit: vi.fn(), rooms: new Set([id]), leave: vi.fn() } as any;
}

describe('handleExistingAuthConnection (createGame): two sockets on one connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getGame as Mock).mockReturnValue({ gameCode: 'OLD123', users: {} });
  });

  it('given a ghost socket on the creating socket\'s own connection, when a host opens a new room, then the connection stays and the old room still closes', async () => {
    const conn = {};
    const ghost = makeSocket('ghost', conn);
    const live = makeSocket('live', conn);
    (getAuthUserConnection as Mock).mockReturnValue({ gameCode: 'OLD123', username: 'Host', isHost: true, socketId: ghost.id });
    (getSocketById as Mock).mockReturnValue(ghost);

    await handleExistingAuthConnection(io, live, 'host-1', 'NEW456');

    expect(disconnectSocket).not.toHaveBeenCalled();
    expect(safeEmit).not.toHaveBeenCalledWith(ghost, 'sessionMigrated', expect.anything());
    expect(deleteGame).toHaveBeenCalledWith('OLD123');
  });

  it('given the old socket is another tab\'s connection, when a host opens a new room, then that tab is disconnected', async () => {
    const oldTab = makeSocket('old-tab', {});
    (getAuthUserConnection as Mock).mockReturnValue({ gameCode: 'OLD123', username: 'Host', isHost: true, socketId: oldTab.id });
    (getSocketById as Mock).mockReturnValue(oldTab);

    await handleExistingAuthConnection(io, makeSocket('new-tab', {}), 'host-1', 'NEW456');

    expect(safeEmit).toHaveBeenCalledWith(oldTab, 'sessionMigrated', expect.anything());
    expect(disconnectSocket).toHaveBeenCalledWith(oldTab, true);
  });
});
