/**
 * Filter builder for GET /api/admin/players.
 *
 * Extracted as a pure function so it can be tested in isolation. Takes a
 * Supabase query chain and applies the right `.eq()/.gte()/.lte()/.lt()/.or()`
 * calls for each filter input. Returns the same chain for further composition.
 *
 * Search input has Postgres LIKE pattern characters (`%` and `_`) escaped
 * so an admin typing `ev%il` doesn't accidentally match every "ev*il" name.
 */

interface FilterableQuery {
  eq: (col: string, val: unknown) => FilterableQuery;
  gte: (col: string, val: unknown) => FilterableQuery;
  lte: (col: string, val: unknown) => FilterableQuery;
  lt: (col: string, val: unknown) => FilterableQuery;
  or: (expr: string) => FilterableQuery;
}

export interface PlayerListFilters {
  search?: string | null;
  country?: string | null;
  role?: 'admin' | 'teacher' | 'player' | null;
  hasBlast?: boolean | null;
  hasBeta?: boolean | null;
  mmrMin?: number | null;
  mmrMax?: number | null;
  daysSinceActive?: number | null;
}

function escapeLikePattern(input: string): string {
  // Backslash-escape Postgres LIKE wildcards so user input can't hijack the pattern.
  return input.replace(/[\\%_]/g, '\\$&');
}

export function applyPlayerListFilters<Q extends FilterableQuery>(
  query: Q,
  filters: PlayerListFilters,
): Q {
  let q = query;

  if (filters.search) {
    const safe = escapeLikePattern(filters.search);
    q = q.or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`) as Q;
  }

  if (filters.country) {
    q = q.eq('country_code', filters.country) as Q;
  }

  if (filters.role === 'admin') {
    q = q.eq('is_admin', true) as Q;
  } else if (filters.role === 'teacher') {
    q = q.eq('user_role', 'teacher') as Q;
  } else if (filters.role === 'player') {
    q = q.eq('user_role', 'player') as Q;
  }

  if (filters.hasBlast === true) {
    q = q.eq('blast_access', true) as Q;
  }

  if (filters.hasBeta === true) {
    q = q.eq('is_beta_tester', true) as Q;
  }

  if (typeof filters.mmrMin === 'number') {
    q = q.gte('ranked_mmr', filters.mmrMin) as Q;
  }
  if (typeof filters.mmrMax === 'number') {
    q = q.lte('ranked_mmr', filters.mmrMax) as Q;
  }

  if (typeof filters.daysSinceActive === 'number' && filters.daysSinceActive > 0) {
    const cutoff = new Date(Date.now() - filters.daysSinceActive * 86_400_000).toISOString();
    q = q.lt('last_game_at', cutoff) as Q;
  }

  return q;
}
