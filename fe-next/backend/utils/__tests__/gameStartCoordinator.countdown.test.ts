/**
 * GameStartCoordinator — countdownComplete tracking
 *
 * The pre-game countdown (ModeReveal + 3-2-1-GO) takes ~6s on the client.
 * The authoritative round timer must NOT start until every human client has
 * finished its countdown, otherwise players lose seconds when their first
 * server `timeUpdate` resyncs the displayed time backwards.
 *
 * `recordCountdownComplete` and `setCountdownCompleteTimeout` are the
 * server-side gate. They mirror ack tracking but are independent — ack
 * confirms delivery (drives retries), countdownComplete confirms readiness
 * to play (drives timer start).
 */
import { vi } from 'vitest';
import { GameStartCoordinator } from '../gameStartCoordinator';

vi.mock('../logger', () => ({ default: {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} }));

describe('GameStartCoordinator — countdownComplete', () => {
  let coordinator: GameStartCoordinator;

  beforeEach(() => {
    vi.useFakeTimers();
    coordinator = new GameStartCoordinator();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('marks allReady=true only after every expected player completes countdown', () => {
    const messageId = coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);

    const r1 = coordinator.recordCountdownComplete('GAME1', 'alice', messageId);
    expect(r1.valid).toBe(true);
    expect(r1.allReady).toBe(false);

    const r2 = coordinator.recordCountdownComplete('GAME1', 'bob', messageId);
    expect(r2.valid).toBe(true);
    expect(r2.allReady).toBe(true);
  });

  it('GIVEN every client acknowledged the start first (the real order) WHEN all countdowns finish THEN the round timer starts then, not at the safety net', () => {
    const messageId = coordinator.initializeSequence('GAME1', ['host', 'noa'], 60);
    coordinator.recordAcknowledgment('GAME1', 'host', messageId);
    coordinator.recordAcknowledgment('GAME1', 'noa', messageId);
    expect(coordinator.getSequenceStats('GAME1')!.timerStarted).toBe(false);

    expect(coordinator.recordCountdownComplete('GAME1', 'host', messageId).allReady).toBe(false);
    const last = coordinator.recordCountdownComplete('GAME1', 'noa', messageId);
    expect(last.allReady).toBe(true);
  });

  it('GIVEN all acks but one countdown never reports WHEN the countdown fallback fires THEN it still starts the timer', () => {
    const messageId = coordinator.initializeSequence('GAME1', ['host', 'noa'], 60);
    const onTimeout = vi.fn();
    coordinator.setCountdownCompleteTimeout('GAME1', 8000, onTimeout);
    coordinator.recordAcknowledgment('GAME1', 'host', messageId);
    coordinator.recordAcknowledgment('GAME1', 'noa', messageId);
    coordinator.recordCountdownComplete('GAME1', 'host', messageId);
    vi.advanceTimersByTime(8000);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('rejects countdownComplete with wrong messageId', () => {
    coordinator.initializeSequence('GAME1', ['alice'], 60);
    const r = coordinator.recordCountdownComplete('GAME1', 'alice', 'stale-id');
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('wrong_message_id');
  });

  it('treats duplicate countdownComplete from same player as no-op', () => {
    const messageId = coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);
    coordinator.recordCountdownComplete('GAME1', 'alice', messageId);
    const r = coordinator.recordCountdownComplete('GAME1', 'alice', messageId);
    expect(r.valid).toBe(true);
    expect(r.duplicate).toBe(true);
    expect(r.allReady).toBe(false);
  });

  it('setCountdownCompleteTimeout fires after timeoutMs when not all completed', () => {
    coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);
    const onTimeout = vi.fn();
    coordinator.setCountdownCompleteTimeout('GAME1', 8000, onTimeout);

    vi.advanceTimersByTime(7999);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('setCountdownCompleteTimeout does not fire if all complete first', () => {
    const messageId = coordinator.initializeSequence('GAME1', ['alice'], 60);
    const onTimeout = vi.fn();
    coordinator.setCountdownCompleteTimeout('GAME1', 8000, onTimeout);

    coordinator.recordCountdownComplete('GAME1', 'alice', messageId);
    vi.advanceTimersByTime(10000);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('handlePlayerDisconnect does NOT start timer if only acks (not countdownComplete) cover the remaining players', () => {
    const messageId = coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);
    // alice acks but never reports countdownComplete
    coordinator.recordAcknowledgment('GAME1', 'alice', messageId);
    // bob disconnects mid-countdown
    const result = coordinator.handlePlayerDisconnect('GAME1', 'bob');
    expect(result?.startTimer).not.toBe(true);
  });

  it('handlePlayerDisconnect starts timer when remaining players have all completed countdown', () => {
    const messageId = coordinator.initializeSequence('GAME1', ['alice', 'bob'], 60);
    coordinator.recordCountdownComplete('GAME1', 'alice', messageId);
    const result = coordinator.handlePlayerDisconnect('GAME1', 'bob');
    expect(result?.startTimer).toBe(true);
  });

  it('cancelSequence clears pending countdown timeout', () => {
    coordinator.initializeSequence('GAME1', ['alice'], 60);
    const onTimeout = vi.fn();
    coordinator.setCountdownCompleteTimeout('GAME1', 8000, onTimeout);

    coordinator.cancelSequence('GAME1');
    vi.advanceTimersByTime(10000);
    expect(onTimeout).not.toHaveBeenCalled();
  });
  describe('quorum start in big rooms', () => {
    const names = (n: number) => Array.from({ length: n }, (_, i) => `p${i}`);

    it('GIVEN 11 of 12 finished the countdown WHEN the grace passes THEN the round starts without waiting the full 8s', () => {
      const players = names(12);
      const messageId = coordinator.initializeSequence('BIG1', players, 60);
      const onTimeout = vi.fn();
      coordinator.setCountdownCompleteTimeout('BIG1', 8000, onTimeout);
      players.slice(0, 11).forEach((p) => coordinator.recordCountdownComplete('BIG1', p, messageId));
      vi.advanceTimersByTime(1400);
      expect(onTimeout).not.toHaveBeenCalled();
      vi.advanceTimersByTime(200);
      expect(onTimeout).toHaveBeenCalledTimes(1);
      expect(onTimeout.mock.calls[0][0]).toMatchObject({ acknowledged: 11, expected: 12, missing: ['p11'] });
    });

    it('GIVEN only 10 of 12 are ready THEN there is no quorum and the full fallback still applies', () => {
      const players = names(12);
      const messageId = coordinator.initializeSequence('BIG2', players, 60);
      const onTimeout = vi.fn();
      coordinator.setCountdownCompleteTimeout('BIG2', 8000, onTimeout);
      players.slice(0, 10).forEach((p) => coordinator.recordCountdownComplete('BIG2', p, messageId));
      vi.advanceTimersByTime(7900);
      expect(onTimeout).not.toHaveBeenCalled();
      vi.advanceTimersByTime(200);
      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it('GIVEN a small room of 4 with 3 ready THEN it keeps waiting for the fourth', () => {
      const players = names(4);
      const messageId = coordinator.initializeSequence('SMALL', players, 60);
      const onTimeout = vi.fn();
      coordinator.setCountdownCompleteTimeout('SMALL', 8000, onTimeout);
      players.slice(0, 3).forEach((p) => coordinator.recordCountdownComplete('SMALL', p, messageId));
      vi.advanceTimersByTime(7900);
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it('GIVEN the last straggler reports inside the grace THEN the normal all-ready path wins and the callback never fires', () => {
      const players = names(12);
      const messageId = coordinator.initializeSequence('BIG3', players, 60);
      const onTimeout = vi.fn();
      coordinator.setCountdownCompleteTimeout('BIG3', 8000, onTimeout);
      players.slice(0, 11).forEach((p) => coordinator.recordCountdownComplete('BIG3', p, messageId));
      vi.advanceTimersByTime(500);
      expect(coordinator.recordCountdownComplete('BIG3', 'p11', messageId).allReady).toBe(true);
      vi.advanceTimersByTime(9000);
      expect(onTimeout).not.toHaveBeenCalled();
    });
  });
});
