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

  const both: TeacherReminderPlan = {
    ...plan,
    dueSoon: [{ ...plan.overdue[0], assignmentId: 'a2', title: 'Week 4 verbs', missingCount: 1, kind: 'due_soon' }],
  };

  it.each(['en', 'he', 'sv', 'ja', 'es', 'ru'] as const)('%s: neo layout, native copy, every assignment listed', (locale) => {
    const { subject, html } = assignmentDueReminderEmail({ fullName: 'Ada', locale, plan: both, hasPro: false, canOpenReport: true });
    expect(subject.length).toBeGreaterThan(0);
    expect(html).toMatch(/\/email\/art\/[a-z-]+\.png/);
    expect(html).toMatch(/border-(right|left)-width:6px/);
    expect(html).toContain('Week 3 nouns');
    expect(html).toContain('Week 4 verbs');
    expect(html).not.toMatch(/undefined|\[object|NaN/);
    if (locale !== 'en') expect(html).not.toContain('Open the progress report');
    if (locale === 'he') expect(html).toContain('dir="rtl"');
  });

  it('the report is the button when the teacher can open it; Pro sits under it as a quiet link', () => {
    const { html } = assignmentDueReminderEmail({ fullName: 'Ada', locale: 'en', plan, hasPro: false, canOpenReport: true });
    const report = html.lastIndexOf('/en/teacher/reports?classroomId=c1"');
    const upgrade = html.indexOf('/en/teacher/upgrade');
    const reportCell = html.slice(html.lastIndexOf('<td', report), report);
    expect(reportCell).toMatch(/border-(right|left)-width:6px/);
    expect(upgrade).toBeGreaterThan(report);
  });

  it('a free teacher without report access gets the upgrade as the button, with the price', () => {
    const { html } = assignmentDueReminderEmail({ fullName: 'Ada', locale: 'en', plan, hasPro: false, canOpenReport: false });
    const upgrade = html.indexOf('/en/teacher/upgrade');
    expect(html.slice(html.lastIndexOf('<td', upgrade), upgrade)).toMatch(/border-(right|left)-width:6px/);
    expect(html).toContain('$9');
  });

  it('escapes class and assignment names', () => {
    const hostile: TeacherReminderPlan = { ...plan, overdue: [{ ...plan.overdue[0], classroomName: '<b>7</b>', title: '<i>t</i>' }] };
    const { html } = assignmentDueReminderEmail({ fullName: 'Ada', locale: 'en', plan: hostile, hasPro: true, canOpenReport: true });
    expect(html).not.toContain('<b>7</b>');
    expect(html).not.toContain('<i>t</i>');
  });
});
