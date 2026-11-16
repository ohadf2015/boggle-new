import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const { mockBroadcast, mockGetGame, mockGetGameUsers, mockGetGameBySocketId, mockGetClassroomGame } = vi.hoisted(() => ({
  mockBroadcast: vi.fn(),
  mockGetGame: vi.fn(),
  mockGetGameUsers: vi.fn(),
  mockGetGameBySocketId: vi.fn(),
  mockGetClassroomGame: vi.fn(),
}));

vi.mock('../../utils/socketHelpers', () => ({
  broadcastToRoom: mockBroadcast,
  getGameRoom: (code: string) => `game:${code}`,
}));
vi.mock('../../modules/gameStateManager', () => ({
  getGame: mockGetGame,
  getGameUsers: mockGetGameUsers,
  getGameBySocketId: mockGetGameBySocketId,
}));
vi.mock('../../modules/classroomGameManager', () => ({
  getClassroomGame: mockGetClassroomGame,
}));

import {
  buildClassroomRoster,
  broadcastClassroomRoster,
  registerClassroomRosterRequest,
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

  it('does not count the teacher when their seat is not flagged host — auth id lives on the raw user, not the broadcast row', async () => {
    mockGetGame.mockReturnValue({
      isClassroom: true,
      users: { Teach: { authUserId: 't1' } },
    });
    mockGetGameUsers.mockReturnValue([{ username: 'Teach', disconnected: false }, { username: 'Ada', disconnected: false }]);
    mockGetClassroomGame.mockResolvedValue({ teacherId: 't1', players: [] });
    const payload = await buildClassroomRoster('CLS1');
    expect(payload?.students).toEqual([{ username: 'Ada', connected: true }]);
  });

  it('unions QR/link joiners (only named in-memory) and keeps bots and the practice seat flagged', async () => {
    mockGetGameUsers.mockReturnValue([
      { username: 'Teach', isHost: true },
      { username: 'Ada', disconnected: false },
      { username: 'LinkKid', disconnected: true, authUserId: 's9' },
      { username: 'Bot', isBot: true, disconnected: false },
      { username: 'Ms Lee', isPractice: true, disconnected: false, authUserId: 't1' },
      { username: 'GuestTry', disconnected: false }, // connected guest: visible while here
      { username: 'GuestGone', disconnected: true }, // phone slept; seat still held — still joined
    ]);
    mockGetClassroomGame.mockResolvedValue({ teacherId: 't1', players: [{ userId: 's1', username: 'Ada' }] });
    const payload = await buildClassroomRoster('CLS1');
    expect(payload?.students).toEqual([
      { username: 'Ada', connected: true },
      { username: 'LinkKid', connected: false },
      { username: 'Bot', connected: true, isBot: true },
      { username: 'Ms Lee', connected: true, isPractice: true },
      { username: 'GuestTry', connected: true },
      { username: 'GuestGone', connected: false },
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

  it('a slow first roster read does not overwrite a newer send', async () => {
    let releaseFirst: (value: unknown) => void = () => {};
    mockGetClassroomGame
      .mockImplementationOnce(() => new Promise((resolve) => { releaseFirst = resolve; }))
      .mockResolvedValue({ teacherId: 't1', players: [{ userId: 's2', username: 'Ben' }] });
    broadcastClassroomRoster(io, 'CLS1');
    broadcastClassroomRoster(io, 'CLS1');
    await vi.advanceTimersByTimeAsync(CLASSROOM_ROSTER_COALESCE_MS);
    await vi.waitFor(() => expect(rosterBroadcasts()).toHaveLength(1));
    releaseFirst({ teacherId: 't1', players: [{ userId: 's1', username: 'Ada' }] });
    await vi.advanceTimersByTimeAsync(0);
    expect(rosterBroadcasts()).toHaveLength(1);
    expect(rosterBroadcasts()[0][3]).toEqual({
      gameCode: 'CLS1',
      students: [{ username: 'Ben', connected: false }],
    });
  });

  it('never emits for an ordinary room', () => {
    mockGetGame.mockReturnValue({ isClassroom: false });
    broadcastClassroomRoster(io, 'ARC1');
    vi.advanceTimersByTime(CLASSROOM_ROSTER_COALESCE_MS * 2);
    expect(rosterBroadcasts()).toHaveLength(0);
  });
});

describe('registerClassroomRosterRequest', () => {
  function seat(handlers: Record<string, () => void>) {
    return {
      id: 'sock-1',
      on: (event: string, handler: () => void) => {
        handlers[event] = handler;
      },
      emit: vi.fn(),
    };
  }

  it('answers from the socket’s own room, ignoring any code the client claims', async () => {
    const handlers: Record<string, () => void> = {};
    const socket = seat(handlers);
    mockGetGameBySocketId.mockReturnValue('REMAFZ');
    mockGetClassroomGame.mockResolvedValue({
      teacherId: 't1',
      players: [
        { userId: 's1', username: 'Ada' },
        { userId: 's2', username: 'Ben' },
      ],
    });
    mockGetGameUsers.mockReturnValue([{ username: 'Ada', disconnected: false }]);

    registerClassroomRosterRequest(socket as never);
    handlers.requestClassroomRoster?.();
    await vi.waitFor(() => expect(socket.emit).toHaveBeenCalledTimes(1));

    expect(mockGetGameBySocketId).toHaveBeenCalledWith('sock-1');
    expect(socket.emit).toHaveBeenCalledWith('classroomRosterUpdate', {
      gameCode: 'REMAFZ',
      students: [
        { username: 'Ada', connected: true },
        { username: 'Ben', connected: false },
      ],
    });
    expect(rosterBroadcasts()).toHaveLength(0);
  });

  it('stays silent when the socket is not seated, so a claimed code cannot pull another room', async () => {
    const handlers: Record<string, () => void> = {};
    const socket = seat(handlers);
    mockGetGameBySocketId.mockReturnValue(null);

    registerClassroomRosterRequest(socket as never);
    handlers.requestClassroomRoster?.();
    await vi.advanceTimersByTimeAsync(50);

    expect(socket.emit).not.toHaveBeenCalled();
    expect(mockGetClassroomGame).not.toHaveBeenCalled();
  });

  it('stays silent for an ordinary room', async () => {
    const handlers: Record<string, () => void> = {};
    const socket = seat(handlers);
    mockGetGameBySocketId.mockReturnValue('ARC1');
    mockGetGame.mockReturnValue({ isClassroom: false });

    registerClassroomRosterRequest(socket as never);
    handlers.requestClassroomRoster?.();
    await vi.advanceTimersByTimeAsync(50);

    expect(socket.emit).not.toHaveBeenCalled();
  });
});
