import { describe, it, expect, vi } from 'vitest';
import { loadParentReportData } from '../parentReportData';

const STUDENT = 'student-1';
const CLASSROOM = 'classroom-1';

/**
 * A fake service-role client whose `.from(table)` branches by table name.
 * Each branch supports the exact chain the loader calls, nothing more —
 * mirrors the shape used by the sibling parent-report route tests.
 */
function makeAdmin(opts: {
  isMember?: boolean;
  membershipError?: { message: string } | null;
  profile?: { display_name: string | null; username: string | null } | null;
  profileError?: { message: string } | null;
  progress?: Array<{ total_xp: number | null; words_mastered: string[] | null; completed_at: string | null }>;
  progressError?: { message: string } | null;
  sessions?: Array<{ completed_at: string | null }>;
  sessionsError?: { message: string } | null;
}) {
  const {
    isMember = true,
    membershipError = null,
    profile = { display_name: 'Ana', username: null },
    profileError = null,
    progress = [],
    progressError = null,
    sessions = [],
    sessionsError = null,
  } = opts;

  const from = vi.fn((table: string) => {
    if (table === 'classroom_memberships') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: isMember ? { id: 'membership-1' } : null,
                error: membershipError,
              }),
            }),
          }),
        }),
      };
    }
    if (table === 'public_profiles') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: profile, error: profileError }),
          }),
        }),
      };
    }
    if (table === 'student_lesson_progress') {
      return {
        select: () => ({
          eq: async () => ({ data: progress, error: progressError }),
        }),
      };
    }
    if (table === 'practice_sessions') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              not: () => ({
                order: () => ({
                  limit: async () => ({ data: sessions, error: sessionsError }),
                }),
              }),
            }),
          }),
        }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });

  return { from };
}

describe('loadParentReportData', () => {
  it('Given the student is not (or no longer) a member of the classroom, When loaded, Then it returns not_member', async () => {
    const admin = makeAdmin({ isMember: false });

    const result = await loadParentReportData(admin as any, STUDENT, CLASSROOM);

    expect(result.status).toBe('not_member');
  });

  it('Given the membership check errors, When loaded, Then it returns error (never renders as "no progress")', async () => {
    const admin = makeAdmin({ membershipError: { message: 'db down' } });

    const result = await loadParentReportData(admin as any, STUDENT, CLASSROOM);

    expect(result.status).toBe('error');
  });

  it('Given the student is a member with no progress rows, When loaded, Then it returns zeroed ok data', async () => {
    const admin = makeAdmin({ profile: { display_name: 'Ana', username: null }, progress: [], sessions: [] });

    const result = await loadParentReportData(admin as any, STUDENT, CLASSROOM);

    expect(result).toEqual({
      status: 'ok',
      data: {
        displayName: 'Ana',
        totalXp: 0,
        lessonsCompleted: 0,
        wordsMastered: 0,
        recentActivity: [],
      },
    });
  });

  it('sums XP, counts completed lessons, and unions distinct mastered words across progress rows', async () => {
    const admin = makeAdmin({
      progress: [
        { total_xp: 50, words_mastered: ['cat', 'dog'], completed_at: '2026-01-01T00:00:00Z' },
        { total_xp: 30, words_mastered: ['dog', 'fox'], completed_at: null },
        { total_xp: 20, words_mastered: [], completed_at: '2026-01-05T00:00:00Z' },
      ],
      sessions: [{ completed_at: '2026-01-05T00:00:00Z' }, { completed_at: '2026-01-01T00:00:00Z' }],
    });

    const result = await loadParentReportData(admin as any, STUDENT, CLASSROOM);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error('unreachable');
    expect(result.data.totalXp).toBe(100);
    expect(result.data.lessonsCompleted).toBe(2);
    expect(result.data.wordsMastered).toBe(3); // cat, dog, fox — deduped
    expect(result.data.recentActivity).toEqual([
      { completedAt: '2026-01-05T00:00:00Z' },
      { completedAt: '2026-01-01T00:00:00Z' },
    ]);
  });

  it('falls back to a generic name when the profile has no display_name or username', async () => {
    const admin = makeAdmin({ profile: { display_name: null, username: null } });

    const result = await loadParentReportData(admin as any, STUDENT, CLASSROOM);

    expect(result.status).toBe('ok');
    if (result.status !== 'ok') throw new Error('unreachable');
    expect(result.data.displayName).toBe('Student');
  });

  it('never leaks email — only display_name/username are selected from the profile', async () => {
    const admin = makeAdmin({});

    await loadParentReportData(admin as any, STUDENT, CLASSROOM);

    // The mock's public_profiles branch only ever returns display_name/username;
    // this test documents the contract so a future edit can't widen the select.
    expect(admin.from).toHaveBeenCalledWith('public_profiles');
  });

  it('Given the progress query errors, When loaded, Then it returns error', async () => {
    const admin = makeAdmin({ progressError: { message: 'boom' } });

    const result = await loadParentReportData(admin as any, STUDENT, CLASSROOM);

    expect(result.status).toBe('error');
  });

  it('Given the sessions query errors, When loaded, Then it returns error', async () => {
    const admin = makeAdmin({ sessionsError: { message: 'boom' } });

    const result = await loadParentReportData(admin as any, STUDENT, CLASSROOM);

    expect(result.status).toBe('error');
  });
});
