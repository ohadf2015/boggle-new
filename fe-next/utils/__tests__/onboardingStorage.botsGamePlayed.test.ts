import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  hasPlayedBotsGame,
  markBotsGamePlayed,
  clearBotsGamePlayed,
} from '@/utils/onboardingStorage';

describe('hasPlayedBotsGame flag', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns false by default (new player)', () => {
    expect(hasPlayedBotsGame()).toBe(false);
  });

  it('returns true after markBotsGamePlayed is called', () => {
    markBotsGamePlayed();
    expect(hasPlayedBotsGame()).toBe(true);
  });

  it('persists the flag across reads', () => {
    markBotsGamePlayed();
    expect(hasPlayedBotsGame()).toBe(true);
    expect(hasPlayedBotsGame()).toBe(true);
  });

  it('clearBotsGamePlayed resets to false', () => {
    markBotsGamePlayed();
    clearBotsGamePlayed();
    expect(hasPlayedBotsGame()).toBe(false);
  });

  it('calling mark twice stays idempotent', () => {
    markBotsGamePlayed();
    markBotsGamePlayed();
    expect(hasPlayedBotsGame()).toBe(true);
  });
});
