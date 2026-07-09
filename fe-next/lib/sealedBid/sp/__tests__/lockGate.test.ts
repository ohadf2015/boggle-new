import { describe, it, expect } from 'vitest';
import { canLockBid, lockDisabledReason } from '../lockGate';

describe('lockGate', () => {
  it('disables without a long-enough word', () => {
    expect(canLockBid({ word: '', stake: 10 })).toBe(false);
    expect(lockDisabledReason({ word: 'AT', stake: 10 })).toBe('needWord');
  });

  it('disables with word but zero stake', () => {
    expect(canLockBid({ word: 'CAT', stake: 0 })).toBe(false);
    expect(lockDisabledReason({ word: 'CAT', stake: 0 })).toBe('needStake');
  });

  it('enables when word ≥ 3 and stake > 0', () => {
    expect(canLockBid({ word: 'CAT', stake: 5 })).toBe(true);
    expect(lockDisabledReason({ word: 'CAT', stake: 5 })).toBe(null);
  });

  it('disables while pending or busted', () => {
    expect(lockDisabledReason({ word: 'CAT', stake: 5, pending: true })).toBe('pending');
    expect(lockDisabledReason({ word: 'CAT', stake: 5, busted: true })).toBe('busted');
  });
});
