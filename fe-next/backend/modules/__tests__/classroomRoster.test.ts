import { vi } from 'vitest';

const { mockGetClassroomGame, mockSetex, mockLogError, mockLogWarn, redisRef } = vi.hoisted(() => ({
  mockGetClassroomGame: vi.fn(),
  mockSetex: vi.fn(),
  mockLogError: vi.fn(),
  mockLogWarn: vi.fn(),
  redisRef: { present: true },
}));

vi.mock('../../redisClient', () => ({ getRedisClient: () => (redisRef.present ? { setex: mockSetex } : null) }));
vi.mock('../classroomGameManager', () => ({
  CLASSROOM_GAME_TTL: 14400,
  getClassroomGame: mockGetClassroomGame,
  withClassroomGameLock: (_code: string, fn: () => Promise<unknown>) => fn(),
}));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), warn: mockLogWarn, error: mockLogError } }));

import { classroomRosterCount, recordClassroomRosterEntry, CLASSROOM_ROSTER_CAP } from '../classroomRoster';

const record = (over: Record<string, unknown> = {}) =>
  ({ gameCode: 'ABC123', teacherId: 't1', classroomId: 'c1', players: [], ...over }) as never;

beforeEach(() => {
  vi.clearAllMocks();
  redisRef.present = true;
});

describe('classroomRosterCount', () => {
  it('Given students who entered only by the join link, When counted, Then each one counts', () => {
    expect(classroomRosterCount(record({ rosterUserIds: ['s1', 's2', 's3'] }))).toBe(3);
  });

  it('Given a student on both the class-page list and the room roster, When counted, Then they count once', () => {
    expect(classroomRosterCount(record({ players: [{ userId: 's1' }, { userId: 's2' }], rosterUserIds: ['s1'] }))).toBe(2);
  });

  it('Given the teacher appears on either list, When counted, Then the teacher is left out', () => {
    expect(classroomRosterCount(record({ players: [{ userId: 't1' }], rosterUserIds: ['t1', 's1'] }))).toBe(1);
  });

  it('Given an older record with neither list, When counted, Then it is zero', () => {
    expect(classroomRosterCount({ teacherId: 't1' } as never)).toBe(0);
    expect(classroomRosterCount(null)).toBe(0);
  });
});

describe('recordClassroomRosterEntry', () => {
  it('Given a student new to the room, When recorded, Then the stored record gains their id', async () => {
    mockGetClassroomGame.mockResolvedValue(record({ rosterUserIds: ['s1'] }));
    await recordClassroomRosterEntry('ABC123', record({ rosterUserIds: ['s1'] }), 's2');
    expect(mockSetex).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(mockSetex.mock.calls[0][2]);
    expect(saved.rosterUserIds).toEqual(['s1', 's2']);
  });

  it('Given the student is already on the roster, When recorded again (reconnect), Then nothing is written', async () => {
    await recordClassroomRosterEntry('ABC123', record({ rosterUserIds: ['s1'] }), 's1');
    expect(mockGetClassroomGame).not.toHaveBeenCalled();
    expect(mockSetex).not.toHaveBeenCalled();
  });

  it('Given a stale in-hand record, When the stored one already has the student, Then nothing is written', async () => {
    mockGetClassroomGame.mockResolvedValue(record({ rosterUserIds: ['s1'] }));
    await recordClassroomRosterEntry('ABC123', record(), 's1');
    expect(mockSetex).not.toHaveBeenCalled();
  });

  it('Given the teacher or a seat with no account, When recorded, Then nothing is written', async () => {
    await recordClassroomRosterEntry('ABC123', record(), 't1');
    await recordClassroomRosterEntry('ABC123', record(), undefined);
    await recordClassroomRosterEntry('ABC123', null, 's1');
    expect(mockSetex).not.toHaveBeenCalled();
  });

  it('Given a roster already at its cap, When a new id arrives, Then it is not stored and a warning is logged', async () => {
    const full = Array.from({ length: CLASSROOM_ROSTER_CAP }, (_, i) => `s${i}`);
    mockGetClassroomGame.mockResolvedValue(record({ rosterUserIds: full }));
    await recordClassroomRosterEntry('ABC123', record({ rosterUserIds: full }), 'one-more');
    expect(mockSetex).not.toHaveBeenCalled();
    expect(mockLogWarn).toHaveBeenCalledWith('CLASSROOM_GAME', expect.stringContaining('cap'));
  });

  it('Given Redis fails, When recorded, Then it logs an error and does not throw', async () => {
    mockGetClassroomGame.mockRejectedValue(new Error('ECONNRESET'));
    await expect(recordClassroomRosterEntry('ABC123', record(), 's1')).resolves.toBeUndefined();
    expect(mockLogError).toHaveBeenCalledWith('CLASSROOM_GAME', expect.stringContaining('ECONNRESET'));
  });

  it('Given no Redis client, When recorded, Then it logs an error', async () => {
    redisRef.present = false;
    await recordClassroomRosterEntry('ABC123', record(), 's1');
    expect(mockLogError).toHaveBeenCalled();
    expect(mockSetex).not.toHaveBeenCalled();
  });

  it('Given the lock itself throws, When recorded, Then it still never rejects', async () => {
    const mod = await import('../classroomGameManager');
    const spy = vi.spyOn(mod, 'withClassroomGameLock' as never).mockImplementation((() => { throw new Error('lock down'); }) as never);
    await expect(recordClassroomRosterEntry('ABC123', record(), 's1')).resolves.toBeUndefined();
    expect(mockLogError).toHaveBeenCalledWith('CLASSROOM_GAME', expect.stringContaining('lock down'));
    spy.mockRestore();
  });
});
