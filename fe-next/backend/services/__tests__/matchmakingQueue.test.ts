/**
 * Matchmaking Queue Tests
 * TDD: RED phase — tests written before implementation
 */

import {
  MatchmakingQueue,
  type QueueEntry,
  type MatchResult,
} from '../matchmakingQueue';

describe('MatchmakingQueue', () => {
  let queue: MatchmakingQueue;

  beforeEach(() => {
    queue = new MatchmakingQueue();
  });

  afterEach(() => {
    queue.destroy();
  });

  describe('joinQueue', () => {
    it('adds a player to the queue', () => {
      queue.joinQueue('socket1', 'player1', 1000, 'classic', 'en');
      const stats = queue.getQueueStats();
      expect(stats.playersInQueue).toBe(1);
    });

    it('prevents duplicate entries for same player', () => {
      queue.joinQueue('socket1', 'player1', 1000, 'classic', 'en');
      queue.joinQueue('socket2', 'player1', 1000, 'classic', 'en');
      const stats = queue.getQueueStats();
      expect(stats.playersInQueue).toBe(1);
    });
  });

  describe('leaveQueue', () => {
    it('removes player from queue by socket id', () => {
      queue.joinQueue('socket1', 'player1', 1000, 'classic', 'en');
      queue.leaveQueue('socket1');
      const stats = queue.getQueueStats();
      expect(stats.playersInQueue).toBe(0);
    });

    it('does nothing if socket not in queue', () => {
      queue.leaveQueue('nonexistent');
      const stats = queue.getQueueStats();
      expect(stats.playersInQueue).toBe(0);
    });
  });

  describe('findMatch — ELO range matching', () => {
    it('matches two players within ±100 ELO in same mode and language', () => {
      queue.joinQueue('s1', 'p1', 1000, 'classic', 'en');
      queue.joinQueue('s2', 'p2', 1050, 'classic', 'en');

      const match = queue.tryMatch('s1');
      expect(match).not.toBeNull();
      expect(match!.player1.playerId).toBe('p1');
      expect(match!.player2.playerId).toBe('p2');
    });

    it('does not match players outside ±100 ELO initially', () => {
      queue.joinQueue('s1', 'p1', 1000, 'classic', 'en');
      queue.joinQueue('s2', 'p2', 1200, 'classic', 'en');

      const match = queue.tryMatch('s1');
      expect(match).toBeNull();
    });

    it('does not match players in different game modes', () => {
      queue.joinQueue('s1', 'p1', 1000, 'classic', 'en');
      queue.joinQueue('s2', 'p2', 1000, 'wordHunt', 'en');

      const match = queue.tryMatch('s1');
      expect(match).toBeNull();
    });

    it('does not match players in different languages', () => {
      queue.joinQueue('s1', 'p1', 1000, 'classic', 'en');
      queue.joinQueue('s2', 'p2', 1000, 'classic', 'he');

      const match = queue.tryMatch('s1');
      expect(match).toBeNull();
    });

    it('removes both players from queue after match', () => {
      queue.joinQueue('s1', 'p1', 1000, 'classic', 'en');
      queue.joinQueue('s2', 'p2', 1050, 'classic', 'en');

      queue.tryMatch('s1');
      const stats = queue.getQueueStats();
      expect(stats.playersInQueue).toBe(0);
    });
  });

  describe('ELO range expansion', () => {
    it('expands range by 50 for each expansion step', () => {
      // Player joined 5s ago — range should be ±150
      queue.joinQueue('s1', 'p1', 1000, 'classic', 'en');
      queue.joinQueue('s2', 'p2', 1140, 'classic', 'en');

      // Simulate 5s elapsed for p1
      queue.setEntryJoinTime('s1', Date.now() - 5000);

      const match = queue.tryMatch('s1');
      expect(match).not.toBeNull();
    });

    it('caps range at ±500', () => {
      queue.joinQueue('s1', 'p1', 1000, 'classic', 'en');
      queue.joinQueue('s2', 'p2', 1600, 'classic', 'en');

      // Even after 60s, max range is ±500 so 1600 is out of range
      queue.setEntryJoinTime('s1', Date.now() - 60000);

      const match = queue.tryMatch('s1');
      expect(match).toBeNull();
    });

    it('matches at ±500 range when enough time has passed', () => {
      queue.joinQueue('s1', 'p1', 1000, 'classic', 'en');
      queue.joinQueue('s2', 'p2', 1490, 'classic', 'en');

      // After 40s: range = 100 + (40/5)*50 = 100 + 400 = 500
      queue.setEntryJoinTime('s1', Date.now() - 40000);

      const match = queue.tryMatch('s1');
      expect(match).not.toBeNull();
    });
  });

  describe('timeout', () => {
    it('reports timed-out entries after 60 seconds', () => {
      queue.joinQueue('s1', 'p1', 1000, 'classic', 'en');
      queue.setEntryJoinTime('s1', Date.now() - 61000);

      const timedOut = queue.getTimedOutEntries();
      expect(timedOut).toHaveLength(1);
      expect(timedOut[0].socketId).toBe('s1');
    });

    it('does not report non-timed-out entries', () => {
      queue.joinQueue('s1', 'p1', 1000, 'classic', 'en');

      const timedOut = queue.getTimedOutEntries();
      expect(timedOut).toHaveLength(0);
    });
  });

  describe('getQueueStats', () => {
    it('returns correct stats', () => {
      queue.joinQueue('s1', 'p1', 1000, 'classic', 'en');
      queue.joinQueue('s2', 'p2', 1100, 'classic', 'en');

      const stats = queue.getQueueStats();
      expect(stats.playersInQueue).toBe(2);
      expect(typeof stats.avgWaitTime).toBe('number');
      expect(stats.activeMatches).toBe(0);
    });
  });

  describe('getEntryEloRange', () => {
    it('returns initial range of ±100', () => {
      queue.joinQueue('s1', 'p1', 1000, 'classic', 'en');
      const range = queue.getEntryEloRange('s1');
      expect(range).toBe(100);
    });

    it('returns expanded range after time', () => {
      queue.joinQueue('s1', 'p1', 1000, 'classic', 'en');
      queue.setEntryJoinTime('s1', Date.now() - 10000);
      const range = queue.getEntryEloRange('s1');
      expect(range).toBe(200); // 100 + 2*50
    });
  });
});
