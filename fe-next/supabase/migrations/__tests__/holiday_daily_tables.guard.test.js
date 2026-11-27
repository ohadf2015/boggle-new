const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..');
const file = fs.readdirSync(dir).find((f) => f.endsWith('_holiday_daily_tables.sql'));
const sql = file ? fs.readFileSync(path.join(dir, file), 'utf8') : '';
const TABLES = ['holiday_daily_results', 'holiday_tables', 'holiday_table_members', 'holiday_rescues'];

describe('holiday daily + tables migration', () => {
  it('Given the migration, then it runs after the progress table it alters', () => {
    const progress = fs.readdirSync(dir).find((f) => f.endsWith('_holiday_event_progress.sql'));
    expect(file > progress).toBe(true);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'game'/);
  });

  it('Given each table, then RLS is on, players only read, and only the service role writes', () => {
    for (const t of TABLES) {
      expect(sql).toMatch(new RegExp(`ALTER TABLE public\\.${t} ENABLE ROW LEVEL SECURITY`));
      expect(sql).toMatch(new RegExp(`CREATE POLICY ${t}_select_own ON public\\.${t}\\s+FOR SELECT TO authenticated`));
    }
    expect(sql).not.toMatch(/FOR (INSERT|UPDATE|DELETE|ALL)/i);
    expect(sql).toMatch(/REVOKE ALL ON[\s\S]+FROM PUBLIC, anon, authenticated/);
  });

  it('Given the one-per-day rules, then keys make settlement, membership and rescue idempotent', () => {
    expect(sql).toMatch(/PRIMARY KEY \(user_id, event_key, puzzle_date\)/);
    expect(sql).toMatch(/UNIQUE \(user_id, event_key\)/);
    expect(sql).toMatch(/PRIMARY KEY \(inviter_id, event_key, day_index\)/);
    expect(sql).toMatch(/CHECK \(inviter_id <> friend_id\)/);
  });

  it('Given realtime discipline, then nothing is published', () => {
    expect(sql).not.toMatch(/supabase_realtime/i);
  });
});
