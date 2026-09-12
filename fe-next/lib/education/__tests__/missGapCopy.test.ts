/**
 * RED first — the homework screens must not ship internal jargon to teachers.
 *
 * Seen live at 1440x900 (2026-09-12, screenshots `/tmp/hw-r6/teacher-roster-1440.png`
 * and `/tmp/hw-r6/gradepass-1440.png`), on the two screens a real teacher opens:
 *
 *   "Students practise the #972 miss-gap card on their own …"
 *   "… your score is ready for the Classroom gradebook (Kahoot Marketplace
 *    grade-passback foil)."
 *   "Grade sync via Classroom add-on API is ready when teacher add-on scope is
 *    enabled."
 *
 * A ticket number, a competitor's product name used as our own positioning
 * note, and an API scope are all notes-to-ourselves that leaked into the
 * product. They are also the fastest way for a reviewer to decide a screen is
 * unfinished. These three keys are rendered by `MissGapAsyncAssignment` and
 * `MissGapGradePassback` and by nothing else, so they can be rewritten safely
 * in all six locales.
 */
import { describe, it, expect } from 'vitest';
import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

const LOCALES: Record<string, unknown> = { en, he, sv, ja, es, ru };

const KEYS = [
  'assignMissGapAsyncSubtitle',
  'missGapGradePassbackSubtitle',
  'missGapGradePassbackPrivacy',
  'missGapPracticeSubtitle',
  'missGapWhatsAppSubtitle',
] as const;

/** Ticket numbers, a rival's brand as our own note, and API-scope talk. */
const JARGON = /#\d{3,}|kahoot|marketplace|\bfoil\b|add-on (api|scope)|roster import|\bGC\b/i;

function read(bundle: unknown, key: string): string {
  const results = (bundle as { education?: { results?: Record<string, unknown> } })?.education
    ?.results;
  const value = results?.[key];
  return typeof value === 'string' ? value : '';
}

describe('miss-gap teacher copy — no notes-to-ourselves on a teacher screen', () => {
  for (const [locale, bundle] of Object.entries(LOCALES)) {
    for (const key of KEYS) {
      it(`${locale}.${key} is written for a teacher`, () => {
        const value = read(bundle, key);
        expect(value.length).toBeGreaterThan(10);
        expect(value).not.toMatch(JARGON);
      });
    }
  }

  it('keeps every locale translated rather than falling back to the English string', () => {
    for (const key of KEYS) {
      const english = read(en, key);
      for (const locale of ['he', 'ja', 'ru'] as const) {
        expect(read(LOCALES[locale], key)).not.toBe(english);
      }
    }
  });
});
