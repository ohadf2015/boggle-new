import { pyramidLocalesOn } from './daily';

// Loose on purpose: checking against Supabase's builder generics recurses past the compiler's depth limit.
interface FilterableQuery {
  in(column: string, values: string[]): unknown;
  not(column: string, operator: string, value: string): unknown;
}

/**
 * Restrict a `connections_daily_scores` query to one board for the date. On a
 * pyramid day the pyramid locales' rows are pyramid runs (a different score
 * scale), so they rank among themselves and never on the chain board.
 * `language` null = the public chain board.
 */
// Unconstrained Q: checking a supabase builder against FilterableQuery hits TS2589.
export function scopeDailyBoard<Q>(query: Q, dateISO: string, language: string | null): Q {
  const pyramidLocales = pyramidLocalesOn(dateISO);
  if (pyramidLocales.length === 0) return query;
  const q = query as unknown as FilterableQuery;
  if (language && pyramidLocales.includes(language)) return q.in('language', pyramidLocales) as unknown as Q;
  return q.not('language', 'in', `(${pyramidLocales.join(',')})`) as unknown as Q;
}
