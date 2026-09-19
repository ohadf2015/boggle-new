import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWordCraftEventToasts } from '../useWordCraftEventToasts';
import { buildInitialState, type WordCraftState } from '@/lib/word-craft/useWordCraftGame';

const t = (key: string, params?: Record<string, unknown>) => (params ? `${key}(${Object.values(params).join(',')})` : key);

function withHistory(s: WordCraftState, entry: WordCraftState['history'][number]): WordCraftState {
  return { ...s, history: [...s.history, entry] };
}

describe('useWordCraftEventToasts', () => {
  const base = buildInitialState({ seed: 1, boardSize: 15, locale: 'en' });

  it('Given the bot skipped, Then a bot toast says so', () => {
    const { result, rerender } = renderHook(({ s }) => useWordCraftEventToasts(s, t), { initialProps: { s: base } });
    expect(result.current.toast).toBeNull();
    rerender({ s: withHistory(base, { who: 'bot', words: [], score: 0, placedTileIds: [], kind: 'skip' }) });
    expect(result.current.toast).toMatchObject({ tone: 'bot', text: 'wordcraft.botSkipped(wordcraft.bot)' });
  });

  it('Given the PLAYER swapped, Then nothing is announced', () => {
    const { result, rerender } = renderHook(({ s }) => useWordCraftEventToasts(s, t), { initialProps: { s: base } });
    rerender({ s: withHistory(base, { who: 'player', words: [], score: 0, placedTileIds: [], kind: 'swap' }) });
    expect(result.current.toast).toBeNull();
  });

  it('Given the player opened a surprise, Then a gold reveal toast names the reward', () => {
    const { result, rerender } = renderHook(({ s }) => useWordCraftEventToasts(s, t), { initialProps: { s: base } });
    rerender({ s: { ...base, lastSurprise: { by: 'player', kind: 'paint', count: 6, row: 1, col: 1, turnIndex: 2 } } });
    expect(result.current.toast).toMatchObject({
      tone: 'gold',
      text: 'wordcraft.surprise.title',
      detail: 'wordcraft.surprise.paint(6)',
    });
  });
});
