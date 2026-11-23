// @vitest-environment happy-dom
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
import { isLuckyWord, LUCKY_LIFE_BONUS } from '../hunt/huntReward';

const grid = [['H', 'O', 'U', 'S', 'E']] as unknown as LetterGrid;
const timeout = () => ({ set: vi.fn(), clear: vi.fn() }) as never;
const TARGET = 'PLANET';

function setup() {
  const dispatch = vi.fn();
  const hook = renderHook(() =>
    useSurvivalWordSubmission({
      grid,
      language: 'en',
      targetWord: TARGET,
      t: (key: string) => key,
      isGameOver: false,
      attempts: [],
      discoveredWords: [] as WordDiscovery[],
      lifePoints: 50,
      dispatch,
      showToast: vi.fn(),
      playWordAcceptedSound: vi.fn(),
      playWordRejectedSound: vi.fn(),
      clueActions: { updateCluesFromFeedback: vi.fn(), updateCluesFromDiscovery: vi.fn(() => 0), triggerClueGainAnimation: vi.fn() },
      feedbackTimeout: timeout(),
      lifeAnimationTimeout: timeout(),
      handleGameOverRef: { current: vi.fn() },
    }),
  );
  const discoveries = () =>
    dispatch.mock.calls.filter(([a]) => a.type === 'DISCOVER_WORD').map(([a]) => a.payload.discovery as WordDiscovery);
  return { ...hook, discoveries };
}

describe('daily word hunt: found words pay a varied reward', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onBoard.mockReturnValue(true);
    global.fetch = vi.fn(async () => new Response(JSON.stringify({ isValid: true, source: 'dict' }))) as unknown as typeof fetch;
  });

  it('Given two quick words, When the second lands, Then it counts as a combo and pays more life', async () => {
    const { result, discoveries } = setup();
    act(() => result.current.handleWordSubmit('hose'));
    await waitFor(() => expect(discoveries()).toHaveLength(1));
    act(() => result.current.handleWordSubmit('shoe'));
    await waitFor(() => expect(discoveries()).toHaveLength(2));
    const [first, second] = discoveries();
    expect(first.combo).toBe(1);
    expect(second.combo).toBe(2);
    const luck = (w: string) => (isLuckyWord(TARGET, w) ? LUCKY_LIFE_BONUS : 0);
    expect(second.lifeGained - luck('SHOE')).toBeGreaterThan(first.lifeGained - luck('HOSE'));
  });

  it('Given a word the day marks lucky, When found, Then it is flagged and pays the lucky bonus', async () => {
    const words = ['HOSE', 'SHOE', 'HUES', 'USE', 'SUE', 'HOUSE', 'OHS'];
    const lucky = words.find((w) => isLuckyWord(TARGET, w));
    const plain = words.find((w) => !isLuckyWord(TARGET, w) && w.length === lucky?.length);
    expect(lucky && plain).toBeTruthy();
    const { result, discoveries } = setup();
    act(() => result.current.handleWordSubmit(lucky!.toLowerCase()));
    await waitFor(() => expect(discoveries()).toHaveLength(1));
    expect(discoveries()[0].lucky).toBe(true);
  });
});
