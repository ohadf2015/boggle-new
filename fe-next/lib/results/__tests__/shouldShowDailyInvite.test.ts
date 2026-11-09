/**
 * Between live rounds the results screen has exactly one ask: play again. A
 * "go play the Daily Challenge instead" card sitting above the sticky rematch
 * bar competes with it and pulls the player out of the session.
 *
 * So the D1 invite only appears once the rematch loop is actually over.
 * Classroom results never show it (students stay in the lesson). Guests DO
 * see it (finish-today / countdown only — no invented streak).
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

  it('shows for guests on series-end — finish-today / countdown, not a false streak', () => {
    expect(shouldShowDailyInvite({ isGuest: true, gameCode: 'ABCD', isBotsOnlyGame: false, isSeriesComplete: true })).toBe(true);
  });

  it('still hides guests mid-series so rematch stays the only ask', () => {
    expect(shouldShowDailyInvite({ isGuest: true, gameCode: 'ABCD', isBotsOnlyGame: false, isSeriesComplete: false })).toBe(false);
  });

  it('never shows in classroom results', () => {
    expect(shouldShowDailyInvite({
      isGuest: false,
      gameCode: 'ABCD',
      isBotsOnlyGame: false,
      isSeriesComplete: true,
      isClassroom: true,
    })).toBe(false);
  });
});
