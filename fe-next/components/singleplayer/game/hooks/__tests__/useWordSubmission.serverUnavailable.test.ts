import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWordSubmission } from '../useWordSubmission';
import type { Language, LetterGrid } from '@/shared/types/game';
import type { ComboSystemReturn } from '@/hooks/useComboSystem';
import type { UseSpamDetectionReturn } from '../useSpamDetection';

vi.mock('@/utils/clientWordValidator', () => ({
  validateWordLocally: vi.fn(() => ({ isValid: true })),
  isWordOnBoard: vi.fn(() => true),
}));
vi.mock('@/utils/haptics', () => ({ hapticForWordScore: vi.fn(), hapticError: vi.fn() }));
vi.mock('@/utils/invalidWordTracker', () => ({
  recordNotOnBoard: vi.fn(),
  recordNotInDictionary: vi.fn(),
  recordInvalidWord: vi.fn(),
}));
vi.mock('@/hooks/useDictionaryCache', () => ({
  useDictionaryCache: () => ({ checkWord: () => false, isLoaded: false, isLoading: true, wordCount: 0, error: null }),
  hasWordInMemoryCache: () => null,
  prewarmDictionary: () => Promise.resolve(),
}));
vi.mock('@/hooks/usePrevalidation', () => ({
  usePrevalidation: () => ({ prefetch: vi.fn(), getCached: () => undefined, clearCache: vi.fn() }),
}));
const verdict = vi.hoisted(() => ({ resolve: vi.fn() }));
vi.mock('@/lib/dictionary/checkWordRemote', () => ({ resolveWordVerdict: verdict.resolve }));

import { recordNotInDictionary } from '@/utils/invalidWordTracker';
import { hapticError } from '@/utils/haptics';

const grid: LetterGrid = [
  ['H', 'O', 'U', 'S', 'E'],
  ['A', 'B', 'C', 'D', 'E'],
  ['A', 'B', 'C', 'D', 'E'],
  ['A', 'B', 'C', 'D', 'E'],
  ['A', 'B', 'C', 'D', 'E'],
];

const combo = (): ComboSystemReturn => ({
  comboLevel: 0,
  comboLevelRef: { current: 0 },
  maxCombo: 0,
  availableShields: 0,
  validWordCount: 0,
  comboTimeRemaining: null,
  isDangerState: false,
  incrementCombo: vi.fn().mockReturnValue(1),
  resetCombo: vi.fn(),
  forceResetCombo: vi.fn(),
  incrementValidWordCount: vi.fn(),
  resetAll: vi.fn(),
});
const spam = (): UseSpamDetectionReturn => ({
  checkSubmission: vi.fn().mockReturnValue({ allowed: true }),
  resetSpamDetection: vi.fn(),
});

function setup() {
  const c = combo();
  const hook = renderHook(() =>
    useWordSubmission({
      language: 'en' as Language,
      minWordLength: 3,
      grid,
      gameStartTime: Date.now() - 10000,
      getScoreMultiplier: () => 1,
      fireRoundActive: false,
      combo: c,
      spamDetection: spam(),
      t: (key: string) => key,
      playWordAcceptedSound: vi.fn(),
      playComboSound: vi.fn(),
      announceWordResult: vi.fn(),
      announceCombo: vi.fn(),
    }),
  );
  return { ...hook, combo: c };
}

describe('single-player word submission when the dictionary server cannot answer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { 'Retry-After': '1' } }),
    ) as unknown as typeof fetch;
    verdict.resolve.mockResolvedValue('unknown');
  });

  it('given a rate-limited check, then the word is not rejected, not penalised and can be resubmitted', async () => {
    const { result, combo: c } = setup();
    act(() => result.current.handleWordSubmit('house'));

    await waitFor(() => expect(result.current.currentFeedback?.message).toBe('playerView.wordCheckUnavailable'));
    expect(result.current.currentFeedback?.type).not.toBe('rejected');
    expect(result.current.foundWords.find(fw => fw.word === 'house')).toBeUndefined();
    expect(c.resetCombo).not.toHaveBeenCalled();
    expect(hapticError).not.toHaveBeenCalled();
    expect(recordNotInDictionary).not.toHaveBeenCalled();

    verdict.resolve.mockResolvedValue('valid');
    act(() => result.current.handleWordSubmit('house'));
    await waitFor(() => expect(result.current.currentFeedback?.type).toBe('accepted'));
  });

  it('given a definitive not-a-word answer, then it is still rejected', async () => {
    verdict.resolve.mockResolvedValue('invalid');
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ isValid: false, source: 'unknown' }))) as unknown as typeof fetch;
    const { result } = setup();
    act(() => result.current.handleWordSubmit('house'));
    await waitFor(() => expect(result.current.currentFeedback?.type).toBe('rejected'));
  });
});
