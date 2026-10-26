import { describe, it, expect } from 'vitest';
import { assignmentDueReminderEmail } from '../assignmentDueReminder';
import type { TeacherReminderPlan } from '@/lib/education/assignmentDueReminders';

const plan: TeacherReminderPlan = {
  teacherId: 't1',
  dueSoon: [],
  overdue: [
    {
      assignmentId: 'a1',
      classroomId: 'c1',
      classroomName: 'Year 7',
      title: 'Week 3 nouns',
      dueDate: '2026-10-10T12:00:00.000Z',
      missingCount: 4,
      kind: 'overdue',
    },
  ],
};

describe('assignmentDueReminderEmail', () => {
  it('a free teacher gets the Pro upgrade as the one action, with no link into the Pro-only reports', () => {
    const { subject, html } = assignmentDueReminderEmail({
      fullName: 'Ada',
      locale: 'en',
      plan,
      hasPro: false,
      canOpenReport: false,
    });
    expect(subject).toContain('overdue');
    expect(html).not.toContain('/teacher/reports');
    expect(html).toContain('/en/teacher/upgrade');
    expect(html).toContain('Year 7');
  });

  it('a teacher on a live access trial still gets the report links, plus the upgrade', () => {
    const { html } = assignmentDueReminderEmail({ fullName: 'Ada', locale: 'he', plan, hasPro: false, canOpenReport: true });
    expect(html).toContain('/he/teacher/reports?classroomId=c1');
    expect(html).toContain('/he/teacher/upgrade');
  });

  it('omits the Polar CTA when the teacher already has Pro', () => {
    const { html } = assignmentDueReminderEmail({
      fullName: 'Ada',
      locale: 'en',
      plan,
      hasPro: true,
      canOpenReport: true,
    });
    expect(html).not.toContain('/en/teacher/upgrade');
    expect(html).toContain('/en/teacher/reports?classroomId=c1');
  });
});
