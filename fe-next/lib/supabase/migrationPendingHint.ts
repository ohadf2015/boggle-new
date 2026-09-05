export interface PostgrestLikeError {
  code?: string | null;
  message?: string | null;
}

// Postgres: 42P01 undefined_table, 42703 undefined_column, 42883 undefined_function.
// PostgREST: PGRST202 function not found, PGRST205 table not found in schema cache.
const MIGRATION_PENDING_CODES = new Set(['42P01', '42703', '42883', 'PGRST202', 'PGRST205']);

/**
 * Recognize "this database has not received a migration yet" and say so
 * plainly, instead of surfacing a bare Postgres/PostgREST error that reads
 * identical to any other failure.
 *
 * Born from the teacher_pro_grants rollout: the migration that created its
 * table and `find_user_id_by_email` function sat unapplied in production for
 * months (the migrations workflow's Supabase token had expired), so every
 * grant failed with a generic "user lookup failed" / "grant insert failed" —
 * indistinguishable from a real bug, and two rounds of unrelated timeout
 * fixes (#940, #941) landed before anyone traced it back to the missing
 * schema. Wrap any DB error a migration-dependent write can throw in this so
 * the next one is diagnosed in one read, not three PRs.
 */
export function migrationPendingHint(error: PostgrestLikeError | null | undefined): string | null {
  if (!error) return null;
  const code = error.code ?? undefined;
  const message = error.message ?? '';
  const matchesCode = !!code && MIGRATION_PENDING_CODES.has(code);
  const matchesMessage = /could not find the (table|function|column)/i.test(message) || /schema cache/i.test(message);
  if (!matchesCode && !matchesMessage) return null;
  return `migration pending: ${message} — run the Supabase migrations workflow (.github/workflows/supabase-migrations.yml) to apply pending schema changes`;
}
