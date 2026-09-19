/**
 * Projector ticker — announces steals and swaps to the room.
 */
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TreasureChestTicker } from '../TreasureChestTicker';
import type { TreasureChestState } from '@/shared/types/vocabQuiz';

const t = (key: string, p?: Record<string, string | number>) =>
  p ? `${key}:${Object.entries(p).map(([k, v]) => `${k}=${v}`).join(',')}` : key;

const ev = (over: Partial<TreasureChestState>): TreasureChestState => ({
  actor: 'ana', outcome: 'gain', amount: 20, standings: [], ...over,
});

describe('TreasureChestTicker', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('stays silent for quiet outcomes', () => {
    const { container } = render(<TreasureChestTicker chestEvents={[ev({}), ev({ outcome: 'double' }), ev({ outcome: 'small-loss', amount: -10 })]} t={t} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('announces a steal with actor, target and amount', () => {
    render(<TreasureChestTicker chestEvents={[ev({ outcome: 'steal', targetUsername: 'ben', amount: 40 })]} t={t} />);
    expect(screen.getByRole('status')).toHaveTextContent('vocabQuiz.treasure.tickerSteal:actor=ana,target=ben,amount=40');
  });

  it('shows the newest dramatic event and hides it after a few seconds', () => {
    const first = [ev({ outcome: 'steal', targetUsername: 'ben', amount: 40 })];
    const { rerender } = render(<TreasureChestTicker chestEvents={first} t={t} />);
    const second = [...first, ev({ actor: 'cy', outcome: 'swap', targetUsername: 'ana' })];
    rerender(<TreasureChestTicker chestEvents={second} t={t} />);
    expect(screen.getByRole('status')).toHaveTextContent('tickerSwap:actor=cy,target=ana');

    act(() => vi.advanceTimersByTime(4500));
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('clears when the next question empties the event list', () => {
    const { rerender } = render(<TreasureChestTicker chestEvents={[ev({ outcome: 'swap', targetUsername: 'ben' })]} t={t} />);
    rerender(<TreasureChestTicker chestEvents={[]} t={t} />);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
