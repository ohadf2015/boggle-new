import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { mockBroadcast, mockGetGame, mockGetGameUsers, mockGetClassroomGame } = vi.hoisted(() => ({
  mockBroadcast: vi.fn(),
  mockGetGame: vi.fn(),
  mockGetGameUsers: vi.fn(),
  mockGetClassroomGame: vi.fn(),
}));

vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: mockBroadcast,
  getGameRoom: (code: string) => `game:${code}`,
}));
vi.mock('../../modules/gameStateManager', () => ({
  getGame: mockGetGame,
  getGameUsers: mockGetGameUsers,
}));
vi.mock('../../modules/classroomGameManager', () => ({
  getClassroomGame: mockGetClassroomGame,
}));

import {
  buildClassroomRoster,
  broadcastClassroomRoster,
  CLASSROOM_ROSTER_COALESCE_MS,
} from '../classroomRosterBroadcast';

const io = {} as never;

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mockGetGame.mockReturnValue({ isClassroom: true });
  mockGetGameUsers.mockReturnValue([]);
  mockGetClassroomGame.mockResolvedValue(null);
});
afterEach(() => vi.useRealTimers());

const rosterBroadcasts = () => mockBroadcast.mock.calls.filter((c) => c[2] === 'classroomRosterUpdate');

describe('buildClassroomRoster', () => {
  it('returns null for an ordinary room — non-classroom lobbies never see this event', async () => {
    mockGetGame.mockReturnValue({ isClassroom: false });
    expect(await buildClassroomRoster('ARC1')).toBeNull();
    expect(rosterBroadcasts()).toHaveLength(0);
  });

  it('redis down degrades to the in-memory view, not a throw', async () => {
    mockGetClassroomGame.mockRejectedValue(new Error('redis down'));
    mockGetGameUsers.mockReturnValue([{ username: 'Ada', disconnected: false }]);
    await expect(buildClassroomRoster('CLS1')).resolves.toEqual({
      gameCode: 'CLS1',
      students: [{ username: 'Ada', connected: true }],
    });
  });

  it('lists joined students from the Redis record even when their socket is gone', async () => {
    mockGetGameUsers.mockReturnValue([
      { username: 'Ada', disconnected: false },
    ]);
    mockGetClassroomGame.mockResolvedValue({
      teacherId: 't1',
      players: [
        { userId: 's1', username: 'Ada' },
        { userId: 's2', username: 'Ben' }, // socket dropped — still joined
        { userId: 't1', username: 'Teach' }, // the teacher, defensively excluded
      ],
    });
    const payload = await buildClassroomRoster('CLS1');
    expect(payload).toEqual({
      gameCode: 'CLS1',
      students: [
        { username: 'Ada', connected: true },
        { username: 'Ben', connected: false },
      ],
    });
  });

  it('unions QR/link joiners (only named in-memory) and keeps bots and the practice seat flagged', async () => {
    mockGetGameUsers.mockReturnValue([
      { username: 'Teach', isHost: true },
      { username: 'Ada', disconnected: false },
      { username: 'LinkKid', disconnected: true, authUserId: 's9' },
      { username: 'Bot', isBot: true, disconnected: false },
      { username: 'Ms Lee', isPractice: true, disconnected: false, authUserId: 't1' },
      { username: 'GuestTry', disconnected: false }, // connected guest: visible while here
      { username: 'GuestGone', disconnected: true }, // dropped guest: no identity to keep
    ]);
    mockGetClassroomGame.mockResolvedValue({ teacherId: 't1', players: [{ userId: 's1', username: 'Ada' }] });
    const payload = await buildClassroomRoster('CLS1');
    expect(payload?.students).toEqual([
      { username: 'Ada', connected: true },
      { username: 'LinkKid', connected: false },
      { username: 'Bot', connected: true, isBot: true },
      { username: 'Ms Lee', connected: true, isPractice: true },
      { username: 'GuestTry', connected: true },
    ]);
  });
});

describe('broadcastClassroomRoster', () => {
  it('coalesces a join storm into one immediate roster plus one trailing roster', async () => {
    mockGetClassroomGame.mockResolvedValue({ teacherId: 't1', players: [] });
    broadcastClassroomRoster(io, 'CLS1');
    for (let i = 0; i < 30; i += 1) broadcastClassroomRoster(io, 'CLS1');
    await vi.waitFor(() => expect(rosterBroadcasts()).toHaveLength(1));

    await vi.advanceTimersByTimeAsync(CLASSROOM_ROSTER_COALESCE_MS);
    expect(rosterBroadcasts()).toHaveLength(2);
  });

  it('never emits for an ordinary room', () => {
    mockGetGame.mockReturnValue({ isClassroom: false });
    broadcastClassroomRoster(io, 'ARC1');
    vi.advanceTimersByTime(CLASSROOM_ROSTER_COALESCE_MS * 2);
    expect(rosterBroadcasts()).toHaveLength(0);
  });
});
