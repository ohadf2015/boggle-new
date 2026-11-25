export function uniquePushTokens<T extends { token: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => !seen.has(row.token) && seen.add(row.token));
}
