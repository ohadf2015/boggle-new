/**
 * Word Pact Manager
 * Social commitment feature: two friends form a pact to play daily.
 * Both play = 1.5x XP next day. Only one plays = 2.0x for the active player.
 */

import { getSupabase } from './supabaseServer';
import logger from '../utils/logger';

export interface WordPact {
  id: string;
  player1_id: string;
  player2_id: string;
  player1_played_today: boolean;
  player2_played_today: boolean;
  last_reset_date: string;
  active: boolean;
  streak: number;
  created_at: string;
}

export interface PactWithFriend extends WordPact {
  friendId: string;
  friendUsername: string;
  friendAvatar: string | null;
}

export interface PactPlayResult {
  pact: WordPact;
  multiplier: number;
}

const TABLE = 'word_pacts';

/**
 * Compute multiplier for a player based on who played today.
 * Both played = 1.5, only you = 2.0, only partner or neither = 1.0
 */
export function computeMultiplier(youPlayed: boolean, partnerPlayed: boolean): number {
  if (youPlayed && partnerPlayed) return 1.5;
  if (youPlayed && !partnerPlayed) return 2.0;
  return 1.0;
}

/** Create a pact between two players. Limit 1 active pact per player. */
export async function createPact(playerId: string, friendId: string): Promise<WordPact> {
  const supabase = getSupabase()!;

  // Check neither player already has an active pact
  const { data: existing } = await supabase
    .from(TABLE)
    .select('id')
    .eq('active', true)
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId},player1_id.eq.${friendId},player2_id.eq.${friendId}`);

  if (existing && existing.length > 0) {
    throw new Error('ALREADY_IN_PACT');
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      player1_id: playerId,
      player2_id: friendId,
      active: true,
      streak: 0,
      player1_played_today: false,
      player2_played_today: false,
    })
    .select()
    .single();

  if (error) {
    logger.error('PACT', 'Failed to create word pact', { error, playerId, friendId });
    throw new Error('PACT_CREATE_FAILED');
  }

  return data as WordPact;
}

/** Get a player's active pact with friend profile info. */
export async function getPact(playerId: string): Promise<PactWithFriend | null> {
  const supabase = getSupabase()!;

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('active', true)
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .single();

  if (error || !data) return null;

  const pact = data as WordPact;
  const friendId = pact.player1_id === playerId ? pact.player2_id : pact.player1_id;

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_image')
    .eq('id', friendId)
    .single();

  return {
    ...pact,
    friendId,
    friendUsername: profile?.username ?? 'Unknown',
    friendAvatar: profile?.avatar_image ?? null,
  };
}

/** Mark current player as having played today. Auto-resets if new day. */
export async function recordPactPlay(playerId: string): Promise<PactPlayResult | null> {
  const supabase = getSupabase()!;

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('active', true)
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
    .single();

  if (error || !data) return null;

  const pact = data as WordPact;
  const today = new Date().toISOString().split('T')[0];

  // Reset if new day
  if (pact.last_reset_date !== today) {
    const bothPlayedYesterday = pact.player1_played_today && pact.player2_played_today;
    const newStreak = bothPlayedYesterday ? pact.streak + 1 : 0;

    await supabase
      .from(TABLE)
      .update({
        player1_played_today: false,
        player2_played_today: false,
        last_reset_date: today,
        streak: newStreak,
      })
      .eq('id', pact.id);

    pact.player1_played_today = false;
    pact.player2_played_today = false;
    pact.streak = newStreak;
    pact.last_reset_date = today;
  }

  const isPlayer1 = pact.player1_id === playerId;
  const updateField = isPlayer1 ? 'player1_played_today' : 'player2_played_today';

  await supabase.from(TABLE).update({ [updateField]: true }).eq('id', pact.id);

  if (isPlayer1) pact.player1_played_today = true;
  else pact.player2_played_today = true;

  const youPlayed = isPlayer1 ? pact.player1_played_today : pact.player2_played_today;
  const partnerPlayed = isPlayer1 ? pact.player2_played_today : pact.player1_played_today;

  return {
    pact,
    multiplier: computeMultiplier(youPlayed, partnerPlayed),
  };
}

/** Reset daily play flags. Called by cron or on first access each day. */
export async function resetDailyPacts(): Promise<number> {
  const supabase = getSupabase()!;
  const today = new Date().toISOString().split('T')[0];

  const { data: stalePacts } = await supabase
    .from(TABLE)
    .select('id, player1_played_today, player2_played_today, streak')
    .eq('active', true)
    .neq('last_reset_date', today);

  if (!stalePacts || stalePacts.length === 0) return 0;

  for (const pact of stalePacts) {
    const bothPlayed = pact.player1_played_today && pact.player2_played_today;
    await supabase
      .from(TABLE)
      .update({
        player1_played_today: false,
        player2_played_today: false,
        last_reset_date: today,
        streak: bothPlayed ? pact.streak + 1 : 0,
      })
      .eq('id', pact.id);
  }

  logger.info('PACT', 'Daily pact reset', { count: stalePacts.length });
  return stalePacts.length;
}

/** Dissolve a player's active pact. */
export async function dissolvePact(playerId: string): Promise<boolean> {
  const supabase = getSupabase()!;

  const { error } = await supabase
    .from(TABLE)
    .update({ active: false })
    .eq('active', true)
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`);

  if (error) {
    logger.error('PACT', 'Failed to dissolve pact', { error, playerId });
    return false;
  }

  return true;
}
