import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';

const CHUNK_SIZE = 100;
const PAGE_SIZE = 1000;

export type Result<T> = { data: T[]; error: { message: string } | null };

export type Where =
  | { op: 'eq' | 'neq' | 'gte'; column: string; value: string | number | boolean }
  | { op: 'notNull'; column: string }
  | { op: 'contains'; column: string; value: Record<string, unknown> };

/** A narrow builder type: the full PostgREST generics hit TS2589 here. */
interface Query {
  eq(column: string, value: unknown): Query;
  neq(column: string, value: unknown): Query;
  gte(column: string, value: unknown): Query;
  not(column: string, operator: string, value: unknown): Query;
  contains(column: string, value: Record<string, unknown>): Query;
  in(column: string, values: readonly string[]): Query;
  order(column: string, opts: { ascending: boolean }): Query;
  range(from: number, to: number): PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
}

const query = (sb: Pick<SupabaseClient, 'from'>, table: string, select: string) =>
  sb.from(table).select(select) as unknown as Query;

function applyWhere(q: Query, where: readonly Where[]): Query {
  let out = q;
  for (const w of where) {
    if (w.op === 'notNull') out = out.not(w.column, 'is', null);
    else if (w.op === 'contains') out = out.contains(w.column, w.value);
    else out = out[w.op](w.column, w.value);
  }
  return out;
}

/** Ids chunked for URL length, each chunk paged past the 1000-row cap; `order` must be unique together. */
export async function fetchInChunks<Row>(
  sb: Pick<SupabaseClient, 'from'>,
  table: string,
  select: string,
  column: string,
  ids: string[],
  where: readonly Where[] = [],
  order: string | readonly string[] = 'id',
): Promise<Result<Row>> {
  const orderBy = typeof order === 'string' ? [order] : order;
  const out: Row[] = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const idChunk = ids.slice(i, i + CHUNK_SIZE);
    for (let from = 0; ; from += PAGE_SIZE) {
      let q = applyWhere(query(sb, table, select).in(column, idChunk), where);
      for (const col of orderBy) q = q.order(col, { ascending: true });
      const { data, error } = await q.range(from, from + PAGE_SIZE - 1);
      if (error) {
        logger.error(`[fetchInChunks] ${table} read failed`, error);
        return { data: [], error: { message: error.message } };
      }
      if (!data || data.length === 0) break;
      out.push(...(data as Row[]));
      if (data.length < PAGE_SIZE) break;
    }
  }
  return { data: out, error: null };
}

export async function fetchPaged<Row>(
  sb: Pick<SupabaseClient, 'from'>,
  table: string,
  select: string,
  where: readonly Where[],
): Promise<Result<Row>> {
  const out: Row[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await applyWhere(query(sb, table, select), where)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      logger.error(`[fetchPaged] ${table} read failed`, error);
      return { data: [], error: { message: error.message } };
    }
    if (!data || data.length === 0) break;
    out.push(...(data as Row[]));
    if (data.length < PAGE_SIZE) break;
  }
  return { data: out, error: null };
}
