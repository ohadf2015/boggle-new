import { describe, it, expect } from 'vitest';
import { isAllowedAdBannerRoute, isAdFreeRoute } from '../admob-routes';

describe('isAllowedAdBannerRoute', () => {
  it('allows landing/leaderboard/settings (passive pages)', () => {
    expect(isAllowedAdBannerRoute('/')).toBe(true);
    expect(isAllowedAdBannerRoute('/leaderboard')).toBe(true);
    expect(isAllowedAdBannerRoute('/settings')).toBe(true);
  });

  it('blocks gameplay routes', () => {
    expect(isAllowedAdBannerRoute('/singleplayer')).toBe(false);
  });

  it('allows the /brain and /daily HUB screens (passive landings — pinned banner like home)', () => {
    // The hub landings are passive menus, not gameplay: the anchored banner sits
    // pinned to the viewport bottom there (matching the home dashboard). Exact
    // match only — the deeper gameplay paths below must stay blocked.
    expect(isAllowedAdBannerRoute('/brain')).toBe(true);
    expect(isAllowedAdBannerRoute('/daily')).toBe(true);
    expect(isAllowedAdBannerRoute('/he/brain')).toBe(true);
    expect(isAllowedAdBannerRoute('/he/daily')).toBe(true);
    // Trailing slash normalises to the hub.
    expect(isAllowedAdBannerRoute('/brain/')).toBe(true);
    expect(isAllowedAdBannerRoute('/daily/')).toBe(true);
  });

  it('blocks /word-tower — it is gameplay, and the promo/banner covered the tower', () => {
    expect(isAllowedAdBannerRoute('/word-tower')).toBe(false);
    expect(isAllowedAdBannerRoute('/en/word-tower')).toBe(false);
    expect(isAllowedAdBannerRoute('/he/word-tower/')).toBe(false);
  });

  it('allows the /connections landing (SEO hub) but blocks its gameplay sub-routes', () => {
    expect(isAllowedAdBannerRoute('/connections')).toBe(true);
    expect(isAllowedAdBannerRoute('/he/connections/')).toBe(true);
    // Gameplay: the on-screen keyboard IS the play surface — nothing may cover it.
    expect(isAllowedAdBannerRoute('/connections/play')).toBe(false);
    expect(isAllowedAdBannerRoute('/connections/daily')).toBe(false);
    expect(isAllowedAdBannerRoute('/connections/pyramid')).toBe(false);
    expect(isAllowedAdBannerRoute('/he/connections/play')).toBe(false);
  });

  it('still blocks the brain/daily GAMEPLAY sub-routes (banner must not cover play)', () => {
    expect(isAllowedAdBannerRoute('/brain/drills/word-recall')).toBe(false);
    expect(isAllowedAdBannerRoute('/daily/word-hunt')).toBe(false);
    expect(isAllowedAdBannerRoute('/daily/word-wheel')).toBe(false);
    expect(isAllowedAdBannerRoute('/daily/flow')).toBe(false);
    expect(isAllowedAdBannerRoute('/he/daily/word-hunt')).toBe(false);
    expect(isAllowedAdBannerRoute('/es/brain/drills/combo')).toBe(false);
  });

  it('allows /multiplayer (lobby is passive; active game/results suppressed via screen-fit-locked, not the route)', () => {
    // /multiplayer is deliberately NOT denylisted: lobby + gameplay share one
    // path, so the route gate cannot tell them apart. The lobby (isActive=false)
    // has no `screen-fit-locked` class → banner shows. Active gameplay/results
    // add `screen-fit-locked` → bannerController's shouldSuppressBanner hides it.
    expect(isAllowedAdBannerRoute('/multiplayer')).toBe(true);
    expect(isAllowedAdBannerRoute('/es/multiplayer')).toBe(true);
  });

  it('blocks classroom multiplayer lobby (child/education surface — keep ad-free)', () => {
    const classroom = new URLSearchParams('classroom=true');
    expect(isAllowedAdBannerRoute('/multiplayer', classroom)).toBe(false);
    expect(isAllowedAdBannerRoute('/he/multiplayer', classroom)).toBe(false);
    // non-classroom multiplayer with other params still allowed
    expect(isAllowedAdBannerRoute('/multiplayer', new URLSearchParams('room=ABC123'))).toBe(true);
  });

  it('strips locale prefix before matching', () => {
    expect(isAllowedAdBannerRoute('/he/leaderboard')).toBe(true);
    expect(isAllowedAdBannerRoute('/es/singleplayer')).toBe(false);
  });

  it('allows adventure (banner runs during adventure mode by design)', () => {
    expect(isAllowedAdBannerRoute('/adventure')).toBe(true);
    expect(isAllowedAdBannerRoute('/he/adventure')).toBe(true);
  });

  it('allows /profile (passive menu page — safe for banner)', () => {
    expect(isAllowedAdBannerRoute('/profile')).toBe(true);
    expect(isAllowedAdBannerRoute('/he/profile')).toBe(true);
  });

  it('allows /friends (passive social list — safe for banner)', () => {
    expect(isAllowedAdBannerRoute('/friends')).toBe(true);
    expect(isAllowedAdBannerRoute('/he/friends')).toBe(true);
  });

  it('blocks /admin and all admin subroutes (operator console — never monetize)', () => {
    expect(isAllowedAdBannerRoute('/admin')).toBe(false);
    expect(isAllowedAdBannerRoute('/admin/users')).toBe(false);
    expect(isAllowedAdBannerRoute('/admin/games')).toBe(false);
    expect(isAllowedAdBannerRoute('/he/admin')).toBe(false);
    expect(isAllowedAdBannerRoute('/es/admin/moderation')).toBe(false);
  });

  it('returns false for null pathname', () => {
    expect(isAllowedAdBannerRoute(null)).toBe(false);
  });
});

