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

describe('holiday arcade family games migration', () => {
  const famFile = fs.readdirSync(dir).find((f) => f.endsWith('_holiday_arcade_family.sql'));
  const fam = famFile ? fs.readFileSync(path.join(dir, famFile), 'utf8') : '';

  it('Given the family games, then the rounds table accepts their ids alongside the word games', () => {
    expect(famFile).toBeTruthy();
    expect(famFile > file).toBe(true);
    expect(fam).toMatch(/DROP CONSTRAINT IF EXISTS holiday_arcade_rounds_game_check/);
    for (const id of ['oil', 'dreidel', 'sufganiyah', 'sleigh', 'snowball', 'wrap', 'latke', 'spin', 'presents', 'splat']) {
      expect(fam).toMatch(new RegExp(`'${id}'`));
    }
    expect(fam).not.toMatch(/supabase_realtime/i);
  });
});
