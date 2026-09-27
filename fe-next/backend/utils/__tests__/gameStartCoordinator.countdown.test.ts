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
});
