import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  LAST_SEEN_BUMP_THROTTLE_MS,
  bumpAuthedClassroomTeacher,
  bumpTeacherLastSeen,
  classroomStarterAuthId,
  shouldBumpLastSeen,
} from '../bumpTeacherLastSeen';

vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const NOW = new Date('2026-11-04T12:00:00.000Z');

function harness(lastSeenAt: string | null, opts?: { readError?: string; updateError?: string; updateThrows?: boolean }) {
  const updates: Array<{ id: string; patch: Record<string, unknown> }> = [];
  const reads: string[] = [];
  const supabase = {
    from(table: string) {
      if (table !== 'profiles') throw new Error(`unexpected table ${table}`);
      return {
        select() {
          return {
            eq(_col: string, id: string) {
              reads.push(id);
              return {
                maybeSingle: async () => {
                  if (opts?.readError) return { data: null, error: { message: opts.readError } };
                  return { data: { last_seen_at: lastSeenAt }, error: null };
                },
              };
            },
          };
        },
        update(patch: Record<string, unknown>) {
          return {
            eq: async (_col: string, id: string) => {
              if (opts?.updateThrows) throw new Error('connection reset');
              updates.push({ id, patch });
              return { error: opts?.updateError ? { message: opts.updateError } : null };
            },
          };
        },
      };
    },
  };
  return { supabase: supabase as unknown as SupabaseClient, updates, reads };
}

describe('shouldBumpLastSeen', () => {
  it('writes when last_seen_at is missing or unparseable', () => {
    expect(shouldBumpLastSeen(null, NOW.getTime())).toBe(true);
    expect(shouldBumpLastSeen(undefined, NOW.getTime())).toBe(true);
    expect(shouldBumpLastSeen('not-a-date', NOW.getTime())).toBe(true);
  });

  it('skips when the stored timestamp is within 5 minutes, including exactly 5 minutes', () => {
    const fourMin = new Date(NOW.getTime() - 4 * 60 * 1000).toISOString();
    const exact = new Date(NOW.getTime() - LAST_SEEN_BUMP_THROTTLE_MS).toISOString();
    expect(shouldBumpLastSeen(fourMin, NOW.getTime())).toBe(false);
    expect(shouldBumpLastSeen(exact, NOW.getTime())).toBe(false);
  });

  it('writes when the stored timestamp is older than 5 minutes', () => {
    const older = new Date(NOW.getTime() - LAST_SEEN_BUMP_THROTTLE_MS - 1).toISOString();
    expect(shouldBumpLastSeen(older, NOW.getTime())).toBe(true);
  });
});

describe('bumpTeacherLastSeen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not touch profiles at all for an anonymous (missing) user id', async () => {
    const { supabase, reads, updates } = harness(null);
    await bumpTeacherLastSeen(supabase, null, NOW);
    await bumpTeacherLastSeen(supabase, undefined, NOW);
    await bumpTeacherLastSeen(supabase, '', NOW);
    expect(reads).toEqual([]);
    expect(updates).toEqual([]);
  });

  it('writes last_seen_at = now for an authed user with no recent bump', async () => {
    const { supabase, updates } = harness(null);
    await bumpTeacherLastSeen(supabase, 'teacher-1', NOW);
    expect(updates).toEqual([{ id: 'teacher-1', patch: { last_seen_at: NOW.toISOString() } }]);
  });

  it('skips the second write when last_seen_at is already within 5 minutes', async () => {
    const recent = new Date(NOW.getTime() - 60_000).toISOString();
    const { supabase, reads, updates } = harness(recent);
    await bumpTeacherLastSeen(supabase, 'teacher-1', NOW);
    expect(reads).toEqual(['teacher-1']);
    expect(updates).toEqual([]);
  });

  it('writes again when last_seen_at is older than 5 minutes', async () => {
    const stale = new Date(NOW.getTime() - LAST_SEEN_BUMP_THROTTLE_MS - 1).toISOString();
    const { supabase, updates } = harness(stale);
    await bumpTeacherLastSeen(supabase, 'teacher-1', NOW);
    expect(updates).toHaveLength(1);
  });

  it('swallows a read error and does not write', async () => {
    const { supabase, updates } = harness(null, { readError: 'timeout' });
    await expect(bumpTeacherLastSeen(supabase, 'teacher-1', NOW)).resolves.toBeUndefined();
    expect(updates).toEqual([]);
  });

  it('swallows an update throw and does not reject', async () => {
    const { supabase } = harness(null, { updateThrows: true });
    await expect(bumpTeacherLastSeen(supabase, 'teacher-1', NOW)).resolves.toBeUndefined();
  });

  it('does nothing when the client is not configured', async () => {
    await expect(bumpTeacherLastSeen(null, 'teacher-1', NOW)).resolves.toBeUndefined();
  });
});

describe('classroomStarterAuthId', () => {
  it('returns null instead of throwing when the socket has no handshake', () => {
    expect(classroomStarterAuthId({} as never, { users: {} })).toBeNull();
    expect(classroomStarterAuthId(undefined, undefined)).toBeNull();
  });
});

describe('bumpAuthedClassroomTeacher', () => {
  it('does not touch profiles when the starter is anonymous or is not the teacher', async () => {
    const { supabase, reads, updates } = harness(null);
    await bumpAuthedClassroomTeacher(supabase, null, 'teacher-1', NOW);
    await bumpAuthedClassroomTeacher(supabase, 'student-1', 'teacher-1', NOW);
    await bumpAuthedClassroomTeacher(supabase, 'teacher-1', '', NOW);
    expect(reads).toEqual([]);
    expect(updates).toEqual([]);
  });

  it('bumps when the authenticated starter is the teacher', async () => {
    const { supabase, updates } = harness(null);
    await bumpAuthedClassroomTeacher(supabase, 'teacher-1', 'teacher-1', NOW);
    expect(updates).toEqual([{ id: 'teacher-1', patch: { last_seen_at: NOW.toISOString() } }]);
  });
});
