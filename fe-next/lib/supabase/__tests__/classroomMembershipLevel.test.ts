import { vi, describe, it, expect, beforeEach, type MockedFunction } from 'vitest';

/**
 * classroom_memberships.level — the per-student differentiation tier — must reach
 * both readers of the membership row:
 *   - the teacher's roster (getClassroomStudents) so the segmented control renders
 *     the current level, and
 *   - the student's own classroom read (getStudentClassroom) so solo practice can
 *     filter the lesson to their tier.
 * Old rows / mocks without the column must degrade to 'core', never to undefined.
 */

vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }));
vi.mock('@/utils/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { getClassroomStudents, getStudentClassroom, setStudentLevel } from '../education';
import { supabase } from '@/lib/supabase';

const mockFrom = supabase!.from as MockedFunction<any>;

describe('getClassroomStudents — level on the roster', () => {
  beforeEach(() => vi.clearAllMocks());

  it('selects level from classroom_memberships and defaults a missing value to core', async () => {
    const selectCalls: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      if (table === 'classroom_memberships') {
        return {
          select: (cols: string) => {
            selectCalls.push(cols);
            return {
              eq: () => ({
                order: async () => ({
                  data: [
                    { id: 'm1', student_id: 's1', classroom_id: 'c1', joined_at: '2025-01-01', level: 'support' },
                    { id: 'm2', student_id: 's2', classroom_id: 'c1', joined_at: '2025-01-02' }, // pre-migration shape
                  ],
                  error: null,
                }),
              }),
            };
          },
        };
      }
      if (table === 'public_profiles') {
        return { select: () => ({ in: async () => ({ data: [], error: null }) }) };
      }
      return {};
    });

    const { data, error } = await getClassroomStudents('c1');

    expect(error).toBeNull();
    expect(selectCalls[0]).not.toMatch(/\blevel\b/);
    expect(data.map((s) => s.level)).toEqual(['support', 'core']);
  });
});

describe('getStudentClassroom — own level', () => {
  beforeEach(() => vi.clearAllMocks());

  function chain(row: Record<string, unknown> | null) {
    const selectCalls: string[] = [];
    mockFrom.mockImplementation(() => ({
      select: (cols: string) => {
        selectCalls.push(cols);
        return {
          eq: () => ({
            order: () => ({
              limit: () => ({ maybeSingle: async () => ({ data: row, error: null }) }),
            }),
          }),
        };
      },
    }));
    return selectCalls;
  }

  it('returns the membership level alongside the classroom', async () => {
    const selectCalls = chain({
      id: 'm1',
      classroom_id: 'c1',
      joined_at: '2025-01-01',
      level: 'challenge',
      classrooms: { id: 'c1', teacher_id: 't1', name: 'X', join_code: 'ABC123', language: 'en' },
    });

    const result = await getStudentClassroom('s1');

    expect(selectCalls[0]).not.toMatch(/\blevel\b/);
    expect(result.data?.id).toBe('c1');
    expect(result.level).toBe('challenge');
  });

  it('defaults to core when the row has no level, and when there is no membership at all', async () => {
    chain({ id: 'm1', classroom_id: 'c1', joined_at: '2025-01-01', classrooms: { id: 'c1' } });
    expect((await getStudentClassroom('s1')).level).toBe('core');

    chain(null);
    const none = await getStudentClassroom('s1');
    expect(none.data).toBeNull();
    expect(none.level).toBe('core');
  });
});

describe('setStudentLevel — client helper for the PATCH route', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('PATCHes /api/education/classroom/:id/members/:studentId with { level }', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true, level: 'support' }) });

    const res = await setStudentLevel('c1', 's1', 'support');

    expect(res).toEqual({ error: null });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/education/classroom/c1/members/s1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ level: 'support' });
  });

  it('surfaces the server error message on a non-OK response, and a generic one on network failure', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403, json: async () => ({ ok: false, error: 'Forbidden' }) });
    expect(await setStudentLevel('c1', 's1', 'core')).toEqual({ error: { message: 'Forbidden' } });

    fetchMock.mockRejectedValue(new Error('offline'));
    expect((await setStudentLevel('c1', 's1', 'core')).error?.message).toBe('offline');
  });
});
