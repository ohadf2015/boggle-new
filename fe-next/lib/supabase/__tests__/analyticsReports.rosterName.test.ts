import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getClassReportData } from '../analyticsReports';

vi.mock('@/lib/supabase', () => ({ supabase: null }));
vi.mock('@/utils/logger', () => ({ default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

type Result = { data: unknown; error: unknown };

function builder(result: Result) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'not', 'gte', 'lte', 'order']) b[m] = vi.fn(() => b);
  b.single = vi.fn(() => Promise.resolve(result));
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  b.then = (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
  return b;
}

function client(memberships: unknown[]) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'classrooms') return builder({ data: { id: 'c1', name: '7B', teacher_id: 't1' }, error: null });
      if (table === 'classroom_memberships') return builder({ data: memberships, error: null });
      if (table === 'public_profiles') {
        return builder({
          data: [
            { id: 's1', display_name: 'Maya', avatar_config: null },
            { id: 's2', display_name: 'Noam', avatar_config: null },
          ],
          error: null,
        });
      }
      return builder({ data: [], error: null });
    }),
  } as unknown as SupabaseClient;
}

const names = (data: Awaited<ReturnType<typeof getClassReportData>>['data']) =>
  Object.fromEntries((data?.studentRankings ?? []).map((r: { studentId: string; studentName: string }) => [r.studentId, r.studentName]));

describe('getClassReportData student names', () => {
  it("uses the teacher's roster name when set and the student's own name otherwise", async () => {
    const { data } = await getClassReportData('c1', undefined, client([
      { student_id: 's1', roster_name: 'Mimi' },
      { student_id: 's2', roster_name: null },
    ]));
    expect(names(data)).toEqual({ s1: 'Mimi', s2: 'Noam' });
  });

  it('still names everyone from their profile when the database has no roster_name column', async () => {
    const { data } = await getClassReportData('c1', undefined, client([{ student_id: 's1' }, { student_id: 's2' }]));
    expect(names(data)).toEqual({ s1: 'Maya', s2: 'Noam' });
  });
});
