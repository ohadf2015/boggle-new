import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';

const root = path.resolve(__dirname, '../../..');
const sql = fs.readFileSync(path.join(root, 'supabase/migrations/20261026233000_external_identities.sql'), 'utf8');
const code = sql.replace(/--.*$/gm, '');

describe('external_identities migration', () => {
  it('is re-runnable: every create is guarded', () => {
    expect(code).toMatch(/create table if not exists public\.external_identities/i);
    const indexes = [...code.matchAll(/create\s+(?:unique\s+)?index\s+[^\n]*/gi)].map((m) => m[0]);
    expect(indexes.length).toBe(2);
    for (const line of indexes) expect(line).toMatch(/index if not exists/i);
    const policies = [...code.matchAll(/create policy "([^"]+)"/gi)].map((m) => m[1]);
    expect(policies.length).toBeGreaterThan(0);
    for (const name of policies) expect(code).toContain(`drop policy if exists "${name}"`);
  });

  it('is additive only: no drops of tables or columns, no data rewrites', () => {
    expect(code).not.toMatch(/drop\s+(table|column|function|index)/i);
    expect(code).not.toMatch(/\b(update|delete\s+from|truncate)\s+public\./i);
    expect(code).not.toMatch(/alter\s+publication/i);
  });

  it('cascades from auth.users and pins the allowed providers', () => {
    expect(code).toMatch(/user_id uuid not null references auth\.users\(id\) on delete cascade/i);
    expect(code).toMatch(/check \(provider in \('google', 'microsoft', 'clever', 'classlink', 'canvas'\)\)/i);
    expect(code).toMatch(/unique \(provider, external_id\)/i);
  });

  it('keeps a hash, not a raw email', () => {
    expect(code).toMatch(/email_hash text/i);
    expect(code).not.toMatch(/\bemail text/i);
    expect(code).toMatch(/email_hash ~ '\^\[0-9a-f\]\{64\}\$'/);
  });

  it('turns RLS on with one own-row select policy and no client writes', () => {
    expect(code).toMatch(/alter table public\.external_identities enable row level security/i);
    expect(code).toMatch(/for select\s+to authenticated\s+using \(user_id = \(select auth\.uid\(\)\)\)/i);
    expect(code).not.toMatch(/for (insert|update|delete|all)/i);
    expect(code).toMatch(/revoke all on public\.external_identities from anon/i);
    expect(code).toMatch(/revoke insert, update, delete on public\.external_identities from authenticated/i);
  });
});
