/**
 * In-memory PostgREST double for cron tests: real eq/neq/in/gte/not-null filters, ordering,
 * `.range` with the 1000-row cap, upsert (ignoreDuplicates) / insert / update / delete.
 * A table seeded with `error` fails every read.
 */
type Row = Record<string, unknown>;
export type TableSeed = { data: Row[] | null; error: { message: string } | null };

const PK: Record<string, string[]> = {
  teacher_lifecycle_sends: ['user_id', 'kind', 'period_key'],
  cron_heartbeats: ['job'],
};

export function postgrestDouble(tables: Record<string, TableSeed>) {
  const rowsOf = (t: string): Row[] => {
    if (!tables[t]) tables[t] = { data: [], error: null };
    if (!tables[t].data) tables[t].data = [];
    return tables[t].data as Row[];
  };
  const pkOf = (t: string, r: Row) => (PK[t] ?? ['id']).map((c) => String(r[c])).join('|');

  function from(table: string) {
    const filters: Array<(r: Row) => boolean> = [];
    let orderCols: string[] = [];
    let win: [number, number] | null = null;
    let mode: 'select' | 'update' | 'delete' = 'select';
    let patch: Row = {};
    const q: Record<string, unknown> = {};
    const matched = () => rowsOf(table).filter((r) => filters.every((f) => f(r)));
    const exec = () => {
      const seed = tables[table];
      if (mode === 'update') {
        for (const r of matched()) Object.assign(r, patch);
        return { data: null, error: null };
      }
      if (mode === 'delete') {
        const keep = rowsOf(table).filter((r) => !filters.every((f) => f(r)));
        tables[table].data = keep;
        return { data: null, error: null };
      }
      if (seed?.error) return { data: null, error: seed.error, count: null };
      let rows = matched();
      for (const c of [...orderCols].reverse()) rows = [...rows].sort((a, b) => String(a[c]).localeCompare(String(b[c])));
      const [a, b] = win ?? [0, rows.length - 1];
      return { data: rows.slice(a, Math.min(b + 1, a + 1000)), error: null, count: rows.length };
    };
    Object.assign(q, {
      select: () => q,
      eq: (c: string, v: unknown) => { filters.push((r) => r[c] === v); return q; },
      neq: (c: string, v: unknown) => { filters.push((r) => r[c] !== v); return q; },
      in: (c: string, vs: unknown[]) => { filters.push((r) => vs.includes(r[c])); return q; },
      gte: (c: string, v: unknown) => { filters.push((r) => r[c] != null && String(r[c]) >= String(v)); return q; },
      lt: (c: string, v: unknown) => { filters.push((r) => r[c] != null && String(r[c]) < String(v)); return q; },
      not: (c: string, _op: string, _v: unknown) => { filters.push((r) => r[c] != null); return q; },
      is: (c: string, v: unknown) => { filters.push((r) => (r[c] ?? null) === v); return q; },
      contains: () => q,
      order: (c: string) => { orderCols.push(c); return q; },
      range: (a: number, b: number) => { win = [a, b]; return q; },
      limit: (n: number) => { win = [0, n - 1]; return q; },
      maybeSingle: async () => {
        const r = exec();
        return { data: (r.data as Row[] | null)?.[0] ?? null, error: r.error };
      },
      update: (p: Row) => { mode = 'update'; patch = p; return q; },
      delete: () => { mode = 'delete'; return q; },
      insert: (row: Row | Row[]) => {
        for (const r of Array.isArray(row) ? row : [row]) rowsOf(table).push({ ...r });
        return Promise.resolve({ error: null });
      },
      upsert: (row: Row, opts: { ignoreDuplicates?: boolean } = {}) => {
        const k = pkOf(table, row);
        const existing = rowsOf(table).find((r) => pkOf(table, r) === k);
        let inserted: Row[] = [];
        if (existing) {
          if (!opts.ignoreDuplicates) Object.assign(existing, row);
        } else {
          rowsOf(table).push({ sent_at: new Date().toISOString(), ...row });
          inserted = [row];
        }
        const res = { data: inserted, error: null };
        return { select: async () => res, then: (ok: (v: unknown) => unknown) => Promise.resolve(res).then(ok) };
      },
      then: (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve(exec()).then(ok, bad),
    });
    orderCols = [];
    return q;
  }
  return { from, tables };
}
