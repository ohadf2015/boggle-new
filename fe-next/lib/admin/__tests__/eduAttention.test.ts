import { describe, it, expect } from 'vitest';
import { buildEduDashboard, type EduDashboardInput } from '../eduDashboard';

const NOW = Date.parse('2026-10-08T00:00:00Z');
const DAY = 86_400_000;
const ago = (days: number) => new Date(NOW - days * DAY).toISOString();
const approved = (id: string, trialDaysLeft: number | null = null) => ({
  user_id: id,
  reviewed_at: ago(20),
  trial_expires_at: trialDaysLeft === null ? null : ago(-trialDaysLeft),
});

const input = (over: Partial<EduDashboardInput> = {}): EduDashboardInput => ({
  nowMs: NOW,
  windowDays: 7,
  teachers: [
    { id: 'noclass', name: 'No class', last_seen_at: ago(1) },
    { id: 'nostudents', name: 'No students', last_seen_at: ago(1) },
    { id: 'stalled', name: 'Stalled', last_seen_at: ago(30) },
    { id: 'quiet', name: 'Quiet', last_seen_at: ago(2) },
    { id: 'trial', name: 'Trial', last_seen_at: ago(1) },
    { id: 'fine', name: 'Fine', last_seen_at: ago(1) },
  ],
  approvals: [
    approved('locked'),
    approved('noclass'),
    approved('nostudents'),
    approved('stalled'),
    approved('quiet'),
    approved('trial', 3),
    approved('fine', 30),
  ],
  requested: 7,
  classrooms: [
    { id: 'cn', teacher_id: 'nostudents', name: 'Empty' },
    { id: 'cs', teacher_id: 'stalled', name: 'Stalled class' },
    { id: 'cq', teacher_id: 'quiet', name: 'Quiet class' },
    { id: 'ct', teacher_id: 'trial', name: 'Trial class' },
    { id: 'cf', teacher_id: 'fine', name: 'Fine class' },
  ],
  memberships: [
    { classroom_id: 'cs', student_id: 's1' },
    { classroom_id: 'cq', student_id: 's2' },
    { classroom_id: 'ct', student_id: 's3' },
    { classroom_id: 'cf', student_id: 's4' },
  ],
  outreach: null,
  rounds: [
    { classroom_id: 'cs', teacher_id: 'stalled', game_mode: 'classic', player_count: 1, completed_at: ago(40) },
    { classroom_id: 'cq', teacher_id: 'quiet', game_mode: 'classic', player_count: 1, completed_at: ago(10) },
    { classroom_id: 'ct', teacher_id: 'trial', game_mode: 'classic', player_count: 1, completed_at: ago(1) },
    { classroom_id: 'cf', teacher_id: 'fine', game_mode: 'classic', player_count: 1, completed_at: ago(1) },
  ],
  subscriptions: [],
  ...over,
});

describe('needs-attention list', () => {
  it('ranks one item per teacher: locked out, trial ending, no students, stalled class, no class, went quiet', () => {
    const { attention } = buildEduDashboard(input());
    expect(attention.items.map((i) => [i.kind, i.teacherId])).toEqual([
      ['locked_out', 'locked'],
      ['trial_ending', 'trial'],
      ['no_students', 'nostudents'],
      ['class_stalled', 'stalled'],
      ['no_class', 'noclass'],
      ['went_quiet', 'quiet'],
    ]);
    expect(attention.total).toBe(6);
  });

  it('points a stalled-class item at the class, and a trial item at its end date', () => {
    const { attention } = buildEduDashboard(input());
    expect(attention.items.find((i) => i.kind === 'class_stalled')).toMatchObject({ classId: 'cs', className: 'Stalled class' });
    expect(attention.items.find((i) => i.kind === 'trial_ending')?.dueAt).toBe(ago(-3));
  });

  it('drops a trial that already converted to paid', () => {
    const { attention } = buildEduDashboard(input({ subscriptions: [{ user_id: 'trial', status: 'active', created_at: ago(1) }] }));
    expect(attention.items.map((i) => i.teacherId)).not.toContain('trial');
  });

  it('skips the round-based reasons while rounds are unmeasured, instead of calling everyone stalled', () => {
    const { attention } = buildEduDashboard(input({ rounds: null }));
    const kinds = attention.items.map((i) => i.kind);
    expect(kinds).not.toContain('class_stalled');
    expect(kinds).not.toContain('went_quiet');
  });

  it('caps the list but keeps the full total', () => {
    const many = Array.from({ length: 20 }, (_, i) => `n${i}`);
    const { attention } = buildEduDashboard(
      input({ teachers: many.map((id) => ({ id, name: id, last_seen_at: ago(1) })), approvals: many.map((id) => approved(id)), classrooms: [], memberships: [], rounds: [] }),
    );
    expect(attention.items).toHaveLength(12);
    expect(attention.total).toBe(20);
  });
});
