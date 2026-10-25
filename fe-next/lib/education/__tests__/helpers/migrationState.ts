import fs from 'fs';
import path from 'path';

export const MIGRATIONS_DIR = path.resolve(__dirname, '../../../../supabase/migrations');

export interface MigrationStatement {
  file: string;
  sql: string;
}

function stripComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = '';
  let dollarTag: string | null = null;
  let inQuote = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (!inQuote && ch === '$') {
      const m = /^\$[A-Za-z_]*\$/.exec(sql.slice(i));
      if (m) {
        if (dollarTag === null) dollarTag = m[0];
        else if (dollarTag === m[0]) dollarTag = null;
        buf += m[0];
        i += m[0].length - 1;
        continue;
      }
    }
    if (dollarTag === null && ch === "'") inQuote = !inQuote;
    if (dollarTag === null && !inQuote && ch === ';') {
      if (buf.trim()) out.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/** Every SQL statement in every migration, in apply order. */
export function allStatements(): MigrationStatement[] {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  return files.flatMap((file) =>
    splitStatements(stripComments(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'))).map((sql) => ({
      file,
      sql: sql.replace(/\s+/g, ' ').toLowerCase(),
    })),
  );
}

const ident = (name: string) => `(?:public\\.)?"?${name}"?`;

export interface ViewState {
  securityInvoker: boolean;
  anonHasAccess: boolean;
  lastFile: string | null;
}

/**
 * Replays CREATE/ALTER VIEW and GRANT/REVOKE for one view. A plain re-CREATE
 * resets reloptions and Supabase re-grants anon by default privileges, which is
 * how a recreated view silently loses security_invoker and gains anon reads.
 */
export function finalViewState(view: string, statements = allStatements()): ViewState {
  const state: ViewState = { securityInvoker: false, anonHasAccess: false, lastFile: null };
  const create = new RegExp(`^create (?:or replace )?view ${ident(view)}(?:\\s|\\()`);
  const alterInvoker = new RegExp(`^alter view (?:if exists )?${ident(view)} set \\(\\s*security_invoker\\s*=\\s*(true|on|false|off)`);
  const grantAnon = new RegExp(`^grant .* on (?:table )?${ident(view)} to .*\\banon\\b`);
  const revokeAnon = new RegExp(`^revoke (all|select)(?: privileges)? on (?:table )?${ident(view)} from .*\\banon\\b`);
  for (const s of statements) {
    if (create.test(s.sql)) {
      const head = s.sql.split(/\sas\s/)[0];
      state.securityInvoker = /security_invoker\s*=\s*(true|on)/.test(head);
      state.anonHasAccess = true;
      state.lastFile = s.file;
    } else if (alterInvoker.test(s.sql)) {
      const v = alterInvoker.exec(s.sql)![1];
      state.securityInvoker = v === 'true' || v === 'on';
      state.lastFile = s.file;
    } else if (revokeAnon.test(s.sql)) {
      state.anonHasAccess = false;
    } else if (grantAnon.test(s.sql)) {
      state.anonHasAccess = true;
    }
  }
  return state;
}

export interface PolicyState {
  name: string;
  table: string;
  sql: string;
  file: string;
}

/** Policies on a table that survive every later DROP POLICY. */
export function finalPolicies(table: string, statements = allStatements()): PolicyState[] {
  const live = new Map<string, PolicyState>();
  const create = new RegExp(`^create policy "?([^"]+?)"? on ${ident(table)}(?:\\s|$)`);
  const drop = new RegExp(`^drop policy (?:if exists )?"?([^"]+?)"? on ${ident(table)}(?:\\s|$)`);
  for (const s of statements) {
    const c = create.exec(s.sql);
    if (c) {
      live.set(c[1].trim(), { name: c[1].trim(), table, sql: s.sql, file: s.file });
      continue;
    }
    const d = drop.exec(s.sql);
    if (d) live.delete(d[1].trim());
  }
  return [...live.values()];
}

/** Triggers on a table that survive every later DROP TRIGGER. */
export function finalTriggers(table: string, statements = allStatements()): PolicyState[] {
  const live = new Map<string, PolicyState>();
  const create = new RegExp(`^create (?:or replace )?(?:constraint )?trigger "?(\\w+)"? .* on ${ident(table)}(?:\\s|$)`);
  const drop = new RegExp(`^drop trigger (?:if exists )?"?(\\w+)"? on ${ident(table)}(?:\\s|$)`);
  for (const s of statements) {
    const c = create.exec(s.sql);
    if (c) {
      live.set(c[1], { name: c[1], table, sql: s.sql, file: s.file });
      continue;
    }
    const d = drop.exec(s.sql);
    if (d) live.delete(d[1]);
  }
  return [...live.values()];
}

/** A client-reachable write policy: INSERT/UPDATE/ALL not limited to service_role. */
export function isClientWritePolicy(p: PolicyState): boolean {
  if (!/\bfor (insert|update|all)\b/.test(p.sql)) return false;
  return !/\bto service_role\b/.test(p.sql);
}
