import type { SupabaseClient } from '@supabase/supabase-js';
import { loadRankedDailyBoard } from '@/lib/daily/loadDailyBoard';
import { fetchGhostRivals } from '@/lib/quickPlay/fetchGhostRivals';
import { latestPingFrom } from './pings';
import { leagueWeekStartIso, loadLeagueNeighbors } from './leagueRivals';
import type { H2HRow } from './pickers';
import type { RivalDeps, RivalProfileRow } from './resolveRival';

const H2H_LIMIT = 20;
const PROFILE_LIMIT = 120;
const FRIEND_LIMIT = 50;
const FOF_EDGE_LIMIT = 500;
const MY_GAMES_LIMIT = 50;
const CO_PLAY_ROW_LIMIT = 500;
const CO_PLAY_DAYS = 30;

/** Real data sources for the rival resolver. Every read is bounded and hits an indexed column. */
export function rivalDeps(db: SupabaseClient, onError?: RivalDeps['onError']): RivalDeps {
  return {
    onError,
    async h2hRows(me) {
      const { data, error } = await db
        .from('head_to_head')
        .select('player1_id, player2_id, player1_wins, player2_wins, draws, last_game_at')
        .or(`player1_id.eq.${me},player2_id.eq.${me}`)
        .order('last_game_at', { ascending: false })
        .limit(H2H_LIMIT);
      if (error) throw new Error(error.message);
      return (data ?? []) as H2HRow[];
    },
    async profiles(ids) {
      const { data, error } = await db
        .from('profiles')
        .select('id, username, display_name, chosen_title, current_level, avatar_config, avatar_image, country_code, language, last_seen_at')
        .in('id', ids.slice(0, PROFILE_LIMIT))
        .eq('is_test_account', false);
      if (error) throw new Error(error.message);
      return (data ?? []) as RivalProfileRow[];
    },
    async friendIds(me) {
      const { data, error } = await db
        .from('friends')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${me},friend_id.eq.${me}`)
        .limit(FRIEND_LIMIT);
      if (error) throw new Error(error.message);
      return (data ?? []).map((f: { user_id: string; friend_id: string }) => (f.user_id === me ? f.friend_id : f.user_id));
    },
    async friendsOf(ids) {
      const list = ids.join(',');
      const { data, error } = await db
        .from('friends')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.in.(${list}),friend_id.in.(${list})`)
        .limit(FOF_EDGE_LIMIT);
      if (error) throw new Error(error.message);
      const mine = new Set(ids);
      const out = new Set<string>();
      for (const f of (data ?? []) as Array<{ user_id: string; friend_id: string }>) {
        if (!mine.has(f.user_id)) out.add(f.user_id);
        if (!mine.has(f.friend_id)) out.add(f.friend_id);
      }
      return [...out];
    },
    async coPlays(me) {
      const since = new Date(Date.now() - CO_PLAY_DAYS * 86_400_000).toISOString();
      const { data: mine, error } = await db
        .from('game_results')
        .select('game_code')
        .eq('player_id', me)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(MY_GAMES_LIMIT);
      if (error) throw new Error(error.message);
      const codes = [...new Set((mine ?? []).map((r: { game_code: string | null }) => r.game_code).filter((c): c is string => !!c))];
      if (codes.length === 0) return [];
      // Room codes get reused, so the date bound matters on this side too.
      const { data, error: err2 } = await db
        .from('game_results')
        .select('player_id, game_code, created_at')
        .in('game_code', codes)
        .gte('created_at', since)
        .neq('player_id', me)
        .not('player_id', 'is', null)
        .limit(CO_PLAY_ROW_LIMIT);
      if (err2) throw new Error(err2.message);
      return (data ?? []).map((r: { player_id: string; game_code: string; created_at: string | null }) => ({ userId: r.player_id, gameCode: r.game_code, at: r.created_at }));
    },
    // Same rule as the ping gate (pingServer.checkPingAllowed): students, parental consent, blocks.
    async excludedIds(me, ids) {
      const list = ids.slice(0, PROFILE_LIMIT);
      const [students, consents, blocks] = await Promise.all([
        db.from('classroom_memberships').select('student_id').in('student_id', list).limit(PROFILE_LIMIT * 4),
        db.from('parental_consents').select('user_id').in('user_id', list).limit(PROFILE_LIMIT),
        me
          ? db.from('friends').select('user_id, friend_id').eq('status', 'blocked').or(`user_id.eq.${me},friend_id.eq.${me}`).limit(FRIEND_LIMIT * 4)
          : Promise.resolve({ data: [], error: null }),
      ]);
      const failed = students.error ?? consents.error ?? blocks.error;
      if (failed) throw new Error(failed.message);
      const out = new Set<string>();
      for (const r of (students.data ?? []) as Array<{ student_id: string }>) out.add(r.student_id);
      for (const r of (consents.data ?? []) as Array<{ user_id: string }>) out.add(r.user_id);
      for (const r of (blocks.data ?? []) as Array<{ user_id: string; friend_id: string }>) out.add(r.user_id === me ? r.friend_id : r.user_id);
      return [...out];
    },
    async dailyBoard(date, lang, caller) {
      return loadRankedDailyBoard(db, date, lang, caller);
    },
    async quickPlayGhosts(subMode, me, lang, myPct) {
      return fetchGhostRivals(db, subMode, `${me ?? 'guest'}:${Date.now()}`, (e) => onError?.('quickPlayGhosts', e), me, lang, myPct);
    },
    league: (me) => loadLeagueNeighbors(db, me),
    async weeklyGhost(me) {
      const { data, error } = await db
        .from('ghost_rivals')
        .select('rival_id, rival_score, player_score')
        .eq('player_id', me)
        .eq('week_start', leagueWeekStartIso().slice(0, 10))
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data?.rival_id) return null;
      return { rivalId: data.rival_id, rivalScore: data.rival_score ?? 0, playerScore: data.player_score ?? 0 };
    },
    latestPing: (me, them) => latestPingFrom(db, me, them),
  };
}
