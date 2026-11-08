import { vi } from 'vitest';

type Row = Record<string, unknown>;

/** A tiny in-memory stand-in for the two tables a calendar claim touches (test helper). */
export function fakeDb(initial: { engagement?: Row | null; profile?: Row }) {
  const tables: Record<string, Row[]> = {
    player_engagement: initial.engagement ? [{ ...initial.engagement }] : [],
    profiles: [{ id: 'p1', free_hints_available: 3, ...initial.profile }],
  };
  const rpc = vi.fn(async () => ({ data: null, error: null }));
  const from = (table: string) => {
    const filters: Array<(r: Row) => boolean> = [];
    let op: { kind: 'select' | 'update' | 'insert'; values?: Row } = { kind: 'select' };
    const rows = () => tables[table].filter((r) => filters.every((f) => f(r)));
    const run = () => {
      if (op.kind === 'insert') {
        if (tables[table].some((r) => r.player_id === op.values!.player_id)) return { data: null, error: { code: '23505', message: 'dup' } };
        tables[table].push({ ...op.values });
        return { data: [op.values], error: null };
      }
      const hit = rows();
      if (op.kind === 'update') hit.forEach((r) => Object.assign(r, op.values));
      return { data: hit.map((r) => ({ ...r })), error: null };
    };
    const b: Record<string, unknown> = {
      select: () => b,
      eq: (col: string, v: unknown) => { filters.push((r) => r[col] === v); return b; },
      is: (col: string, v: unknown) => { filters.push((r) => (r[col] ?? null) === v); return b; },
      not: (col: string, opName: string, v: string) => {
        const day = Number(v.replace(/[{}]/g, ''));
        if (opName === 'cs') filters.push((r) => !((r[col] as number[] | undefined) ?? []).includes(day));
        return b;
      },
      update: (values: Row) => { op = { kind: 'update', values }; return b; },
      insert: (values: Row) => { op = { kind: 'insert', values }; return b; },
      maybeSingle: async () => { const r = run(); return { data: (r.data as Row[] | null)?.[0] ?? null, error: r.error }; },
      then: (ok: (v: unknown) => unknown) => Promise.resolve(run()).then(ok),
    };
    return b;
  };
  return { client: { from, rpc } as never, tables, rpc };
}

