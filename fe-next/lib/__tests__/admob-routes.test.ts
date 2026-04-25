import { describe, it, expect } from 'vitest';
import { isAllowedAdBannerRoute } from '../admob-routes';

describe('isAllowedAdBannerRoute', () => {
  it('allows landing/leaderboard/settings (passive pages)', () => {
    expect(isAllowedAdBannerRoute('/')).toBe(true);
    expect(isAllowedAdBannerRoute('/leaderboard')).toBe(true);
    expect(isAllowedAdBannerRoute('/settings')).toBe(true);
  });

  it('blocks gameplay routes', () => {
    expect(isAllowedAdBannerRoute('/multiplayer')).toBe(false);
    expect(isAllowedAdBannerRoute('/singleplayer')).toBe(false);
    expect(isAllowedAdBannerRoute('/daily')).toBe(false);
    expect(isAllowedAdBannerRoute('/brain')).toBe(false);
  });

  it('strips locale prefix before matching', () => {
    expect(isAllowedAdBannerRoute('/he/leaderboard')).toBe(true);
    expect(isAllowedAdBannerRoute('/es/multiplayer')).toBe(false);
  });

  it('allows adventure (banner runs during adventure mode by design)', () => {
    expect(isAllowedAdBannerRoute('/adventure')).toBe(true);
    expect(isAllowedAdBannerRoute('/he/adventure')).toBe(true);
  });

  it('allows /profile (passive menu page — safe for banner)', () => {
    expect(isAllowedAdBannerRoute('/profile')).toBe(true);
    expect(isAllowedAdBannerRoute('/he/profile')).toBe(true);
  });

  it('returns false for null pathname', () => {
    expect(isAllowedAdBannerRoute(null)).toBe(false);
  });
});
