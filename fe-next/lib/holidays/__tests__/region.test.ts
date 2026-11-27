import { describe, expect, it } from 'vitest';
import { activeHoliday, defaultHoliday, otherHoliday, resolveRegion } from '../region';

describe('resolveRegion', () => {
  it('given a country code, it decides alone (case-insensitive)', () => {
    expect(resolveRegion({ countryCode: 'IL' })).toBe('IL');
    expect(resolveRegion({ countryCode: 'il', timeZone: 'America/New_York', locale: 'en' })).toBe('IL');
    expect(resolveRegion({ countryCode: 'US', timeZone: 'Asia/Jerusalem', locale: 'he' })).toBe('world');
  });

  it('given no country code, an Israeli time zone means IL', () => {
    expect(resolveRegion({ timeZone: 'Asia/Jerusalem' })).toBe('IL');
    expect(resolveRegion({ countryCode: null, timeZone: 'Asia/Tel_Aviv', locale: 'en' })).toBe('IL');
  });

  it('given no country or Israeli time zone, Hebrew locale means IL', () => {
    expect(resolveRegion({ timeZone: 'Europe/London', locale: 'he' })).toBe('IL');
    expect(resolveRegion({ locale: 'he-IL' })).toBe('IL');
  });

  it('given nothing Israeli, returns world', () => {
    expect(resolveRegion({ timeZone: 'Europe/Stockholm', locale: 'sv' })).toBe('world');
    expect(resolveRegion({})).toBe('world');
  });
});

describe('defaultHoliday / otherHoliday', () => {
  it('IL defaults to hanukkah, world to christmas', () => {
    expect(defaultHoliday('IL')).toBe('hanukkah');
    expect(defaultHoliday('world')).toBe('christmas');
    expect(otherHoliday('hanukkah')).toBe('christmas');
    expect(otherHoliday('christmas')).toBe('hanukkah');
  });
});

describe('activeHoliday', () => {
  it('given the region default open, returns it', () => {
    expect(activeHoliday({ localDate: '2026-12-05', region: 'IL' })).toBe('hanukkah');
    expect(activeHoliday({ localDate: '2026-12-20', region: 'world' })).toBe('christmas');
    expect(activeHoliday({ localDate: '2027-01-01', region: 'world' })).toBe('christmas');
  });

  it('given the default closed and the other open, returns null (no auto-fallback)', () => {
    expect(activeHoliday({ localDate: '2026-12-05', region: 'world' })).toBeNull();
    expect(activeHoliday({ localDate: '2026-12-20', region: 'IL' })).toBeNull();
  });

  it('given an override inside its window, returns the override', () => {
    expect(activeHoliday({ localDate: '2026-12-05', region: 'world', override: 'hanukkah' })).toBe('hanukkah');
    expect(activeHoliday({ localDate: '2026-12-20', region: 'IL', override: 'christmas' })).toBe('christmas');
  });

  it('given an override outside its window, falls back to the default', () => {
    expect(activeHoliday({ localDate: '2026-12-20', region: 'world', override: 'hanukkah' })).toBe('christmas');
    expect(activeHoliday({ localDate: '2026-12-20', region: 'IL', override: 'hanukkah' })).toBeNull();
  });

  it('given override off, returns null even in season', () => {
    expect(activeHoliday({ localDate: '2026-12-05', region: 'IL', override: 'off' })).toBeNull();
  });

  it('given preview, forces the override on outside every window', () => {
    expect(activeHoliday({ localDate: '2026-07-01', region: 'world', override: 'christmas', preview: true })).toBe(
      'christmas',
    );
    expect(activeHoliday({ localDate: '2026-07-01', region: 'world', override: 'off', preview: true })).toBeNull();
  });

  it('outside every window returns null', () => {
    expect(activeHoliday({ localDate: '2026-11-27', region: 'IL' })).toBeNull();
    expect(activeHoliday({ localDate: '2027-01-02', region: 'world' })).toBeNull();
  });
});

describe('activeHoliday with locale', () => {
  it('given es on Jan 6-7, christmas is still on; Jan 8 off', () => {
    expect(activeHoliday({ localDate: '2027-01-06', region: 'world', locale: 'es' })).toBe('christmas');
    expect(activeHoliday({ localDate: '2027-01-07', region: 'world', locale: 'es' })).toBe('christmas');
    expect(activeHoliday({ localDate: '2027-01-08', region: 'world', locale: 'es' })).toBeNull();
  });

  it('given ru, Jan 7 on and Jan 8 off; en Jan 2 off', () => {
    expect(activeHoliday({ localDate: '2027-01-07', region: 'world', locale: 'ru' })).toBe('christmas');
    expect(activeHoliday({ localDate: '2027-01-08', region: 'world', locale: 'ru' })).toBeNull();
    expect(activeHoliday({ localDate: '2027-01-02', region: 'world', locale: 'en' })).toBeNull();
  });

  it('given an IL player overriding to christmas in es, the es window applies', () => {
    expect(activeHoliday({ localDate: '2027-01-06', region: 'IL', override: 'christmas', locale: 'es' })).toBe('christmas');
  });
});
