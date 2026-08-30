/**
 * Where a brand-new player lands the moment onboarding ends.
 *
 * It used to be `/practice/classic?play=1` — the cozy practice hub's mode route.
 * Measured over 90 days on www.lexiclash.live: 299 people started practice and
 * **151 of them (50.5%) never played a real game at all**. Practice was a
 * terminal destination for half the people it caught, so FTUE now hands players
 * straight to the real engine.
 *
 * `/singleplayer?autoStart=bots` is not a new path — it already exists and is
 * built for exactly this: it auto-starts a real solo-vs-bot round with the
 * first-win config, and once the player has one bot game behind them the SAME
 * url graduates them to multiplayer Quick Play (see useSinglePlayerConfig's
 * returning-player gate). That is the ladder the practice hub was imitating.
 *
 * This lives in one function because OnboardingFlow reaches "onboarding done"
 * from three separate handlers, and three paths to one outcome that each build
 * their own destination is Class 3 in .claude/rules/60-recurring-pitfalls.md.
 */

import { describe, it, expect } from 'vitest';
import { firstGameRoute, FIRST_GAME_MODE } from '../firstGameRoute';
import { QUICK_MODES } from '@/components/quick-play/types';

describe('firstGameRoute', () => {
  it('sends a new player into Quick Play (the default mode for all players)', () => {
    expect(firstGameRoute('en')).toContain('/en/quick-play');
  });

  it('auto-picks the first game instead of parking the newcomer on the mode picker', () => {
    // A first-timer should be playing, not choosing. The picker is a decision
    // between four unfamiliar mechanics, and this FTUE has already lost half its
    // starters once to a destination that asked for a choice before a first word.
    expect(firstGameRoute('en')).toBe(`/en/quick-play?autoStart=${FIRST_GAME_MODE}`);
  });

  it('auto-starts a mode that actually exists', () => {
    expect(QUICK_MODES).toContain(FIRST_GAME_MODE);
  });

  it('keeps the player in their own language', () => {
    expect(firstGameRoute('he')).toBe(`/he/quick-play?autoStart=${FIRST_GAME_MODE}`);
    expect(firstGameRoute('ja')).toBe(`/ja/quick-play?autoStart=${FIRST_GAME_MODE}`);
  });

  it('never routes into practice', () => {
    for (const lang of ['en', 'he', 'sv', 'ja', 'es', 'ru']) {
      expect(firstGameRoute(lang)).not.toContain('/practice');
    }
  });
});
