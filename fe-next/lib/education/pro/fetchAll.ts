import type { SupabaseClient } from '@supabase/supabase-js';
import logger from '@/utils/logger';

const CHUNK_SIZE = 100;
const PAGE_SIZE = 1000;

export type Result<T> = { data: T[]; error: { message: string } | null };

/**
 * Every row whose `column` is in `ids`: ids chunked to keep the URL short, each chunk paged
 * past PostgREST's 1000-row cap. `exclude` drops rows whose column equals a value.
 */
export async function fetchInChunks<Row>(
  sb: Pick<SupabaseClient, 'from'>,
  table: string,
  select: string,
  column: string,
  ids: string[],
  exclude?: { column: string; value: string },
): Promise<Result<Row>> {
  const out: Row[] = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const idChunk = ids.slice(i, i + CHUNK_SIZE);
    for (let from = 0; ; from += PAGE_SIZE) {
      const base = sb.from(table).select(select).in(column, idChunk);
      const q = exclude ? base.neq(exclude.column, exclude.value) : base;
      const { data, error } = await q.order('id', { ascending: true }).range(from, from + PAGE_SIZE - 1);
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
