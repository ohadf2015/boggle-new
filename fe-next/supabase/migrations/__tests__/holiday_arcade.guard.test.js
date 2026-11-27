const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..');
const file = fs.readdirSync(dir).find((f) => f.endsWith('_holiday_arcade.sql'));
const sql = file ? fs.readFileSync(path.join(dir, file), 'utf8') : '';

describe('holiday arcade migration', () => {
  it('Given the rounds table, then players only read their own rows and only the service role writes', () => {
    expect(file).toBeTruthy();
    expect(sql).toMatch(/ALTER TABLE public\.holiday_arcade_rounds ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/REVOKE ALL ON public\.holiday_arcade_rounds FROM PUBLIC, anon, authenticated/);
    expect(sql).toMatch(/CREATE POLICY holiday_arcade_rounds_select_own ON public\.holiday_arcade_rounds\s+FOR SELECT TO authenticated USING \(\(select auth\.uid\(\)\) = user_id\)/);
    expect(sql).not.toMatch(/CREATE POLICY[^;]*FOR (INSERT|UPDATE|DELETE|ALL)/i);
    expect(sql).not.toMatch(/supabase_realtime/i);
  });

  it('Given the settle function, then only the service role can call it and it locks per player-day', () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.holiday_arcade_settle\(uuid, uuid, integer, integer, integer\) FROM PUBLIC, anon, authenticated/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.holiday_arcade_settle\(uuid, uuid, integer, integer, integer\) TO service_role/);
    expect(sql).toMatch(/SET search_path = public, pg_temp/);
    expect(sql).toMatch(/pg_advisory_xact_lock/);
    expect(sql).toMatch(/finished_at IS NULL\s+FOR UPDATE/);
  });
});

describe('holiday arcade party games migration', () => {
  const nextFile = fs.readdirSync(dir).find((f) => f.endsWith('_holiday_arcade_party_games.sql'));
  const next = nextFile ? fs.readFileSync(path.join(dir, nextFile), 'utf8') : '';

  it('Given the six family games, then the rounds table accepts exactly their ids', () => {
    expect(nextFile).toBeTruthy();
    expect(nextFile > file).toBe(true);
    expect(next).toMatch(/DROP CONSTRAINT IF EXISTS holiday_arcade_rounds_game_check/);
    const ids = [...next.matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort();
    expect(ids).toEqual(['catch', 'dash', 'latke', 'presents', 'spin', 'splat']);
    expect(next).not.toMatch(/supabase_realtime/i);
  });
});
