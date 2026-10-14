import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHuntStage } from '../useHuntStage';
import { VERDICT_HOLD_MS, REJECT_HOLD_MS, PENDING_TIMEOUT_MS } from '../huntStage';
import type { FeedbackType } from '../../types';

const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }];

type Props = { seq: number; type: FeedbackType | null; word?: string | null };

function setup() {
  return renderHook(
    ({ seq, type, word }: Props) => useHuntStage({ feedbackSeq: seq, feedbackType: type, feedbackWord: word ?? null }),
    { initialProps: { seq: 0, type: null } as Props },
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

  it('still lands a verdict that arrives 2.5s late on a slow network', () => {
    vi.useFakeTimers();
    const { result, rerender } = setup();
    act(() => result.current.release('CAT', path));
    act(() => vi.advanceTimersByTime(2500));
    expect(result.current.stage.phase).toBe('pending');
    rerender({ seq: 1, type: 'not-in-dictionary' });
    expect(result.current.stage).toMatchObject({ phase: 'verdict', verdict: 'bad', word: 'CAT' });
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

  it('given a rejected word, then its reason stays up longer than a payout before clearing', () => {
    vi.useFakeTimers();
    const { result, rerender } = setup();
    act(() => result.current.release('SFRK', path));
    rerender({ seq: 1, type: 'not-in-dictionary', word: 'SFRK' });
    act(() => vi.advanceTimersByTime(VERDICT_HOLD_MS + 50));
    expect(result.current.stage).toMatchObject({ phase: 'verdict', verdict: 'bad' });
    act(() => vi.advanceTimersByTime(REJECT_HOLD_MS - VERDICT_HOLD_MS));
    expect(result.current.stage.phase).toBe('idle');
  });

  it('given the verdict of an earlier word lands while a newer one is held, then the newer word keeps waiting', () => {
    vi.useFakeTimers();
    const { result, rerender } = setup();
    act(() => result.current.release('XQZ', path));
    act(() => result.current.release('DOG', path));
    rerender({ seq: 1, type: 'not-in-dictionary', word: 'XQZ' });
    expect(result.current.stage).toMatchObject({ phase: 'pending', word: 'DOG' });
    rerender({ seq: 2, type: 'valid-word', word: 'DOG' });
    expect(result.current.stage).toMatchObject({ phase: 'verdict', verdict: 'good', word: 'DOG' });
  });
});
