#!/usr/bin/env tsx
/**
 * Post-`db push` migration-drift guard (CI).
 *
 * Fails the job if a migration ADDED in this push did not actually land in the
 * remote `schema_migrations` ledger — i.e. `supabase db push` silently skipped it
 * (out-of-order version timestamp). See lib/migrations/migrationDrift.ts for the
 * full rationale and why this is scoped to the delta (no historical false positives).
 *
 * Must run AFTER `supabase db push` (a pre-merge check can't predict a remote skip).
 *
 * Env:
 *   DRIFT_BASE_SHA  git ref before the push (GitHub: ${{ github.event.before }})
 *   DRIFT_HEAD_SHA  git ref after the push  (GitHub: ${{ github.sha }})
 * Falls back to HEAD~1..HEAD when unset (local runs).
 *
 * Run from `fe-next/supabase` (where the CLI is linked):
 *   npx tsx ../scripts/check-migration-drift.ts
 */
import { execFileSync } from 'node:child_process';
import {
  extractMigrationVersion,
  parseRemoteVersionsFromMigrationList,
  findUnappliedMigrations,
} from '../lib/migrations/migrationDrift';

const MIGRATIONS_GLOB = 'fe-next/supabase/migrations';

// execFileSync with an argument array — no shell, so SHAs/refs from CI context
// cannot inject shell metacharacters.
function run(cmd: string, args: string[], cwd?: string): string {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], cwd });
}

// Linked Supabase project lives here; `supabase migration list` must run from it.
const SUPABASE_DIR = process.env.DRIFT_SUPABASE_DIR?.trim() || 'fe-next/supabase';

// Reject anything that isn't a plausible git rev (sha, HEAD, HEAD~1, ref name).
// Defense in depth on top of the no-shell execFile call.
function safeRev(rev: string): string {
  if (!/^[A-Za-z0-9_./~^-]+$/.test(rev)) {
    throw new Error(`Refusing unsafe git rev: ${JSON.stringify(rev)}`);
  }
  return rev;
}

function getDeltaVersions(): string[] {
  const base = process.env.DRIFT_BASE_SHA?.trim();
  const head = safeRev(process.env.DRIFT_HEAD_SHA?.trim() || 'HEAD');
  // An all-zero before-SHA means a brand-new branch (no parent to diff) — fall back.
  const from = base && !/^0+$/.test(base) ? safeRev(base) : `${head}~1`;

  let out = '';
  try {
    out = run('git', ['diff', '--name-only', '--diff-filter=A', from, head, '--', MIGRATIONS_GLOB]);
  } catch {
    // Shallow clone / missing parent — list files added by the head commit only.
    out = run('git', ['show', '--name-only', '--diff-filter=A', '--pretty=format:', head, '--', MIGRATIONS_GLOB]);
  }

  return out
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map(extractMigrationVersion)
    .filter((v): v is string => v !== null);
}

function getRemoteVersions(): string[] {
  // `supabase migration list` prints Local | Remote | Time. Linked project + creds
  // come from the workflow env (SUPABASE_ACCESS_TOKEN / SUPABASE_DB_PASSWORD).
  const out = run('supabase', ['migration', 'list'], SUPABASE_DIR);
  return parseRemoteVersionsFromMigrationList(out);
}

function main(): void {
  const delta = getDeltaVersions();
  if (delta.length === 0) {
    console.log('✅ migration-drift: no new migrations in this push — nothing to verify.');
    return;
  }

  const remote = getRemoteVersions();
  const unapplied = findUnappliedMigrations(delta, remote);

  if (unapplied.length === 0) {
    console.log(`✅ migration-drift: all ${delta.length} new migration(s) are applied remotely.`);
    return;
  }

  console.error('❌ migration-drift: migrations committed in this push were NOT applied to prod.');
  console.error('   `supabase db push` likely skipped them (out-of-order version timestamp).');
  console.error('   Unapplied versions:');
  for (const v of unapplied) console.error(`     - ${v}`);
  console.error('');
  console.error('   Fix: re-run with `supabase db push --include-all`, or apply + repair the');
  console.error('   ledger for the version above, then confirm the created objects exist.');
  process.exit(1);
}

main();
