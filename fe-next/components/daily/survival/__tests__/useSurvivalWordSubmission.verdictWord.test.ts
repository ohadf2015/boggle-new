import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { LetterGrid } from '@/types';

const onBoard = vi.fn(() => true);
vi.mock('@/utils/clientWordValidator', () => ({
  isWordOnBoard: (...a: unknown[]) => onBoard(...(a as [])),
  normalizeWord: (w: string) => w.toUpperCase(),
}));
vi.mock('@/hooks/useDictionaryCache', () => ({
  hasWordInMemoryCache: () => null,
  prewarmDictionary: () => Promise.resolve(),
}));
vi.mock('@/utils/invalidWordTracker', () => ({ recordNotOnBoard: vi.fn(), recordNotInDictionary: vi.fn() }));

import { useSurvivalWordSubmission } from '../useSurvivalWordSubmission';
import type { WordDiscovery } from '../types';

const grid = [['H', 'O', 'U', 'S', 'E']] as unknown as LetterGrid;
const timeout = () => ({ set: vi.fn(), clear: vi.fn() }) as never;

function setup(discoveredWords: WordDiscovery[] = []) {
  const showToast = vi.fn();
  const gameOver = vi.fn();
  const hook = renderHook(() =>
    useSurvivalWordSubmission({
      grid,
      language: 'en',
      targetWord: 'PLANET',
      t: (key: string) => key,
      isGameOver: false,
      attempts: [],
      discoveredWords,
      lifePoints: 50,
      dispatch: vi.fn(),
      showToast,
      playWordAcceptedSound: vi.fn(),
      playWordRejectedSound: vi.fn(),
      clueActions: { updateCluesFromFeedback: vi.fn(), updateCluesFromDiscovery: vi.fn(() => 0), triggerClueGainAnimation: vi.fn() },
      feedbackTimeout: timeout(),
      lifeAnimationTimeout: timeout(),
      handleGameOverRef: { current: gameOver },
    }),
  );
  return { ...hook, showToast, gameOver };
}

/**
 * The board shows each verdict on the word it is about. Every result of a
 * submitted word must say which word it is for, or a slow dictionary answer for
 * one word lands on the next word the player swiped.
 */
describe('daily word hunt: every verdict names its word', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onBoard.mockReturnValue(true);
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ isValid: false, source: 'unknown' }))) as unknown as typeof fetch;
  });

  it('Given a too-short word, When submitted, Then the verdict carries the word', () => {
    const { result, showToast } = setup();
    act(() => result.current.handleWordSubmit('h'));
    expect(showToast).toHaveBeenCalledWith('too-short', expect.any(String), 'H');
  });

  it('Given an already-found word, When submitted again, Then the verdict carries the word', () => {
    const { result, showToast } = setup([{ word: 'HOUSE', lifeGained: 1, tokensGained: 0, timestamp: 0 }]);
    act(() => result.current.handleWordSubmit('house'));
    expect(showToast).toHaveBeenCalledWith('duplicate', expect.any(String), 'HOUSE');
  });

  it('Given a word that is not on the board, When submitted, Then the verdict carries the word', () => {
    onBoard.mockReturnValue(false);
    const { result, showToast } = setup();
    act(() => result.current.handleWordSubmit('hose'));
    expect(showToast).toHaveBeenCalledWith('not-on-board', expect.any(String), 'HOSE');
  });

  it('Given a target-length word that is not on the board, When submitted, Then the verdict carries the word', () => {
    onBoard.mockReturnValue(false);
    const { result, showToast } = setup();
    act(() => result.current.handleWordSubmit('houses'));
    expect(showToast).toHaveBeenCalledWith('not-on-board', expect.any(String), 'HOUSES');
  });

  it('Given a word the dictionary rejects, When the answer lands, Then the verdict carries the word', async () => {
    const { result, showToast } = setup();
    act(() => result.current.handleWordSubmit('hous'));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('not-in-dictionary', expect.any(String), 'HOUS'));
  });

  it('Given the dictionary cannot answer, When submitted, Then the verdict carries the word', async () => {
    global.fetch = vi.fn(async () => new Response('{}', { status: 429 })) as unknown as typeof fetch;
    const { result, showToast } = setup();
    act(() => result.current.handleWordSubmit('hous'));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('unavailable', expect.any(String), 'HOUS'), { timeout: 3000 });
  });

  it('Given the target word, When submitted, Then the solve is announced on the word before the game ends', () => {
    const { result, showToast, gameOver } = setup();
    act(() => result.current.handleWordSubmit('planet'));
    expect(showToast).toHaveBeenCalledWith('target-found', expect.any(String), 'PLANET');
    expect(gameOver).toHaveBeenCalledWith(true, expect.any(Array));
  });
});
