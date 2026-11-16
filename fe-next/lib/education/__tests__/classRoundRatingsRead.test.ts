/**
 * Teacher read of class ratings: rating column only, for one classroom + game.
 * An error is null, not an empty mood the UI could invent.
 */
import { describe, it, expect, vi } from 'vitest';
import { readClassRoundRatings, CLASS_ROUND_RATING_COLUMNS } from '../classRoundRatingsRead';

describe('readClassRoundRatings', () => {
  it('asks for the rating column only', () => {
    expect(CLASS_ROUND_RATING_COLUMNS).toBe('rating');
    expect(CLASS_ROUND_RATING_COLUMNS).not.toMatch(/student|name/i);
  });

  it('returns the ratings for that class game', async () => {
    const list = vi.fn(async () => ({
      data: [{ rating: 'great' }, { rating: 'bad' }, { rating: 'ok' }],
      error: null,
    }));
    await expect(readClassRoundRatings('c1', 'ABC123', { list })).resolves.toEqual(['great', 'bad', 'ok']);
    expect(list).toHaveBeenCalledWith('c1', 'ABC123');
  });

  it('returns an empty list when the game has no ratings', async () => {
    const list = vi.fn(async () => ({ data: [], error: null }));
    await expect(readClassRoundRatings('c1', 'ABC123', { list })).resolves.toEqual([]);
  });

  it('returns null on a failed read so the digest does not invent a mood', async () => {
    const list = vi.fn(async () => ({ data: null, error: { message: 'rls' } }));
    await expect(readClassRoundRatings('c1', 'ABC123', { list })).resolves.toBeNull();
  });

  it('drops a row whose rating is not bad, ok, or great', async () => {
    const list = vi.fn(async () => ({ data: [{ rating: 'great' }, { rating: 'love' }], error: null }));
    await expect(readClassRoundRatings('c1', 'ABC123', { list })).resolves.toEqual(['great']);
  });
});
