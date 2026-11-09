import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

// A database rebuilt from supabase/migrations (a Supabase branch, a local
// stack, a restore) must be able to sign a teacher up and let a student join
// a class. These objects lived only on prod until 20261109170000.
const root = path.resolve(__dirname, '../../..');
const dir = path.join(root, 'supabase/migrations');
const allSql = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => fs.readFileSync(path.join(dir, f), 'utf8').replace(/--.*$/gm, ''))
  .join('\n');

const definedFunctions = new Set(
  [...allSql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?"?([a-z_0-9]+)"?\s*\(/gi)].map((m) =>
    m[1].toLowerCase(),
  ),
);

function walk(d: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) {
      if (e.name === '__tests__' || e.name === 'node_modules') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
  }
  return out;
}

const educationSources = ['app/api/education', 'lib/education', 'lib/supabase/education']
  .map((d) => path.join(root, d))
  .filter((d) => fs.existsSync(d))
  .flatMap((d) => walk(d));

const educationRpcs = new Set(
  educationSources.flatMap((f) =>
    [...fs.readFileSync(f, 'utf8').matchAll(/\.rpc(?:<[^>]*>)?\(\s*['"`]([a-z_0-9]+)['"`]/g)].map((m) => m[1]),
  ),
);

describe('Education schema is rebuildable from migrations', () => {
  it('finds the Education RPC call sites it guards', () => {
    expect(educationRpcs.has('lookup_classroom_by_join_code')).toBe(true);
  });

  it('defines every RPC the Education routes call', () => {
    const missing = [...educationRpcs].filter((name) => !definedFunctions.has(name)).sort();
    expect(missing).toEqual([]);
  });

  it('wires handle_new_user to auth.users so signups get a profile', () => {
    expect(definedFunctions.has('handle_new_user')).toBe(true);
    expect(allSql).toMatch(
      /create\s+trigger\s+on_auth_user_created\s+after\s+insert\s+on\s+auth\.users\s+for\s+each\s+row\s+execute\s+(?:function|procedure)\s+public\.handle_new_user\(\)/i,
    );
  });

  it('defines get_current_season_id, which every profile insert depends on', () => {
    expect(definedFunctions.has('get_current_season_id')).toBe(true);
  });
});
