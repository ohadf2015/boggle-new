import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resolveJoinIdentity } from '../playerJoinIdentity';
import { getAuthUserConnection, getGame, deleteGame } from '../../modules/gameStateManager';
import { safeEmit, broadcastToRoom, getSocketById } from '../../utils/socketHelpers';
import type { GameState } from '../../modules/gameState/types';
import type { ClassroomSeat } from '../classroomSeatGate';

vi.mock('../../modules/gameStateManager');
vi.mock('../../utils/socketHelpers');
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../../modules/botManager', () => ({ cleanupGameBots: vi.fn() }));
vi.mock('../../modules/tournamentManager', () => ({
  addPlayerMidTournament: vi.fn(), getTournament: vi.fn(), getTournamentStandings: vi.fn(),
}));

const io = {} as never;
const socket = { id: 'tab-b', data: {}, emit: vi.fn() } as never;
const quickPlayRoom = { users: {}, hostSocketId: 'someone' } as unknown as GameState;
const noClassroom = { game: null } as unknown as ClassroomSeat;
const input = { username: 'Ms T', authUserId: 'teacher-1', guestTokenHash: undefined, verifiedUserId: 'teacher-1', wantsPracticeSeat: false, hostSeat: false };

describe('joining another room while hosting a live classroom game', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthUserConnection).mockReturnValue({ gameCode: 'CLASS1', socketId: 'board-sock', username: 'Ms T', isHost: true, connectedAt: 0 });
    vi.mocked(getSocketById).mockReturnValue({ id: 'board-sock', connected: true, data: {} } as never);
  });

  it('keeps the board and its students, and seats the new tab without the account', async () => {
    vi.mocked(getGame).mockImplementation(((code: string) => (code === 'CLASS1' ? { isClassroom: true, users: {} } : quickPlayRoom)) as never);

    const identity = await resolveJoinIdentity(io, socket, quickPlayRoom, 'QP1', noClassroom, input);

    expect(identity.authUserId).toBeUndefined();
    expect(deleteGame).not.toHaveBeenCalled();
    expect(broadcastToRoom).not.toHaveBeenCalledWith(expect.anything(), expect.anything(), 'hostLeftRoomClosing', expect.anything());
    expect(safeEmit).not.toHaveBeenCalledWith(expect.anything(), 'sessionMigrated', expect.anything());
  });

  it('still closes an arcade room its host leaves for another game', async () => {
    vi.mocked(getGame).mockImplementation(((code: string) => (code === 'CLASS1' ? { isClassroom: false, users: {} } : quickPlayRoom)) as never);

    const identity = await resolveJoinIdentity(io, socket, quickPlayRoom, 'QP1', noClassroom, input);

    expect(identity.authUserId).toBe('teacher-1');
    expect(deleteGame).toHaveBeenCalledWith('CLASS1');
  });
});
