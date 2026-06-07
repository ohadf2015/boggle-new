/**
 * Ghost Rival Manager
 * Weekly auto-matched skill-similar rivalry system.
 * Every week, each player gets a "Ghost Rival" with similar total_score (±20%).
 * All scores across all modes contribute to the weekly rivalry.
 */

import { getSupabase } from './supabaseServer';
import logger from '../utils/logger';
import { isPlaceholderName } from '../../lib/pushDisplayName';

/**
 * Resolve a rival's shown name. The DB default username is a `Player_<hex>`
 * placeholder (migration 20260504160000) with the real chosen name parked in
 * display_name — so prefer a real display_name, then a real username, else the
 * generic "Ghost" noun. Never leaks a raw placeholder to the widget.
 */
function rivalName(p: { display_name?: string | null; username?: string | null }): string {
  const real = (n: string | null | undefined) => (isPlaceholderName(n) ? null : (n as string).trim());
  return real(p.display_name) ?? real(p.username) ?? 'Ghost';
}

// ─── TYPES ──────────────────────────────────────────────────

export interface RivalProfile {
  id: string;
  username: string;
  avatar: string;
  score: number;
}

export interface GhostRivalStatus {
  rival: RivalProfile;
  player: { score: number };
  weekStart: string;
  weekEnd: string;
}

// ─── WEEK HELPERS ───────────────────────────────────────────

export function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getWeekEnd(): Date {
  const start = getWeekStart();
  return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
}

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}

// ─── MATCHING ───────────────────────────────────────────────

const SCORE_TOLERANCE = 0.2; // ±20%

type RivalCandidate = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_image: string;
  total_score: number;
};

/**
 * Find a skill-similar rival for the player.
 * Looks for players with total_score within ±20%, excluding self
 * and anyone already matched this week.
 *
 * Language: prefer a rival who plays the SAME language. `profiles.language` is
 * only ~40% populated, so this is a PREFERENCE with a language-agnostic
 * fallback — never a hard filter (which would starve the candidate pool). When
 * the player's own language is unknown, skip the filter entirely.
 */
async function findSkillSimilarRival(
  playerId: string,
  playerScore: number,
  weekStartDate: string,
  playerLang: string | null
): Promise<RivalCandidate | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const minScore = Math.floor(playerScore * (1 - SCORE_TOLERANCE));
  const maxScore = Math.ceil(playerScore * (1 + SCORE_TOLERANCE));

  // Find candidates within score range. Optionally constrained to one language.
  const queryCandidates = async (lang: string | null): Promise<RivalCandidate[]> => {
    let q = supabase
      .from('profiles')
      .select('id, username, display_name, avatar_image, total_score, language')
      .neq('id', playerId)
      .gte('total_score', minScore)
      .lte('total_score', maxScore);
    if (lang) q = q.eq('language', lang);
    const { data, error } = await q.order('total_score', { ascending: false }).limit(20);
    if (error) return [];
    return (data ?? []) as RivalCandidate[];
  };

  // Same-language first; fall back to any-language when the player's language is
  // unknown or no same-language candidate is in range.
  let candidates = playerLang ? await queryCandidates(playerLang) : [];
  if (candidates.length === 0) {
    candidates = await queryCandidates(null);
  }

  if (candidates.length === 0) {
    logger.debug('ghostRival', 'No candidates in score range', { playerId, minScore, maxScore });
    return null;
  }

  // Filter out players already matched this week
  const { data: alreadyMatched } = await supabase
    .from('ghost_rivals')
    .select('rival_id')
    .eq('week_start', weekStartDate);

  const matchedIds = new Set((alreadyMatched ?? []).map((r) => r.rival_id));

  const available = candidates.filter((c) => !matchedIds.has(c.id));
  if (available.length === 0) {
    // Fall back to any candidate even if matched elsewhere
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // Pick a random candidate from available pool for variety
  return available[Math.floor(Math.random() * available.length)];
}

// ─── CORE FUNCTIONS ─────────────────────────────────────────

/**
 * Get or create the weekly ghost rival for a player.
 * If already matched this week, returns existing. Otherwise finds a new match.
 */
