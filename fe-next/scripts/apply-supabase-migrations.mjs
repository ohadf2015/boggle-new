#!/usr/bin/env node
/**
 * Supabase migration runner via the Management API (replaces `supabase db push`).
 *
 * Why this exists: the remote `supabase_migrations.schema_migrations` ledger
 * drifted from fe-next/supabase/migrations/** (hundreds of remote-only versions
 * applied outside this repo). `supabase db push` hard-fails on that drift
 * ("Remote migration versions not found in local migrations directory") and the
 * CLI repair path would mean blindly rewriting the production ledger.
 *
 * Strategy — forward-only watermark:
 *   baseline = max(version) in the remote ledger
 *   pending  = local *.sql files whose version is NOT in the ledger AND whose
 *              numeric version is > baseline
 * Applied in ascending version order; each success is recorded in the ledger,
 * so re-runs are idempotent. Legacy local files at or below the baseline are
 * treated as already-applied history and are never re-run.
 *
 * Auth: SUPABASE_ACCESS_TOKEN only (Management API) — no DB password needed.
 *
 * Usage:
 *   node fe-next/scripts/apply-supabase-migrations.mjs [--dry-run]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF?.trim() || 'hdtmpkicuxvtmvrmtybx';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const DRY_RUN = process.argv.includes('--dry-run');

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');
const FILE_RE = /^(\d+)_(.+)\.sql$/;

if (!ACCESS_TOKEN) {
  console.error('❌ Missing SUPABASE_ACCESS_TOKEN (Supabase Management API token).');
  process.exit(1);
}

async function runQuery(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Management API ${res.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : [];
}

const toBig = (v) => (/^\d+$/.test(v) ? BigInt(v) : null);

function listLocal() {
  const byVersion = new Map();
  for (const file of readdirSync(MIGRATIONS_DIR)) {
    const m = FILE_RE.exec(basename(file));
    if (!m) continue; // e.g. run-migrations.js, README
    const [, version, name] = m;
    if (!byVersion.has(version)) byVersion.set(version, []);
    byVersion.get(version).push({ file, name });
  }
  return byVersion;
}

function cmpVersion(a, b) {
  const ba = toBig(a);
  const bb = toBig(b);
  if (ba !== null && bb !== null) return ba < bb ? -1 : ba > bb ? 1 : 0;
  return a < b ? -1 : a > b ? 1 : 0;
}

const esc = (s) => `'${s.replaceAll("'", "''")}'`;

async function main() {
  const local = listLocal();
  const rows = await runQuery('select version from supabase_migrations.schema_migrations');
  const remote = new Set(rows.map((r) => String(r.version)));
  const baseline = [...remote].filter((v) => toBig(v) !== null).sort(cmpVersion).at(-1) ?? '0';
  const baselineBig = toBig(baseline);

  console.log(`Remote ledger: ${remote.size} versions; baseline (max): ${baseline}`);
  console.log(`Local migrations: ${local.size} distinct versions in ${MIGRATIONS_DIR}`);

  // Duplicate local versions only matter if they'd be candidates to apply.
  const pending = [];
  for (const [version, files] of local) {
    if (remote.has(version)) continue;
    const v = toBig(version);
    if (v === null || v <= baselineBig) continue; // legacy drift: already represented remotely
    if (files.length > 1) {
      console.error(`❌ Duplicate local files for pending version ${version}: ${files.map((f) => f.file).join(', ')}`);
      process.exit(1);
    }
    pending.push({ version, name: files[0].name, file: join(MIGRATIONS_DIR, files[0].file) });
  }
  pending.sort((a, b) => cmpVersion(a.version, b.version));

  if (pending.length === 0) {
    console.log('✅ No pending migrations — remote is up to date.');
    return;
  }

  console.log(`${DRY_RUN ? '[dry-run] ' : ''}Pending migrations to apply:`);
  for (const p of pending) console.log(`  - ${p.version}_${p.name}`);
  if (DRY_RUN) return;

  for (const p of pending) {
    const sql = readFileSync(p.file, 'utf8');
    console.log(`▶ Applying ${p.version}_${p.name} (${sql.length} bytes)...`);
    try {
      await runQuery(sql);
    } catch (err) {
      console.error(`❌ Migration ${p.version} FAILED: ${err.message}`);
      console.error('   Ledger NOT updated. Fix the migration and re-run; earlier ones in this batch are recorded.');
      process.exit(1);
    }
    await runQuery(
      `insert into supabase_migrations.schema_migrations (version, name, created_by) values (${esc(p.version)}, ${esc(p.name)}, 'gh-actions-mgmt-api')`
    );
    console.log(`✅ ${p.version} applied and recorded.`);
  }
  console.log(`✅ Done — ${pending.length} migration(s) applied.`);
}

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
