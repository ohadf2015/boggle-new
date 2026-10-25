import fs from 'fs';
import path from 'path';
import {
  allStatements,
  finalPolicies,
  finalTriggers,
  isClientWritePolicy,
  MIGRATIONS_DIR,
} from './helpers/migrationState';

// Rows in these tables grant Teacher Pro or teacher access. A client-writable
// policy on any of them is only safe when an insert/update guard trigger
// rewrites the granting columns.
const ENTITLEMENT_TABLES = [
  'teacher_access_requests',
  'teacher_access_allowlist',
  'subscriptions',
  'subscription_events',
  'teacher_pro_grants',
];

const adminOnly = (sql: string) => /is_admin_user\(\)/.test(sql) && !/\bor\b/.test(sql.split(/\busing\b|\bwith check\b/)[1] ?? '');

describe('entitlement tables stay unwritable by clients', () => {
  const statements = allStatements();

  it.each(ENTITLEMENT_TABLES)('%s: every client write policy is admin-only or guarded', (table) => {
    const guards = finalTriggers(table, statements).filter((t) => /before insert/.test(t.sql));
    const open = finalPolicies(table, statements).filter((p) => isClientWritePolicy(p) && !adminOnly(p.sql));
    if (open.length > 0) {
      expect({ table, open: open.map((p) => p.name), guards: guards.map((g) => g.name) }).toEqual({
        table,
        open: open.map((p) => p.name),
        guards: expect.arrayContaining([expect.stringMatching(/guard/)]),
      });
    }
  });

  it('flags an open insert policy that has no guard trigger', () => {
    const replay = [
      { file: 'a', sql: 'create policy p on public.teacher_access_requests for insert with check (true)' },
    ];
    const open = finalPolicies('teacher_access_requests', replay).filter(isClientWritePolicy);
    expect(open).toHaveLength(1);
    expect(finalTriggers('teacher_access_requests', replay)).toHaveLength(0);
  });

  describe('access-request insert guard', () => {
    const file = fs.readdirSync(MIGRATIONS_DIR).sort().reverse().find((f) => /access_request.*guard|guard.*access_request/.test(f));
    const sql = file ? fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8').toLowerCase() : '';

    it('exists', () => expect(file).toBeDefined());

    it('only rewrites direct client writes', () => {
      expect(sql).toMatch(/current_user not in \('authenticated', 'anon'\)/);
    });

    it.each([
      ["status", "'pending'"],
      ['trial_expires_at', 'null'],
      ['reviewed_at', 'null'],
      ['reviewed_by', 'null'],
      ['admin_note', 'null'],
      ['user_id', 'auth.uid()'],
      ['trial_reminders_sent', "'{}'"],
      ['activation_nudges_sent', "'{}'"],
    ])('forces %s on insert', (col, value) => {
      expect(sql).toContain(`new.${col} := ${value}`);
    });

    it('runs before insert', () => {
      expect(sql).toMatch(/before insert on public\.teacher_access_requests/);
    });
  });
});
