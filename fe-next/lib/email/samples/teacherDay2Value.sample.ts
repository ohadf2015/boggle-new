import { teacherDay2Value } from '../templates/teacherDay2Value';
import { TEACHER_LOCALES, type EmailSample } from './types';

export const samples: EmailSample[] = TEACHER_LOCALES.map((locale) => ({
  name: 'teacherDay2Value.default',
  locale,
  render: () => teacherDay2Value({ fullName: 'Dana', locale, studentsJoined: 18, gamesPlayed: 4 }),
}));
