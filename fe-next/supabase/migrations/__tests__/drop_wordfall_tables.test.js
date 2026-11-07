const fs = require('fs');
const path = require('path');

const sql = fs.readFileSync(
  path.join(__dirname, '..', '20261107120000_drop_wordfall_tables.sql'),
  'utf8',
);

describe('20261107120000_drop_wordfall_tables', () => {
  it('builds the backup only inside a guard, so a rerun after the drop does not fail', () => {
    const guard = sql.indexOf("to_regclass('public.blast_progress') IS NOT NULL");
    const select = sql.indexOf('FROM public.blast_progress t');
    expect(guard).toBeGreaterThan(-1);
    expect(select).toBeGreaterThan(guard);
    expect(sql).toMatch(/EXECUTE \$sql\$[\s\S]*FROM public\.blast_progress t[\s\S]*\$sql\$;/);
  });

  it('drops with IF EXISTS', () => {
    for (const t of ['blast_level_clears', 'blast_chests', 'blast_progress']) {
      expect(sql).toContain(`DROP TABLE IF EXISTS public.${t};`);
    }
  });
});
