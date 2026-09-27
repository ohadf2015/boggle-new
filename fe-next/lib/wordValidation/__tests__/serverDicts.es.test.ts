/**
 * serverDicts Spanish validation must strip accents BEFORE lookup, matching the
 * live MP path (backend/dictionary.ts -> normalizeSpanishWord) and the
 * /api/validate-word path. Before this fix, score-sync re-validation
 * (app/api/scores/sync) lowercased only, so accented words like "café" / "día"
 * / "acción" — accepted live — were silently REJECTED on offline-queue replay.
 * The `an-array-of-spanish-words` package stores accent-free vowels (only "cafe",
 * never "café") + preserves ñ, so symmetry requires accent-stripping, ñ-keeping.
 * Regression guard for the validator asymmetry bug.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { validateWordOnServer, __resetServerDictsForTest } from '../serverDicts';

describe('validateWordOnServer (es) — accent-stripped, ñ-preserved', () => {
  beforeEach(() => __resetServerDictsForTest());

  it('accepts accented words by stripping accents before lookup', async () => {
    expect(await validateWordOnServer('café', 'es')).toBe(true);
    expect(await validateWordOnServer('día', 'es')).toBe(true);
    expect(await validateWordOnServer('acción', 'es')).toBe(true);
    expect(await validateWordOnServer('página', 'es')).toBe(true);
  });

  it('accepts uppercase accented input (case + accent normalized)', async () => {
    expect(await validateWordOnServer('CAFÉ', 'es')).toBe(true);
    expect(await validateWordOnServer('ACCIÓN', 'es')).toBe(true);
  });

  it('preserves ñ — does not fold it to n', async () => {
    expect(await validateWordOnServer('niño', 'es')).toBe(true);
    expect(await validateWordOnServer('año', 'es')).toBe(true);
    expect(await validateWordOnServer('señor', 'es')).toBe(true);
  });

  it('still accepts plain ASCII Spanish words (regression)', async () => {
    expect(await validateWordOnServer('boa', 'es')).toBe(true);
    expect(await validateWordOnServer('dado', 'es')).toBe(true);
  });

  it('rejects non-words', async () => {
    expect(await validateWordOnServer('xqzwvk', 'es')).toBe(false);
    expect(await validateWordOnServer('', 'es')).toBe(false);
  });
});
