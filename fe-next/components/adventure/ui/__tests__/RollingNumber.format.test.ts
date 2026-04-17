import { describe, it, expect } from 'vitest';
import { formatNumber } from '../RollingNumber';

describe('RollingNumber formatNumber', () => {
  it('respects en-US thousands separator', () => {
    expect(formatNumber(1234, 1, 'en-US')).toBe('1,234');
  });

  it('respects de-DE thousands separator (dot)', () => {
    expect(formatNumber(1234, 1, 'de-DE')).toBe('1.234');
  });

  it('pads with zeros to minDigits', () => {
    expect(formatNumber(7, 3, 'en-US')).toBe('007');
  });

  it('falls back to runtime default when locale undefined', () => {
    expect(formatNumber(1234, 1)).toMatch(/[1][.,\u00a0 ]?234/);
  });
});
