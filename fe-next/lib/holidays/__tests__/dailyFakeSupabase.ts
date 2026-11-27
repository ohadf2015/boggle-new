import type { SupabaseClient } from '@supabase/supabase-js';

type Row = Record<string, unknown>;
type Filter = (r: Row) => boolean;

export function fakeSupabase(opts: { keys?: Record<string, string[][]>; seed?: Record<string, Row[]> } = {}) {
  const tables: Record<string, Row[]> = {};
  for (const [t, rows] of Object.entries(opts.seed ?? {})) tables[t] = rows.map((r) => ({ ...r }));
  const rowsOf = (t: string) => (tables[t] ??= []);
  const clash = (t: string, row: Row) =>
    (opts.keys?.[t] ?? []).some((cols) => rowsOf(t).some((r) => cols.every((c) => r[c] === row[c])));

  function builder(table: string) {
    const filters: Filter[] = [];
    let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let payload: Row | Row[] | null = null;
    let returning = false;
    let limitN: number | null = null;
    let countOnly = false;

    const run = (): { data: unknown; error: { code?: string; message: string } | null; count?: number } => {
      const all = rowsOf(table);
      const match = (r: Row) => filters.every((f) => f(r));
      if (op === 'insert') {
        const list = Array.isArray(payload) ? payload : [payload as Row];
        for (const row of list) if (clash(table, row)) return { data: null, error: { code: '23505', message: 'duplicate' } };
        all.push(...list.map((r) => ({ ...r })));
        return { data: returning ? list : null, error: null };
      }
      if (op === 'update') {
        const hit = all.filter(match);
        hit.forEach((r) => Object.assign(r, payload));
        return { data: returning ? hit : null, error: null };
      }
      if (op === 'delete') {
        for (let i = all.length - 1; i >= 0; i--) if (match(all[i])) all.splice(i, 1);
        return { data: null, error: null };
      }
      const found = all.filter(match);
      if (countOnly) return { data: null, error: null, count: found.length };
      return { data: limitN === null ? found : found.slice(0, limitN), error: null };
    };

    const q = {
      select: (_cols?: string, o?: { count?: string; head?: boolean }) => {
        if (op !== 'select') returning = true;
        if (o?.head) countOnly = true;
        return q;
      },
      insert: (row: Row | Row[]) => ((op = 'insert'), (payload = row), q),
      update: (patch: Row) => ((op = 'update'), (payload = patch), q),
      delete: () => ((op = 'delete'), q),
      eq: (k: string, v: unknown) => (filters.push((r) => r[k] === v), q),
      neq: (k: string, v: unknown) => (filters.push((r) => r[k] !== v), q),
      in: (k: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[k])), q),
      is: (k: string, v: unknown) => (filters.push((r) => (r[k] ?? null) === v), q),
      gte: (k: string, v: string) => (filters.push((r) => String(r[k]) >= v), q),
      lte: (k: string, v: string) => (filters.push((r) => String(r[k]) <= v), q),
      order: () => q,
      limit: (n: number) => ((limitN = n), q),
      maybeSingle: async () => {
        const r = run();
        const list = (r.data as Row[] | null) ?? [];
        return { data: list[0] ?? null, error: r.error };
      },
      single: async () => {
        const r = run();
        const list = (r.data as Row[] | null) ?? [];
        return list[0] ? { data: list[0], error: r.error } : { data: null, error: r.error ?? { message: 'no rows' } };
      },
      then: (res: (v: ReturnType<typeof run>) => unknown, rej?: (e: unknown) => unknown) => {
        try {
          return Promise.resolve(res(run()));
        } catch (e) {
          return rej ? Promise.resolve(rej(e)) : Promise.reject(e);
        }
      },
    };
    return q;
  }

  return { tables, supabase: { from: builder } as unknown as SupabaseClient };
}
