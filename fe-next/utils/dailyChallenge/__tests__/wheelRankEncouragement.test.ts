import { describe, it, expect } from 'vitest';
import { selectWheelRankEncouragement } from '../wheelRankEncouragement';

/**
 * Pure decision logic for the rank-aware Word Wheel signup encouragement.
 *
 * After a guest finishes today's wheel their score is already on the
 * leaderboard (by guest fingerprint). This selector turns their live rank into
 * the single most compelling *honest* signup hook — "you're #1 today" — or
 * stays silent (returns null) when the rank isn't worth bragging about.
 *
 * Honesty gates (matching the mode's non-predatory ethos):
 *   • a rank only means something when there are other players to beat
 *     (totalPlayers >= 2), so "#1 of 1" never claims leadership.
 *   • only the top 10 get a rank-specific hook; deeper ranks fall back to the
 *     generic offer copy.
 */
describe('selectWheelRankEncouragement', () => {
  it('returns null when rank is unknown (not yet on the board)', () => {
    expect(selectWheelRankEncouragement(null, 50)).toBeNull();
    expect(selectWheelRankEncouragement(undefined, 50)).toBeNull();
  });

  it('returns null for a non-positive rank (defensive)', () => {
    expect(selectWheelRankEncouragement(0, 50)).toBeNull();
    expect(selectWheelRankEncouragement(-3, 50)).toBeNull();
  });

  it('stays silent when there is nobody else to beat (totalPlayers < 2)', () => {
    // "#1 of 1" is technically true but not an honest brag — don't claim it.
    expect(selectWheelRankEncouragement(1, 1)).toBeNull();
    expect(selectWheelRankEncouragement(1, 0)).toBeNull();
  });

  it('flags the leader (rank 1) when others have played', () => {
    expect(selectWheelRankEncouragement(1, 2)).toEqual({ tier: 'leader', rank: 1, totalPlayers: 2 });
    expect(selectWheelRankEncouragement(1, 999)).toEqual({ tier: 'leader', rank: 1, totalPlayers: 999 });
  });

  it('flags the podium (rank 2-3)', () => {
    expect(selectWheelRankEncouragement(2, 40)).toEqual({ tier: 'podium', rank: 2, totalPlayers: 40 });
    expect(selectWheelRankEncouragement(3, 40)).toEqual({ tier: 'podium', rank: 3, totalPlayers: 40 });
  });

  it('flags the top ten (rank 4-10)', () => {
    expect(selectWheelRankEncouragement(4, 40)).toEqual({ tier: 'topTen', rank: 4, totalPlayers: 40 });
    expect(selectWheelRankEncouragement(10, 40)).toEqual({ tier: 'topTen', rank: 10, totalPlayers: 40 });
  });

  it('stays silent below the top ten (generic offer copy takes over)', () => {
    expect(selectWheelRankEncouragement(11, 40)).toBeNull();
    expect(selectWheelRankEncouragement(250, 1000)).toBeNull();
  });
});
