import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { mockBroadcast, mockGetGame, mockGetGameUsers } = vi.hoisted(() => ({
  mockBroadcast: vi.fn(),
  mockGetGame: vi.fn(),
  mockGetGameUsers: vi.fn(),
}));

vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: mockBroadcast,
  getGameRoom: (code: string) => `game:${code}`,
}));
vi.mock('../../modules/gameStateManager', () => ({
  getGame: mockGetGame,
  getGameUsers: mockGetGameUsers,
}));

import { broadcastRoomUsers, CLASSROOM_USERS_COALESCE_MS } from '../classroomUsersBroadcast';

const io = {} as never;
let roster: string[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  roster = [];
  mockGetGameUsers.mockImplementation(() => roster.map((username) => ({ username })));
});
afterEach(() => vi.useRealTimers());

const usersBroadcasts = () => mockBroadcast.mock.calls.filter((c) => c[2] === 'updateUsers');

describe('broadcastRoomUsers', () => {
  it('broadcasts every change at once in an ordinary room', () => {
    mockGetGame.mockReturnValue({ isClassroom: false });
    for (const name of ['a', 'b', 'c']) {
      roster.push(name);
      broadcastRoomUsers(io, 'ARC1');
    }
    expect(usersBroadcasts()).toHaveLength(3);
  });

  it('coalesces a class of joins into the first broadcast plus one trailing roster', () => {
    mockGetGame.mockReturnValue({ isClassroom: true });
    for (let i = 0; i < 30; i += 1) {
      roster.push(`s${i}`);
      broadcastRoomUsers(io, 'CLS1');
    }
    expect(usersBroadcasts()).toHaveLength(1);

    vi.advanceTimersByTime(CLASSROOM_USERS_COALESCE_MS);

    expect(usersBroadcasts()).toHaveLength(2);
    expect((usersBroadcasts()[1][3] as { users: unknown[] }).users).toHaveLength(30);
  });

  it('sends nothing extra when only one student joined in the window', () => {
    mockGetGame.mockReturnValue({ isClassroom: true });
    roster.push('solo');
    broadcastRoomUsers(io, 'CLS2');
    vi.advanceTimersByTime(CLASSROOM_USERS_COALESCE_MS * 2);
    expect(usersBroadcasts()).toHaveLength(1);
  });

  it('drops the trailing broadcast once the room is gone', () => {
    mockGetGame.mockReturnValue({ isClassroom: true });
    broadcastRoomUsers(io, 'CLS3');
    broadcastRoomUsers(io, 'CLS3');
    mockGetGame.mockReturnValue(undefined);
    vi.advanceTimersByTime(CLASSROOM_USERS_COALESCE_MS);
    expect(usersBroadcasts()).toHaveLength(1);
  });
});
