import { describe, it, expect, vi } from 'vitest';
import { loadClassHubState, loadClassStreak, classStreakStatus, requestClassRematch, type ClassHubStore } from '../classroomHub';

function store(overrides: Partial<ClassHubStore> = {}): ClassHubStore {
  return {
    isMember: vi.fn(async () => true),
    fetchRoundDays: vi.fn(async () => ['2026-10-07', '2026-10-08']),
    hasRematchToday: vi.fn(async () => false),
    insertRematch: vi.fn(async () => 'inserted' as const),
    ...overrides,
  };
}

describe('loadClassHubState', () => {
  it('given a member whose class played today, then it reports the streak and no rematch yet', async () => {
    const state = await loadClassHubState(store(), 'c1', 's1', '2026-10-08');
    expect(state).toEqual({ streak: 2, playedToday: true, rematchRequestedToday: false });
  });

  it('given the student already asked today, then rematchRequestedToday is true', async () => {
    const state = await loadClassHubState(store({ hasRematchToday: vi.fn(async () => true) }), 'c1', 's1', '2026-10-08');
    expect(state.rematchRequestedToday).toBe(true);
  });

  it('given a non-member, then the hub is refused', async () => {
    await expect(loadClassHubState(store({ isMember: vi.fn(async () => false) }), 'c1', 's1', '2026-10-08'))
      .rejects.toThrow('NOT_A_MEMBER');
  });

  it('given the rounds table is not available yet, then the streak is an honest zero, not an error', async () => {
    const state = await loadClassHubState(
      store({ fetchRoundDays: vi.fn(async () => { throw new Error('relation does not exist'); }) }),
      'c1',
      's1',
      '2026-10-08'
    );
    expect(state).toEqual({ streak: 0, playedToday: false, rematchRequestedToday: false });
  });
});

describe('requestClassRematch', () => {
  it('given a member with no request today, then it inserts and reports requested', async () => {
    const db = store();
    await expect(requestClassRematch(db, 'c1', 's1', '2026-10-08')).resolves.toBe('requested');
    expect(db.insertRematch).toHaveBeenCalledWith('c1', 's1', '2026-10-08');
  });

  it('given a request already made today, then the repeat is a no-op reported as already', async () => {
    const db = store({ insertRematch: vi.fn(async () => 'duplicate' as const) });
    await expect(requestClassRematch(db, 'c1', 's1', '2026-10-08')).resolves.toBe('already');
  });

  it('given a non-member, then nothing is inserted', async () => {
    const db = store({ isMember: vi.fn(async () => false) });
    await expect(requestClassRematch(db, 'c1', 's1', '2026-10-08')).resolves.toBe('not_member');
    expect(db.insertRematch).not.toHaveBeenCalled();
  });
});

describe('loadClassStreak (teacher view)', () => {
  it.each([
    [['2026-10-07', '2026-10-08'], '2026-10-08'],
    [['2026-10-06', '2026-10-07'], '2026-10-08'],
    [['2026-10-01'], '2026-10-08'],
    [[], '2026-10-08'],
  ])('given round days %j on %s, then the teacher sees exactly what the student hub shows', async (days, today) => {
    const db = store({ fetchRoundDays: vi.fn(async () => days) });
    const student = await loadClassHubState(db, 'c1', 's1', today);
    const teacher = await loadClassStreak(db, 'c1', today);
    expect(teacher).toEqual({ streak: student.streak, playedToday: student.playedToday });
  });

  it('given the rounds read fails, then the teacher streak is the same honest zero', async () => {
    const db = store({ fetchRoundDays: vi.fn(async () => { throw new Error('boom'); }) });
    await expect(loadClassStreak(db, 'c1', '2026-10-08')).resolves.toEqual({ streak: 0, playedToday: false });
  });

  it('reads the same 60-day window the student hub reads', async () => {
    const db = store();
    await loadClassStreak(db, 'c1', '2026-10-08');
    await loadClassHubState(db, 'c1', 's1', '2026-10-08');
    const calls = vi.mocked(db.fetchRoundDays).mock.calls;
    expect(calls[0]).toEqual(calls[1]);
  });
});

describe('classStreakStatus', () => {
  it('given no streak, then there is nothing to show', () => {
    expect(classStreakStatus({ streak: 0, playedToday: false })).toBe('none');
  });
  it('given a streak and a game today, then it is kept', () => {
    expect(classStreakStatus({ streak: 3, playedToday: true })).toBe('kept');
  });
  it('given a streak and no game yet today, then it is at risk', () => {
    expect(classStreakStatus({ streak: 3, playedToday: false })).toBe('atRisk');
  });
});
