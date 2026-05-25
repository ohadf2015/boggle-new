import { describe, it, expect, vi, afterEach } from 'vitest';
import { todayUtcVariant, isVariantShape } from '../dailyVariant';

describe('dailyVariant', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('todayUtcVariant returns YYYY-MM-DD in UTC', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-05-26T22:30:00Z'));
    expect(todayUtcVariant()).toBe('2026-05-26');
  });

  it('todayUtcVariant rolls over at UTC midnight', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-05-27T00:00:01Z'));
    expect(todayUtcVariant()).toBe('2026-05-27');
  });

  it('isVariantShape validates YYYY-MM-DD only', () => {
    expect(isVariantShape('2026-05-26')).toBe(true);
    expect(isVariantShape('2026-5-26')).toBe(false);
    expect(isVariantShape('abc')).toBe(false);
    expect(isVariantShape('')).toBe(false);
    expect(isVariantShape('2026-13-01')).toBe(true);
  });
});
