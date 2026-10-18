import { describe, it, expect, vi } from 'vitest';
import { getClassroomWindowSource } from '../windowedClassroomProgressQuery';
import { foldClassroomAssignmentWindow } from '@/lib/education/classroomAssignmentWindow';

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const NOW = Date.parse('2026-10-13T12:00:00.000Z');

function thenable(payload: { data: unknown; error: null }) {
  const api: Record<string, unknown> = {};
  const self = () => api;
  api.select = self;
  api.eq = self;
  api.gte = self;
  api.not = self;
  api.order = self;
  api.limit = self;
  api.in = self;
  api.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(payload).then(resolve, reject);
  return api;
}

function mockClient(tables: Record<string, unknown[]>) {
  return {
    from: (name: string) => thenable({ data: tables[name] ?? [], error: null }),
  };
}

describe('foldClassroomAssignmentWindow', () => {
  it('maps a this-week student_lesson_progress row onto the classroom expected count', () => {
    const folded = foldClassroomAssignmentWindow({
      assignments: [{ id: 'a1', classroom_id: 'c1' }],
      completionRows: [{ assignment_id: 'a1', completed_at: '2026-10-12T12:00:00.000Z' }],
      rosterSize: 2,
    });
    expect(folded.assignmentCount).toBe(1);
    expect(folded.assignmentExpected).toBe(2);
    expect(folded.assignmentCompletions).toEqual([{ completedAt: '2026-10-12T12:00:00.000Z' }]);
  });
});

describe('getClassroomWindowSource assignment window', () => {
  it('loads lesson_assignments + student_lesson_progress the same way the Monday cron does', async () => {
    const client = mockClient({
      classroom_memberships: [{ student_id: 's1' }],
      practice_sessions: [],
      public_profiles: [{ id: 's1', display_name: 'Sam', username: null }],
      lesson_assignments: [{ id: 'a1', classroom_id: 'c1' }],
      student_lesson_progress: [{ assignment_id: 'a1', completed_at: '2026-10-12T12:00:00.000Z' }],
    });

    const { data, error } = await getClassroomWindowSource(
      'c1',
      NOW,
      client as unknown as Parameters<typeof getClassroomWindowSource>[2],
    );

    expect(error).toBeNull();
    expect(data?.assignmentCount).toBe(1);
    expect(data?.assignmentExpected).toBe(1);
    expect(data?.assignmentCompletions).toHaveLength(1);
    expect(data?.assignmentCompletions[0]?.completedAt).toBe('2026-10-12T12:00:00.000Z');
  });
});
