// @vitest-environment happy-dom
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

const grid = [['P', 'L', 'A', 'N', 'T', 'S']] as unknown as LetterGrid;
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
      lifePoints: 50,
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

const answer = (isValid: boolean) => {
  global.fetch = vi.fn(async () => new Response(JSON.stringify({ isValid, source: 'dictionary' }))) as unknown as typeof fetch;
};

describe('daily word hunt: a real word as long as the hidden word', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Given a real word that is not the hidden word, When it is submitted, Then after its reward the player is told it was a wrong guess', async () => {
    answer(true);
    const { result, showToast } = setup();
    act(() => result.current.handleWordSubmit('PLANTS'));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('target-attempt', 'tutorial.wordHunt.lesson.guessWrong', 'PLANTS'));
    expect(showToast.mock.calls.map((c) => c[0])).toEqual(['valid-word', 'target-attempt']);
  });

  it('Given a non-word as long as the hidden word, When it is submitted, Then "not a word" stays the message', async () => {
    answer(false);
    const { result, dispatch, showToast } = setup();
    act(() => result.current.handleWordSubmit('PLANTS'));

    await waitFor(() => expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'ADD_ATTEMPT' })));
    expect(showToast.mock.calls.map((c) => c[0])).toEqual(['not-in-dictionary']);
  });
});

describe('daily word hunt: a tapped selection too short to submit', () => {
  it('Given one or two tapped letters left idle, When they clear, Then the player is told the word is too short and loses no life', () => {
    const { result, dispatch, showToast } = setup();
    act(() => result.current.handleTooShort('PL'));

    expect(showToast).toHaveBeenCalledWith('too-short', 'wordHunt.feedback.tooShort', 'PL');
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'ADJUST_LIFE' }));
  });
});
