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
import { recordNotInDictionary } from '@/utils/invalidWordTracker';

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

describe('daily word hunt discovery when the dictionary server cannot answer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { 'Retry-After': '1' } }),
    ) as unknown as typeof fetch;
  });

  it('given a rate-limited check, then no life is lost and the word is not called invalid', async () => {
    const { result, dispatch, showToast } = setup();
    act(() => result.current.handleWordSubmit('HOUSE'));

    await waitFor(() => expect(showToast).toHaveBeenCalled(), { timeout: 3000 });
    expect(showToast).toHaveBeenCalledWith('duplicate', 'playerView.wordCheckUnavailable', 'HOUSE');
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'ADJUST_LIFE' }));
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'DISCOVER_WORD' }));
    expect(recordNotInDictionary).not.toHaveBeenCalled();
  });

  it('given a definitive not-a-word answer, then the life penalty still applies', async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ isValid: false, source: 'unknown' }))) as unknown as typeof fetch;
    const { result, dispatch } = setup();
    act(() => result.current.handleWordSubmit('HOUSE'));
    await waitFor(() => expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'ADJUST_LIFE' })));
  });
});
