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
  it('overdue copy deep-links the classroom progress report and Polar upgrade for free teachers', () => {
    const { subject, html } = assignmentDueReminderEmail({
      fullName: 'Ada',
      locale: 'en',
      plan,
      hasPro: false,
    });
    expect(subject).toContain('overdue');
    expect(html).toContain('/en/teacher/reports?classroomId=c1');
    expect(html).toContain('/en/teacher/upgrade');
    expect(html).toContain('Year 7');
  });

  it('omits the Polar CTA when the teacher already has Pro', () => {
    const { html } = assignmentDueReminderEmail({
      fullName: 'Ada',
      locale: 'en',
      plan,
      hasPro: true,
    });
    expect(html).not.toContain('/en/teacher/upgrade');
    expect(html).toContain('/en/teacher/reports?classroomId=c1');
  });
});
