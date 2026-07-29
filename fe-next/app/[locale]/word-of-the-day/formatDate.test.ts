import { describe, it, expect } from 'vitest';
import { formatLongDate } from './formatDate';

describe('formatLongDate', () => {
  it('formats Hebrew date with HE month name', () => {
    const out = formatLongDate('he', '2026-04-28');
    expect(out).toMatch(/28/);
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/באפריל/);
  });

  it('formats English date as Month Day, Year', () => {
    const out = formatLongDate('en', '2026-04-28');
    expect(out).toMatch(/April/);
    expect(out).toMatch(/28/);
    expect(out).toMatch(/2026/);
  });

  it('returns the raw dateKey on invalid input', () => {
    expect(formatLongDate('he', 'not-a-date')).toBe('not-a-date');
  });
});
