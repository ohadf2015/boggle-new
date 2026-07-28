import { describe, it, expect } from 'vitest';
import { resolveDailyLandingTarget } from '../landingRedirect';

/**
 * Pure decision logic for auto-advancing returning players past the /daily hub.
 *
 * Player feedback (2026-07-28): a returning player taps Daily and lands on the
 * selection+SEO hub, then has to tap AGAIN to reach the actual challenge — the
 * hub gates the game. This selector decides, from resolved status, whether to
 * skip the hub and which quest to open. First-timers, share/QR arrivals, and
 * players who already finished today keep the hub. The skip is once-per-session
 * so a returner can still reach the hub (leaderboard / other quest).
 */
describe('resolveDailyLandingTarget', () => {
  const base = {
    language: 'en' as const,
    isReturning: true,
    wordHuntPlayed: false,
    wordWheelPlayed: false,
    hasSharedRival: false,
    cameFromQr: false,
    alreadySkippedThisSession: false,
  };

  it('sends a returning player with an unplayed Word Hunt straight into it', () => {
    expect(resolveDailyLandingTarget(base)).toBe('/en/daily/word-hunt');
  });

  it('falls through to Word Wheel when Word Hunt is already done', () => {
    expect(resolveDailyLandingTarget({ ...base, wordHuntPlayed: true })).toBe('/en/daily/word-wheel');
  });

  it('keeps the hub when both quests are done today (show leaderboard/results)', () => {
    expect(
      resolveDailyLandingTarget({ ...base, wordHuntPlayed: true, wordWheelPlayed: true })
    ).toBeNull();
  });

  it('keeps the hub for first-time players (they learn both quests + see SEO)', () => {
    expect(resolveDailyLandingTarget({ ...base, isReturning: false })).toBeNull();
  });

  it('keeps the hub for share/rival arrivals (they came for the gauntlet banner)', () => {
    expect(resolveDailyLandingTarget({ ...base, hasSharedRival: true })).toBeNull();
  });

  it('keeps the hub for QR/barcode arrivals (they came for the welcome)', () => {
    expect(resolveDailyLandingTarget({ ...base, cameFromQr: true })).toBeNull();
  });

  it('keeps the hub after the once-per-session skip already fired', () => {
    expect(resolveDailyLandingTarget({ ...base, alreadySkippedThisSession: true })).toBeNull();
  });

  it('respects the language segment in the target path', () => {
    expect(resolveDailyLandingTarget({ ...base, language: 'he' })).toBe('/he/daily/word-hunt');
  });
});
