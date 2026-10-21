#!/usr/bin/env node
/**
 * Cheap schema-drift check against the LexiClash prod project.
 *
 * Walks fe-next for string-literal `.from()` / `.rpc()` calls (tests and
 * supabase/migrations excluded) and asserts each name exists in prod.
 * Also asserts every table whose BEFORE UPDATE trigger calls
 * update_brain_training_updated_at actually has an updated_at column —
 * that mismatch 400s every upsert of brain_score_history.
 *
 * Read-only. Auth is the Management API token, same as
 * apply-supabase-migrations.mjs. No DB password.
 *
 * Usage:
 *   node fe-next/scripts/check-schema-drift.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractRefs } from './schema-drift/extractRefs.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWLIST_PATH = join(ROOT, 'scripts', 'schema-drift', 'allowlist.txt');
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF?.trim() || 'hdtmpkicuxvtmvrmtybx';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN?.trim();

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'coverage',
  '__tests__',
  '__mocks__',
  'migrations',
  'schema-drift',
]);
const SOURCE_EXT = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs']);

if (!ACCESS_TOKEN) {
  console.error('Missing SUPABASE_ACCESS_TOKEN (Supabase Management API token).');
  process.exit(1);
}

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;
    const path = join(dir, entry);
    const st = statSync(path);
    if (st.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      walk(path, out);
      continue;
    }
    const dot = entry.lastIndexOf('.');
    if (dot < 0 || !SOURCE_EXT.has(entry.slice(dot))) continue;
    if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(entry)) continue;
    out.push(path);
  }
}

function loadAllowlist() {
  const tables = new Set();
  const rpcs = new Set();
  const text = readFileSync(ALLOWLIST_PATH, 'utf8');
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const sep = line.indexOf(':');
    if (sep < 1) {
      throw new Error(`Bad allowlist line (want table:<name> or rpc:<name>): ${line}`);
    }
    const kind = line.slice(0, sep);
    const name = line.slice(sep + 1);
    if (kind === 'table') tables.add(name);
    else if (kind === 'rpc') rpcs.add(name);
    else throw new Error(`Bad allowlist kind "${kind}" on: ${line}`);
  }
  return { tables, rpcs };
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

function scan() {
  const files = [];
  walk(ROOT, files);
  const tables = new Map();
  const rpcs = new Map();
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const refs = extractRefs(source);
    const rel = relative(ROOT, file);
    for (const name of refs.tables) {
      if (!tables.has(name)) tables.set(name, []);
      tables.get(name).push(rel);
    }
    for (const name of refs.rpcs) {
      if (!rpcs.has(name)) rpcs.set(name, []);
      rpcs.get(name).push(rel);
    }
  }
  return { files: files.length, tables, rpcs };
}

function reportMissing(kind, missing, refs) {
  for (const name of missing) {
    const where = (refs.get(name) || []).slice(0, 3).join(', ');
    console.error(`  missing ${kind} ${name}  (${where})`);
  }
}

async function main() {
  const allow = loadAllowlist();
  const scanned = scan();
  console.log(
    `Scanned ${scanned.files} files: ${scanned.tables.size} tables, ${scanned.rpcs.size} rpcs`,
  );

  const [catalog, funcs, triggerGaps] = await Promise.all([
    runQuery(`
      select c.relname as name
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'v', 'm', 'p', 'f')
    `),
    runQuery(`
      select p.proname as name
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
    `),
    runQuery(`
      select c.relname as table_name, t.tgname as trigger_name
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_proc p on p.oid = t.tgfoid
      where n.nspname = 'public'
        and not t.tgisinternal
        and p.proname = 'update_brain_training_updated_at'
        and not exists (
          select 1 from information_schema.columns col
          where col.table_schema = 'public'
            and col.table_name = c.relname
            and col.column_name = 'updated_at'
        )
    `),
  ]);

  const prodTables = new Set(catalog.map((row) => row.name));
  const prodFuncs = new Set(funcs.map((row) => row.name));
  const failures = [];

  const missingTables = [...scanned.tables.keys()]
    .filter((name) => !prodTables.has(name) && !allow.tables.has(name))
    .sort();
  const missingRpcs = [...scanned.rpcs.keys()]
    .filter((name) => !prodFuncs.has(name) && !allow.rpcs.has(name))
    .sort();
  const staleTables = [...allow.tables].filter((name) => prodTables.has(name)).sort();
  const staleRpcs = [...allow.rpcs].filter((name) => prodFuncs.has(name)).sort();

  if (missingTables.length || missingRpcs.length) {
    console.error('Referenced objects missing in prod:');
    reportMissing('table', missingTables, scanned.tables);
    reportMissing('rpc', missingRpcs, scanned.rpcs);
    failures.push('missing objects');
  }
  if (staleTables.length || staleRpcs.length) {
    console.error('Allowlist entries that now exist — delete them:');
    for (const name of staleTables) console.error(`  table:${name}`);
    for (const name of staleRpcs) console.error(`  rpc:${name}`);
    failures.push('stale allowlist');
  }
  if (triggerGaps.length) {
    console.error('BEFORE UPDATE trigger sets updated_at on a table without that column:');
    for (const row of triggerGaps) {
      console.error(`  ${row.table_name}.${row.trigger_name}`);
    }
    failures.push('updated_at trigger gap');
  }

  if (failures.length) {
    console.error(`Schema drift check failed (${failures.join(', ')}).`);
    process.exit(1);
  }
  console.log(`Schema drift check passed against ${PROJECT_REF}.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
