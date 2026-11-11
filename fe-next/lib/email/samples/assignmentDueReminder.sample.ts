import { assignmentDueReminderEmail } from '../templates/assignmentDueReminder';
import type { TeacherReminderPlan } from '@/lib/education/assignmentDueReminders';
import { TEACHER_LOCALES, type EmailSample } from './types';

const overdue: TeacherReminderPlan['overdue'][number] = {
  assignmentId: 'a1',
  classroomId: 'c1',
  classroomName: 'Year 7',
  title: 'Week 3 nouns',
  dueDate: '2026-11-10T12:00:00.000Z',
  missingCount: 4,
  kind: 'overdue',
};
const dueSoon: TeacherReminderPlan['dueSoon'][number] = {
  ...overdue,
  assignmentId: 'a2',
  classroomName: '8B',
  title: 'Animals word list',
  missingCount: 9,
  kind: 'due_soon',
};

const VARIANTS: Record<string, { plan: TeacherReminderPlan; hasPro: boolean; canOpenReport: boolean }> = {
  freeOverdue: { plan: { teacherId: 't1', dueSoon: [], overdue: [overdue] }, hasPro: false, canOpenReport: false },
  trialBoth: { plan: { teacherId: 't1', dueSoon: [dueSoon], overdue: [overdue] }, hasPro: false, canOpenReport: true },
  proDueSoon: { plan: { teacherId: 't1', dueSoon: [dueSoon], overdue: [] }, hasPro: true, canOpenReport: true },
};

export const samples: EmailSample[] = TEACHER_LOCALES.flatMap((locale) =>
  Object.entries(VARIANTS).map(([variant, v]) => ({
    name: `assignmentDueReminder.${variant}`,
    locale,
    render: () => assignmentDueReminderEmail({ fullName: 'Dana', locale, ...v }),
  })),
);
