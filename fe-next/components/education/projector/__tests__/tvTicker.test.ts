import { describe, it, expect } from 'vitest';
import { tickerEvents, type TvRow } from '../tvTicker';

const row = (username: string, cash: number, streak = 0): TvRow => ({ username, cash, streak });

describe('tickerEvents — what the TV ticker says between two frames', () => {
  it('is silent on the first frame: nothing has changed yet', () => {
    expect(tickerEvents(null, [row('Maya', 10), row('Leo', 5)])).toEqual([]);
  });

  it('announces a rank swap when a student overtakes the one above', () => {
    const prev = [row('Maya', 10), row('Leo', 5)];
    const next = [row('Leo', 12), row('Maya', 10)];
    expect(tickerEvents(prev, next)).toEqual([{ kind: 'overtook', username: 'Leo', rival: 'Maya' }]);
  });

  it('announces a streak milestone once it is reached, not on every frame after', () => {
    const prev = [row('Noa', 4, 2)];
    const next = [row('Noa', 9, 3)];
    expect(tickerEvents(prev, next)).toEqual([{ kind: 'streak', username: 'Noa', streak: 3 }]);
    expect(tickerEvents(next, [row('Noa', 12, 3)])).toEqual([]);
  });

  it('stays silent when the order holds and no streak moved', () => {
    const prev = [row('Maya', 10), row('Leo', 5)];
    expect(tickerEvents(prev, [row('Maya', 14), row('Leo', 6)])).toEqual([]);
  });
});
