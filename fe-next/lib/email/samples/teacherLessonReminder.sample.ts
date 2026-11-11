import { teacherLessonReminder } from '../templates/teacherLessonReminder';
import { TEACHER_LOCALES, type EmailSample } from './types';

export const samples: EmailSample[] = TEACHER_LOCALES.map((locale) => ({
  name: 'teacherLessonReminder.default',
  locale,
  render: () =>
    teacherLessonReminder({
      fullName: 'Dana Levi',
      locale,
      className: '7B English',
      joinCode: 'QX7K2M',
      classroomId: 'c-1',
      boardLanguage: 'en',
      lessonAt: '2026-11-12T07:00:00Z',
      timezone: 'Asia/Jerusalem',
    }),
}));
