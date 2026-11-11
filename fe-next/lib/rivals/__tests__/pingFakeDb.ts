import { vi } from 'vitest';

export type Op = [method: string, ...args: unknown[]];
export type Result = { data: unknown; error: unknown };
export type Handler = (ops: Op[]) => Result;

export const has = (ops: Op[], method: string, ...args: unknown[]) =>
  ops.some(([m, ...a]) => m === method && args.every((x, i) => JSON.stringify(a[i]) === JSON.stringify(x)));

export function pingFakeDb(handlers: Record<string, Handler>) {
  const calls: { table: string; ops: Op[] }[] = [];
  const from = vi.fn((table: string) => {
    const call = { table, ops: [] as Op[] };
    calls.push(call);
    const resolve = () => (handlers[table] ?? (() => ({ data: [], error: null })))(call.ops);
    const chain: Record<string, unknown> = {};
    for (const m of ['select', 'insert', 'update', 'eq', 'in', 'or', 'like', 'gte', 'order', 'limit']) {
      chain[m] = (...args: unknown[]) => {
        call.ops.push([m, ...args]);
        return chain;
      };
    }
    chain.maybeSingle = () => Promise.resolve(resolve());
    chain.then = (ok: (r: Result) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve(resolve()).then(ok, bad);
    return chain;
  });
  return { client: { from } as never, calls, from };
}
