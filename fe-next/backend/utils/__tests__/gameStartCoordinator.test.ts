import { vi, type Mock, type MockInstance } from 'vitest';
import { GameStartCoordinator, type TimeoutStats } from '../gameStartCoordinator';

vi.mock('../logger', () => ({ default: {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));

describe('GameStartCoordinator', () => {
  let coordinator: GameStartCoordinator;

  beforeEach(() => {
    vi.useFakeTimers();
    coordinator = new GameStartCoordinator();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ==========================================
  // initializeSequence
  // ==========================================

  describe('initializeSequence', () => {
    it('returns a unique messageId', () => {
      const id = coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);
      expect(id).toMatch(/^start-GAME1-/);
    });

    it('creates an active sequence with correct initial state', () => {
      coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);
      const stats = coordinator.getSequenceStats('GAME1');

      expect(stats).not.toBeNull();
      expect(stats!.acknowledgedCount).toBe(0);
      expect(stats!.expectedCount).toBe(2);
      expect(stats!.timerStarted).toBe(false);
      expect(stats!.missing).toEqual(['alice', 'bob']);
    });

    it('cleans up previous sequence for same gameCode', () => {
      const id1 = coordinator.initializeSequence('GAME1', ['alice'], 60);
      const id2 = coordinator.initializeSequence('GAME1', ['bob'], 60);

      expect(id1).not.toBe(id2);
      const stats = coordinator.getSequenceStats('GAME1');
      expect(stats!.missing).toEqual(['bob']);
    });

    it('handles single player', () => {
      coordinator.initializeSequence('GAME1', ['alice'], 60);
      const stats = coordinator.getSequenceStats('GAME1');
      expect(stats!.expectedCount).toBe(1);
    });
  });

  // ==========================================
  // recordAcknowledgment - normal flow
  // ==========================================

  describe('recordAcknowledgment', () => {
    let messageId: string;

    beforeEach(() => {
      messageId = coordinator.initializeSequence('GAME1', ['alice', 'bob', 'charlie'], 60);
    });

    it('records valid ack and returns partial status', () => {
      const result = coordinator.recordAcknowledgment('GAME1', 'alice', messageId);

      expect(result.valid).toBe(true);
      expect(result.allReady).toBe(false);
      expect(result.acknowledgedCount).toBe(1);
      expect(result.expectedCount).toBe(3);
    });

    it('returns allReady=true when last player ACKs', () => {
      coordinator.recordAcknowledgment('GAME1', 'alice', messageId);
      coordinator.recordAcknowledgment('GAME1', 'bob', messageId);
      const result = coordinator.recordAcknowledgment('GAME1', 'charlie', messageId);

      expect(result.allReady).toBe(true);
      expect(result.waitTime).toBeDefined();
      expect(result.waitTime).toBeGreaterThanOrEqual(0);
    });

    it('marks timerStarted when all ACK', () => {
      coordinator.recordAcknowledgment('GAME1', 'alice', messageId);
      coordinator.recordAcknowledgment('GAME1', 'bob', messageId);
      coordinator.recordAcknowledgment('GAME1', 'charlie', messageId);

      const stats = coordinator.getSequenceStats('GAME1');
      expect(stats!.timerStarted).toBe(true);
      expect(stats!.timerStartedAt).not.toBeNull();
    });

    it('single player: first ACK triggers allReady', () => {
      const id = coordinator.initializeSequence('SOLO', ['alice'], 60);
      const result = coordinator.recordAcknowledgment('SOLO', 'alice', id);

      expect(result.allReady).toBe(true);
    });

    // --- Invalid cases ---

    it('rejects ACK for non-existent sequence', () => {
      const result = coordinator.recordAcknowledgment('NOPE', 'alice', 'fake-id');
      expect(result).toEqual({ valid: false, reason: 'no_active_sequence' });
    });

    it('rejects ACK with wrong messageId', () => {
      const result = coordinator.recordAcknowledgment('GAME1', 'alice', 'wrong-id');
      expect(result).toEqual({ valid: false, reason: 'wrong_message_id' });
    });

    it('rejects ACK from unexpected player', () => {
      const result = coordinator.recordAcknowledgment('GAME1', 'stranger', messageId);
      expect(result).toEqual({ valid: false, reason: 'unexpected_player' });
    });

    it('returns duplicate for repeated ACK', () => {
      coordinator.recordAcknowledgment('GAME1', 'alice', messageId);
      const result = coordinator.recordAcknowledgment('GAME1', 'alice', messageId);

      expect(result.valid).toBe(true);
      expect(result.duplicate).toBe(true);
    });

    it('rejects ACK on cancelled sequence', () => {
      coordinator.cancelSequence('GAME1');
      const result = coordinator.recordAcknowledgment('GAME1', 'alice', messageId);
      expect(result).toEqual({ valid: false, reason: 'no_active_sequence' });
    });

    it('marks late ACK if timer already started', () => {
      // All 3 ACK to start timer
      coordinator.recordAcknowledgment('GAME1', 'alice', messageId);
      coordinator.recordAcknowledgment('GAME1', 'bob', messageId);
      coordinator.recordAcknowledgment('GAME1', 'charlie', messageId);

      // Now re-init with same players to get a new scenario where timer started
      // Actually, let's use the timeout path instead
      const id2 = coordinator.initializeSequence('GAME2', ['alice', 'bob'], 60);
      coordinator.setAcknowledgmentTimeout('GAME2', 3000, vi.fn());
      coordinator.recordAcknowledgment('GAME2', 'alice', id2);

      // Force timeout - timer starts without bob
      vi.advanceTimersByTime(3000);

      // bob ACKs late
      const result = coordinator.recordAcknowledgment('GAME2', 'bob', id2);
      expect(result.valid).toBe(true);
      expect(result.late).toBe(true);
    });
  });

  // ==========================================
  // CRITICAL: Race condition - timer before all ACK
  // ==========================================

  describe('race condition: timeout fires before all players ACK', () => {
    it('timeout starts timer with partial ACKs and reports missing players', () => {
      const messageId = coordinator.initializeSequence('GAME1', ['alice', 'bob', 'charlie'], 60);
      const onTimeout = vi.fn();

      coordinator.setAcknowledgmentTimeout('GAME1', 3000, onTimeout);

      // Only alice ACKs
      coordinator.recordAcknowledgment('GAME1', 'alice', messageId);

      // Timeout fires
      vi.advanceTimersByTime(3000);

      expect(onTimeout).toHaveBeenCalledTimes(1);
      const stats: TimeoutStats = onTimeout.mock.calls[0][0];
      expect(stats.acknowledged).toBe(1);
      expect(stats.expected).toBe(3);
      expect(stats.missing).toEqual(expect.arrayContaining(['bob', 'charlie']));
      expect(stats.missing).toHaveLength(2);

      // Timer is now started
      const seqStats = coordinator.getSequenceStats('GAME1');
      expect(seqStats!.timerStarted).toBe(true);
    });

    it('timeout does NOT fire if all ACKs arrive before deadline', () => {
      const messageId = coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);
      const onTimeout = vi.fn();

      coordinator.setAcknowledgmentTimeout('GAME1', 3000, onTimeout);

      coordinator.recordAcknowledgment('GAME1', 'alice', messageId);
      coordinator.recordAcknowledgment('GAME1', 'bob', messageId);

      // Timeout cleared by allReady path
      vi.advanceTimersByTime(5000);

      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('timeout does NOT fire if sequence was cancelled', () => {
      coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);
      const onTimeout = vi.fn();

      coordinator.setAcknowledgmentTimeout('GAME1', 3000, onTimeout);
      coordinator.cancelSequence('GAME1');

      vi.advanceTimersByTime(5000);
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('zero ACKs at timeout reports all players missing', () => {
      coordinator.initializeSequence('GAME1', ['alice', 'bob', 'charlie'], 60);
      const onTimeout = vi.fn();

      coordinator.setAcknowledgmentTimeout('GAME1', 1000, onTimeout);
      vi.advanceTimersByTime(1000);

      const stats: TimeoutStats = onTimeout.mock.calls[0][0];
      expect(stats.acknowledged).toBe(0);
      expect(stats.missing).toHaveLength(3);
    });

    it('late ACK after timeout is accepted but marked late', () => {
      const messageId = coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);
      const onTimeout = vi.fn();

      coordinator.setAcknowledgmentTimeout('GAME1', 1000, onTimeout);
      vi.advanceTimersByTime(1000);

      // Timer already started via timeout
      expect(onTimeout).toHaveBeenCalled();

      const result = coordinator.recordAcknowledgment('GAME1', 'alice', messageId);
      expect(result.valid).toBe(true);
      expect(result.late).toBe(true);
      expect(result.reason).toBe('timer_already_started');
    });
  });

  // ==========================================
  // handlePlayerDisconnect
  // ==========================================

  describe('handlePlayerDisconnect', () => {
    it('removes player from expected and triggers timer if remaining all reported countdownComplete', () => {
      const messageId = coordinator.initializeSequence('GAME1', ['alice', 'bob', 'charlie'], 60);

      coordinator.recordCountdownComplete('GAME1', 'alice', messageId);
      coordinator.recordCountdownComplete('GAME1', 'bob', messageId);

      // charlie disconnects — alice and bob already finished countdown
      const result = coordinator.handlePlayerDisconnect('GAME1', 'charlie');

      expect(result).toEqual({ startTimer: true });
      expect(coordinator.getSequenceStats('GAME1')!.timerStarted).toBe(true);
    });

    it('does not start timer if remaining players have not all reported countdownComplete', () => {
      const messageId = coordinator.initializeSequence('GAME1', ['alice', 'bob', 'charlie'], 60);

      coordinator.recordCountdownComplete('GAME1', 'alice', messageId);

      // charlie disconnects — bob still hasn't finished countdown
      const result = coordinator.handlePlayerDisconnect('GAME1', 'charlie');

      expect(result).toEqual({ startTimer: false });
      expect(coordinator.getSequenceStats('GAME1')!.timerStarted).toBe(false);
    });

    it('returns void for non-existent sequence', () => {
      const result = coordinator.handlePlayerDisconnect('NOPE', 'alice');
      expect(result).toBeUndefined();
    });

    it('returns void if timer already started', () => {
      const messageId = coordinator.initializeSequence('GAME1', ['alice'], 60);
      coordinator.recordAcknowledgment('GAME1', 'alice', messageId);

      // Timer already started
      const result = coordinator.handlePlayerDisconnect('GAME1', 'alice');
      expect(result).toBeUndefined();
    });

    it('returns void for cancelled sequence', () => {
      coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);
      coordinator.cancelSequence('GAME1');

      const result = coordinator.handlePlayerDisconnect('GAME1', 'alice');
      expect(result).toBeUndefined();
    });

    it('handles disconnect of player not in expected list', () => {
      coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);
      const result = coordinator.handlePlayerDisconnect('GAME1', 'stranger');

      expect(result).toEqual({ startTimer: false });
    });

    it('clears countdown + ack timeouts when disconnect triggers start', () => {
      const messageId = coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);
      const onAckTimeout = vi.fn();
      const onCountdownTimeout = vi.fn();

      coordinator.setAcknowledgmentTimeout('GAME1', 3000, onAckTimeout);
      coordinator.setCountdownCompleteTimeout('GAME1', 8000, onCountdownTimeout);
      coordinator.recordCountdownComplete('GAME1', 'alice', messageId);

      // bob disconnects — alice already finished countdown, should start timer
      coordinator.handlePlayerDisconnect('GAME1', 'bob');

      // Both timeouts should have been cleared
      vi.advanceTimersByTime(10000);
      expect(onAckTimeout).not.toHaveBeenCalled();
      expect(onCountdownTimeout).not.toHaveBeenCalled();
    });

    it('does NOT start timer if all players disconnect (0 expected)', () => {
      coordinator.initializeSequence('GAME1', ['alice'], 60);

      const result = coordinator.handlePlayerDisconnect('GAME1', 'alice');
      // expectedPlayers.size === 0, so the condition `size > 0` prevents start
      expect(result).toEqual({ startTimer: false });
    });
  });

  // ==========================================
  // scheduleRetries
  // ==========================================

  describe('scheduleRetries', () => {
    it('retries with exponential backoff for failed sends', () => {
      coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);
      const sendFn = vi.fn().mockReturnValue(false); // always fails

      coordinator.scheduleRetries('GAME1', ['bob'], sendFn);

      // 4 retries at 100, 200, 400, 800ms
      vi.advanceTimersByTime(100);
      expect(sendFn).toHaveBeenCalledTimes(1);
      expect(sendFn).toHaveBeenCalledWith('bob');

      vi.advanceTimersByTime(200);
      expect(sendFn).toHaveBeenCalledTimes(2);

      vi.advanceTimersByTime(400);
      expect(sendFn).toHaveBeenCalledTimes(3);

      vi.advanceTimersByTime(800);
      expect(sendFn).toHaveBeenCalledTimes(4);

      // No more retries after max
      vi.advanceTimersByTime(2000);
      expect(sendFn).toHaveBeenCalledTimes(4);
    });

    it('stops retrying if send succeeds', () => {
      coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);
      const sendFn = vi.fn().mockReturnValue(true); // succeeds first try

      coordinator.scheduleRetries('GAME1', ['bob'], sendFn);

      vi.advanceTimersByTime(100);
      expect(sendFn).toHaveBeenCalledTimes(1);

      // No further retries since send succeeded
      vi.advanceTimersByTime(5000);
      expect(sendFn).toHaveBeenCalledTimes(1);
    });

    it('skips players who already acknowledged', () => {
      const messageId = coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);
      coordinator.recordAcknowledgment('GAME1', 'bob', messageId);

      const sendFn = vi.fn();
      coordinator.scheduleRetries('GAME1', ['bob'], sendFn);

      vi.advanceTimersByTime(5000);
      expect(sendFn).not.toHaveBeenCalled();
    });

    it('does not retry if sequence cancelled', () => {
      coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);
      const sendFn = vi.fn();

      coordinator.scheduleRetries('GAME1', ['bob'], sendFn);
      coordinator.cancelSequence('GAME1');

      vi.advanceTimersByTime(5000);
      expect(sendFn).not.toHaveBeenCalled();
    });

    it('does not retry if timer already started', () => {
      const messageId = coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);
      const sendFn = vi.fn().mockReturnValue(false);

      coordinator.scheduleRetries('GAME1', ['bob'], sendFn);

      // alice and bob ACK immediately (before retry fires)
      coordinator.recordAcknowledgment('GAME1', 'alice', messageId);
      coordinator.recordAcknowledgment('GAME1', 'bob', messageId);

      vi.advanceTimersByTime(5000);
      // retries should not fire since timer started
      expect(sendFn).not.toHaveBeenCalled();
    });
  });

  // ==========================================
  // cancelSequence / cleanupSequence
  // ==========================================

  describe('cancelSequence', () => {
    it('removes sequence and clears all timeouts', () => {
      coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);
      coordinator.setAcknowledgmentTimeout('GAME1', 3000, vi.fn());

      coordinator.cancelSequence('GAME1');

      expect(coordinator.hasActiveSequence('GAME1')).toBe(false);
      expect(coordinator.getSequenceStats('GAME1')).toBeNull();
    });

    it('is idempotent for missing games', () => {
      expect(() => coordinator.cancelSequence('NOPE')).not.toThrow();
    });
  });

  // ==========================================
  // getSequenceStats
  // ==========================================

  describe('getSequenceStats', () => {
    it('returns null for non-existent game', () => {
      expect(coordinator.getSequenceStats('NOPE')).toBeNull();
    });

    it('returns accurate stats after partial ACKs', () => {
      const messageId = coordinator.initializeSequence('GAME1', ['alice', 'bob', 'charlie'], 60);
      coordinator.recordAcknowledgment('GAME1', 'alice', messageId);

      const stats = coordinator.getSequenceStats('GAME1');
      expect(stats!.acknowledged).toEqual(['alice']);
      expect(stats!.missing).toEqual(expect.arrayContaining(['bob', 'charlie']));
      expect(stats!.acknowledgedCount).toBe(1);
      expect(stats!.expectedCount).toBe(3);
      expect(stats!.waitTime).toBeNull(); // timer not started yet
    });
  });

  // ==========================================
  // hasActiveSequence
  // ==========================================

  describe('hasActiveSequence', () => {
    it('returns false for unknown game', () => {
      expect(coordinator.hasActiveSequence('NOPE')).toBe(false);
    });

    it('returns true after init, false after cleanup', () => {
      coordinator.initializeSequence('GAME1', ['alice'], 60);
      expect(coordinator.hasActiveSequence('GAME1')).toBe(true);

      coordinator.cleanupSequence('GAME1');
      expect(coordinator.hasActiveSequence('GAME1')).toBe(false);
    });
  });

  // ==========================================
  // Max players / stress edge case
  // ==========================================

  describe('max players scenario', () => {
    it('handles 20 players all acknowledging', () => {
      const players = Array.from({ length: 20 }, (_, i) => `player${i}`);
      const messageId = coordinator.initializeSequence('BIG', players, 60);

      // First 19 should not trigger allReady
      for (let i = 0; i < 19; i++) {
        const result = coordinator.recordAcknowledgment('BIG', `player${i}`, messageId);
        expect(result.allReady).toBe(false);
      }

      // 20th triggers allReady
      const final = coordinator.recordAcknowledgment('BIG', 'player19', messageId);
      expect(final.allReady).toBe(true);
      expect(final.acknowledgedCount).toBe(20);
    });
  });

  // ==========================================
  // Integration: disconnect + timeout interplay
  // ==========================================

  describe('disconnect during timeout window', () => {
    it('disconnect resolves sequence before timeout fires', () => {
      const messageId = coordinator.initializeSequence('GAME1', ['alice', 'bob', 'charlie'], 60);
      const onTimeout = vi.fn();

      coordinator.setCountdownCompleteTimeout('GAME1', 5000, onTimeout);

      // alice and bob finish countdown
      coordinator.recordCountdownComplete('GAME1', 'alice', messageId);
      coordinator.recordCountdownComplete('GAME1', 'bob', messageId);

      // charlie disconnects at 2000ms
      vi.advanceTimersByTime(2000);
      const result = coordinator.handlePlayerDisconnect('GAME1', 'charlie');
      expect(result).toEqual({ startTimer: true });

      // timeout should not fire
      vi.advanceTimersByTime(5000);
      expect(onTimeout).not.toHaveBeenCalled();
    });
  });
});
