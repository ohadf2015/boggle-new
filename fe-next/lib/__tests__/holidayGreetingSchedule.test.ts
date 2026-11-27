import { describe, expect, it } from 'vitest';
import {
  HOLIDAY_CAMPAIGNS,
  activeCampaigns,
  isDueNow,
  recipientTimeZone,
} from '../holidayGreetingSchedule';

const hanukkah = HOLIDAY_CAMPAIGNS.find((c) => c.id === 'hanukkah-2026')!;
const christmas = HOLIDAY_CAMPAIGNS.find((c) => c.id === 'christmas-2026')!;
const utc = (iso: string) => new Date(`${iso}Z`);

describe('holiday campaigns', () => {
  it('fire Hanukkah on Dec 4 and Christmas on Dec 18, 2026', () => {
    expect(hanukkah).toMatchObject({ holiday: 'hanukkah', date: '2026-12-04' });
    expect(christmas).toMatchObject({ holiday: 'christmas', date: '2026-12-18' });
  });

  it('are only active while some time zone can be in its 10:00-13:59 window', () => {
    expect(activeCampaigns(utc('2026-12-03T19:59:00'))).toEqual([]);
    expect(activeCampaigns(utc('2026-12-03T20:00:00')).map((c) => c.id)).toEqual(['hanukkah-2026']);
    expect(activeCampaigns(utc('2026-12-05T01:59:00')).map((c) => c.id)).toEqual(['hanukkah-2026']);
    expect(activeCampaigns(utc('2026-12-05T02:00:00'))).toEqual([]);
    expect(activeCampaigns(utc('2026-12-18T12:00:00')).map((c) => c.id)).toEqual(['christmas-2026']);
  });
});

describe('isDueNow', () => {
  const il = { country_code: 'IL', timezone: 'Asia/Jerusalem' };
  const la = { country_code: 'US', timezone: 'America/Los_Angeles' };
  const tokyo = { country_code: 'JP', timezone: 'Asia/Tokyo' };

  it('given an Israeli player, Hanukkah is due 10:00-13:59 Jerusalem time on Dec 4 (UTC+2)', () => {
    expect(isDueNow(hanukkah, il, utc('2026-12-04T07:59:00'))).toBe(false);
    expect(isDueNow(hanukkah, il, utc('2026-12-04T08:00:00'))).toBe(true);
    expect(isDueNow(hanukkah, il, utc('2026-12-04T11:59:00'))).toBe(true);
    expect(isDueNow(hanukkah, il, utc('2026-12-04T12:00:00'))).toBe(false);
  });

  it('given an Israeli player, Christmas is never due', () => {
    for (const h of ['08:00', '10:00', '11:30']) {
      expect(isDueNow(christmas, il, utc(`2026-12-18T${h}:00`))).toBe(false);
    }
  });

  it('given a Los Angeles player (UTC-8), Christmas is due on their own Dec 18, which is Dec 18-19 in UTC', () => {
    expect(isDueNow(christmas, la, utc('2026-12-18T17:59:00'))).toBe(false);
    expect(isDueNow(christmas, la, utc('2026-12-18T18:00:00'))).toBe(true);
    expect(isDueNow(christmas, la, utc('2026-12-18T21:59:00'))).toBe(true);
    expect(isDueNow(christmas, la, utc('2026-12-18T22:00:00'))).toBe(false);
    expect(isDueNow(hanukkah, la, utc('2026-12-04T19:00:00'))).toBe(false);
  });

  it('given a Tokyo player (UTC+9), Christmas is due while it is still Dec 18 01:00-04:59 UTC', () => {
    expect(isDueNow(christmas, tokyo, utc('2026-12-18T00:59:00'))).toBe(false);
    expect(isDueNow(christmas, tokyo, utc('2026-12-18T01:00:00'))).toBe(true);
    expect(isDueNow(christmas, tokyo, utc('2026-12-18T04:59:00'))).toBe(true);
    expect(isDueNow(christmas, tokyo, utc('2026-12-19T01:00:00'))).toBe(false);
  });

  it('given no time zone, it falls back to the country, then UTC', () => {
    expect(recipientTimeZone({ country_code: 'JP' })).toBe('Asia/Tokyo');
    expect(recipientTimeZone({ timezone: 'Not/AZone', country_code: 'IL' })).toBe('Asia/Jerusalem');
    expect(recipientTimeZone({})).toBe('UTC');
    expect(isDueNow(christmas, {}, utc('2026-12-18T10:00:00'))).toBe(true);
    expect(isDueNow(christmas, {}, utc('2026-12-18T14:00:00'))).toBe(false);
  });
});
