import { describe, it, expect } from 'vitest';
import { momentsFor, countryFromTimeZone } from '../moments';

const base = { holiday: 'christmas' as const, hour: 10, countryCode: null, timeZone: null };

describe('momentsFor', () => {
  it.each([
    ['sv', '2026-12-13', 10, 'lucia'],
    ['sv', '2026-12-24', 15, 'fika'],
    ['es', '2026-12-28', 10, 'inocentes'],
    ['es', '2027-01-05', 10, 'reyes'],
    ['es', '2027-01-06', 10, 'roscon'],
    ['ja', '2026-12-31', 10, 'kohaku'],
    ['ja', '2027-01-01', 10, 'bells108'],
    ['ru', '2026-12-31', 23, 'chimes'],
    ['ru', '2027-01-01', 0, 'chimes'],
    ['ru', '2027-01-07', 10, 'dedmoroz'],
    ['en', '2026-12-24', 10, 'sleigh'],
  ])('Given %s on %s at %s:00, then %s is on', (locale, localDate, hour, moment) => {
    expect(momentsFor({ ...base, locale, localDate, hour })).toContain(moment);
  });

  it.each([
    ['sv', '2026-12-24', 17, 'fika'],
    ['sv', '2026-12-14', 10, 'lucia'],
    ['ru', '2026-12-31', 21, 'chimes'],
    ['en', '2026-12-13', 10, 'lucia'],
    ['es', '2026-12-29', 10, 'inocentes'],
  ])('Given %s on %s at %s:00, then %s is off', (locale, localDate, hour, moment) => {
    expect(momentsFor({ ...base, locale, localDate, hour })).not.toContain(moment);
  });

  it('Given Boxing Day, then only GB/CA/AU players see it (country, else time zone)', () => {
    const d = { ...base, locale: 'en', localDate: '2026-12-26' };
    expect(momentsFor({ ...d, countryCode: 'GB' })).toContain('boxingDay');
    expect(momentsFor({ ...d, countryCode: 'US' })).not.toContain('boxingDay');
    expect(momentsFor({ ...d, timeZone: 'Australia/Sydney' })).toContain('boxingDay');
    expect(momentsFor({ ...d, timeZone: 'America/New_York' })).not.toContain('boxingDay');
  });

  it('Given the Hanukkah theme or no theme, then no Christmas locale moments', () => {
    expect(momentsFor({ ...base, holiday: 'hanukkah', locale: 'en', localDate: '2027-12-24' })).toEqual([]);
    expect(momentsFor({ ...base, holiday: null, locale: 'sv', localDate: '2026-12-13' })).toEqual([]);
  });
});

describe('countryFromTimeZone', () => {
  it('Given known zones, then the country', () => {
    expect(countryFromTimeZone('Europe/London')).toBe('GB');
    expect(countryFromTimeZone('America/Toronto')).toBe('CA');
    expect(countryFromTimeZone('Australia/Perth')).toBe('AU');
    expect(countryFromTimeZone('Europe/Paris')).toBeNull();
  });
});
