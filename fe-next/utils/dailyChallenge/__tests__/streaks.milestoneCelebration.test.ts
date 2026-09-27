/**
 * Which streak milestones earn a full-screen, confetti-firing modal.
 *
 * The app used to throw that party at 7 and 14 days while staying completely
 * silent when a player actually passed another human on the board. Interrupting
 * play to celebrate attendance — twice in the first fortnight — is what made the
 * streak feel like an obligation. The analytics milestone list is deliberately
 * untouched (dashboards depend on it); only the celebration threshold moves.
 */

import {
  getStreakMilestone,
  shouldCelebrateStreakMilestone,
  CELEBRATED_STREAK_MILESTONES,
} from '../streaks';

describe('shouldCelebrateStreakMilestone', () => {
  it('no longer interrupts at the early milestones', () => {
    expect(shouldCelebrateStreakMilestone(7)).toBe(false);
    expect(shouldCelebrateStreakMilestone(14)).toBe(false);
  });

  it('still celebrates the genuinely rare ones', () => {
    expect(shouldCelebrateStreakMilestone(30)).toBe(true);
    expect(shouldCelebrateStreakMilestone(100)).toBe(true);
    expect(shouldCelebrateStreakMilestone(365)).toBe(true);
  });

  it('ignores non-milestone days', () => {
    expect(shouldCelebrateStreakMilestone(0)).toBe(false);
    expect(shouldCelebrateStreakMilestone(1)).toBe(false);
    expect(shouldCelebrateStreakMilestone(29)).toBe(false);
    expect(shouldCelebrateStreakMilestone(31)).toBe(false);
  });

  it('leaves the analytics milestone list alone — dashboards read it', () => {
    // 7 and 14 must still be reported even though they no longer pop a modal.
    expect(getStreakMilestone(7)).toBe(7);
    expect(getStreakMilestone(14)).toBe(14);
  });

  it('celebrates a strict subset of the tracked milestones', () => {
    for (const day of CELEBRATED_STREAK_MILESTONES) {
      expect(getStreakMilestone(day)).toBe(day);
    }
  });
});
