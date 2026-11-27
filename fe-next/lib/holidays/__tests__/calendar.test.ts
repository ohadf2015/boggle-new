import { describe, expect, it } from 'vitest';
import { finaleDate, holidayWindows, localDateIn, trackIndex, windowFor } from '../calendar';

describe('holidayWindows', () => {
  it('given 2026, returns hanukkah Dec 4-12 with 8 nights and christmas Dec 13 - Jan 1 with 12 gifts', () => {
    const [h, c] = holidayWindows(2026);
    expect(h).toMatchObject({ key: 'hanukkah', start: '2026-12-04', end: '2026-12-12' });
    expect(h.trackDays).toHaveLength(8);
    expect(h.trackDays[0]).toBe('2026-12-04');
    expect(h.trackDays[7]).toBe('2026-12-11');
    expect(c).toMatchObject({ key: 'christmas', start: '2026-12-13', end: '2027-01-01' });
    expect(c.trackDays).toHaveLength(12);
    expect(c.trackDays[0]).toBe('2026-12-14');
    expect(c.trackDays[11]).toBe('2026-12-25');
  });

  it('given 2027, hanukkah wraps into 2028', () => {
    const h = holidayWindows(2027).find((w) => w.key === 'hanukkah')!;
    expect(h).toMatchObject({ start: '2027-12-24', end: '2028-01-01' });
    expect(h.trackDays[7]).toBe('2027-12-31');
  });

  it('given 2028, hanukkah is Dec 12-20', () => {
    expect(holidayWindows(2028).find((w) => w.key === 'hanukkah')).toMatchObject({
      start: '2028-12-12',
      end: '2028-12-20',
    });
  });

  it('given a year without hanukkah data, returns only christmas', () => {
    expect(holidayWindows(2025).map((w) => w.key)).toEqual(['christmas']);
    expect(holidayWindows(2029).map((w) => w.key)).toEqual(['christmas']);
  });
});

describe('windowFor', () => {
  it('includes both window edges and excludes the days outside', () => {
    expect(windowFor('hanukkah', '2026-12-03')).toBeNull();
    expect(windowFor('hanukkah', '2026-12-04')?.start).toBe('2026-12-04');
    expect(windowFor('hanukkah', '2026-12-12')?.start).toBe('2026-12-04');
    expect(windowFor('hanukkah', '2026-12-13')).toBeNull();
    expect(windowFor('christmas', '2026-12-12')).toBeNull();
    expect(windowFor('christmas', '2026-12-13')?.start).toBe('2026-12-13');
    expect(windowFor('christmas', '2027-01-01')?.start).toBe('2026-12-13');
    expect(windowFor('christmas', '2027-01-02')).toBeNull();
  });

  it('given Jan 1 2028, finds the 2027 windows of both holidays', () => {
    expect(windowFor('hanukkah', '2028-01-01')?.start).toBe('2027-12-24');
    expect(windowFor('christmas', '2028-01-01')?.start).toBe('2027-12-13');
    expect(windowFor('hanukkah', '2028-01-02')).toBeNull();
  });

  it('returns null in summer and for malformed dates', () => {
    expect(windowFor('christmas', '2026-07-01')).toBeNull();
    expect(windowFor('christmas', 'nope')).toBeNull();
  });
});

describe('trackIndex', () => {
  it('maps hanukkah nights 1-8 to 0-7 and the 9th day to null', () => {
    const h = windowFor('hanukkah', '2026-12-04')!;
    expect(trackIndex(h, '2026-12-04')).toBe(0);
    expect(trackIndex(h, '2026-12-11')).toBe(7);
    expect(trackIndex(h, '2026-12-12')).toBeNull();
  });

  it('maps christmas gifts Dec 14-25 to 0-11 and the other window days to null', () => {
    const c = windowFor('christmas', '2026-12-13')!;
    expect(trackIndex(c, '2026-12-13')).toBeNull();
    expect(trackIndex(c, '2026-12-14')).toBe(0);
    expect(trackIndex(c, '2026-12-25')).toBe(11);
    expect(trackIndex(c, '2026-12-26')).toBeNull();
    expect(trackIndex(c, '2027-01-01')).toBeNull();
  });

  it('maps the 2027 hanukkah night 8 on Dec 31', () => {
    const h = windowFor('hanukkah', '2028-01-01')!;
    expect(trackIndex(h, '2027-12-31')).toBe(7);
    expect(trackIndex(h, '2028-01-01')).toBeNull();
  });
});

describe('localDateIn', () => {
  it('given 22:30 UTC on Dec 3, returns Dec 4 in Asia/Jerusalem and Dec 3 in New York', () => {
    const now = new Date('2026-12-03T22:30:00Z');
    expect(localDateIn(now, 'Asia/Jerusalem')).toBe('2026-12-04');
    expect(localDateIn(now, 'America/New_York')).toBe('2026-12-03');
    expect(windowFor('hanukkah', localDateIn(now, 'Asia/Jerusalem'))).not.toBeNull();
  });

  it('given an unknown time zone, falls back to UTC', () => {
    expect(localDateIn(new Date('2026-12-03T22:30:00Z'), 'Not/AZone')).toBe('2026-12-03');
  });
});

describe('locale christmas windows', () => {
  it('given no locale or en, christmas ends Jan 1', () => {
    expect(holidayWindows(2026, 'en').find((w) => w.key === 'christmas')!.end).toBe('2027-01-01');
    expect(windowFor('christmas', '2027-01-02', 'en')).toBeNull();
  });

  it('given es, christmas runs through Reyes plus a grace day to Jan 7', () => {
    expect(windowFor('christmas', '2027-01-05', 'es')?.end).toBe('2027-01-07');
    expect(windowFor('christmas', '2027-01-06', 'es-MX')?.end).toBe('2027-01-07');
    expect(windowFor('christmas', '2027-01-07', 'es')?.end).toBe('2027-01-07');
    expect(windowFor('christmas', '2027-01-08', 'es')).toBeNull();
  });

  it('given ru, christmas runs to Jan 7 (Orthodox Christmas)', () => {
    expect(windowFor('christmas', '2027-01-07', 'ru')?.end).toBe('2027-01-07');
    expect(windowFor('christmas', '2027-01-08', 'ru')).toBeNull();
  });

  it('locale never changes hanukkah or the 12-gift track', () => {
    expect(holidayWindows(2026, 'es')[0]).toEqual(holidayWindows(2026)[0]);
    expect(windowFor('christmas', '2027-01-06', 'es')!.trackDays).toEqual(holidayWindows(2026)[1].trackDays);
  });
});

describe('finaleDate', () => {
  it('hanukkah finale is night 8, christmas Dec 25, es Jan 6', () => {
    expect(finaleDate(windowFor('hanukkah', '2026-12-05')!)).toBe('2026-12-11');
    expect(finaleDate(windowFor('hanukkah', '2028-01-01')!)).toBe('2027-12-31');
    expect(finaleDate(windowFor('christmas', '2026-12-20')!)).toBe('2026-12-25');
    expect(finaleDate(windowFor('christmas', '2026-12-20', 'ru')!)).toBe('2026-12-25');
    expect(finaleDate(windowFor('christmas', '2026-12-20', 'es')!)).toBe('2027-01-06');
  });
});
