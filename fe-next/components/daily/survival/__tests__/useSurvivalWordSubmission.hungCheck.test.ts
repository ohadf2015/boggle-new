import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { LetterGrid } from '@/types';
import { PENDING_TIMEOUT_MS } from '../hunt/huntStage';

vi.mock('@/utils/clientWordValidator', () => ({
  isWordOnBoard: vi.fn(() => true),
  normalizeWord: (w: string) => w.toUpperCase(),
}));
vi.mock('@/hooks/useDictionaryCache', () => ({
  hasWordInMemoryCache: () => null,
  prewarmDictionary: () => Promise.resolve(),
}));
vi.mock('@/utils/invalidWordTracker', () => ({ recordNotOnBoard: vi.fn(), recordNotInDictionary: vi.fn() }));

import { useSurvivalWordSubmission } from '../useSurvivalWordSubmission';

const grid = [['H', 'O', 'U', 'S', 'E']] as unknown as LetterGrid;
const timeout = () => ({ set: vi.fn(), clear: vi.fn() }) as never;

function setup() {
  const showToast = vi.fn();
  const hook = renderHook(() =>
    useSurvivalWordSubmission({
      grid,
      language: 'en',
      targetWord: 'PLANET',
      t: (key: string) => key,
      isGameOver: false,
      attempts: [],
      discoveredWords: [],
      lifePoints: 50,
      dispatch: vi.fn(),
      showToast,
      playWordAcceptedSound: vi.fn(),
      playWordRejectedSound: vi.fn(),
      clueActions: { updateCluesFromFeedback: vi.fn(), updateCluesFromDiscovery: vi.fn(() => 0), triggerClueGainAnimation: vi.fn() },
      feedbackTimeout: timeout(),
      lifeAnimationTimeout: timeout(),
      handleGameOverRef: { current: null },
    }),
  );
  return { ...hook, showToast };
}

const hangingFetch = vi.fn(
  (_url: string, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }),
);

describe('daily word hunt when the dictionary request never answers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    hangingFetch.mockClear();
    global.fetch = hangingFetch as unknown as typeof fetch;
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('Given a word check that hangs, When the word is submitted, Then the player is told it could not be checked before the stage gives up on it', async () => {
    const { result, showToast } = setup();
    act(() => result.current.handleWordSubmit('HOUSE'));

    await act(() => vi.advanceTimersByTimeAsync(PENDING_TIMEOUT_MS - 1));

    expect(showToast).toHaveBeenCalledWith('unavailable', 'playerView.wordCheckUnavailable', 'HOUSE');
  });

  it('Given a word check that hung once, When the same word is submitted again, Then it gets feedback again', async () => {
    const { result, showToast } = setup();
    act(() => result.current.handleWordSubmit('HOUSE'));
    await act(() => vi.advanceTimersByTimeAsync(PENDING_TIMEOUT_MS - 1));
    showToast.mockClear();

    act(() => result.current.handleWordSubmit('HOUSE'));
    await act(() => vi.advanceTimersByTimeAsync(PENDING_TIMEOUT_MS - 1));

    expect(showToast).toHaveBeenCalledWith('unavailable', 'playerView.wordCheckUnavailable', 'HOUSE');
  });
});
