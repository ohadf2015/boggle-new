/**
 * League Manager
 * Weekly leagues with Duolingo-style promotion/relegation
 * 30 players per league, top 10 promote, bottom 5 relegate
 */

import { getSupabase } from './supabaseServer';
import logger from '../utils/logger';

// ─── TYPES ──────────────────────────────────────────────────

export type LeagueTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'ruby';
export type LeagueZone = 'promotion' | 'safe' | 'relegation';

export interface League {
  id: string;
  tier: LeagueTier;
  week_start: string;
  week_end: string;
  created_at: string;
}

export interface LeagueMember {
  id: string;
  league_id: string;
  user_id: string;
  weekly_xp: number;
  final_position: number | null;
  joined_at: string;
}

export interface LeagueStanding {
  userId: string;
  displayName: string;
  weeklyXp: number;
  position: number;
  zone: LeagueZone;
  joinedAt: string;
}

export interface LeagueRewards {
  coins: number;
  xp: number;
}

export interface LeagueAssignment {
  leagueId: string;
  tier: LeagueTier;
}

export interface LeagueRivalPlayer {
  username: string;
  avatar: string;
  score: number;
  position: number;
}

export interface LeagueRivalsResult {
  above: LeagueRivalPlayer | null;
  below: LeagueRivalPlayer | null;
  player: { position: number; score: number };
}

export interface WeeklyResetResult {
  leaguesProcessed: number;
  promoted: number;
  relegated: number;
  stayed: number;
}

// ─── CONSTANTS ──────────────────────────────────────────────

export const LEAGUE_TIERS: LeagueTier[] = ['bronze', 'silver', 'gold', 'diamond', 'ruby'];

export const LEAGUE_CONFIG = {
  PLAYERS_PER_LEAGUE: 30,
  PROMOTION_COUNT: 10,
  RELEGATION_COUNT: 5,
} as const;

// Reward tables: coins per tier (index 0 = bronze ... 4 = ruby)
const TIER_COIN_MULTIPLIER: Record<LeagueTier, number> = {
  bronze: 1,
  silver: 1.5,
  gold: 2,
  diamond: 3,
  ruby: 5,
};

const BASE_REWARDS = {
  FIRST_PLACE_COINS: 200,
  POSITION_DECAY: 0.9, // Each position gets 90% of the previous
  MIN_COINS: 10,
  XP_PER_COIN: 2,
} as const;

// ─── TIER CONFIG ───────────────────────────────────────────

export interface TierConfig {
  promotionSlots: number;
  relegationSlots: number;
  maxMembers: number;
}

export function getLeagueTierConfig(tier: LeagueTier): TierConfig {
  // All tiers share the same structure for now; config is per-tier
  // so it can diverge later (e.g. ruby gets fewer relegation slots)
  return {
    promotionSlots: tier === 'ruby' ? 0 : LEAGUE_CONFIG.PROMOTION_COUNT,
    relegationSlots: tier === 'bronze' ? 0 : LEAGUE_CONFIG.RELEGATION_COUNT,
    maxMembers: LEAGUE_CONFIG.PLAYERS_PER_LEAGUE,
  };
}

export function calculatePromotions(
  standings: LeagueMember[]
): { promoted: string[]; relegated: string[] } {
  const sorted = [...standings].sort((a, b) => b.weekly_xp - a.weekly_xp);
  const total = sorted.length;
  const promoted = sorted
    .slice(0, LEAGUE_CONFIG.PROMOTION_COUNT)
    .map((m) => m.user_id);
  const relegated = sorted
    .slice(Math.max(0, total - LEAGUE_CONFIG.RELEGATION_COUNT))
    .map((m) => m.user_id);
  return { promoted, relegated };
}

// ─── TIER HELPERS ───────────────────────────────────────────

export function getNextTier(tier: LeagueTier): LeagueTier {
  const idx = LEAGUE_TIERS.indexOf(tier);
  if (idx >= LEAGUE_TIERS.length - 1) return tier;
  return LEAGUE_TIERS[idx + 1];
}

export function getPreviousTier(tier: LeagueTier): LeagueTier {
  const idx = LEAGUE_TIERS.indexOf(tier);
  if (idx <= 0) return tier;
  return LEAGUE_TIERS[idx - 1];
}

export function getZone(position: number, totalPlayers: number): LeagueZone {
  if (position <= LEAGUE_CONFIG.PROMOTION_COUNT) return 'promotion';
  if (position > totalPlayers - LEAGUE_CONFIG.RELEGATION_COUNT) return 'relegation';
  return 'safe';
}

// ─── WEEK HELPERS ───────────────────────────────────────────

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getWeekEnd(): Date {
  const start = getWeekStart();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}

// ─── CORE FUNCTIONS ─────────────────────────────────────────

/**
 * Get or create a league assignment for a player this week.
 * If player already has a league, returns it. Otherwise assigns to
 * an open league or creates a new one.
 */
export async function getOrCreateLeague(
  userId: string,
  tier: LeagueTier = 'bronze'
): Promise<LeagueAssignment> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");
  const weekStart = getWeekStart().toISOString();

  // Check existing membership this week
  const { data: existing } = await supabase
    .from('league_members')
    .select('*, league:leagues(*)')
    .eq('user_id', userId)
    .eq('league.week_start', weekStart)
    .single();

  if (existing) {
    return {
      leagueId: existing.league_id,
      tier: existing.league?.tier ?? tier,
    };
  }

  // Find open league with room
  const { data: openLeagues } = await supabase
    .from('leagues')
    .select('id, tier, member_count')
    .eq('tier', tier)
    .eq('week_start', weekStart)
    .order('member_count', { ascending: true })
    .limit(1);

  if (openLeagues && openLeagues.length > 0 && openLeagues[0].member_count < LEAGUE_CONFIG.PLAYERS_PER_LEAGUE) {
    const league = openLeagues[0];
    await supabase
      .from('league_members')
      .insert({ league_id: league.id, user_id: userId, weekly_xp: 0 });

    return { leagueId: league.id, tier: league.tier ?? tier };
  }

  // Create new league
  const weekEnd = getWeekEnd().toISOString();
  const { data: newLeague } = await supabase
    .from('leagues')
    .insert({ tier, week_start: weekStart, week_end: weekEnd })
    .select()
    .single();

  if (!newLeague) throw new Error('Failed to create league');

  await supabase
    .from('league_members')
    .insert({ league_id: newLeague.id, user_id: userId, weekly_xp: 0 });

  return { leagueId: newLeague.id, tier };
}

