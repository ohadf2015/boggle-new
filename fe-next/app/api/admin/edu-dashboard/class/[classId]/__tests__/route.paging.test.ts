import { vi, type Mock, describe, it, expect } from 'vitest';

vi.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({ json: () => Promise.resolve(data), status: init?.status || 200 })),
  },
}));
vi.mock('@/lib/auth/adminAuth', () => ({ verifyAdminAuth: vi.fn(async () => ({ success: true })) }));
vi.mock('@/lib/admin/server', () => ({ getSupabaseAdmin: vi.fn() }));
vi.mock('@/lib/supabase/analyticsLastGame', () => ({ getRecentClassroomGames: vi.fn(async () => ({ data: [], error: null })) }));

import { GET } from '../route';
import { getSupabaseAdmin } from '@/lib/admin/server';

const POSTGREST_MAX_ROWS = 1000;

/** Behaves like PostgREST: an unranged read stops at max-rows, .range() returns that slice. */
function postgrest(tables: Record<string, unknown[] | Record<string, unknown>>) {
  return {
    from: (table: string) => {
      const all = tables[table] ?? [];
      let slice: [number, number] | null = null;
      const b: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'in', 'gte', 'order', 'limit']) b[m] = () => b;
      b.range = (from: number, to: number) => {
        slice = [from, to];
        return b;
      };
      b.maybeSingle = () => Promise.resolve({ data: all, error: null });
      b.then = (resolve: (v: unknown) => void) => {
        const rows = all as unknown[];
        const data = slice ? rows.slice(slice[0], slice[1] + 1) : rows.slice(0, POSTGREST_MAX_ROWS);
        resolve({ data, error: null });
      };
      return b;
    },
  };
}

describe('admin class drill-down on a big class', () => {
  it('counts completion past the first thousand progress rows', async () => {
    const students = Array.from({ length: 50 }, (_, i) => `s${i}`);
    const assignments = Array.from({ length: 25 }, (_, i) => ({ id: `a${i}`, lesson_id: `l${i}`, due_date: null, created_at: null }));
    const progress = assignments.flatMap((a) =>
      students.map((s) => ({ assignment_id: a.id, student_id: s, completed_at: '2026-10-01T00:00:00Z' })),
    );
    (getSupabaseAdmin as Mock).mockReturnValue(
      postgrest({
        classrooms: { id: 'c1', name: 'P3', join_code: 'ABC123', language: 'en', created_at: null, teacher_id: 't1' },
        classroom_memberships: students.map((s) => ({ student_id: s, joined_at: null })),
        lesson_assignments: assignments,
        classroom_rounds: [],
        profiles: [{ id: 't1' }, ...students.map((id) => ({ id }))].map((p) => ({
          ...p, display_name: p.id, username: null, last_seen_at: null, is_test_account: false,
        })),
        vocabulary_lessons: assignments.map((a) => ({ id: a.lesson_id, name: a.lesson_id })),
        student_lesson_progress: progress,
      }),
    );

    const res = await GET({} as never, { params: Promise.resolve({ classId: 'c1' }) });
    const body = await res.json();
    expect(body.assignments).toHaveLength(25);
    expect(body.assignments.every((a: { completed: number }) => a.completed === 50)).toBe(true);
  });
});
