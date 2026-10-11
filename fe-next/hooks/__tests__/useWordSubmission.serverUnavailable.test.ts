import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { LetterGrid } from '@/shared/types/game';

vi.mock('@/utils/clientWordValidator', () => ({
  validateWordLocally: vi.fn(() => ({ isValid: true })),
  isWordOnBoard: vi.fn(() => true),
  buildPositionsMap: vi.fn(() => new Map()),
}));
vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: () => false, isLoaded: false }),
  hasWordInMemoryCache: () => null,
  prewarmDictionary: () => Promise.resolve(),
}));
vi.mock('@/hooks/usePrevalidation', () => ({
  usePrevalidation: () => ({ prefetch: vi.fn(), getCached: () => undefined, clearCache: vi.fn() }),
}));
vi.mock('@/utils/posthogEngagement', () => ({ trackWordFound: vi.fn(), trackInvalidWord: vi.fn() }));

import { useWordSubmission } from '../useWordSubmission';

const grid: LetterGrid = [
  ['H', 'O', 'U', 'S'],
  ['A', 'B', 'C', 'E'],
  ['A', 'B', 'C', 'D'],
  ['A', 'B', 'C', 'D'],
];

describe('useWordSubmission when the dictionary server cannot answer', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { 'Retry-After': '1' } }),
    ) as unknown as typeof fetch;
  });

  it('given a rate-limited check, then the word is not rejected and can be resubmitted', async () => {
    const onWordRejected = vi.fn();
    const onComboReset = vi.fn();
    const { result } = renderHook(() =>
      useWordSubmission({ grid, language: 'en', onWordRejected, onComboReset }),
    );

    act(() => result.current.submitWord('house'));

    await waitFor(() => expect(result.current.currentFeedback?.message).toBe('playerView.wordCheckUnavailable'), { timeout: 3000 });
    expect(result.current.currentFeedback?.type).not.toBe('rejected');
    expect(onWordRejected).not.toHaveBeenCalled();
    expect(onComboReset).not.toHaveBeenCalled();
    expect(result.current.foundWords.some(fw => fw.word === 'house')).toBe(false);
    expect(result.current.foundWordsSet.has('house')).toBe(false);
  });
});
