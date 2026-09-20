/**
 * Chainable supabase-js fake for the estate routes. Every `from(table)` chain
 * records its calls; awaiting it (or `.maybeSingle()` / `.single()`) asks the
 * table's handler for `{ data, error }`. Tests assert on `db.calls`, which is
 * how "profiles is a SEPARATE query, never an embed" is pinned.
 */
import { vi } from 'vitest';
import { PLOT_SLOTS } from '@/lib/wordTowerV2/estateCatalog';

export type Op = [method: string, ...args: unknown[]];
export interface Call {
  table: string;
  ops: Op[];
}
export type Result = { data: unknown; error: unknown };
export type Handler = (ops: Op[], call: Call) => Result;

export const has = (ops: Op[], method: string, ...args: unknown[]) =>
  ops.some(([m, ...a]) => m === method && args.every((x, i) => JSON.stringify(a[i]) === JSON.stringify(x)));

export const argOf = (ops: Op[], method: string, i = 0) => ops.find(([m]) => m === method)?.[i + 1];

export function fakeDb(handlers: Record<string, Handler>, rpc?: (name: string, args: Record<string, unknown>) => Result) {
  const calls: Call[] = [];
  const from = vi.fn((table: string) => {
    const call: Call = { table, ops: [] };
    calls.push(call);
    const resolve = () => (handlers[table] ?? (() => ({ data: null, error: null })))(call.ops, call);
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'in', 'is', 'gte', 'lt', 'lte', 'gt', 'order', 'limit', 'not']) {
      chain[m] = (...args: unknown[]) => {
        call.ops.push([m, ...args]);
        return chain;
      };
    }
    chain.maybeSingle = () => {
      call.ops.push(['maybeSingle']);
      return Promise.resolve(resolve());
    };
    chain.single = () => {
      call.ops.push(['single']);
      return Promise.resolve(resolve());
    };
    chain.then = (ok: (r: Result) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve(resolve()).then(ok, bad);
    return chain;
  });
  const rpcFn = vi.fn((name: string, args: Record<string, unknown>) =>
    Promise.resolve(rpc ? rpc(name, args) : { data: null, error: null }),
  );
  return { client: { from, rpc: rpcFn }, calls, from, rpc: rpcFn };
}

/** Standard next/server mock body (same shape as the other word-tower route tests). */
export const jsonResponse = (data: unknown, init?: { status?: number }) => ({
  json: async () => data,
  status: init?.status ?? 200,
});

export const postReq = (body: unknown) => ({ json: async () => body, url: 'http://x/api/word-tower/estate' }) as never;
export const getReq = () => ({ url: 'http://x/api/word-tower/estate' }) as never;

export const ME = '11111111-1111-4111-8111-111111111111';
export const THEM = '22222222-2222-4222-8222-222222222222';
export const TS = '2026-09-19T20:00:00.000000+00:00';

export const row = (patch: Record<string, unknown> = {}) => ({
  player_id: ME,
  coins: 0,
  district: 1,
  plots: PLOT_SLOTS.map((slot) => ({ slot, level: 0, damaged: false })),
  shields: 0,
  bricks: 0,
  blueprints: 0,
  raid_charges: 0,
  last_tower: [],
  best_m: 0,
  runs: 0,
  updated_at: TS,
  ...patch,
});

/** An estates table that holds one row and applies compare-and-swap updates to it. */
export function estatesTable(initial: Record<string, unknown> | null) {
  let current = initial ? { ...initial } : null;
  let version = 0;
  const handler = (ops: Op[]) => {
    if (has(ops, 'upsert') || has(ops, 'insert')) {
      if (!current) current = row(argOf(ops, 'upsert') ?? argOf(ops, 'insert'));
      return { data: null, error: null };
    }
    if (has(ops, 'update')) {
      if (!current || !has(ops, 'eq', 'updated_at', current.updated_at)) return { data: [], error: null };
      version += 1;
      current = { ...current, ...(argOf(ops, 'update') as object), updated_at: `${TS}#${version}` };
      return { data: [{ updated_at: current.updated_at }], error: null };
    }
    return { data: current, error: null };
  };
  return { handler, get: () => current };
}

