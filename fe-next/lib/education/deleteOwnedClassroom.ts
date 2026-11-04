/**
 * Delete one classroom the caller owns.
 *
 * classroom_rounds.classroom_id is ON DELETE SET NULL, so a bare classrooms
 * delete orphans the reports the confirm copy says will be permanently
 * deleted. Rounds go first; memberships cascade from the classroom row.
 *
 * Same retry discipline as account delete: one retry on a transient error,
 * and "already gone" is success.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ClassroomDeleteError {
  message?: string;
  status?: number;
  code?: string;
}

export interface ClassroomDeleteResult {
  data: unknown;
  error: ClassroomDeleteError | null;
  count?: number | null;
}

export interface ClassroomDeleteClient {
  deleteWhere: (table: string, column: string, value: string) => Promise<ClassroomDeleteResult>;
  selectWhere: (table: string, column: string, value: string) => Promise<ClassroomDeleteResult>;
}

export interface ClassroomDeleteOutcome {
  ok: boolean;
  alreadyDeleted: boolean;
  attempts: number;
  error: ClassroomDeleteError | null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function isRetryableClassroomDeleteError(error: ClassroomDeleteError | null): boolean {
  if (!error) return false;
  const status = typeof error.status === 'number' ? error.status : 0;
  if (status >= 500) return true;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === 'timeout' ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('fetch failed') ||
    msg.includes('aborterror')
  );
}

function rowGone(result: ClassroomDeleteResult): boolean {
  if (result.error) return false;
  if (Array.isArray(result.data)) return result.data.length === 0;
  return result.data == null;
}

/**
 * Adapts a service-role Supabase client. select() after delete is what turns
 * an RLS no-op into "zero rows" instead of a silent success.
 */
export function classroomDeleteClient(admin: SupabaseClient): ClassroomDeleteClient {
  return {
    deleteWhere: async (table, column, value) => {
      const res = await admin.from(table).delete().eq(column, value).select('id');
      return { data: res.data, error: res.error, count: res.count };
    },
    selectWhere: async (table, column, value) => {
      const res = await admin.from(table).select('id').eq(column, value).maybeSingle();
      return { data: res.data, error: res.error };
    },
  };
}

export async function deleteOwnedClassroom(
  client: ClassroomDeleteClient,
  classroomId: string,
  { maxAttempts = 2, retryDelayMs = 750 }: { maxAttempts?: number; retryDelayMs?: number } = {},
): Promise<ClassroomDeleteOutcome> {
  let lastError: ClassroomDeleteError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const rounds = await client.deleteWhere('classroom_rounds', 'classroom_id', classroomId);
    if (rounds.error) {
      lastError = rounds.error;
      if (isRetryableClassroomDeleteError(rounds.error) && attempt < maxAttempts) {
        await sleep(retryDelayMs);
        continue;
      }
      if (isRetryableClassroomDeleteError(rounds.error)) break;
      return { ok: false, alreadyDeleted: false, attempts: attempt, error: rounds.error };
    }

    const deleted = await client.deleteWhere('classrooms', 'id', classroomId);
    if (deleted.error) {
      lastError = deleted.error;
      const still = await client.selectWhere('classrooms', 'id', classroomId);
      if (!still.error && rowGone(still)) {
        return { ok: true, alreadyDeleted: true, attempts: attempt, error: null };
      }
      if (isRetryableClassroomDeleteError(deleted.error) && attempt < maxAttempts) {
        await sleep(retryDelayMs);
        continue;
      }
      break;
    }

    const removed = Array.isArray(deleted.data) ? deleted.data.length : 0;
    if (removed > 0) {
      return { ok: true, alreadyDeleted: false, attempts: attempt, error: null };
    }

    const still = await client.selectWhere('classrooms', 'id', classroomId);
    if (!still.error && rowGone(still)) {
      return { ok: true, alreadyDeleted: true, attempts: attempt, error: null };
    }
    lastError = still.error ?? { message: 'Classroom delete matched no row' };
    if (attempt < maxAttempts) {
      await sleep(retryDelayMs);
      continue;
    }
  }

  return { ok: false, alreadyDeleted: false, attempts: maxAttempts, error: lastError };
}
