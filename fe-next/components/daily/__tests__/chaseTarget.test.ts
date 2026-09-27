/**
 * Tests for computeChaseTarget — the "who is right in front of you" calculation
 * behind the daily-leaderboard chase banner.
 *
 * Live daily boards hold 2–8 players (measured 2026-08-01), so a percentile says
 * nothing. What motivates at that size is a named person and a closable gap:
 * "42 points behind Maya". This function produces exactly that, and the
 * defend-your-lead mirror image when the player is already first.
 */

import { computeChaseTarget, type ChaseParticipant } from '../chaseTarget';

function p(over: Partial<ChaseParticipant> & { rank_position: number }): ChaseParticipant {
  return {
    player_id: null,
    guest_fingerprint: null,
    display_name: `P${over.rank_position}`,
    score: 0,
    ...over,
  };
}

describe('computeChaseTarget', () => {
  it('returns null when the board is empty', () => {
    expect(computeChaseTarget([], { playerId: 'me' })).toBeNull();
  });

  it('returns null when the player is not on the board', () => {
    const board = [p({ rank_position: 1, player_id: 'other', score: 100 })];
    expect(computeChaseTarget(board, { playerId: 'me' })).toBeNull();
  });

  it('returns null when the player is the only entry — beating nobody is not a win', () => {
    const board = [p({ rank_position: 1, player_id: 'me', score: 100 })];
    expect(computeChaseTarget(board, { playerId: 'me' })).toBeNull();
  });

  describe('chasing (rank > 1)', () => {
    it('names the player directly above and the points needed to pass them', () => {
      const board = [
        p({ rank_position: 1, player_id: 'a', display_name: 'Maya', score: 340 }),
        p({ rank_position: 2, player_id: 'me', score: 298 }),
        p({ rank_position: 3, player_id: 'c', display_name: 'Tom', score: 120 }),
      ];
      const result = computeChaseTarget(board, { playerId: 'me' });
      expect(result).toEqual({
        mode: 'chasing',
        rank: 2,
        totalPlayers: 3,
        targetName: 'Maya',
        // 340 - 298 = 42 behind; one more than that passes them
        pointsGap: 42,
        pointsToPass: 43,
      });
    });

    it('needs a single point to break a tie', () => {
      const board = [
        p({ rank_position: 1, player_id: 'a', display_name: 'Maya', score: 200 }),
        p({ rank_position: 2, player_id: 'me', score: 200 }),
      ];
      expect(computeChaseTarget(board, { playerId: 'me' })).toMatchObject({
        mode: 'chasing',
        pointsGap: 0,
        pointsToPass: 1,
      });
    });

    it('falls back to efficiency_score when score is absent (word hunt boards)', () => {
      const board = [
        p({ rank_position: 1, player_id: 'a', display_name: 'Maya', score: 0, efficiency_score: 90 }),
        p({ rank_position: 2, player_id: 'me', score: 0, efficiency_score: 75 }),
      ];
      expect(computeChaseTarget(board, { playerId: 'me' })).toMatchObject({
        pointsGap: 15,
        pointsToPass: 16,
      });
    });

    it('identifies the player by guest fingerprint when there is no account', () => {
      const board = [
        p({ rank_position: 1, player_id: 'a', display_name: 'Maya', score: 50 }),
        p({ rank_position: 2, guest_fingerprint: 'fp-1', score: 20 }),
      ];
      expect(computeChaseTarget(board, { guestFingerprint: 'fp-1' })).toMatchObject({
        mode: 'chasing',
        rank: 2,
        targetName: 'Maya',
        pointsGap: 30,
      });
    });

    it('uses the entry directly above by rank, not merely the previous array element', () => {
      // Deliberately unsorted input — the API is not contractually ordered.
      const board = [
        p({ rank_position: 3, player_id: 'c', display_name: 'Tom', score: 10 }),
        p({ rank_position: 1, player_id: 'a', display_name: 'Maya', score: 90 }),
        p({ rank_position: 2, player_id: 'me', score: 40 }),
      ];
      expect(computeChaseTarget(board, { playerId: 'me' })).toMatchObject({
        targetName: 'Maya',
        pointsGap: 50,
      });
    });
  });

  describe('when the visible metric disagrees with the ranking', () => {
    // daily_word_hunt_leaderboard ranks by `solved DESC, efficiency_score DESC,
    // attempts_used, completed_at` — so an unsolved player with a high efficiency
    // score sits BELOW a solved player with a low one. Diffing efficiency alone
    // would then report "40 behind" to someone who is ahead on the only number
    // shown. When the metric cannot explain the ranking, drop the points and keep
    // the name: still a target, no longer a wrong one.
    it('omits the points when the player above has a lower visible metric', () => {
      const board = [
        p({ rank_position: 1, player_id: 'a', display_name: 'Maya', score: 0, efficiency_score: 10 }),
        p({ rank_position: 2, player_id: 'me', score: 0, efficiency_score: 50 }),
      ];
      expect(computeChaseTarget(board, { playerId: 'me' })).toEqual({
        mode: 'chasing',
        rank: 2,
        totalPlayers: 2,
        targetName: 'Maya',
        pointsGap: null,
        pointsToPass: null,
      });
    });

    it('omits the points when the chaser below somehow out-scores the leader', () => {
      const board = [
        p({ rank_position: 1, player_id: 'me', score: 0, efficiency_score: 10 }),
        p({ rank_position: 2, player_id: 'b', display_name: 'Tom', score: 0, efficiency_score: 90 }),
      ];
      expect(computeChaseTarget(board, { playerId: 'me' })).toMatchObject({
        mode: 'leading',
        targetName: 'Tom',
        pointsGap: null,
      });
    });

    it('still reports a tie as a real, closable one-point gap', () => {
      const board = [
        p({ rank_position: 1, player_id: 'a', display_name: 'Maya', score: 200 }),
        p({ rank_position: 2, player_id: 'me', score: 200 }),
      ];
      expect(computeChaseTarget(board, { playerId: 'me' })).toMatchObject({
        pointsGap: 0,
        pointsToPass: 1,
      });
    });
  });

  describe('totalPlayers', () => {
    it('prefers the fetched board size over the length of a paginated slice', () => {
      const board = [
        p({ rank_position: 1, player_id: 'a', display_name: 'Maya', score: 90 }),
        p({ rank_position: 2, player_id: 'me', score: 40 }),
      ];
      expect(computeChaseTarget(board, { playerId: 'me', totalPlayers: 37 })).toMatchObject({
        rank: 2,
        totalPlayers: 37,
      });
    });

    it('ignores a total smaller than the rows in hand', () => {
      const board = [
        p({ rank_position: 1, player_id: 'a', display_name: 'Maya', score: 90 }),
        p({ rank_position: 2, player_id: 'me', score: 40 }),
      ];
      expect(computeChaseTarget(board, { playerId: 'me', totalPlayers: 1 })).toMatchObject({
        totalPlayers: 2,
      });
    });
  });

  describe('leading (rank 1 with company)', () => {
    it('names the closest chaser and the size of the lead to defend', () => {
      const board = [
        p({ rank_position: 1, player_id: 'me', score: 300 }),
        p({ rank_position: 2, player_id: 'b', display_name: 'Tom', score: 288 }),
      ];
      expect(computeChaseTarget(board, { playerId: 'me' })).toEqual({
        mode: 'leading',
        rank: 1,
        totalPlayers: 2,
        targetName: 'Tom',
        pointsGap: 12,
        pointsToPass: 0,
      });
    });
  });
});
