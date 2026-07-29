/**
 * Migration drift detection — delta-scoped.
 *
 * Root cause this guards against: `supabase db push` silently SKIPS a committed
 * migration whose version timestamp is older than the latest already-applied
 * remote migration (out-of-order landing). It exits 0, so the skip is invisible
 * until a feature breaks in prod (e.g. word_wheel_catchup / offerwall_postbacks,
 * 2026-06). A swallowed client `catch {}` then hides the resulting insert errors.
 *
 * Why delta-scoped: this repo has two historical migration systems (the legacy
 * run-migrations.js → `_migrations`, and `supabase db push` → `schema_migrations`),
 * so "absent from the CLI ledger" is NOT a reliable signal across all history —
 * ~35 old-but-applied migrations are absent from `schema_migrations`. But for a
 * migration ADDED IN THIS PUSH, ledger membership is clean: it didn't exist
 * before, so "not in remote after db push" means genuinely-not-applied. We only
 * ever check the delta, so historical migrations can never false-positive.
 *
 * Pure functions here are unit-tested; the CLI wrapper lives in
 * scripts/check-migration-drift.mjs and runs post-`db push` in CI.
 */

/** Extract the leading `YYYYMMDDHHMMSS` version from a migration filename or path. */
export function extractMigrationVersion(fileNameOrPath: string): string | null {
  const base = fileNameOrPath.split('/').pop() ?? fileNameOrPath;
  const match = base.match(/^(\d{14})_.*\.sql$/);
  return match ? match[1] : null;
}

/**
 * Parse the versions present in the REMOTE column of `supabase migration list`
 * output. A row whose Remote cell is empty is local-only (not applied) and is
 * therefore excluded.
 *
 * Table shape: `Local | Remote | Time (UTC)` — we read the 2nd pipe-delimited cell.
 */
export function parseRemoteVersionsFromMigrationList(cliOutput: string): string[] {
  const versions: string[] = [];
  for (const line of cliOutput.split('\n')) {
    if (!line.includes('|')) continue; // skip header rule / blank lines
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 2) continue;
    const remote = cells[1];
    if (/^\d{14}$/.test(remote)) versions.push(remote);
  }
  return versions;
}

/**
 * Given the versions of migrations added in this push and the versions present
 * in the remote ledger, return the delta versions that are NOT applied (drift).
 */
export function findUnappliedMigrations(
  deltaVersions: string[],
  remoteVersions: string[],
): string[] {
  const remote = new Set(remoteVersions);
  return deltaVersions.filter((v) => !remote.has(v));
}
