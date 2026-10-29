import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHuntStage } from '../useHuntStage';
import { VERDICT_HOLD_MS, PENDING_TIMEOUT_MS, verdictHoldMs } from '../huntStage';
import type { FeedbackType } from '../../types';

const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 0, col: 2 }];

function setup() {
  return renderHook(
    ({ seq, type, word = 'CAT' }: { seq: number; type: FeedbackType | null; word?: string | null }) =>
      useHuntStage({ feedbackSeq: seq, feedbackType: type, feedbackWord: word }),
    { initialProps: { seq: 0, type: null as FeedbackType | null, word: null as string | null } },
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
    act(() => vi.advanceTimersByTime(verdictHoldMs('bad') + 5));
    act(() => result.current.release('CAB', path));
    rerender({ seq: 2, type: 'not-in-dictionary', word: 'CAB' });
    expect(result.current.stage).toMatchObject({ phase: 'verdict', verdict: 'bad', word: 'CAB' });
  });

  it('Given a rejected word, When the verdict shows, Then the reason stays up past the short good-word hold', () => {
    vi.useFakeTimers();
    const { result, rerender } = setup();
    act(() => result.current.release('CAT', path));
    rerender({ seq: 1, type: 'not-in-dictionary' });
    act(() => vi.advanceTimersByTime(VERDICT_HOLD_MS + 50));
    expect(result.current.stage).toMatchObject({ phase: 'verdict', verdict: 'bad' });
    act(() => vi.advanceTimersByTime(verdictHoldMs('bad')));
    expect(result.current.stage.phase).toBe('idle');
  });
});

describe('useHuntStage hidden word', () => {
  afterEach(() => vi.useRealTimers());

  it('Given the hidden word is found, Then its path stays lit until the results take over', () => {
    vi.useFakeTimers();
    const { result, rerender } = setup();
    act(() => result.current.release('CAT', path));
    rerender({ seq: 1, type: 'target-found', word: 'CAT' });
    expect(result.current.stage).toMatchObject({ phase: 'verdict', verdict: 'target' });
    act(() => vi.advanceTimersByTime(VERDICT_HOLD_MS * 5));
    expect(result.current.stage).toMatchObject({ phase: 'verdict', verdict: 'target', path });
  });
});

describe('useHuntStage live word', () => {
  it('Given a drag in progress, When letters are added, Then the live word updates without a new stage state per letter', () => {
    const { result } = setup();
    act(() => result.current.live('C'));
    const stageAtStart = result.current.stage;
    expect(stageAtStart.phase).toBe('live');
    act(() => result.current.live('CA'));
    act(() => result.current.live('CAT'));
    expect(result.current.stage).toBe(stageAtStart);
    expect(result.current.liveWord.get()).toBe('CAT');
  });

  it('Given a live word subscriber, When the word changes and then clears, Then it hears each change and the stage returns to idle', () => {
    const { result } = setup();
    const seen: string[] = [];
    const stop = result.current.liveWord.subscribe(() => seen.push(result.current.liveWord.get()));
    act(() => result.current.live('C'));
    act(() => result.current.live('CA'));
    act(() => result.current.live(''));
    stop();
    expect(seen).toEqual(['C', 'CA', '']);
    expect(result.current.stage.phase).toBe('idle');
  });

  it('Given a verdict still held, When a new drag starts, Then the stage goes live at once', () => {
    vi.useFakeTimers();
    const { result, rerender } = setup();
    act(() => result.current.release('CAT', path));
    rerender({ seq: 1, type: 'valid-word', word: 'CAT' });
    expect(result.current.stage.phase).toBe('verdict');
    act(() => result.current.live('D'));
    expect(result.current.stage.phase).toBe('live');
  });
});
