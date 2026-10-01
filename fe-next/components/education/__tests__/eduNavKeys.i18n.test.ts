import { describe, it, expect } from 'vitest';
import { en } from '../../../translations/en.js';
import { es } from '../../../translations/es.js';
import { he } from '../../../translations/he.js';
import { ja } from '../../../translations/ja.js';
import { ru } from '../../../translations/ru.js';
import { sv } from '../../../translations/sv.js';

const LOCALES = { en, es, he, ja, ru, sv } as Record<string, Record<string, unknown>>;

const KEYS = [
  'education.student.classroomRoomGone',
  'education.student.gameEnded.title',
  'education.student.gameEnded.retry',
  'education.student.gameEnded.toClass',
  'education.student.gameEnded.newCode',
  'education.access.auth_signin_cta',
  'education.header.exitEducation',
  'mpUi.results.backToClass',
  'mpUi.results.endClassTitle',
  'mpUi.results.endClassBody',
];

function resolve(bundle: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], bundle);
}

describe('education nav/room-gone copy resolves through every imported bundle', () => {
  it.each(Object.keys(LOCALES))('%s', (locale) => {
    const missing = KEYS.filter((k) => {
      const v = resolve(LOCALES[locale], k);
      return typeof v !== 'string' || !v.trim();
    });
    expect(missing).toEqual([]);
  });

  it.each(Object.keys(LOCALES).filter((l) => l !== 'en'))('%s is translated, not English', (locale) => {
    for (const k of [...KEYS.slice(1, 6), ...KEYS.slice(7)]) expect(resolve(LOCALES[locale], k)).not.toBe(resolve(LOCALES.en, k));
  });
});