// ------------------------------------------------------------------
// Education module is ad-free across EVERY format (AdSense auto-ads,
// interstitials), not only the native anchored banner.
// ------------------------------------------------------------------
describe('isAdFreeRoute', () => {
  it('Given an education/teacher/student route, When checked, Then it is ad-free', () => {
    expect(isAdFreeRoute('/education')).toBe(true);
    expect(isAdFreeRoute('/education/for-schools')).toBe(true);
    expect(isAdFreeRoute('/he/education/classroom-game')).toBe(true);
    expect(isAdFreeRoute('/teacher')).toBe(true);
    expect(isAdFreeRoute('/es/teacher/classroom/abc/analytics')).toBe(true);
    expect(isAdFreeRoute('/student/join')).toBe(true);
    expect(isAdFreeRoute('/ja/student/lessons/42/')).toBe(true);
  });

  it('Given the classroom multiplayer lobby, When checked, Then it is ad-free', () => {
    expect(isAdFreeRoute('/multiplayer', new URLSearchParams('classroom=true'))).toBe(true);
    expect(isAdFreeRoute('/he/multiplayer', new URLSearchParams('classroom=true&room=ABC'))).toBe(true);
  });

  it('Given the admin console, When checked, Then it is ad-free', () => {
    expect(isAdFreeRoute('/admin/users')).toBe(true);
  });

  it('Given ordinary game and hub routes, When checked, Then ads may run', () => {
    expect(isAdFreeRoute('/')).toBe(false);
    expect(isAdFreeRoute('/daily')).toBe(false);
    expect(isAdFreeRoute('/singleplayer')).toBe(false);
    expect(isAdFreeRoute('/multiplayer', new URLSearchParams('room=ABC'))).toBe(false);
    expect(isAdFreeRoute('/en/pricing')).toBe(false);
  });

  it('Given a null pathname, When checked, Then it is NOT treated as ad-free (unknown ≠ education)', () => {
    expect(isAdFreeRoute(null)).toBe(false);
  });
});
