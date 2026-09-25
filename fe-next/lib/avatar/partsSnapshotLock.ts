/**
 * Optimistic lock on `profiles.premium_avatar_parts` (jsonb).
 *
 * Never `.eq(col, array)`: postgrest-js serializes that as `eq.a,b` / `eq.`,
 * which Postgres can't cast to jsonb, so the update errors. Send a JSON literal.
 */
interface FilterableQuery<Q> {
  filter(column: string, operator: string, value: string): Q;
}

export function lockOnPartsSnapshot<Q extends FilterableQuery<Q>>(query: Q, parts: readonly string[]): Q {
  return query.filter('premium_avatar_parts', 'eq', JSON.stringify(parts));
}
