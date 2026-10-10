import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHuntStage } from '../useHuntStage';
import { VERDICT_HOLD_MS, PENDING_TIMEOUT_MS } from '../huntStage';
import type { FeedbackType } from '../../types';

const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }];

function setup() {
  return renderHook(
    ({ seq, type }: { seq: number; type: FeedbackType | null }) => useHuntStage({ feedbackSeq: seq, feedbackType: type }),
    { initialProps: { seq: 0, type: null as FeedbackType | null } },
  );
}

describe('useHuntStage', () => {
  afterEach(() => vi.useRealTimers());

  it('holds the released word until its verdict lands, then clears after the hold', () => {
    vi.useFakeTimers();
    const { result, rerender } = setup();
    act(() => result.current.live('CAT'));
    act(() => result.current.release('CAT', path));
    expect(result.current.stage.phase).toBe('pending');

    rerender({ seq: 1, type: 'valid-word' });
    expect(result.current.stage).toMatchObject({ phase: 'verdict', verdict: 'good', word: 'CAT' });

    act(() => vi.advanceTimersByTime(VERDICT_HOLD_MS - 10));
    expect(result.current.stage.phase).toBe('verdict');
    act(() => vi.advanceTimersByTime(20));
    expect(result.current.stage.phase).toBe('idle');
  });

  it('gives up on a verdict that never arrives', () => {
    vi.useFakeTimers();
    const { result } = setup();
    act(() => result.current.release('CAT', path));
    act(() => vi.advanceTimersByTime(PENDING_TIMEOUT_MS + 5));
    expect(result.current.stage.phase).toBe('idle');
  });

  it('marks a repeated feedback type as a fresh verdict', () => {
    vi.useFakeTimers();
    const { result, rerender } = setup();
    act(() => result.current.release('CAT', path));
    rerender({ seq: 1, type: 'not-in-dictionary' });
    act(() => vi.advanceTimersByTime(VERDICT_HOLD_MS + 5));
    act(() => result.current.release('CAB', path));
    rerender({ seq: 2, type: 'not-in-dictionary' });
    expect(result.current.stage).toMatchObject({ phase: 'verdict', verdict: 'bad', word: 'CAB' });
  });
});
