const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..');
const file = fs.readdirSync(dir).find((f) => f.endsWith('_holiday_event_progress.sql'));
const sql = file ? fs.readFileSync(path.join(dir, file), 'utf8') : '';

describe('holiday_event_progress migration', () => {
  it('Given the migration, then it creates the table keyed one row per player, event and day', () => {
    expect(file).toBeTruthy();
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.holiday_event_progress/i);
    expect(sql).toMatch(/user_id\s+uuid\s+NOT NULL REFERENCES public\.profiles\(id\) ON DELETE CASCADE/i);
    expect(sql).toMatch(/PRIMARY KEY \(user_id, event_key, day_index\)/i);
    expect(sql).toMatch(/claimed_reward\s+jsonb/i);
    expect(sql).toMatch(/played_on\s+date/i);
  });

  it('Given RLS, then players read only their own rows and nobody but the service role writes', () => {
    expect(sql).toMatch(/ALTER TABLE public\.holiday_event_progress ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/REVOKE ALL ON public\.holiday_event_progress FROM PUBLIC, anon, authenticated/i);
    expect(sql).toMatch(/GRANT SELECT ON public\.holiday_event_progress TO authenticated/i);
    expect(sql).toMatch(/GRANT ALL ON public\.holiday_event_progress TO service_role/i);
    expect(sql).toMatch(/FOR SELECT\s+TO authenticated\s+USING \(\(select auth\.uid\(\)\) = user_id\)/i);
    expect(sql).not.toMatch(/FOR (INSERT|UPDATE|DELETE|ALL)/i);
  });

  it('Given realtime discipline, then the table is never published', () => {
    expect(sql).not.toMatch(/supabase_realtime/i);
  });
});
