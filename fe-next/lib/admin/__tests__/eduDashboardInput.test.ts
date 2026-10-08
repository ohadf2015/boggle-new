import { describe, it, expect } from 'vitest';
import { prepareEduDashboardInput, type EduRawRows } from '../eduDashboardInput';

const NOW = Date.parse('2026-10-08T12:00:00Z');
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

function raw(over: Partial<EduRawRows> = {}): EduRawRows {
  return {
    profiles: [],
    requests: [],
    classrooms: [],
    memberships: [],
    rounds: null,
    subscriptions: [],
    ...over,
  };
}

describe('prepareEduDashboardInput', () => {
  it('drops test-account teachers, their classrooms and their rounds', () => {
    const input = prepareEduDashboardInput(
      raw({
        profiles: [
          { id: 't1', user_role: 'teacher', last_seen_at: daysAgo(1), display_name: 'Ada', username: null, is_test_account: false },
          { id: 'qa', user_role: 'teacher', last_seen_at: daysAgo(1), display_name: 'QA', username: null, is_test_account: true },
        ],
        classrooms: [
          { id: 'c1', teacher_id: 't1', name: 'Math' },
          { id: 'cq', teacher_id: 'qa', name: 'QA' },
        ],
        memberships: [
          { classroom_id: 'c1', student_id: 's1' },
          { classroom_id: 'cq', student_id: 's9' },
        ],
        rounds: [
          { classroom_id: 'cq', teacher_id: 'qa', game_mode: 'classic', player_count: 3, completed_at: daysAgo(1) },
          { classroom_id: 'c1', teacher_id: 't1', game_mode: 'classic', player_count: 2, completed_at: daysAgo(1) },
        ],
      }),
      NOW,
      30,
    );
    expect(input.teachers.map((t) => t.id)).toEqual(['t1']);
    expect(input.classrooms.map((c) => c.id)).toEqual(['c1']);
    expect(input.memberships).toEqual([{ classroom_id: 'c1', student_id: 's1' }]);
    expect(input.rounds?.map((r) => r.teacher_id)).toEqual(['t1']);
  });

  it('counts requested people, not request rows, and skips machine and test requests', () => {
    const input = prepareEduDashboardInput(
      raw({
        profiles: [{ id: 'qa', user_role: 'teacher', last_seen_at: null, display_name: null, username: null, is_test_account: true }],
        requests: [
          { user_id: 't1', email: 'a@school.org', status: 'approved', reviewed_at: daysAgo(2), trial_expires_at: daysAgo(-12) },
          { user_id: 't1', email: 'a@school.org', status: 'pending', reviewed_at: null, trial_expires_at: null },
          { user_id: null, email: 'b@school.org', status: 'pending', reviewed_at: null, trial_expires_at: null },
          { user_id: 'qa', email: 'qa@school.org', status: 'pending', reviewed_at: null, trial_expires_at: null },
          { user_id: null, email: 'bot@example.com', status: 'pending', reviewed_at: null, trial_expires_at: null },
        ],
      }),
      NOW,
      30,
    );
    expect(input.requested).toBe(2);
  });

  it('keeps one approval per person so newTeachers and trials count people', () => {
    const input = prepareEduDashboardInput(
      raw({
        requests: [
          { user_id: 't1', email: 'a@school.org', status: 'approved', reviewed_at: daysAgo(3), trial_expires_at: daysAgo(-10) },
          { user_id: 't1', email: 'a@school.org', status: 'approved', reviewed_at: daysAgo(1), trial_expires_at: daysAgo(-9) },
        ],
      }),
      NOW,
      30,
    );
    expect(input.approvals).toEqual([
      { user_id: 't1', reviewed_at: daysAgo(1), trial_expires_at: daysAgo(-9), email: 'a@school.org' },
    ]);
  });

  it('keeps one paid subscription per trial user, earliest active', () => {
    const input = prepareEduDashboardInput(
      raw({
        profiles: [{ id: 'qa', user_role: 'teacher', last_seen_at: null, display_name: null, username: null, is_test_account: true }],
        requests: [
          { user_id: 't1', email: 'a@school.org', status: 'approved', reviewed_at: daysAgo(20), trial_expires_at: daysAgo(-5) },
        ],
        subscriptions: [
          { user_id: 't1', status: 'active', created_at: daysAgo(4) },
          { user_id: 't1', status: 'active', created_at: daysAgo(2) },
          { user_id: 't1', status: 'canceled', created_at: daysAgo(1) },
          { user_id: 'qa', status: 'active', created_at: daysAgo(1) },
        ],
      }),
      NOW,
      30,
    );
    expect(input.subscriptions).toEqual([{ user_id: 't1', status: 'active', created_at: daysAgo(4) }]);
  });

  it('reports rounds as unmeasured when the table is absent', () => {
    expect(prepareEduDashboardInput(raw(), NOW, 7).rounds).toBeNull();
  });
});
