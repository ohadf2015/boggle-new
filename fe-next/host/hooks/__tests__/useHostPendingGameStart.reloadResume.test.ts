/**
 * A host who reloads mid-round gets `joined` + a `reconnect` startGame before
 * HostView's socket listener is mounted, so only the page-level pending path
 * sees it. HostView's in-game branch needs gameStarted/board + an open mode
 * gate, and HostInGameView renders null while the gate is closed.
 */
import { renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useHostGameEvents } from '../socket/useHostGameEvents';
import { useHostPendingGameStart } from '../useHostPendingGameStart';
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
  gameSessionId: 4,
  gameMode: 'classic',
  reconnect: true,
  skipAck: true,
};

const freshPayload = () => ({ ...basePayload, messageId: `reconnect-${++seq}` });

function useReloadedHost(pendingGameStart: unknown, onGameStartConsumed: () => void) {
  const [gameStarted, setGameStarted] = useState(false);
  const [showStartAnimation, setShowStartAnimation] = useState(false);
  const [tableData, setTableData] = useState<unknown>(null);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [setters] = useState(() => ({
    setWaitingForResults: vi.fn(), setFinalScores: vi.fn(), setPlayerWordCounts: vi.fn(),
    setPlayerScores: vi.fn(), setHostFoundWords: vi.fn(), setHostAchievements: vi.fn(),
  }));
  const [state] = useState(() => ({ ...setters, setTableData, setRemainingTime, setShowStartAnimation }));
  const [onRoundMusic] = useState(() => vi.fn());

  useHostGameEvents({
    socket: mockSocket, t: (k: string) => k, gameStarted, username: 'host', hostPlaying: true,
    setGameStarted, setShowStartAnimation, setTableData, setRemainingTime,
    setWaitingForResults: setters.setWaitingForResults, setFinalScores: setters.setFinalScores,
    setPlayerWordCounts: setters.setPlayerWordCounts, setPlayerScores: setters.setPlayerScores,
    setPlayerAchievements: vi.fn(), setHostFoundWords: setters.setHostFoundWords,
    setHostAchievements: setters.setHostAchievements, setTournamentData: vi.fn(),
    setTournamentCreating: vi.fn(), setShufflingGrid: vi.fn(), setXpGainedData: vi.fn(),
    setLevelUpData: vi.fn(), setEarthquakeState: vi.fn(), setFireRoundActive: vi.fn(),
    setFireRoundRemaining: vi.fn(), comboLevelRef: { current: 0 }, lastWordTimeRef: { current: null },
    setComboLevel: vi.fn(), setLastWordTime: vi.fn(), comboTimeoutRef: { current: null },
    intentionalExitRef: { current: false },
  } as never);
  useHostPendingGameStart({ pendingGameStart: pendingGameStart as never, onGameStartConsumed, state: state as never, onRoundMusic });

  return { gameStarted, showStartAnimation, tableData, remainingTime, setters };
}

describe('useHostPendingGameStart — reload mid-round (reconnect payload)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(handlers)) delete handlers[k];
    act(() => { useGameStore.getState().resetAll(); });
  });

  it('resumes the round: board in, mode gate open, no countdown replay', () => {
    const payload = freshPayload();
    const consumed = vi.fn();
    const { result } = renderHook(() => useReloadedHost(payload, consumed));

    expect(useGameStore.getState().gameModeConfirmed).toBe(true);
    expect(useGameStore.getState().gameMode).toBe('classic');
    expect(result.current.tableData).toEqual(GRID);
    expect(result.current.remainingTime).toBe(112);
    expect(result.current.gameStarted).toBe(true);
    expect(result.current.showStartAnimation).toBe(false);
    expect(consumed).toHaveBeenCalled();
  });

  it('keeps the live round\'s scores and words (no fresh-start wipe)', () => {
    const payload = freshPayload();
    const { result } = renderHook(() => useReloadedHost(payload, vi.fn()));
    expect(result.current.setters.setPlayerScores).not.toHaveBeenCalled();
    expect(result.current.setters.setHostFoundWords).not.toHaveBeenCalled();
  });

  it('when the listener wins the race, the pending copy does not replay the countdown', () => {
    const payload = freshPayload();
    const { result, rerender } = renderHook(({ p }) => useReloadedHost(p, vi.fn()), { initialProps: { p: null as unknown } });
    act(() => { handlers['startGame']?.(payload); });
    rerender({ p: payload });
    expect(result.current.gameStarted).toBe(true);
    expect(result.current.showStartAnimation).toBe(false);
    expect(result.current.setters.setPlayerScores).not.toHaveBeenCalled();
  });

  it('a later socket copy of the same reconnect start does not replay it', () => {
    const payload = freshPayload();
    const { result } = renderHook(() => useReloadedHost(payload, vi.fn()));
    act(() => { handlers['startGame']?.(payload); });
    expect(result.current.showStartAnimation).toBe(false);
    expect(result.current.setters.setPlayerScores).not.toHaveBeenCalled();
  });
});

describe('useHostPendingGameStart — next round started while HostView was unmounted', () => {
  it('plays the countdown and opens the mode gate', () => {
    act(() => { useGameStore.getState().resetAll(); });
    const payload = { ...freshPayload(), reconnect: undefined, skipAck: undefined, messageId: `start-${++seq}` };
    const { result } = renderHook(() => useReloadedHost(payload, vi.fn()));
    expect(useGameStore.getState().gameModeConfirmed).toBe(true);
    expect(result.current.showStartAnimation).toBe(true);
    expect(result.current.setters.setFinalScores).toHaveBeenCalledWith(null);
    expect(mockSocket.emit).toHaveBeenCalledWith('startGameAck', { messageId: payload.messageId });
  });
});
