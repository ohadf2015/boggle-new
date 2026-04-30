/**
 * useAutoPauseOnHidden Tests
 *
 * Pauses the game when the tab/app goes to background (document.hidden=true),
 * but only while actively playing.
 */

import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const { mockUseNativeAppStatePause } = vi.hoisted(() => ({
  mockUseNativeAppStatePause: vi.fn(),
}));
vi.mock('@/hooks/useNativeAppStatePause', () => ({
  useNativeAppStatePause: (opts: { onBackground?: () => void }) => mockUseNativeAppStatePause(opts),
}));

import { useAutoPauseOnHidden } from '../useAutoPauseOnHidden';

const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: hidden });
  document.dispatchEvent(new Event('visibilitychange'));
};

describe('useAutoPauseOnHidden', () => {
  afterEach(() => setHidden(false));

  const props = {
    isPlaying: true,
    isPaused: false,
    entryPhase: 'playing',
    pauseGame: vi.fn(),
    setIsPaused: vi.fn(),
  };

  it('pauses when tab hidden while playing', () => {
    const pauseGame = vi.fn();
    const setIsPaused = vi.fn();
    renderHook(() => useAutoPauseOnHidden({ ...props, pauseGame, setIsPaused }));
    setHidden(true);
    expect(pauseGame).toHaveBeenCalledTimes(1);
    expect(setIsPaused).toHaveBeenCalledWith(true);
  });

  it('does nothing when already paused', () => {
    const pauseGame = vi.fn();
    renderHook(() => useAutoPauseOnHidden({ ...props, isPaused: true, pauseGame }));
    setHidden(true);
    expect(pauseGame).not.toHaveBeenCalled();
  });

  it('does nothing when not playing', () => {
    const pauseGame = vi.fn();
    renderHook(() => useAutoPauseOnHidden({ ...props, isPlaying: false, pauseGame }));
    setHidden(true);
    expect(pauseGame).not.toHaveBeenCalled();
  });

  it('does nothing during entry phase', () => {
    const pauseGame = vi.fn();
    renderHook(() => useAutoPauseOnHidden({ ...props, entryPhase: 'entering', pauseGame }));
    setHidden(true);
    expect(pauseGame).not.toHaveBeenCalled();
  });

  it('removes listener on unmount', () => {
    const pauseGame = vi.fn();
    const { unmount } = renderHook(() => useAutoPauseOnHidden({ ...props, pauseGame }));
    unmount();
    setHidden(true);
    expect(pauseGame).not.toHaveBeenCalled();
  });

  it('also pauses via Capacitor App background event (iOS swipe-up parity)', () => {
    const pauseGame = vi.fn();
    const setIsPaused = vi.fn();
    mockUseNativeAppStatePause.mockClear();
    renderHook(() => useAutoPauseOnHidden({ ...props, pauseGame, setIsPaused }));

    expect(mockUseNativeAppStatePause).toHaveBeenCalledWith(
      expect.objectContaining({ onBackground: expect.any(Function) })
    );

    const lastCall = mockUseNativeAppStatePause.mock.calls[mockUseNativeAppStatePause.mock.calls.length - 1];
    const onBackground = lastCall[0].onBackground as () => void;
    onBackground();

    expect(pauseGame).toHaveBeenCalledTimes(1);
    expect(setIsPaused).toHaveBeenCalledWith(true);
  });

  it('Capacitor onBackground respects isPaused/isPlaying/entryPhase guards', () => {
    const pauseGame = vi.fn();
    mockUseNativeAppStatePause.mockClear();
    renderHook(() =>
      useAutoPauseOnHidden({ ...props, isPaused: true, pauseGame })
    );

    const lastCall = mockUseNativeAppStatePause.mock.calls[mockUseNativeAppStatePause.mock.calls.length - 1];
    const onBackground = lastCall[0].onBackground as () => void;
    onBackground();

    expect(pauseGame).not.toHaveBeenCalled();
  });
});
