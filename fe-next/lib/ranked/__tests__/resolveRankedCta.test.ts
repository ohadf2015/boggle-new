import { describe, expect, it } from 'vitest';
import { resolveRankedCta } from '../resolveRankedCta';

describe('resolveRankedCta', () => {
  it('hides when kill-switch is off', () => {
    expect(resolveRankedCta({ flagOn: false, isAuthenticated: true, canPlayRanked: true })).toBe('hidden');
  });

  it('asks guests to auth when flag is on', () => {
    expect(resolveRankedCta({ flagOn: true, isAuthenticated: false, canPlayRanked: false })).toBe('auth');
  });

  it('locks signed-in players who have not unlocked ranked', () => {
    expect(resolveRankedCta({ flagOn: true, isAuthenticated: true, canPlayRanked: false })).toBe('locked');
  });

  it('allows join when authenticated, eligible, and flag on', () => {
    expect(resolveRankedCta({ flagOn: true, isAuthenticated: true, canPlayRanked: true })).toBe('join');
  });
});
