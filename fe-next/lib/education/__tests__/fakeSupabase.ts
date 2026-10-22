import { vi } from 'vitest';

type Result = { data: unknown; error: { message: string } | null };
export type TableResponder = Result | ((filters: Array<[string, ...unknown[]]>) => Result);

/** A chainable query fake: every builder method records itself, and awaiting or `.maybeSingle()` resolves the table's result. */
export function fakeSupabase(tables: Record<string, TableResponder>) {
  const calls: Array<{ table: string; filters: Array<[string, ...unknown[]]> }> = [];
  const from = vi.fn((table: string) => {
    if (!(table in tables)) throw new Error(`unexpected table ${table}`);
    const filters: Array<[string, ...unknown[]]> = [];
    calls.push({ table, filters });
    const resolve = (): Result => {
      const r = tables[table];
      return typeof r === 'function' ? r(filters) : r;
    };
    const builder: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'in', 'not', 'gte', 'lte', 'order', 'limit']) {
      builder[m] = (...args: unknown[]) => {
        filters.push([m, ...args]);
        return builder;
      };
    }
    builder.maybeSingle = async () => {
      const r = resolve();
      return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
    };
    builder.then = (ok: (r: Result) => unknown, fail?: (e: unknown) => unknown) => Promise.resolve(resolve()).then(ok, fail);
    return builder;
  });
  return { client: { from }, from, calls };
}

export const ok = (data: unknown): Result => ({ data, error: null });
export const fail = (message: string): Result => ({ data: null, error: { message } });
