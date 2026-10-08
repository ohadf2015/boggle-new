import { describe, it, expect, vi } from 'vitest';
import { fetchAllRows, PAGE_SIZE } from '../fetchAllRows';

const rowsOf = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }));

describe('fetchAllRows', () => {
  it('reads past the PostgREST 1000-row cap in pages until a short page', async () => {
    const all = rowsOf(2350);
    const page = vi.fn(async (from: number, to: number) => ({
      data: all.slice(from, to + 1),
      error: null,
    }));
    const { data, error } = await fetchAllRows(page);
    expect(error).toBeNull();
    expect(data).toHaveLength(2350);
    expect(page.mock.calls.map(([f, t]) => [f, t])).toEqual([
      [0, PAGE_SIZE - 1],
      [PAGE_SIZE, 2 * PAGE_SIZE - 1],
      [2 * PAGE_SIZE, 3 * PAGE_SIZE - 1],
    ]);
  });

  it('stops after one request when the first page is short', async () => {
    const page = vi.fn(async () => ({ data: rowsOf(3), error: null }));
    const { data } = await fetchAllRows(page);
    expect(data).toHaveLength(3);
    expect(page).toHaveBeenCalledTimes(1);
  });

  it('returns the error message instead of partial data', async () => {
    const page = vi.fn(async (from: number) =>
      from === 0 ? { data: rowsOf(PAGE_SIZE), error: null } : { data: null, error: { message: 'timeout' } },
    );
    const { data, error } = await fetchAllRows(page);
    expect(error).toBe('timeout');
    expect(data).toEqual([]);
  });
});
