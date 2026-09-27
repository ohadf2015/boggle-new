/**
 * Both word-event paths — the joiner's `usePlayerWordEvents` and the playing
 * host's `useHostWordEvents` — must write the SAME feedback channel, or the
 * HUD juice would fire on one side only (pitfall class 3).
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Socket } from 'socket.io-client';
import { useMpFeedbackStore, resetMpFeedback } from '@/lib/multiplayer/mpFeedback';
import { usePlayerWordEvents } from '@/player/hooks/socket/usePlayerWordEvents';
import { useHostWordEvents } from '@/host/hooks/socket/useHostWordEvents';

vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({ customHaptic: vi.fn() }),
  GAME_HAPTICS: {},
}));

function fakeSocket() {
  const handlers = new Map<string, Set<(d: unknown) => void>>();
  const socket = {
    on: (e: string, h: (d: unknown) => void) => {
      if (!handlers.has(e)) handlers.set(e, new Set());
      handlers.get(e)!.add(h);
      return socket;
    },
    off: (e: string, h?: (d: unknown) => void) => {
      if (h) handlers.get(e)?.delete(h);
      else handlers.delete(e);
      return socket;
    },
    emit: vi.fn(),
    fire: async (e: string, d: unknown) => {
      for (const h of handlers.get(e) ?? []) await h(d);
    },
  };
  return socket;
}

const refs = () => ({
  comboLevelRef: { current: 0 },
  lastWordTimeRef: { current: null as number | null },
  comboTimeoutRef: { current: null as NodeJS.Timeout | null },
  setComboLevel: vi.fn(),
  setLastWordTime: vi.fn(),
});

const accepted = { word: 'planet', score: 9, baseScore: 5, comboBonus: 4, comboLevel: 2, autoValidated: true };

describe('word events → mpFeedback', () => {
  beforeEach(() => resetMpFeedback());

  it('player path records accepted words with the server score', async () => {
    const socket = fakeSocket();
    renderHook(() =>
      usePlayerWordEvents({
        socket: socket as unknown as Socket,
        t: (k: string) => k,
        inputRef: { current: null },
        playComboSound: vi.fn(),
        setShowWordFeedback: vi.fn(),
        setWordToVote: vi.fn(),
        comboShieldsUsedRef: { current: 0 },
        ...refs(),
      }),
    );
    await act(async () => { await socket.fire('wordAccepted', accepted); });
    expect(useMpFeedbackStore.getState().lastWord).toMatchObject({ word: 'planet', points: 9 });
  });

  it('player path records each rejection reason', async () => {
    const socket = fakeSocket();
    renderHook(() =>
      usePlayerWordEvents({
        socket: socket as unknown as Socket,
        t: (k: string) => k,
        inputRef: { current: null },
        playComboSound: vi.fn(),
        setShowWordFeedback: vi.fn(),
        setWordToVote: vi.fn(),
        comboShieldsUsedRef: { current: 0 },
        ...refs(),
      }),
    );
    const cases: Array<[string, string]> = [
      ['wordRejected', 'invalid'],
      ['wordTooShort', 'too-short'],
      ['wordNotOnBoard', 'not-on-board'],
      ['wordAlreadyFound', 'already-found'],
    ];
    for (const [event, reason] of cases) {
      await act(async () => { await socket.fire(event, { word: 'zz' }); });
      expect(useMpFeedbackStore.getState().lastReject).toMatchObject({ word: 'zz', reason });
    }
    await act(async () => {
      await socket.fire('wordAlreadyFoundByOther', { word: 'sun', foundBy: 'Ana', confirmationScore: 2 });
    });
    expect(useMpFeedbackStore.getState().lastReject).toMatchObject({ reason: 'found-by-other', foundBy: 'Ana', points: 2 });
  });

  it('host-playing path records accepted words and rejections into the same channel', async () => {
    const socket = fakeSocket();
    renderHook(() =>
      useHostWordEvents({
        socket: socket as unknown as Socket,
        t: (k: string) => k,
        hostPlaying: true,
        playComboSound: vi.fn(),
        setHostFoundWords: vi.fn(),
        setWordsForBoard: vi.fn(),
        setBoardTheme: vi.fn(),
        ...refs(),
      }),
    );
    await act(async () => { await socket.fire('wordAccepted', accepted); });
    expect(useMpFeedbackStore.getState().lastWord).toMatchObject({ word: 'planet', points: 9 });
    await act(async () => { await socket.fire('wordNotOnBoard', { word: 'qq' }); });
    expect(useMpFeedbackStore.getState().lastReject).toMatchObject({ word: 'qq', reason: 'not-on-board' });
  });

  it('host path records nothing while the host is not playing', async () => {
    const socket = fakeSocket();
    renderHook(() =>
      useHostWordEvents({
        socket: socket as unknown as Socket,
        t: (k: string) => k,
        hostPlaying: false,
        playComboSound: vi.fn(),
        setHostFoundWords: vi.fn(),
        setWordsForBoard: vi.fn(),
        setBoardTheme: vi.fn(),
        ...refs(),
      }),
    );
    await act(async () => { await socket.fire('wordAccepted', accepted); });
    expect(useMpFeedbackStore.getState().lastWord).toBeNull();
  });
});
