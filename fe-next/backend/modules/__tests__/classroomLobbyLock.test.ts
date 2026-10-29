import { vi } from 'vitest';

const { mockGetClassroomGame, mockSetex } = vi.hoisted(() => ({
  mockGetClassroomGame: vi.fn(),
  mockSetex: vi.fn(),
}));

vi.mock('../../redisClient', () => ({ getRedisClient: () => ({ setex: mockSetex }) }));
vi.mock('../classroomGameManager', () => ({
  CLASSROOM_GAME_TTL: 14400,
  getClassroomGame: mockGetClassroomGame,
  withClassroomGameLock: (_code: string, fn: () => Promise<unknown>) => fn(),
}));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { isLockedOut, lockSeatsOf, setClassroomLobbyLocked } from '../classroomLobbyLock';

const record = (settings: Record<string, unknown> = {}) => ({ teacherId: 't1', settings }) as never;

describe('isLockedOut', () => {
  const base = { users: {}, username: 'Newbie', authUserId: undefined, hasSocket: false };

  it('GIVEN an ordinary multiplayer room (no classroom record) THEN nobody is locked out', () => {
    expect(isLockedOut(null, base)).toBe(false);
  });

  it('GIVEN an unlocked classroom THEN a new joiner gets in', () => {
    expect(isLockedOut(record(), base)).toBe(false);
    expect(isLockedOut(record({ lobbyLocked: false }), base)).toBe(false);
  });

  it('GIVEN a locked classroom THEN a brand-new joiner is turned away', () => {
    expect(isLockedOut(record({ lobbyLocked: true }), base)).toBe(true);
  });

  it('GIVEN a locked classroom THEN a seated student rejoining is let back in', () => {
    expect(isLockedOut(record({ lobbyLocked: true }), { ...base, users: { Newbie: {} } })).toBe(false);
    expect(isLockedOut(record({ lobbyLocked: true }), { ...base, hasSocket: true })).toBe(false);
  });

  it('GIVEN a student seated when the room was locked WHEN their phone slept past the grace and they rejoin THEN they get in', () => {
    const locked = record({ lobbyLocked: true, lobbyLockedSeats: lockSeatsOf([{ authUserId: 'u1' }, { guestTokenHash: 'hash-1' }]) });
    expect(isLockedOut(locked, { ...base, authUserId: 'u1' })).toBe(false);
    expect(isLockedOut(locked, { ...base, guestTokenHash: 'hash-1' })).toBe(false);
    expect(isLockedOut(locked, { ...base, guestTokenHash: 'hash-2' })).toBe(true);
  });

  it('GIVEN a locked classroom THEN the teacher always gets in', () => {
    expect(isLockedOut(record({ lobbyLocked: true }), { ...base, authUserId: 't1' })).toBe(false);
  });
});

describe('lockSeatsOf', () => {
  it('collects the durable identity of every seated human', () => {
    const seats = lockSeatsOf([{ authUserId: 'u1' }, { guestTokenHash: 'h1' }, { authUserId: null, guestTokenHash: null }]);
    expect(seats).toHaveLength(2);
    expect(seats[0]).toBe('a:u1');
  });

  it('never stores the raw guest token hash, which students can read back from the room settings', () => {
    const [seat] = lockSeatsOf([{ guestTokenHash: 'secret-hash' }]);
    expect(seat).toMatch(/^g:[0-9a-f]{24}$/);
    expect(seat).not.toContain('secret-hash');
  });
});

describe('setClassroomLobbyLocked', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GIVEN a live record WHEN locked THEN the flag is stored alongside the other settings', async () => {
    mockGetClassroomGame.mockResolvedValue({ gameCode: 'ABC123', settings: { gameMode: 'classic' } });
    await expect(setClassroomLobbyLocked('ABC123', true)).resolves.toBe(true);
    const [key, ttl, json] = mockSetex.mock.calls[0];
    expect(key).toBe('classroom_game:ABC123');
    expect(ttl).toBe(14400);
    expect(JSON.parse(json).settings).toEqual({ gameMode: 'classic', lobbyLocked: true, lobbyLockedSeats: [] });
  });

  it('GIVEN seats WHEN locked THEN they are kept, and unlocking drops them', async () => {
    mockGetClassroomGame.mockResolvedValue({ gameCode: 'ABC123', settings: {} });
    await setClassroomLobbyLocked('ABC123', true, ['a:u1']);
    expect(JSON.parse(mockSetex.mock.calls[0][2]).settings).toEqual({ lobbyLocked: true, lobbyLockedSeats: ['a:u1'] });

    mockGetClassroomGame.mockResolvedValue({ gameCode: 'ABC123', settings: { lobbyLocked: true, lobbyLockedSeats: ['a:u1'] } });
    await setClassroomLobbyLocked('ABC123', false);
    expect(JSON.parse(mockSetex.mock.calls[1][2]).settings).toEqual({ lobbyLocked: false });
  });

  it('GIVEN no record THEN it reports failure instead of writing', async () => {
    mockGetClassroomGame.mockResolvedValue(null);
    await expect(setClassroomLobbyLocked('ABC123', true)).resolves.toBe(false);
    expect(mockSetex).not.toHaveBeenCalled();
  });
});
