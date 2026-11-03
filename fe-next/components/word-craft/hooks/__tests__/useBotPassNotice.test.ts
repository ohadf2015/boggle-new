import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBotPassNotice } from '../useBotPassNotice';

const move = (who: 'player' | 'bot', words: string[]) => ({ who, words, score: words.length ? 5 : 0, placedTileIds: [] });

describe('useBotPassNotice', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows a notice when the bot passes, then clears it', () => {
    const { result, rerender } = renderHook(({ h }) => useBotPassNotice(h, false), {
      initialProps: { h: [move('player', ['cat'])] },
    });
    expect(result.current).toBeNull();
    rerender({ h: [move('player', ['cat']), move('bot', [])] });
    expect(result.current).not.toBeNull();
    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current).toBeNull();
  });

  it('stays silent when the bot plays a word, the player passes, or in hot-seat', () => {
    const a = renderHook(({ h }) => useBotPassNotice(h, false), { initialProps: { h: [] as ReturnType<typeof move>[] } });
    a.rerender({ h: [move('bot', ['dog'])] });
    expect(a.result.current).toBeNull();
    a.rerender({ h: [move('bot', ['dog']), move('player', [])] });
    expect(a.result.current).toBeNull();
    const b = renderHook(({ h }) => useBotPassNotice(h, true), { initialProps: { h: [] as ReturnType<typeof move>[] } });
    b.rerender({ h: [move('bot', [])] });
    expect(b.result.current).toBeNull();
  });
});
