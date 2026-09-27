/**
 * Verifies the new teacher.reports.exportAllClasses.* keys resolve to a
 * real, non-empty string in every shipped locale — not just English. Follows
 * the same lazy-loader pattern as translations.import.test.ts.
 */
import { loadTranslation } from '../translations/loadTranslation';

const COLUMN_KEYS = [
  'classroom',
  'student',
  'lessonsCompleted',
  'wordsMastered',
  'totalXp',
  'lastActive',
  'gamesPlayed',
] as const;

describe('teacher.reports.exportAllClasses translations', () => {
  it('resolves button/downloading/failed/empty/fileName + every column label in every locale', async () => {
    for (const lang of ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const) {
      const data = (await loadTranslation(lang)) as {
        teacher?: { reports?: { exportAllClasses?: Record<string, unknown> } };
      };

      const section = data.teacher?.reports?.exportAllClasses;
      expect(section, `teacher.reports.exportAllClasses missing for locale "${lang}"`).toBeDefined();

      for (const key of ['button', 'downloading', 'failed', 'empty', 'fileName', 'anonymousStudent'] as const) {
        const value = section?.[key];
        expect(typeof value, `${lang}.teacher.reports.exportAllClasses.${key}`).toBe('string');
        expect((value as string).length, `${lang}.teacher.reports.exportAllClasses.${key} is empty`).toBeGreaterThan(0);
      }

      // anonymousStudent is authored as "...{{id}}..." in the source translation
      // files, but loadTranslation() runs normalizeMessages() on everything it
      // returns, which rewrites {{id}} -> ICU {id} — this test goes through the
      // same loadTranslation() the real LanguageContext uses, so it must assert
      // on the NORMALIZED form, not the raw file syntax. teacherExportToCsv
      // matches both {{id}} and {id} for exactly this reason.
      expect(
        section?.anonymousStudent,
        `${lang}.teacher.reports.exportAllClasses.anonymousStudent must contain an id placeholder`,
      ).toEqual(expect.stringMatching(/\{\{id\}\}|\{id\}/));

      const columns = section?.columns as Record<string, unknown> | undefined;
      expect(columns, `teacher.reports.exportAllClasses.columns missing for locale "${lang}"`).toBeDefined();

      for (const key of COLUMN_KEYS) {
        const value = columns?.[key];
        expect(typeof value, `${lang}.teacher.reports.exportAllClasses.columns.${key}`).toBe('string');
        expect((value as string).length, `${lang}.teacher.reports.exportAllClasses.columns.${key} is empty`).toBeGreaterThan(0);
      }
    }
  });
});
