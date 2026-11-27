import { describe, it, expect } from 'vitest';
import { giftTier, giftOpenable, giftReward, giftHintIndex, GIFT_TIER_COUNT } from '../gift';
import { lastMissedIndex, COMEBACK_GAMES } from '../comeback';
import { windowFor } from '../calendar';

describe('giftTier', () => {
  it('Given Hanukkah, then each lit night grows the box one tier up to 8', () => {
    expect(GIFT_TIER_COUNT.hanukkah).toBe(8);
    expect(giftTier('hanukkah', 0)).toBe(1);
    expect(giftTier('hanukkah', 1)).toBe(1);
    expect(giftTier('hanukkah', 5)).toBe(5);
    expect(giftTier('hanukkah', 8)).toBe(8);
    expect(giftTier('hanukkah', 20)).toBe(8);
  });

  it('Given Christmas, then 12 days map onto 9 tiers and never shrink', () => {
    const tiers = Array.from({ length: 13 }, (_, lit) => giftTier('christmas', lit));
    expect(tiers[0]).toBe(1);
    expect(tiers[12]).toBe(9);
    for (let i = 1; i < tiers.length; i++) expect(tiers[i]).toBeGreaterThanOrEqual(tiers[i - 1]);
  });
});

describe('giftOpenable', () => {
  it('Given the Hanukkah finale (night 8), then it opens that day and stays open to the window end', () => {
    const win = windowFor('hanukkah', '2026-12-05')!;
    expect(giftOpenable(win, '2026-12-10')).toBe(false);
    expect(giftOpenable(win, '2026-12-11')).toBe(true);
    expect(giftOpenable(win, '2026-12-12')).toBe(true);
  });

  it('Given a Spanish player, then the big gift waits for Reyes on Jan 6', () => {
    const win = windowFor('christmas', '2026-12-20', 'es')!;
    expect(giftOpenable(win, '2026-12-25')).toBe(false);
    expect(giftOpenable(win, '2027-01-06')).toBe(true);
    expect(giftOpenable(win, '2027-01-07')).toBe(true);
    expect(giftOpenable(win, '2027-01-08')).toBe(false);
    expect(giftOpenable(windowFor('christmas', '2026-12-20', 'en')!, '2026-12-25')).toBe(true);
  });
});

describe('giftReward', () => {
  it('Given a partial run, then coins scale with lit days and there is no part', () => {
    expect(giftReward('hanukkah', 3)).toEqual({ coins: 120 });
  });

  it('Given a full run, then a bonus and the exclusive golden part are added', () => {
    expect(giftReward('hanukkah', 8)).toEqual({ coins: 520, partKey: 'accessory:goldGeltMedal' });
    expect(giftReward('christmas', 12)).toEqual({ coins: 680, partKey: 'accessory:goldBell' });
  });

  it('Given zero lit days, then still a small consolation', () => {
    expect(giftReward('christmas', 0)).toEqual({ coins: 20 });
  });
});

describe('giftHintIndex', () => {
  it('Given successive taps, then the hint rotates and wraps', () => {
    expect([0, 1, 2, 3, 4, 5].map((n) => giftHintIndex(n))).toEqual([0, 1, 2, 3, 4, 0]);
  });
});

describe('lastMissedIndex', () => {
  it('Given a gap before today, then the latest missed day is returned', () => {
    expect(COMEBACK_GAMES).toBe(3);
    expect(lastMissedIndex(new Set([0, 1, 3]), 5, 8)).toBe(4);
    expect(lastMissedIndex(new Set([0, 2, 3, 4]), 5, 8)).toBe(1);
  });

  it('Given no gap, or today is day 1, then nothing to relight', () => {
    expect(lastMissedIndex(new Set([0, 1, 2]), 3, 8)).toBeNull();
    expect(lastMissedIndex(new Set(), 0, 8)).toBeNull();
  });

  it('Given the track is over (after the last day), then any missed track day counts', () => {
    expect(lastMissedIndex(new Set([0, 1, 2, 3, 4, 5, 6]), null, 8)).toBe(7);
  });
});
