import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Socket } from 'socket.io-client';
import { useMpFeedbackStore, resetMpFeedback } from '@/lib/multiplayer/mpFeedback';
import { useMpBonusStore } from '@/components/multiplayer/MpBonusPill';
import { usePlayerWordEvents } from '@/player/hooks/socket/usePlayerWordEvents';
import { useHostWordEvents } from '@/host/hooks/socket/useHostWordEvents';
import { useGameStore } from '@/hooks/gameState';

const toasts = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));
vi.mock('@/components/NeoToast', () => ({
  wordErrorToast: toasts.error,
  neoSuccessToast: vi.fn(),
  neoInfoToast: toasts.info,
  neoWarningToast: toasts.warn,
  TOAST_ICONS: {},
}));
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

const comboRefs = () => ({
  comboLevelRef: { current: 2 },
  lastWordTimeRef: { current: Date.now() as number | null },
  comboTimeoutRef: { current: null as NodeJS.Timeout | null },
  setComboLevel: vi.fn(),
  setLastWordTime: vi.fn(),
});

function mountPlayer(combo = comboRefs()) {
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
      ...combo,
    }),
  );
  return socket;
}

function mountHost(setHostFoundWords = vi.fn(), combo = comboRefs()) {
  const socket = fakeSocket();
  renderHook(() =>
    useHostWordEvents({
      socket: socket as unknown as Socket,
      t: (k: string) => k,
      hostPlaying: true,
      playComboSound: vi.fn(),
      setHostFoundWords,
      setWordsForBoard: vi.fn(),
      setBoardTheme: vi.fn(),
      ...combo,
    }),
  );
  return socket;
}

const accepted = { word: 'planet', score: 9, baseScore: 5, comboBonus: 0, comboLevel: 0, autoValidated: true };

describe('wordAccepted bonuses → bonus pill (both paths)', () => {
  beforeEach(() => useMpBonusStore.setState({ last: null }));

  it.each([['player', mountPlayer], ['host', () => mountHost()]] as const)('%s path records a comeback bonus with its percent', async (_n, mount) => {
    const socket = mount();
    await act(async () => { await socket.fire('wordAccepted', { ...accepted, catchUp: { bonus: 2, pct: 15 } }); });
    expect(useMpBonusStore.getState().last?.bonus).toMatchObject({ kind: 'comeback', pct: 15, points: 2 });
  });

  it.each([['player', mountPlayer], ['host', () => mountHost()]] as const)('%s path records a meteor bonus', async (_n, mount) => {
    const socket = mount();
    await act(async () => { await socket.fire('wordAccepted', { ...accepted, meteorBonus: 6 }); });
    expect(useMpBonusStore.getState().last?.bonus).toMatchObject({ kind: 'meteor', points: 6 });
  });

  it('a plain accepted word records no bonus', async () => {
    const socket = mountPlayer();
    await act(async () => { await socket.fire('wordAccepted', accepted); });
    expect(useMpBonusStore.getState().last).toBeNull();
  });
});

describe('wordRejected server reasons', () => {
  beforeEach(() => {
    resetMpFeedback();
    vi.clearAllMocks();
    useGameStore.getState().setFoundWords([{ word: 'zap', score: 0, validated: false, isDuplicate: false }]);
  });

  const cases = [
    ['frozen', toasts.info, 'mpUi.round.rejectFrozen'],
    ['boss_frozen', toasts.info, 'mpUi.round.rejectFrozen'],
    ['rate_limited', toasts.warn, 'mpUi.round.rejectRateLimited'],
    ['error', toasts.warn, 'mpUi.round.rejectError'],
  ] as const;

  it.each(cases)('player: %s clears the optimistic word, explains why, keeps the combo', async (reason, toast, key) => {
    const combo = comboRefs();
    const socket = mountPlayer(combo);
    await act(async () => { await socket.fire('wordRejected', { word: 'zap', reason }); });
    expect(useGameStore.getState().foundWords).toEqual([]);
    expect(toast).toHaveBeenCalledWith(key, expect.objectContaining({ id: expect.any(String) }));
    expect(useMpFeedbackStore.getState().lastReject).toBeNull();
    expect(combo.setComboLevel).not.toHaveBeenCalled();
  });

  it.each(cases)('host: %s clears the optimistic word and explains why', async (reason, toast, key) => {
    const setHostFoundWords = vi.fn();
    const combo = comboRefs();
    const socket = mountHost(setHostFoundWords, combo);
    await act(async () => { await socket.fire('wordRejected', { word: 'zap', reason }); });
    const updater = setHostFoundWords.mock.calls[0][0] as (p: string[]) => string[];
    expect(updater(['zap', 'sun'])).toEqual(['sun']);
    expect(toast).toHaveBeenCalledWith(key, expect.objectContaining({ id: expect.any(String) }));
    expect(useMpFeedbackStore.getState().lastReject).toBeNull();
    expect(combo.setComboLevel).not.toHaveBeenCalled();
  });

  it('an unknown or missing reason stays a plain "not a word"', async () => {
    const socket = mountPlayer();
    await act(async () => { await socket.fire('wordRejected', { word: 'zap' }); });
    expect(useMpFeedbackStore.getState().lastReject).toMatchObject({ word: 'zap', reason: 'invalid' });
    expect(toasts.info).not.toHaveBeenCalled();
    expect(toasts.warn).not.toHaveBeenCalled();
  });
});
