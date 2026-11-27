import type { SupabaseClient } from '@supabase/supabase-js';

type Row = Record<string, unknown>;

const KEYS: Record<string, string[]> = {
  holiday_event_progress: ['user_id', 'event_key', 'day_index'],
  holiday_event_claims: ['user_id', 'event_key', 'kind'],
  holiday_day_games: ['user_id', 'event_key', 'played_on'],
  holiday_hunt_finds: ['user_id', 'event_key', 'find_date'],
  holiday_egg_finds: ['user_id', 'event_key', 'egg_id'],
  game_results: ['id'],
};

export interface FakeDb {
  client: SupabaseClient;
  tables: Record<string, Row[]>;
  failInsert: Set<string>;
}

export function fakeDb(seed: Record<string, Row[]> = {}): FakeDb {
  const tables: Record<string, Row[]> = { ...Object.fromEntries(Object.keys(KEYS).map((k) => [k, []])), ...seed };
  const failInsert = new Set<string>();

  const from = (table: string) => {
    const rows = () => tables[table] ?? (tables[table] = []);
    const filters: ((r: Row) => boolean)[] = [];
    let limitN = Infinity;
    const result = () => ({ data: rows().filter((r) => filters.every((f) => f(r))).slice(0, limitN), error: null });
    const q = {
      select: () => q,
      eq: (k: string, v: unknown) => { filters.push((r) => r[k] === v); return q; },
      gte: (k: string, v: string) => { filters.push((r) => String(r[k]) >= v); return q; },
      lte: (k: string, v: string) => { filters.push((r) => String(r[k]) <= v); return q; },
      lt: (k: string, v: string) => { filters.push((r) => String(r[k]) < v); return q; },
      not: (k: string, _op: string, _v: unknown) => { filters.push((r) => r[k] !== null && r[k] !== undefined); return q; },
      like: (k: string, v: string) => { const re = new RegExp(`^${v.replace(/%/g, '.*')}$`); filters.push((r) => re.test(String(r[k]))); return q; },
      limit: (n: number) => { limitN = n; return q; },
      maybeSingle: async () => ({ data: result().data[0] ?? null, error: null }),
      then: (res: (v: { data: Row[]; error: null }) => unknown) => res(result()),
      insert: async (row: Row) => {
        if (failInsert.has(table)) return { error: { message: 'insert down' } };
        const keys = KEYS[table] ?? [];
        if (keys.length && rows().some((r) => keys.every((k) => r[k] === row[k]))) return { error: { code: '23505', message: 'duplicate' } };
        rows().push({ ...row });
        return { error: null };
      },
      upsert: async (row: Row) => {
        const keys = KEYS[table] ?? [];
        const i = rows().findIndex((r) => keys.every((k) => r[k] === row[k]));
        if (i >= 0) rows()[i] = { ...rows()[i], ...row };
        else rows().push({ ...row });
        return { error: null };
      },
      delete: () => {
        const d = {
          eq: (k: string, v: unknown) => { filters.push((r) => r[k] === v); return d; },
          then: (res: (v: { error: null }) => unknown) => {
            const t = rows();
            for (let i = t.length - 1; i >= 0; i--) if (filters.every((f) => f(t[i]))) t.splice(i, 1);
            return res({ error: null });
          },
        };
        return d;
      },
    };
    return q;
  };
  return { client: { from } as unknown as SupabaseClient, tables, failInsert };
}
