/**
 * Behavioral test: a fresh MP round start must not toast "GO! You're in!" —
 * the countdown stage (MpCountdownStage) IS the GO moment, and the toast
 * repeated it on top. Reconnect/recovery resumes silently (no countdown, and
 * nothing new to announce). A late joiner skips the countdown, so the
 * "Joined game!" toast stays their only confirmation.
 */
import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@/components/NeoToast', () => ({
  neoSuccessToast: vi.fn(),
  neoErrorToast: vi.fn(),
  neoInfoToast: vi.fn(),
  neoWarningToast: vi.fn(),
  TOAST_ICONS: {},
}));
vi.mock('@/utils/logger', () => ({
  default: { log: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { usePlayerGameEvents } from '../usePlayerGameEvents';
import { neoSuccessToast } from '@/components/NeoToast';

const handlers: Record<string, ((data: unknown) => void) | undefined> = {};
const mockSocket = {
  on: vi.fn((event: string, handler: (data: unknown) => void) => { handlers[event] = handler; }),
  off: vi.fn((event: string) => { delete handlers[event]; }),
  emit: vi.fn(),
};

function mountHook() {
  return renderHook(() =>
    usePlayerGameEvents({
      socket: mockSocket as any,
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
    }),
  );
}

let seq = 0;
const startPayload = (extra: Record<string, unknown> = {}) => ({
  letterGrid: [['A', 'B'], ['C', 'D']],
  timerSeconds: 90,
  language: 'en',
  messageId: `go-toast-${Date.now()}-${seq++}`,
  gameSessionId: 1000 + seq,
  ...extra,
});

const toastKeys = () =>
  (neoSuccessToast as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0]);

describe('usePlayerGameEvents — no duplicate GO toast at round start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(handlers)) delete handlers[k];
  });

  it('a fresh round start fires no "GO!" success toast (the countdown is the GO)', () => {
    mountHook();
    act(() => { handlers['startGame']?.(startPayload()); });
    expect(toastKeys()).not.toContain('common.gameStarted');
    expect(neoSuccessToast).not.toHaveBeenCalled();
  });

  it('a reconnect/recovery resume fires no "GO!" success toast', () => {
    mountHook();
    act(() => { handlers['startGame']?.(startPayload({ reconnect: true })); });
    expect(toastKeys()).not.toContain('common.gameStarted');
  });

  it('a late joiner (no countdown) still gets the "Joined game!" toast', () => {
    mountHook();
    act(() => { handlers['startGame']?.(startPayload({ lateJoin: true, reconnect: true })); });
    expect(toastKeys()).toEqual(['common.joinedGame']);
  });
});
