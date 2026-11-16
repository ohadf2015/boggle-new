import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CHALLENGE_FIRST } from '@/lib/wordTowerV2/rush/challenges';
import { useRush } from '../useRush';

describe('useRush floor challenges', () => {
  it('given floors landing, when the third lands, then a challenge arms; the next landing resolves it', () => {
    const { result } = renderHook(() => useRush());
    act(() => result.current.reset(11));
    for (let i = 0; i < CHALLENGE_FIRST; i += 1) act(() => result.current.onLanding('good', 3));
    const armed = result.current.challenge;
    expect(armed).not.toBeNull();
    expect(result.current.challengeRef.current).toEqual(armed);
    act(() => result.current.onLanding('perfect', 9));
    expect(result.current.challengeResult?.met).toBe(true);
    expect(result.current.challenge).toBeNull();
  });

  it('given a new run, when reset, then no challenge carries over', () => {
    const { result } = renderHook(() => useRush());
    act(() => result.current.reset(11));
    for (let i = 0; i < CHALLENGE_FIRST; i += 1) act(() => result.current.onLanding('good', 3));
    act(() => result.current.reset(12));
    expect(result.current.challenge).toBeNull();
    expect(result.current.challengeResult).toBeNull();
  });
});
