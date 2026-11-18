import { teacherFirstStudent } from '../templates/teacherFirstStudent';
import { TEACHER_LOCALES, type EmailSample } from './types';

export const samples: EmailSample[] = TEACHER_LOCALES.map((locale) => ({
  name: 'teacherFirstStudent.default',
  locale,
  render: () => teacherFirstStudent({ fullName: 'Dana Levi', locale, className: '7B English', classroomId: 'c-1' }),
}));
