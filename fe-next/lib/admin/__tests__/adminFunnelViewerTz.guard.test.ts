import { readFileSync } from 'fs';
import { join } from 'path';

const sql = readFileSync(
  join(__dirname, '../../../supabase/migrations/20261128120000_admin_funnel_retention_viewer_tz.sql'),
  'utf8',
);

describe('admin funnel, retention and viewer-timezone migration', () => {
  it('filters funnel and cohorts to registered, non-anonymous, non-test accounts', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.admin_engagement_funnel/);
    expect(sql).toMatch(/DROP FUNCTION IF EXISTS public\.admin_cohort_retention\(integer\)/);
    const funnel = sql.slice(sql.indexOf('admin_engagement_funnel()'));
    const funnelBody = funnel.slice(0, funnel.indexOf('GRANT EXECUTE ON FUNCTION public.admin_engagement_funnel'));
    expect(funnelBody).toMatch(/JOIN auth\.users u ON u\.id = p\.id/);
    expect(funnelBody).toMatch(/u\.is_anonymous IS NOT TRUE/);
    expect(funnelBody).toMatch(/p\.is_test_account IS NOT TRUE/);

    const cohort = sql.slice(sql.indexOf('admin_cohort_retention(weeks integer'));
    const cohortBody = cohort.slice(0, cohort.indexOf('GRANT EXECUTE ON FUNCTION public.admin_cohort_retention'));
    expect(cohortBody).toMatch(/JOIN auth\.users u ON u\.id = p\.id/);
    expect(cohortBody).toMatch(/u\.is_anonymous IS NOT TRUE/);
    expect(cohortBody).toMatch(/p\.is_test_account IS NOT TRUE/);
  });

  it('buckets activity, growth and real-game windows in a validated timezone', () => {
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION public\.admin_resolve_timezone\(p_tz text\)/);
    expect(sql).toMatch(/admin_activity_stats\(p_tz text DEFAULT 'UTC'\)/);
    expect(sql).toMatch(/admin_real_games_stats\(p_tz text DEFAULT 'UTC'\)/);
    expect(sql).toMatch(/admin_signup_growth\(weeks integer DEFAULT 26, p_tz text DEFAULT 'UTC'\)/);
    expect(sql).toMatch(/AT TIME ZONE tz\.tz/);
  });

  it('keeps the new signatures server-only', () => {
    const sigs = [
      'admin_resolve_timezone(text)',
      'admin_activity_stats(text)',
      'admin_real_games_stats(text)',
      'admin_signup_growth(integer, text)',
      'admin_cohort_retention(integer, text)',
      'admin_engagement_funnel()',
    ];
    for (const sig of sigs) {
      expect(sql).toContain(`REVOKE ALL ON FUNCTION public.${sig} FROM PUBLIC, anon, authenticated;`);
      expect(sql).toContain(`GRANT EXECUTE ON FUNCTION public.${sig} TO service_role;`);
    }
  });
});
