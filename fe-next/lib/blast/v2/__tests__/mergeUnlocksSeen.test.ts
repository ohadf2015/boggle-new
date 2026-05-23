import { describe, it, expect } from 'vitest';
import { mergeUnlocksSeen } from '../mergeUnlocksSeen';

/**
 * Merges the client's accumulated tutorial-seen flags onto the server's stored
 * set. Must be additive (never lose a seen flag) and must treat
 * veteran_bonus_granted as server-owned — the client can never clear it, or the
 * 500-coin veteran bonus (telemetry.server.ts grantVeteranBonus) could re-fire.
 */
describe('mergeUnlocksSeen', () => {
  it('unions disjoint keys', () => {
    expect(mergeUnlocksSeen({ ftue_completed: true }, { coinOverlay: true })).toEqual({
      ftue_completed: true,
      coinOverlay: true,
    });
  });

  it('incoming wins for a shared key (both monotonic-true anyway)', () => {
    expect(mergeUnlocksSeen({ coinOverlay: true }, { coinOverlay: true })).toEqual({ coinOverlay: true });
  });

  it('returns incoming when existing is empty', () => {
    expect(mergeUnlocksSeen({}, { ftue_completed: true })).toEqual({ ftue_completed: true });
  });

  it('returns existing when incoming is empty', () => {
    expect(mergeUnlocksSeen({ ftue_completed: true }, {})).toEqual({ ftue_completed: true });
  });

  it('preserves server veteran_bonus_granted even if the client omits it', () => {
    const merged = mergeUnlocksSeen({ veteran_bonus_granted: true }, { ftue_completed: true });
    expect(merged.veteran_bonus_granted).toBe(true);
    expect(merged.ftue_completed).toBe(true);
  });

  it('refuses to let the client clear veteran_bonus_granted', () => {
    const merged = mergeUnlocksSeen({ veteran_bonus_granted: true }, { veteran_bonus_granted: false });
    expect(merged.veteran_bonus_granted).toBe(true);
  });

  it('tolerates null/undefined inputs', () => {
    expect(mergeUnlocksSeen(null, { ftue_completed: true })).toEqual({ ftue_completed: true });
    expect(mergeUnlocksSeen({ ftue_completed: true }, null)).toEqual({ ftue_completed: true });
    expect(mergeUnlocksSeen(null, null)).toEqual({});
  });
});
