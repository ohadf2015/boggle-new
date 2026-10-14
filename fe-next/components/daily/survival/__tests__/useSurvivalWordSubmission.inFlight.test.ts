import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { LetterGrid } from '@/types';

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
  const dispatch = vi.fn();
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
      dispatch,
      showToast,
      playWordAcceptedSound: vi.fn(),
      playWordRejectedSound: vi.fn(),
      clueActions: { updateCluesFromFeedback: vi.fn(), updateCluesFromDiscovery: vi.fn(() => 0), triggerClueGainAnimation: vi.fn() },
      feedbackTimeout: timeout(),
      lifeAnimationTimeout: timeout(),
      handleGameOverRef: { current: null },
    }),
  );
  return { ...hook, dispatch, showToast };
}

describe('daily word hunt submissions while a dictionary check is in flight', () => {
  let answer: (valid: boolean) => void;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          answer = (valid) => resolve(new Response(JSON.stringify({ isValid: valid, source: 'db' })));
        }),
    ) as unknown as typeof fetch;
  });

  it('given the same word is swiped again before its check returns, then it is paid once and the repeat is called a duplicate', async () => {
    const { result, dispatch, showToast } = setup();
    act(() => result.current.handleWordSubmit('HOUSE'));
    act(() => result.current.handleWordSubmit('HOUSE'));
    expect(showToast).toHaveBeenCalledWith('duplicate', 'wordHunt.feedback.duplicate', 'HOUSE');

    await act(async () => answer(true));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('valid-word', expect.any(String), 'HOUSE'));
    expect(dispatch.mock.calls.filter(([a]) => a.type === 'DISCOVER_WORD')).toHaveLength(1);
  });

  it('given a word turns out not to be a word, then the toast names that word so the stage can match it', async () => {
    const { result, showToast } = setup();
    act(() => result.current.handleWordSubmit('HOUSE'));
    await act(async () => answer(false));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('not-in-dictionary', 'wordHunt.feedback.notInDictionary', 'HOUSE'));
  });

  it('given a word was checked and rejected, then it can be tried again', async () => {
    const { result, showToast } = setup();
    act(() => result.current.handleWordSubmit('HOUSE'));
    await act(async () => answer(false));
    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1));
    act(() => result.current.handleWordSubmit('HOUSE'));
    expect(showToast).not.toHaveBeenCalledWith('duplicate', expect.anything(), 'HOUSE');
  });
});
