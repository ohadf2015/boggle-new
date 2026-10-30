import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { LetterGrid } from '@/types';

vi.mock('@/utils/clientWordValidator', () => ({
  isWordOnBoard: vi.fn(() => true),
  normalizeWord: (w: string) => w.toUpperCase(),
}));
vi.mock('@/utils/invalidWordTracker', () => ({ recordNotOnBoard: vi.fn(), recordNotInDictionary: vi.fn() }));
const resolveWordVerdict = vi.fn();
vi.mock('@/lib/dictionary/checkWordRemote', () => ({ resolveWordVerdict: (...a: unknown[]) => resolveWordVerdict(...a) }));

import { useSurvivalWordSubmission } from '../useSurvivalWordSubmission';

const grid = [['P', 'L', 'A', 'N', 'E', 'S']] as unknown as LetterGrid;
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

const ofType = (dispatch: ReturnType<typeof vi.fn>, type: string) =>
  dispatch.mock.calls.filter(([a]) => a.type === type);

describe('word submission races', () => {
  beforeEach(() => resolveWordVerdict.mockReset());

  it('given the same word is submitted twice while its check is pending, then it is rewarded once', async () => {
    let release: (v: string) => void = () => {};
    resolveWordVerdict.mockReturnValue(new Promise((r) => { release = r; }));
    const { result, dispatch } = setup();
    act(() => { result.current.handleWordSubmit('LANE'); result.current.handleWordSubmit('LANE'); });
    await act(async () => { release('valid'); });
    await waitFor(() => expect(ofType(dispatch, 'DISCOVER_WORD')).toHaveLength(1));
    expect(resolveWordVerdict).toHaveBeenCalledTimes(1);
  });

  it('given a discovered word, then the reward is sent as a delta, not an absolute life', async () => {
    resolveWordVerdict.mockResolvedValue('valid');
    const { result, dispatch } = setup();
    act(() => result.current.handleWordSubmit('LANE'));
    await waitFor(() => expect(ofType(dispatch, 'DISCOVER_WORD')).toHaveLength(1));
    expect(ofType(dispatch, 'DISCOVER_WORD')[0][0].payload).not.toHaveProperty('newLife');
  });

  it('given a target-length word and the checker is down, then no attempt or life is spent', async () => {
    resolveWordVerdict.mockResolvedValue('unknown');
    const { result, dispatch, showToast } = setup();
    act(() => result.current.handleWordSubmit('PLANES'));
    await waitFor(() => expect(showToast).toHaveBeenCalledWith('unavailable', expect.any(String), 'PLANES'));
    expect(ofType(dispatch, 'ADD_ATTEMPT')).toHaveLength(0);
    expect(ofType(dispatch, 'ADJUST_LIFE')).toHaveLength(0);
  });

  it('given a target-length word, then the attempt is charged only after the verdict', async () => {
    let release: (v: string) => void = () => {};
    resolveWordVerdict.mockReturnValue(new Promise((r) => { release = r; }));
    const { result, dispatch } = setup();
    act(() => result.current.handleWordSubmit('PLANES'));
    expect(ofType(dispatch, 'ADD_ATTEMPT')).toHaveLength(0);
    await act(async () => { release('valid'); });
    await waitFor(() => expect(ofType(dispatch, 'ADD_ATTEMPT')).toHaveLength(1));
  });
});
