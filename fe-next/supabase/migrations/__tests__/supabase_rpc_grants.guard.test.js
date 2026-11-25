/**
 * Supabase security advisor (2026-11-25): SECURITY DEFINER functions callable over
 * /rest/v1/rpc by anon/authenticated, and public._migrations created without RLS.
 */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..');
const sql = (() => {
  const file = path.join(dir, '20261125180000_lock_down_definer_rpc_grants.sql');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
})();
const runner = fs.readFileSync(path.join(dir, 'run-migrations.js'), 'utf8');

const SERVER_ONLY = [
  'add_league_xp(uuid, integer)',
  'admin_activity_stats()',
  'admin_bulk_ban_players(uuid[], text, uuid)',
  'admin_cohort_retention(integer)',
  'admin_engagement_funnel()',
  'admin_language_breakdown()',
  'admin_overview_stats()',
  'award_ad_coins(uuid, integer, text, jsonb, integer)',
  'award_coins(uuid, integer, text, jsonb)',
  'block_word_bank_word(text, text, uuid, text)',
  'bulk_update_word_bank_validation(uuid[], text)',
  'claim_boost(uuid, text, text)',
  'claim_season_rewards(uuid, integer, integer, text[])',
  'grant_offerwall_coins(text, uuid, integer, numeric, boolean, text, text, text, jsonb)',
  'increment_ghost_rival_score(uuid, date, integer)',
  'increment_profile_xp(uuid, integer)',
  'mark_word_promoted_to_dictionary(uuid)',
  'process_season_reset(integer)',
  'purchase_collectible(uuid, text)',
  'record_level_attempt(uuid, integer, integer, integer, integer, integer, jsonb, boolean)',
  'record_word_mastery_event(uuid, text, text, text, boolean, integer)',
  'reset_weekly_club_xp()',
  'snapshot_db_perf_top_queries()',
  'snapshot_realtime_publication()',
  'auto_remediate_realtime_publication()',
  'sync_coins(uuid, integer, text, jsonb)',
  'update_buzz_streak(uuid, date)',
];

// Called with a user's JWT (browser or a route using the session client), or by RLS policies.
const MUST_STAY_CALLABLE = [
  'increment_player_xp',
  'award_education_xp',
  'apply_prestige',
  'calculate_lesson_mastery',
  'lookup_classroom_by_join_code',
  'claim_admin_gift',
  'classroom_consent_status',
  'upsert_push_token',
  'get_leaderboard',
  'get_past_season_leaderboard',
  'flagged_vocabulary_lesson_ids',
  'is_admin_user',
  'is_classroom_member',
  'is_classroom_owner',
  'is_language_curator',
  'is_lesson_owner',
  'is_teacher_of_student',
  'has_lesson_access',
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('lock down SECURITY DEFINER rpc grants', () => {
  it.each(SERVER_ONLY)('revokes %s from PUBLIC, anon and authenticated', (sig) => {
    expect(sql).toMatch(new RegExp(`revoke execute on function public\\.${escape(sig)} from public, anon, authenticated;`, 'i'));
  });

  it.each(SERVER_ONLY)('keeps %s executable by service_role', (sig) => {
    expect(sql).toMatch(new RegExp(`grant execute on function public\\.${escape(sig)} to service_role;`, 'i'));
  });

  it.each(MUST_STAY_CALLABLE)('does not revoke %s', (name) => {
    expect(sql).not.toMatch(new RegExp(`revoke execute on function public\\.${name}\\(`, 'i'));
  });

  it.each(['bump_vocabulary_lesson_stat(uuid, text)', 'report_vocabulary_lesson(uuid, text, text)'])(
    'takes %s away from logged-out callers only',
    (sig) => {
      expect(sql).toMatch(new RegExp(`revoke execute on function public\\.${escape(sig)} from public, anon;`, 'i'));
      expect(sql).toMatch(new RegExp(`grant execute on function public\\.${escape(sig)} to authenticated, service_role;`, 'i'));
    },
  );

  it('limits get_web_vitals_stats to admins', () => {
    expect(sql).toMatch(/function public\.get_web_vitals_stats[\s\S]*?if not public\.is_admin_user\(\) then[\s\S]*?raise exception/i);
  });

  it('never grants writes on public_profiles', () => {
    expect(sql).toMatch(/revoke insert, update, delete, truncate on public\.public_profiles from public, anon, authenticated;/i);
  });
});

describe('every public table gets RLS', () => {
  it('locks down the _migrations ledger', () => {
    expect(sql).toMatch(/revoke all on public\._migrations from public, anon, authenticated;/i);
    expect(sql).toMatch(/alter table public\._migrations enable row level security;/i);
  });

  it('the migration runner creates _migrations with RLS on', () => {
    expect(runner).toMatch(/CREATE TABLE IF NOT EXISTS \$\{MIGRATIONS_TABLE\}[\s\S]*?ENABLE ROW LEVEL SECURITY/);
    expect(runner).toMatch(/REVOKE ALL ON \$\{MIGRATIONS_TABLE\} FROM PUBLIC, anon, authenticated/);
  });

  it('every migration from 2026-11-25 on that creates a public table enables RLS on it', () => {
    const files = fs.readdirSync(dir).filter((f) => /^\d+_.+\.sql$/.test(f) && f >= '20261125');
    const missing = [];
    for (const f of files) {
      const body = fs.readFileSync(path.join(dir, f), 'utf8');
      for (const m of body.matchAll(/create table (?:if not exists )?(?:public\.)?"?(\w+)"?/gi)) {
        const rls = new RegExp(`alter table (?:if exists )?(?:public\\.)?"?${m[1]}"? enable row level security`, 'i');
        if (!rls.test(body)) missing.push(`${f}: ${m[1]}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