export async function getOrCreateWeeklyRival(
  playerId: string
): Promise<GhostRivalStatus | null> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const weekStartDate = toDateString(getWeekStart());
  const weekEndDate = toDateString(getWeekEnd());

  // Check existing rivalry this week
  const { data: existing } = await supabase
    .from('ghost_rivals')
    .select('*, rival:profiles!ghost_rivals_rival_id_fkey(id, username, display_name, avatar_image, total_score)')
    .eq('player_id', playerId)
    .eq('week_start', weekStartDate)
    .single();

  if (existing?.rival) {
    return {
      rival: {
        id: existing.rival.id,
        username: rivalName(existing.rival),
        avatar: existing.rival.avatar_image ?? '',
        score: existing.rival_score ?? 0,
      },
      player: { score: existing.player_score ?? 0 },
      weekStart: weekStartDate,
      weekEnd: weekEndDate,
    };
  }

  // Get player's total score + language for matching
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_score, language')
    .eq('id', playerId)
    .single();

  const playerScore = profile?.total_score ?? 0;
  const playerLang = (profile?.language as string | null | undefined) ?? null;
  const rival = await findSkillSimilarRival(playerId, playerScore, weekStartDate, playerLang);

  if (!rival) {
    logger.debug('ghostRival', 'No rival found for player', { playerId });
    return null;
  }

  // Create the rivalry
  const { error: insertError } = await supabase
    .from('ghost_rivals')
    .insert({
      player_id: playerId,
      rival_id: rival.id,
      week_start: weekStartDate,
      player_score: 0,
      rival_score: 0,
    });

  if (insertError) {
    logger.error('ghostRival', 'Failed to create rivalry', { playerId, error: insertError });
    throw insertError;
  }

  return {
    rival: {
      id: rival.id,
      username: rivalName(rival),
      avatar: rival.avatar_image ?? '',
      score: 0,
    },
    player: { score: 0 },
    weekStart: weekStartDate,
    weekEnd: weekEndDate,
  };
}

/**
 * Add points to a player's weekly ghost rival score.
 * Called after any game mode completes.
 */
export async function updateRivalScore(
  playerId: string,
  pointsEarned: number
): Promise<{ newScore: number } | null> {
  if (pointsEarned <= 0) return null;

  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const weekStartDate = toDateString(getWeekStart());

  let data: unknown = null;
  let error: { code?: string; message?: string } | null = null;

  try {
    const result = await supabase.rpc('increment_ghost_rival_score', {
      p_player_id: playerId,
      p_week_start: weekStartDate,
      p_points: pointsEarned,
    });
    data = result.data;
    error = result.error;
  } catch (e: unknown) {
    // Newer Supabase client versions may throw instead of returning {error}
    const code = (e as { code?: string })?.code;
    error = { code: code ?? 'UNKNOWN', message: String(e) };
  }

  // Fallback: manual update if RPC doesn't exist
  // 42883 = Postgres "function does not exist"
  // PGRST202 = PostgREST "function not found in schema cache" (what Supabase actually returns)
  if (error?.code === '42883' || error?.code === 'PGRST202') {
    const { data: existing } = await supabase
      .from('ghost_rivals')
      .select('player_score')
      .eq('player_id', playerId)
      .eq('week_start', weekStartDate)
      .single();

    if (!existing) return null;

    const newScore = (existing.player_score ?? 0) + pointsEarned;
    await supabase
      .from('ghost_rivals')
      .update({ player_score: newScore })
      .eq('player_id', playerId)
      .eq('week_start', weekStartDate);

    return { newScore };
  }

  if (error) {
    logger.debug('ghostRival', 'Failed to update score (non-critical)', { playerId, pointsEarned, error });
    return null;
  }

  // RPC returns `TABLE(new_score integer)` → shape is `[{ new_score: number }]`.
  // Empty array = no matching (player_id, week_start) row (rivalry not initialized).
  const row = Array.isArray(data) ? data[0] : (data as { new_score?: number } | null);
  if (!row || typeof row.new_score !== 'number') return null;
  return { newScore: row.new_score };
}

/**
 * Get current weekly rivalry status for a player.
 */
export async function getWeeklyRivalStatus(
  playerId: string
): Promise<GhostRivalStatus | null> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not initialized');

  const weekStartDate = toDateString(getWeekStart());
  const weekEndDate = toDateString(getWeekEnd());

  const { data } = await supabase
    .from('ghost_rivals')
    .select('*, rival:profiles!ghost_rivals_rival_id_fkey(id, username, display_name, avatar_image, total_score)')
    .eq('player_id', playerId)
    .eq('week_start', weekStartDate)
    .single();

  if (!data?.rival) return null;

  return {
    rival: {
      id: data.rival.id,
      username: rivalName(data.rival),
      avatar: data.rival.avatar_image ?? '',
      score: data.rival_score ?? 0,
    },
    player: { score: data.player_score ?? 0 },
    weekStart: weekStartDate,
    weekEnd: weekEndDate,
  };
}
