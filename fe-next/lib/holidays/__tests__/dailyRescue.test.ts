import { describe, expect, it } from 'vitest';
import { latestMissedDay, missedDays, rescueInviteUrl } from '../dailyRescue';

const DAYS = ['2026-12-04', '2026-12-05', '2026-12-06', '2026-12-07'];

describe('missedDays', () => {
  it('Given past unlit days, Then they are missed; today and the future are not', () => {
    expect(missedDays(DAYS, new Set([0]), '2026-12-07')).toEqual([1, 2]);
    expect(missedDays(DAYS, new Set(), '2026-12-04')).toEqual([]);
  });
});

describe('latestMissedDay', () => {
  it('Given several missed days, Then the friend relights the latest one', () => {
    expect(latestMissedDay(DAYS, new Set([0]), '2026-12-07')).toBe(2);
  });

  it('Given nothing missed, Then there is nothing to relight', () => {
    expect(latestMissedDay(DAYS, new Set([0, 1, 2]), '2026-12-07')).toBeNull();
  });

  it('Given today is after the track, Then every unlit day counts as missed', () => {
    expect(latestMissedDay(DAYS, new Set([0, 1, 2]), '2026-12-12')).toBe(3);
  });
});

describe('rescueInviteUrl', () => {
  it('Given an invite code, Then the link opens the daily in that holiday with the code as ref', () => {
    expect(rescueInviteUrl('https://www.lexiclash.live', 'he', 'hanukkah', 'ABCDEFGH')).toBe(
      'https://www.lexiclash.live/he/daily?holiday=hanukkah&ref=ABCDEFGH&hinvite=1',
    );
  });
});
