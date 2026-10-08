/**
 * A joiner who reloads mid-round gets `joined` + a `reconnect` startGame before
 * PlayerView's socket listener is mounted, so only the page-level pending path
 * sees it. It must resume the round exactly like the listener's reconnect path.
 */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { usePlayerGameEvents } from '../socket/usePlayerGameEvents';
import { usePendingGameStart } from '../usePendingGameStart';
import { useGameStore } from '@/hooks/gameState/store';

vi.mock('@/utils/logger', () => ({
  default: { log: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

const handlers: Record<string, ((data: unknown) => void) | undefined> = {};
const mockSocket = {
  on: vi.fn((event: string, handler: (data: unknown) => void) => { handlers[event] = handler; }),
  off: vi.fn((event: string) => { delete handlers[event]; }),
  emit: vi.fn(),
};

const GRID = [['A', 'B'], ['C', 'D']];
let seq = 0;
const basePayload = {
  letterGrid: GRID,
  timerSeconds: 112,
  remainingTime: 112,
  language: 'en',
  minWordLength: 2,
  gameSessionId: 3,
  gameMode: 'classic',
  reconnect: true,
  skipAck: true,
  myFoundWords: ['cab'],
  leaderboard: [{ username: 'joiner', score: 7 }],
};

const freshPayload = () => ({ ...basePayload, messageId: `reconnect-${++seq}` });

function useReloadedPlayer(pendingGameStart: unknown, onGameStartConsumed: () => void) {
  usePlayerGameEvents({
    socket: mockSocket as never,
    t: (key: string) => key,
    username: 'joiner',
    comboShieldsUsedRef: { current: 0 },
  } as never);
  usePendingGameStart({
    pendingGameStart: pendingGameStart as never,
    socket: mockSocket as never,
    onGameStartConsumed,
    handleGameStartMusic: vi.fn(),
    timerReset: vi.fn(),
    timerSetTime: vi.fn(),
    setFoundWords: vi.fn(),
    setLetterGrid: vi.fn(),
    setMinWordLength: vi.fn(),
    setShowModeReveal: vi.fn(),
    setShowStartAnimation: vi.fn(),
    pendingMessageIdRef: { current: null },
    revealedMessageIdRef: { current: null },
    totalGameTimeRef: { current: 0 },
  });
}

describe('usePendingGameStart — reload mid-round (reconnect payload)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(handlers)) delete handlers[k];
    act(() => { useGameStore.getState().resetAll(); });
  });

  it('opens the in-game render gate and resumes the round without a countdown', () => {
    const payload = freshPayload();
    const consumed = vi.fn();
    renderHook(() => useReloadedPlayer(payload, consumed));

    const s = useGameStore.getState();
    expect(s.gameModeConfirmed).toBe(true);
    expect(s.gameMode).toBe('classic');
    expect(s.gameActive).toBe(true);
    expect(s.showStartAnimation).toBe(false);
    expect(s.letterGrid).toEqual(GRID);
    expect(s.foundWords.map((w: { word: string }) => w.word)).toEqual(['cab']);
    expect(s.leaderboard).toEqual(payload.leaderboard);
    expect(consumed).toHaveBeenCalled();
  });

  it('reports countdownComplete so a reload during the 3-2-1 window does not stall the room', () => {
    const payload = freshPayload();
    renderHook(() => useReloadedPlayer(payload, vi.fn()));
    expect(mockSocket.emit).toHaveBeenCalledWith('countdownComplete', { messageId: payload.messageId });
  });
});
