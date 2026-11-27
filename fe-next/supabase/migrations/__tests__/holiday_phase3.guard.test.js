const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..');
const file = fs.readdirSync(dir).find((f) => f.endsWith('_holiday_phase3.sql'));
const sql = file ? fs.readFileSync(path.join(dir, file), 'utf8') : '';
const TABLES = ['holiday_event_claims', 'holiday_day_games', 'holiday_hunt_finds', 'holiday_egg_finds'];

describe('holiday phase 3 migration', () => {
  it('Given the migration, then each table is keyed so a reward or find is stored once', () => {
    expect(file).toBeTruthy();
    expect(sql).toMatch(/PRIMARY KEY \(user_id, event_key, kind\)/);
    expect(sql).toMatch(/PRIMARY KEY \(user_id, event_key, played_on\)/);
    expect(sql).toMatch(/PRIMARY KEY \(user_id, event_key, find_date\)/);
    expect(sql).toMatch(/PRIMARY KEY \(user_id, event_key, egg_id\)/);
  });

  it.each(TABLES)('Given %s, then players only read their own rows and only the service role writes', (t) => {
    expect(sql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS public\\.${t}`));
    expect(sql).toMatch(new RegExp(`ALTER TABLE public\\.${t} ENABLE ROW LEVEL SECURITY`));
    expect(sql).toMatch(new RegExp(`REVOKE ALL ON public\\.${t} FROM PUBLIC, anon, authenticated`));
    expect(sql).toMatch(new RegExp(`GRANT SELECT ON public\\.${t} TO authenticated`));
    expect(sql).toMatch(new RegExp(`CREATE POLICY ${t}_select_own ON public\\.${t}\\s+FOR SELECT TO authenticated USING \\(\\(select auth\\.uid\\(\\)\\) = user_id\\)`));
  });

  it('Given write discipline and realtime discipline, then no write policy and no publication', () => {
    expect(sql).not.toMatch(/FOR (INSERT|UPDATE|DELETE|ALL)/i);
    expect(sql).not.toMatch(/supabase_realtime/i);
  });
});
