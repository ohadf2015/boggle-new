/**
 * Between live rounds the results screen has exactly one ask: play again. A
 * "go play the Daily Challenge instead" card sitting above the sticky rematch
 * bar competes with it and pulls the player out of the session.
 *
 * So the D1 invite only appears once the rematch loop is actually over.
 */
import { shouldShowDailyInvite } from '../shouldShowDailyInvite';

describe('shouldShowDailyInvite', () => {
  it('hides between rounds of a live series (rematch is the only ask)', () => {
    expect(shouldShowDailyInvite({ isGuest: false, gameCode: 'ABCD', isBotsOnlyGame: false, isSeriesComplete: false })).toBe(false);
  });

  it('shows once the series is over — the loop ended, so offer the next session', () => {
    expect(shouldShowDailyInvite({ isGuest: false, gameCode: 'ABCD', isBotsOnlyGame: false, isSeriesComplete: true })).toBe(true);
  });

  it('shows when there is no room to rematch into', () => {
    expect(shouldShowDailyInvite({ isGuest: false, gameCode: undefined, isBotsOnlyGame: false, isSeriesComplete: false })).toBe(true);
  });

  it('shows for a bots-only game (no human rematch loop to protect)', () => {
    expect(shouldShowDailyInvite({ isGuest: false, gameCode: 'ABCD', isBotsOnlyGame: true, isSeriesComplete: false })).toBe(true);
  });

  it('never shows for guests — their single CTA is the signup card', () => {
    expect(shouldShowDailyInvite({ isGuest: true, gameCode: undefined, isBotsOnlyGame: true, isSeriesComplete: true })).toBe(false);
  });
});