/**
 * Add XP to a player's current league membership
 */
export async function addXpToLeague(
  userId: string,
  xpAmount: number
): Promise<{ newXp: number }> {
  if (xpAmount <= 0) throw new Error('XP amount must be positive');

  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");
  const { data, error } = await supabase.rpc('add_league_xp', {
    p_user_id: userId,
    p_xp_amount: xpAmount,
  });

  if (error) {
    logger.error('league', 'Failed to add league XP', { userId, xpAmount, error });
    throw error;
  }

  return { newXp: data?.weekly_xp ?? xpAmount };
}

/**
 * Get sorted standings for a league with zone markers
 */
export async function getLeagueStandings(leagueId: string): Promise<LeagueStanding[]> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  const { data: members, error } = await supabase
    .from('league_members')
    .select('user_id, weekly_xp, joined_at, display_name')
    .eq('league_id', leagueId)
    .order('weekly_xp', { ascending: false });

  if (error || !members) return [];

  // Sort with tiebreak: higher XP first, then earlier join date
  const sorted = [...members].sort((a, b) => {
    if (b.weekly_xp !== a.weekly_xp) return b.weekly_xp - a.weekly_xp;
    return new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime();
  });

  return sorted.map((m, i) => ({
    userId: m.user_id,
    displayName: m.display_name ?? '',
    weeklyXp: m.weekly_xp,
    position: i + 1,
    zone: getZone(i + 1, sorted.length),
    joinedAt: m.joined_at,
  }));
}

/**
 * Get the 2 players directly above and below the current player in standings.
 * Used for the "Named Rivals" feature on the landing page.
 */
export async function getLeagueRivals(playerId: string): Promise<LeagueRivalsResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");

  // Find player's current league
  const { data: membership } = await supabase
    .from('league_members')
    .select('league_id, user_id')
    .eq('user_id', playerId)
    .single();

  if (!membership) throw new Error('Player not in a league');

  // Get standings for the league
  const standings = await getLeagueStandings(membership.league_id);
  const playerIdx = standings.findIndex((s) => s.userId === playerId);

  if (playerIdx === -1) throw new Error('Player not in a league');

  const playerStanding = standings[playerIdx];
  const aboveStanding = playerIdx > 0 ? standings[playerIdx - 1] : null;
  const belowStanding = playerIdx < standings.length - 1 ? standings[playerIdx + 1] : null;

  const toRival = (s: LeagueStanding): LeagueRivalPlayer => ({
    username: s.displayName,
    avatar: '',
    score: s.weeklyXp,
    position: s.position,
  });

  return {
    above: aboveStanding ? toRival(aboveStanding) : null,
    below: belowStanding ? toRival(belowStanding) : null,
    player: { position: playerStanding.position, score: playerStanding.weeklyXp },
  };
}

/**
 * Process weekly reset: promote top 10, relegate bottom 5, create history
 */
export async function processWeeklyReset(): Promise<WeeklyResetResult> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase client not initialized");
  const result: WeeklyResetResult = { leaguesProcessed: 0, promoted: 0, relegated: 0, stayed: 0 };

  // Get all active leagues for this week
  const { data: leagues, error } = await supabase
    .from('leagues')
    .select('id, tier')
    .eq('week_start', getWeekStart().toISOString())
    .order('created_at');

  if (error || !leagues) return result;

  for (const league of leagues) {
    const standings = await getLeagueStandings(league.id);
    const tier = league.tier as LeagueTier;
    const historyRecords = [];

    for (const standing of standings) {
      const promoted = standing.zone === 'promotion' && getNextTier(tier) !== tier;
      const relegated = standing.zone === 'relegation' && getPreviousTier(tier) !== tier;

      if (promoted) result.promoted++;
      else if (relegated) result.relegated++;
      else result.stayed++;

      historyRecords.push({
        user_id: standing.userId,
        league_id: league.id,
        tier,
        position: standing.position,
        promoted,
        relegated,
        rewards_claimed: false,
        week_end: getWeekEnd().toISOString(),
      });
    }

    // Batch insert history
    await supabase.from('league_history').insert(historyRecords);

    // Mark league as completed
    await supabase
      .from('leagues')
      .update({ status: 'completed' })
      .eq('id', league.id);

    result.leaguesProcessed++;
  }

  logger.info('league', 'Weekly league reset completed', result);
  return result;
}

/**
 * Calculate rewards based on tier and final position
 */
export function getLeagueRewards(tier: LeagueTier, position: number): LeagueRewards {
  const multiplier = TIER_COIN_MULTIPLIER[tier];
  const rawCoins = BASE_REWARDS.FIRST_PLACE_COINS * Math.pow(BASE_REWARDS.POSITION_DECAY, position - 1);
  const coins = Math.max(BASE_REWARDS.MIN_COINS, Math.round(rawCoins * multiplier));
  const xp = coins * BASE_REWARDS.XP_PER_COIN;

  return { coins, xp };
}
