import type { SupabaseClient } from '@supabase/supabase-js';
import type { H2HRow } from '@/lib/rivals/pickers';
import { readServerPresence } from './serverPresence';
import type { FriendRow, FriendsHomeDeps, HomeProfileRow } from './loadFriendsHome';

const FRIEND_ROW_LIMIT = 200;
const REQUEST_LIMIT = 20;
const H2H_LIMIT = 50;
const PROFILE_LIMIT = 120;

/** Real reads for loadFriendsHome. Each is bounded and hits an indexed column. */
export function friendsHomeDeps(db: SupabaseClient): FriendsHomeDeps {
  return {
    now: () => Date.now(),
    presence: (ids) => readServerPresence(ids),
    async myProfile(me) {
      const { data, error } = await db
        .from('profiles')
        .select('birth_year, social_features_override, created_at')
        .eq('id', me)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    async friendRows(me) {
      const { data, error } = await db
        .from('friends')
        .select('id, user_id, friend_id, status, created_at')
        .or(`user_id.eq.${me},friend_id.eq.${me}`)
        .order('created_at', { ascending: false })
        .limit(FRIEND_ROW_LIMIT);
      if (error) throw new Error(error.message);
      return (data ?? []) as FriendRow[];
    },
    async incomingRequests(me) {
      const { data, error } = await db
        .from('friends')
        .select('id, user_id, friend_id, status, created_at')
        .eq('friend_id', me)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(REQUEST_LIMIT);
      if (error) throw new Error(error.message);
      return (data ?? []) as FriendRow[];
    },
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
        .select('id, username, display_name, avatar_config, avatar_image, last_seen_at, is_test_account, birth_year, social_features_override, created_at')
        .in('id', ids.slice(0, PROFILE_LIMIT));
      if (error) throw new Error(error.message);
      return (data ?? []) as HomeProfileRow[];
    },
  };
}
