/**
 * Hebrew one-letter prefixes (ש/ל/ב/מ) bind to their word; when the word is an
 * interpolated Latin name or number the join needs a maqaf — "ש-Noa", never
 * "שNoa". Guards the arc block against the glue recurring.
 */
import { describe, it, expect } from 'vitest';
import { he } from '../../../../translations/he.js';

const arc = (he as Record<string, any>).teacher.reports.arc as Record<string, unknown>;

describe('he teacher.reports.arc prefix glue', () => {
  it('no arc string glues a one-letter prefix to an interpolation', () => {
    const offenders = Object.entries(arc)
      .filter(([, v]) => typeof v === 'string' && /[שלבמ]\{\{/.test(v as string))
      .map(([k]) => k);
    expect(offenders).toEqual([]);
  });
});
