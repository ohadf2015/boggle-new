/**
 * Best-of-3 duel series tally.
 *
 * A rematch button that forgets the last game is just a replay button. The
 * series turns two duels into three and gives the loser of game 1 a reason to
 * tap it.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  duelSeriesKey,
  readDuelSeries,
  recordDuelSeriesResult,
  duelSeriesStatus,
  clearDuelSeries,
  DUEL_SERIES_TARGET,
} from '../duelSeries';

describe('duelSeries', () => {
  const key = duelSeriesKey('opponent-1', 'lesson-1');

  beforeEach(() => {
    localStorage.clear();
  });

  it('builds a stable key from opponent and lesson', () => {
    expect(duelSeriesKey('opponent-1', 'lesson-1')).toBe(duelSeriesKey('opponent-1', 'lesson-1'));
    expect(duelSeriesKey('opponent-1', 'lesson-1')).not.toBe(
      duelSeriesKey('opponent-2', 'lesson-1')
    );
  });

  it('starts a fresh series at 0-0', () => {
    const series = readDuelSeries(key);
    expect(series).toEqual({ mine: 0, theirs: 0, games: 0 });
  });

  it('records a win and persists it', () => {
    recordDuelSeriesResult(key, 'win');
    expect(readDuelSeries(key)).toEqual({ mine: 1, theirs: 0, games: 1 });
  });

  it('records a loss and a draw', () => {
    recordDuelSeriesResult(key, 'loss');
    recordDuelSeriesResult(key, 'draw');
    expect(readDuelSeries(key)).toEqual({ mine: 0, theirs: 1, games: 2 });
  });

  it('keeps the series open while neither player has reached the target', () => {
    recordDuelSeriesResult(key, 'win');
    expect(duelSeriesStatus(readDuelSeries(key))).toBe('open');
  });

  it('closes the series as won at the target number of wins', () => {
    recordDuelSeriesResult(key, 'win');
    const series = recordDuelSeriesResult(key, 'win');
    expect(series.mine).toBe(DUEL_SERIES_TARGET);
    expect(duelSeriesStatus(series)).toBe('won');
  });

  it('closes the series as lost when the opponent reaches the target', () => {
    recordDuelSeriesResult(key, 'loss');
    const series = recordDuelSeriesResult(key, 'loss');
    expect(duelSeriesStatus(series)).toBe('lost');
  });

  it('calls three drawn games a tie rather than leaving it open forever', () => {
    recordDuelSeriesResult(key, 'draw');
    recordDuelSeriesResult(key, 'draw');
    const series = recordDuelSeriesResult(key, 'draw');
    expect(duelSeriesStatus(series)).toBe('tied');
  });

  it('clears a finished series so the next rematch starts over', () => {
    recordDuelSeriesResult(key, 'win');
    clearDuelSeries(key);
    expect(readDuelSeries(key)).toEqual({ mine: 0, theirs: 0, games: 0 });
  });

  it('survives corrupted storage without throwing', () => {
    localStorage.setItem(key, 'not json');
    expect(readDuelSeries(key)).toEqual({ mine: 0, theirs: 0, games: 0 });
  });
});
