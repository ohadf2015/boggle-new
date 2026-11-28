import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const sql = readFileSync(
  join(__dirname, '../../../supabase/migrations/20261128180000_admin_drilldown_tz_and_daily_summary_jerusalem.sql'),
  'utf8',
);

describe('admin drilldown timezone and daily summary Jerusalem migration', () => {
  it('is a function-only replacement', () => {
    expect(sql).toMatch(/Function bodies only/);
    expect(sql).not.toMatch(/\b(DELETE|UPDATE|INSERT|TRUNCATE|DROP TABLE|ALTER TABLE)\b/i);
  });

  it('buckets signup weeks in the viewer timezone with a UTC default', () => {
    expect(sql).toMatch(/admin_drilldown\(kind text, week date DEFAULT NULL, p_tz text DEFAULT 'UTC'\)/);
    expect(sql).toContain("date_trunc('week', p.created_at AT TIME ZONE tz)::date = week");
    expect(sql).toContain('admin_resolve_timezone(p_tz)');
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.admin_drilldown\(text, date, text\) FROM PUBLIC, anon, authenticated/);
  });

  it('counts each admin summary day in Asia/Jerusalem', () => {
    expect(sql).toContain("p_day::timestamp AT TIME ZONE 'Asia/Jerusalem'");
    expect(sql).toContain("(p_day + 1)::timestamp AT TIME ZONE 'Asia/Jerusalem'");
    expect(sql).toContain("(p_day - 1)::timestamp AT TIME ZONE 'Asia/Jerusalem'");
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.admin_daily_summary\(date\) FROM PUBLIC, anon, authenticated/);
  });
});
