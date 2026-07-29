/**
 * Behavioral test: results-skip race recovery in usePlayerGameEvents.
 *
 * Bug: after a couple of rounds a player could be stuck on "calculating
 * results" and then yanked straight into the next round without ever seeing
 * the results page. Root cause is a race in the
 * `waitingForResults && !showResults` window: the next round's `startGame`
 * arrives before (or instead of) `validatedScores`.
 *
 * Fix contract: when `handleStartGame` sees a NEW game session begin while the
 * PREVIOUS session's results were never processed, it best-effort emits
 * `requestResults` (server re-sends cached results only while still
 * 'finished') and leaves a breadcrumb — without blocking the new round.
 */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { usePlayerGameEvents } from '../usePlayerGameEvents';

const handlers: Record<string, ((data: unknown) => void) | undefined> = {};
const mockSocket = {
  on: vi.fn((event: string, handler: (data: unknown) => void) => { handlers[event] = handler; }),
  off: vi.fn((event: string) => { delete handlers[event]; }),
  emit: vi.fn(),
};

vi.mock('@/utils/logger', () => ({
  default: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const baseParams = (): Parameters<typeof usePlayerGameEvents>[0] => ({
  socket: mockSocket,
  t: (key: string) => key,
  username: 'testuser',
  setShowWordFeedback: vi.fn(),
  setWordToVote: vi.fn(),
  setEarthquakeState: vi.fn(),
  setFireRoundActive: vi.fn(),
  setFireRoundRemaining: vi.fn(),
  comboLevelRef: { current: 0 },
  lastWordTimeRef: { current: null },
  setComboLevel: vi.fn(),
  setLastWordTime: vi.fn(),
  comboTimeoutRef: { current: null },
  comboShieldsUsedRef: { current: 0 },
  intentionalExitRef: { current: false },
});

describe('usePlayerGameEvents — results-skip race recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(handlers)) delete handlers[k];
  });

  it('requests cached results when a NEW round starts before results were shown', () => {
    renderHook(() => usePlayerGameEvents(baseParams()));

    // Round 1 begins.
    act(() => { handlers['startGame']?.({ gameSessionId: 1, messageId: 'race-m1' }); });
    // ...ends, but validatedScores never reaches us (the race).
    mockSocket.emit.mockClear(); // drop the round-1 startGame ack

    // Round 2 begins while round-1 results were never processed.
    act(() => { handlers['startGame']?.({ gameSessionId: 2, messageId: 'race-m2' }); });

    expect(mockSocket.emit).toHaveBeenCalledWith('requestResults');
  });

  it('does NOT request results when the previous round results were already shown', () => {
    renderHook(() => usePlayerGameEvents(baseParams()));

    act(() => { handlers['startGame']?.({ gameSessionId: 10, messageId: 'race-m10' }); });
    // Results for session 10 ARE processed.
    act(() => { handlers['validatedScores']?.({ scores: [], letterGrid: null }); });
    mockSocket.emit.mockClear();

    act(() => { handlers['startGame']?.({ gameSessionId: 11, messageId: 'race-m11' }); });

    expect(mockSocket.emit).not.toHaveBeenCalledWith('requestResults');
  });

  it('does NOT request results on the very first round (no prior session)', () => {
    renderHook(() => usePlayerGameEvents(baseParams()));
    mockSocket.emit.mockClear();

    act(() => { handlers['startGame']?.({ gameSessionId: 100, messageId: 'race-m100' }); });

    expect(mockSocket.emit).not.toHaveBeenCalledWith('requestResults');
  });
});
