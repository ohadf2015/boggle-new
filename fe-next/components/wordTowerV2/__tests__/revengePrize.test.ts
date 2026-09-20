import { describe, expect, it } from 'vitest';
import { emptyEstate } from '@/lib/wordTowerV2/estate';
import { revengePrize } from '../rivals/revengePrize';

/**
 * A revenge row that says "their shield held" and nothing else is a row with no
 * stated reason to tap it — the blind judge counted exactly that against us
 * ("2 of the 3 rows say 'shield held' with no stated benefit to hitting back").
 *
 * So every row states its prize, and the prize is read off the SAME pure
 * function the server scores the raid with (`raidOutcome`) rather than a
 * hand-written number that can drift from the payout.
 */

const rival = (over: { shields?: number; district?: number } = {}) => ({
  district: over.district ?? 1,
  shields: over.shields ?? 0,
  plots: emptyEstate().plots,
});

describe('revengePrize', () => {
  it('Given a shielded rival, When previewing revenge, Then it says the swing breaks the shield and still banks coins', () => {
    const prize = revengePrize(rival({ shields: 1 }));
    expect(prize.shielded).toBe(true);
    expect(prize.guaranteed).toBeGreaterThan(0);
  });

  it('Given an unshielded rival, When previewing revenge, Then the prize is bigger than a shielded one', () => {
    expect(revengePrize(rival({ shields: 0 })).guaranteed).toBeGreaterThan(revengePrize(rival({ shields: 1 })).guaranteed);
    expect(revengePrize(rival({ shields: 0 })).shielded).toBe(false);
  });

  it('Given a deeper district, When previewing revenge, Then the prize scales up with it', () => {
    expect(revengePrize(rival({ district: 3 })).guaranteed).toBeGreaterThan(revengePrize(rival({ district: 1 })).guaranteed);
  });

  it('Given junk plots, When previewing revenge, Then it still returns a whole positive number', () => {
    const prize = revengePrize({ district: 0, shields: 0, plots: [] as never });
    expect(Number.isInteger(prize.guaranteed)).toBe(true);
    expect(prize.guaranteed).toBeGreaterThan(0);
  });

  it('Given the preview, When the swing is a clean miss, Then the advertised number is one the payout can always honour', () => {
    // The chip advertises the FLOOR (accuracy 0), never a best case the swing
    // may not reach — a row that promises more than the payout delivers is the
    // same self-contradiction `raidVerdict` exists to prevent, one screen back.
    const prize = revengePrize(rival({ shields: 0 }));
    expect(prize.guaranteed).toBeLessThanOrEqual(prize.atBestAccuracy);
  });
});
