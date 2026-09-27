import { describe, it, expect } from 'vitest';
import { buildComparisonRows, FREERICE_ROW_DEFS } from '../comparisonTable';

describe('comparisonTable', () => {
  it('builds rows using vs translations, falls back to key for missing', () => {
    const vs = { free: 'Free (en)', noStudentLogin: 'No student login (en)' }; // deliberately missing some
    const rows = buildComparisonRows(vs, FREERICE_ROW_DEFS);
    expect(rows[0]).toEqual(['Free (en)', '✓', '✓']);
    // coreFormat not in vs mock -> fallback to the key itself
    const coreRow = rows.find((r) => r[0] === 'coreFormat');
    expect(coreRow).toBeDefined();
    expect(coreRow![0]).toBe('coreFormat');
  });
});
