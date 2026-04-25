import { describe, it, expect, beforeEach } from 'vitest';
import { markWordHuntTutorialSeen } from '../markWordHuntTutorialSeen';
import { getWordHuntTutorialKey } from '@/utils/dailyChallenge/constants';

describe('markWordHuntTutorialSeen', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists the per-language seen flag as "true"', () => {
    markWordHuntTutorialSeen('en');
    expect(localStorage.getItem(getWordHuntTutorialKey('en'))).toBe('true');
  });

  it('isolates flags between languages', () => {
    markWordHuntTutorialSeen('he');
    expect(localStorage.getItem(getWordHuntTutorialKey('he'))).toBe('true');
    expect(localStorage.getItem(getWordHuntTutorialKey('en'))).toBeNull();
  });

  it('is idempotent — repeated calls keep the flag "true"', () => {
    markWordHuntTutorialSeen('sv');
    markWordHuntTutorialSeen('sv');
    expect(localStorage.getItem(getWordHuntTutorialKey('sv'))).toBe('true');
  });
});
