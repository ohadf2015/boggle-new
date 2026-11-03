import { describe, expect, it } from 'vitest';
import { comboTier, formatHudCount } from '../hudFormat';

describe('comboTier', () => {
  it('given no streak, then tier 0 (no meter)', () => {
    expect(comboTier(0)).toBe(0);
    expect(comboTier(1)).toBe(0);
  });

  it('given a short streak, then tier 1', () => {
    expect(comboTier(2)).toBe(1);
    expect(comboTier(3)).toBe(1);
  });

  it('given a hot streak, then tier 2', () => {
    expect(comboTier(4)).toBe(2);
    expect(comboTier(6)).toBe(2);
  });

  it('given a blazing streak, then tier 3 and it caps there', () => {
    expect(comboTier(7)).toBe(3);
    expect(comboTier(99)).toBe(3);
  });

  it('given garbage, then tier 0', () => {
    expect(comboTier(Number.NaN)).toBe(0);
    expect(comboTier(-3)).toBe(0);
  });
});

describe('formatHudCount', () => {
  it('given a count under 10,000, then every digit shows', () => {
    expect(formatHudCount(9999, 'en')).toBe('9,999');
  });

  it('given a five-digit count, then it compacts so the chip width stays bounded', () => {
    expect(formatHudCount(88888, 'en')).toBe('88.9K');
    expect(formatHudCount(1_250_000, 'en')).toBe('1.3M');
  });

  it('given a locale, then the compact form follows it', () => {
    expect(formatHudCount(1234, 'sv')).toBe(new Intl.NumberFormat('sv').format(1234));
  });

  it('given a fractional or negative count, then it rounds and floors at zero', () => {
    expect(formatHudCount(12.6, 'en')).toBe('13');
    expect(formatHudCount(-5, 'en')).toBe('0');
  });
});
