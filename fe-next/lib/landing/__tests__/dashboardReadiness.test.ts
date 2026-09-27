import { describe, it, expect } from 'vitest';
import { isDashboardProfileLoading } from '../dashboardReadiness';

/**
 * The dashboard top bar must render the pessimistic (skeleton) state until the
 * signed-in player's profile actually lands — never the guest "Player" default
 * that would then snap to their real username (cold-start flicker, pitfall
 * Class 1: dual source of truth + async resolution).
 */
describe('isDashboardProfileLoading', () => {
  const profile = { id: 'u1', display_name: 'Maya' } as any;
  const user = { id: 'u1' } as any;

  it('is loading while auth itself is still resolving', () => {
    expect(isDashboardProfileLoading(true, null, null)).toBe(true);
  });

  it('is loading for a signed-in session whose profile row has not arrived yet', () => {
    // The exact cold-start gap: `user` is set, `loading` already flipped false,
    // but `profile` is still null while fetchUserData is in flight.
    expect(isDashboardProfileLoading(false, user, null)).toBe(true);
  });

  it('is resolved once the profile lands for a signed-in user', () => {
    expect(isDashboardProfileLoading(false, user, profile)).toBe(false);
  });

  it('is NOT loading for a guest (no session) — they get the neutral state, not an endless skeleton', () => {
    expect(isDashboardProfileLoading(false, null, null)).toBe(false);
  });
});
