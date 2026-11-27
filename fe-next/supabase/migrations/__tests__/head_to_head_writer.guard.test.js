const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(path.join(__dirname, '../20261030160000_head_to_head_writer.sql'), 'utf8');

describe('head_to_head writer migration', () => {
  it('removes direct player writes', () => {
    expect(sql).toMatch(/DROP POLICY IF EXISTS "Authenticated users can insert h2h records"/);
    expect(sql).toMatch(/DROP POLICY IF EXISTS "Authenticated users can update h2h records"/);
  });

  it('lets only the server call the writer', () => {
    expect(sql).toMatch(/SECURITY INVOKER/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.record_head_to_head_results\(jsonb\) FROM PUBLIC, anon, authenticated;/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.record_head_to_head_results\(jsonb\) TO service_role;/);
  });

  it('increments counters atomically instead of overwriting them', () => {
    expect(sql).toMatch(/ON CONFLICT \(player1_id, player2_id\) DO UPDATE/);
    for (const col of ['player1_wins', 'player2_wins', 'draws', 'player1_total_score', 'player2_total_score']) {
      expect(sql).toMatch(new RegExp(`${col} = COALESCE\\(h\\.${col}, 0\\) \\+ EXCLUDED\\.${col}`));
    }
    expect(sql).toMatch(/total_games = COALESCE\(h\.total_games, 0\) \+ 1/);
  });

  it('never records test accounts', () => {
    expect(sql.match(/NOT COALESCE\(p[12]\.is_test_account, false\)/g)).toHaveLength(2);
  });
});
