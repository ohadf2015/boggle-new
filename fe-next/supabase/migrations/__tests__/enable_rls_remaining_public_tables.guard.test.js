/**
 * Guards the fix for Supabase advisor `rls_disabled_in_public` (2026-09-27):
 * admin_alerts, game_audit_log and seasons were created without RLS.
 */
const fs = require('fs');
const path = require('path');

const migrationPath = path.join(__dirname, '../20260929100000_enable_rls_remaining_public_tables.sql');

describe('enable RLS on remaining public tables', () => {
  const sql = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, 'utf8') : '';

  it.each(['admin_alerts', 'game_audit_log', 'seasons'])('enables RLS on %s', (table) => {
    expect(sql).toMatch(new RegExp(`ALTER TABLE public\\.${table}\\s+ENABLE ROW LEVEL SECURITY`, 'i'));
  });

  it('restricts admin_alerts to admins', () => {
    expect(sql).toMatch(/ON public\.admin_alerts[\s\S]*?is_admin/i);
  });

  it('lets anyone read seasons but grants no write policy', () => {
    expect(sql).toMatch(/ON public\.seasons\s+FOR SELECT/i);
    expect(sql).not.toMatch(/ON public\.seasons\s+FOR (INSERT|UPDATE|DELETE|ALL)/i);
  });

  it('adds no anon/public policy to game_audit_log (service role only)', () => {
    expect(sql).not.toMatch(/ON public\.game_audit_log/i);
  });
});
