/**
 * useBossMechanicTutorial Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { useBossMechanicTutorial } from '../useBossMechanicTutorial';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useBossMechanicTutorial', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('starts with no active tutorial', () => {
    const { result } = renderHook(() => useBossMechanicTutorial());
    expect(result.current.activeTwistType).toBeNull();
    expect(result.current.isTutorialVisible).toBe(false);
  });

  it('shows tutorial on first encounter of a mechanic', () => {
    const { result } = renderHook(() => useBossMechanicTutorial());

    act(() => {
      result.current.onMechanicEncountered('popQuiz');
    });

    expect(result.current.activeTwistType).toBe('popQuiz');
    expect(result.current.isTutorialVisible).toBe(true);
  });

  it('does not show tutorial for already-seen mechanic', () => {
    localStorageMock.setItem(
      'lexiclash-seen-boss-mechanics',
      JSON.stringify(['popQuiz'])
    );

    const { result } = renderHook(() => useBossMechanicTutorial());

    act(() => {
      result.current.onMechanicEncountered('popQuiz');
    });

    expect(result.current.activeTwistType).toBeNull();
    expect(result.current.isTutorialVisible).toBe(false);
  });

  it('dismisses tutorial and marks mechanic as seen', () => {
    const { result } = renderHook(() => useBossMechanicTutorial());

    act(() => {
      result.current.onMechanicEncountered('hiveMind');
    });

    act(() => {
      result.current.dismissTutorial();
    });

    expect(result.current.activeTwistType).toBeNull();
    expect(result.current.isTutorialVisible).toBe(false);

    // Should not show again after dismiss
    act(() => {
      result.current.onMechanicEncountered('hiveMind');
    });
    expect(result.current.isTutorialVisible).toBe(false);
  });

  it('persists seen mechanics to localStorage on dismiss', () => {
    const { result } = renderHook(() => useBossMechanicTutorial());

    act(() => {
      result.current.onMechanicEncountered('popQuiz');
    });
    act(() => {
      result.current.dismissTutorial();
    });

    const stored = localStorageMock.getItem('lexiclash-seen-boss-mechanics');
    expect(stored).toContain('popQuiz');
  });

  it('restores seen mechanics from localStorage', () => {
    localStorageMock.setItem(
      'lexiclash-seen-boss-mechanics',
      JSON.stringify(['finalWord', 'mirrorMatch'])
    );

    const { result } = renderHook(() => useBossMechanicTutorial());

    act(() => {
      result.current.onMechanicEncountered('finalWord');
    });
    expect(result.current.isTutorialVisible).toBe(false);

    act(() => {
      result.current.onMechanicEncountered('mirrorMatch');
    });
    expect(result.current.isTutorialVisible).toBe(false);
  });
});
