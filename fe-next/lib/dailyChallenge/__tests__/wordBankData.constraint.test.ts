// ─── WORD_LENGTH_RANGE ↔ DB check_word_length invariant ──────────────────
// The importer filters candidate words by WORD_LENGTH_RANGE before inserting
// them as status='active'. The DB constraint `check_word_length`
// (migration 20260625000000_enforce_word_hunt_target_5to7) rejects active words
// outside its bounds: ja 2..4, everything else 5..7. If the filter allows a
// length the constraint rejects, the insert fails with Postgres 23514 and logs
// "[WORD_BANK] Error importing word: …" to Sentry (JAVASCRIPT-NEXTJS-1QT, e.g.
// "AMUN" = 4 letters). The import filter must never allow such lengths.

import { WORD_LENGTH_RANGE } from '../wordBankData';
import type { Language } from '@/types';

// DB check_word_length bounds for status='active' rows.
const DB_ACTIVE_BOUNDS: Record<Language, { min: number; max: number }> = {
  en: { min: 5, max: 7 },
  he: { min: 5, max: 7 },
  sv: { min: 5, max: 7 },
  es: { min: 5, max: 7 },
  fr: { min: 5, max: 7 },
  de: { min: 5, max: 7 },
  ru: { min: 5, max: 7 },
  ja: { min: 2, max: 4 },
};

describe('WORD_LENGTH_RANGE stays inside the DB check_word_length constraint', () => {
  it.each(Object.keys(WORD_LENGTH_RANGE) as Language[])(
    'never admits a length the DB rejects for active %s words',
    (lang) => {
      const filter = WORD_LENGTH_RANGE[lang];
      const db = DB_ACTIVE_BOUNDS[lang];
      // Any word passing the filter must satisfy the DB constraint → the filter
      // window must be a subset of the DB window.
      expect(filter.min).toBeGreaterThanOrEqual(db.min);
      expect(filter.max).toBeLessThanOrEqual(db.max);
    },
  );
});
