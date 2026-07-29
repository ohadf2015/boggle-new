import { describe, test, expect } from 'vitest';
import { needsGameProviders } from '../conditional-providers';

describe('needsGameProviders', () => {
  test('returns false for landing/root', () => {
    expect(needsGameProviders('/')).toBe(false);
    expect(needsGameProviders('/en')).toBe(false);
  });

  test('returns true for existing game routes', () => {
    expect(needsGameProviders('/en/multiplayer')).toBe(true);
    expect(needsGameProviders('/he/adventure')).toBe(true);
  });

  test('returns true for /friends so socket-based gift/request realtime works', () => {
    expect(needsGameProviders('/en/friends')).toBe(true);
    expect(needsGameProviders('/he/friends/requests')).toBe(true);
  });

  test('returns true for /profile so socket listeners mount', () => {
    expect(needsGameProviders('/en/profile')).toBe(true);
  });

  test('handles null pathname', () => {
    expect(needsGameProviders(null)).toBe(false);
  });
});
