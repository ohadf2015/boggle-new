/**
 * Admin Player Routes
 * Player management, statistics, and acquisition analytics.
 */

import express, { Response, Router } from 'express';
import type { AdminRequest, NameCountData, ProfileRow, EventRow, CountMaps } from './types';
import logger from '../../utils/logger';
import { applyPlayerListFilters, type PlayerListFilters } from './playerListFilters';

import { getSupabase } from '../../modules/supabaseServer';

const router: Router = express.Router();

/**
 * GET /api/admin/players/countries
 * Get player distribution by country (includes both authenticated and guest players)
 */
router.get('/players/countries', async (_req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    if (!supabase) { res.status(503).json({ error: 'Database not available' }); return; }

    // Get authenticated user countries from profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('country_code')
      .not('country_code', 'is', null);

    if (profileError) throw profileError;

    const registeredCounts: Record<string, number> = {};
    profileData?.forEach((p: { country_code?: string }) => {
      const country = p.country_code || 'Unknown';
      registeredCounts[country] = (registeredCounts[country] || 0) + 1;
    });

    // Get guest countries from game_sessions (unique guest sessions per country)
    const guestCounts: Record<string, number> = {};
    try {
      const { data: guestData } = await supabase
        .from('game_sessions')
        .select('guest_session_id, country')
        .is('user_id', null)
        .not('guest_session_id', 'is', null)
        .not('country', 'is', null);

      // Count unique guest sessions per country
      const guestsByCountry: Record<string, Set<string>> = {};
      guestData?.forEach((s: { guest_session_id: string; country: string }) => {
        if (s.country && s.guest_session_id) {
          if (!guestsByCountry[s.country]) {
            guestsByCountry[s.country] = new Set();
          }
          guestsByCountry[s.country].add(s.guest_session_id);
        }
      });

      Object.entries(guestsByCountry).forEach(([country, sessions]) => {
        guestCounts[country] = sessions.size;
      });
    } catch {
      // game_sessions might not have country data yet, skip
      logger.debug('ADMIN_API', 'Guest country data unavailable');
    }

    // Combine counts
    const combinedCounts: Record<string, { registered: number; guests: number; total: number }> = {};

    // Add registered users
    Object.entries(registeredCounts).forEach(([country, count]) => {
      if (!combinedCounts[country]) {
        combinedCounts[country] = { registered: 0, guests: 0, total: 0 };
      }
      combinedCounts[country].registered = count;
      combinedCounts[country].total += count;
    });

    // Add guests
    Object.entries(guestCounts).forEach(([country, count]) => {
      if (!combinedCounts[country]) {
        combinedCounts[country] = { registered: 0, guests: 0, total: 0 };
      }
      combinedCounts[country].guests = count;
      combinedCounts[country].total += count;
    });

    // Sort by total count descending
    const sorted = Object.entries(combinedCounts)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([country, counts]) => ({
        country,
        count: counts.total,
        registered: counts.registered,
        guests: counts.guests,
      }));

    res.json({
      countries: sorted,
      totals: {
        registeredUsers: Object.values(registeredCounts).reduce((a, b) => a + b, 0),
        guestPlayers: Object.values(guestCounts).reduce((a, b) => a + b, 0),
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Countries error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch country data' });
  }
});

/**
 * GET /api/admin/players/sources
 * Get player acquisition sources (UTM tracking)
 */
router.get('/players/sources', async (_req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    if (!supabase) { res.status(503).json({ error: 'Database not available' }); return; }

    // Get registered user data from profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('utm_source, utm_medium, utm_campaign, referrer');

    if (profileError) throw profileError;

    // Get analytics events for guest players
    const { data: eventData, error: eventError } = await supabase
      .from('analytics_events')
      .select('utm_source, utm_medium, utm_campaign, referrer, metadata')
      .not('metadata->guest_name', 'is', null);

    if (eventError) {
      logger.warn('ADMIN_API', `Analytics events query failed: ${eventError.message}`);
    }

    const sourceCounts: CountMaps = { registered: {}, guests: {} };
    const mediumCounts: CountMaps = { registered: {}, guests: {} };
    const campaignCounts: CountMaps = { registered: {}, guests: {} };
    const referrerCounts: CountMaps = { registered: {}, guests: {} };
    const guestNames: Record<string, boolean> = {};

    // Process registered user data
    profileData?.forEach((p: ProfileRow) => {
      if (p.utm_source) {
        sourceCounts.registered[p.utm_source] = (sourceCounts.registered[p.utm_source] || 0) + 1;
      }
      if (p.utm_medium) {
        mediumCounts.registered[p.utm_medium] = (mediumCounts.registered[p.utm_medium] || 0) + 1;
      }
      if (p.utm_campaign) {
        campaignCounts.registered[p.utm_campaign] = (campaignCounts.registered[p.utm_campaign] || 0) + 1;
      }
      if (p.referrer) {
        try {
          const domain = new URL(p.referrer).hostname;
          referrerCounts.registered[domain] = (referrerCounts.registered[domain] || 0) + 1;
        } catch {
          referrerCounts.registered[p.referrer] = (referrerCounts.registered[p.referrer] || 0) + 1;
        }
      }
    });

    // Process guest player data from analytics events
    eventData?.forEach((event: EventRow) => {
      const guestName = event.metadata?.guest_name;
      if (guestName && !guestNames[guestName]) {
        guestNames[guestName] = true;

        const source = event.utm_source || 'direct';
        sourceCounts.guests[source] = (sourceCounts.guests[source] || 0) + 1;

        if (event.utm_medium) {
          mediumCounts.guests[event.utm_medium] = (mediumCounts.guests[event.utm_medium] || 0) + 1;
        }
        if (event.utm_campaign) {
          campaignCounts.guests[event.utm_campaign] = (campaignCounts.guests[event.utm_campaign] || 0) + 1;
        }
        if (event.referrer) {
          try {
            const domain = new URL(event.referrer).hostname;
            referrerCounts.guests[domain] = (referrerCounts.guests[domain] || 0) + 1;
          } catch {
            referrerCounts.guests[event.referrer] = (referrerCounts.guests[event.referrer] || 0) + 1;
          }
        }
      }
    });

    // Combine registered and guest counts
    const combineCounts = (registered: Record<string, number>, guests: Record<string, number>): Record<string, number> => {
      const combined = { ...registered };
      Object.entries(guests).forEach(([key, count]) => {
        combined[key] = (combined[key] || 0) + count;
      });
      return combined;
    };

    const sortByCount = (obj: Record<string, number>): NameCountData[] => Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));

    const totalSources = combineCounts(sourceCounts.registered, sourceCounts.guests);
    const totalMediums = combineCounts(mediumCounts.registered, mediumCounts.guests);
    const totalCampaigns = combineCounts(campaignCounts.registered, campaignCounts.guests);
    const totalReferrers = combineCounts(referrerCounts.registered, referrerCounts.guests);

    res.json({
      sources: sortByCount(totalSources),
      mediums: sortByCount(totalMediums),
      campaigns: sortByCount(totalCampaigns),
      referrers: sortByCount(totalReferrers),
      breakdown: {
        registeredUsers: profileData?.length || 0,
        guestPlayers: Object.keys(guestNames).length,
        registeredSources: sortByCount(sourceCounts.registered),
        guestSources: sortByCount(sourceCounts.guests),
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Sources error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch source data' });
  }
});

/**
 * GET /api/admin/players/top
 * Get top players by score with full profile data
 */
router.get('/players/top', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const supabase = getSupabase();
    if (!supabase) { res.status(503).json({ error: 'Database not available' }); return; }

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id, username, display_name, avatar_emoji, avatar_color, avatar_image, avatar_config,
        total_score, total_games, total_words, total_time_played, total_xp, current_level,
        casual_games, ranked_games, casual_wins, ranked_wins,
        ranked_mmr, peak_mmr, longest_word, longest_word_length,
        total_coins, lifetime_coins_earned, total_hints_used,
        prestige_level, prestige_multiplier,
        country_code, referral_count,
        daily_email_subscribed, last_seen_at, last_game_at, created_at
      `)
      .order('total_score', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ players: data || [] });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Top players error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch top players' });
  }
});

/**
 * GET /api/admin/players/recent
 * Get recently active players with full profile data
 */
router.get('/players/recent', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const supabase = getSupabase();
    if (!supabase) { res.status(503).json({ error: 'Database not available' }); return; }

    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id, username, display_name, avatar_emoji, avatar_color, avatar_image, avatar_config,
        total_score, total_games, total_words, total_time_played, total_xp, current_level,
        casual_games, ranked_games, casual_wins, ranked_wins,
        ranked_mmr, peak_mmr, longest_word, longest_word_length,
        total_coins, lifetime_coins_earned, total_hints_used,
        prestige_level, prestige_multiplier,
        country_code, referral_count,
        daily_email_subscribed, last_seen_at, last_game_at, created_at
      `)
      .order('last_game_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw error;

    res.json({ players: data || [] });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Recent players error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch recent players' });
  }
});

/**
 * GET /api/admin/players
 * Get all players with pagination and search
 */
router.get('/players', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    if (!supabase) { res.status(503).json({ error: 'Database not available' }); return; }
    const search = (req.query.search as string) || null;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const sortBy = (req.query.sortBy as string) || 'created_at';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? true : false;

    const country = (req.query.country as string) || null;
    const roleParam = (req.query.role as string) || null;
    const role: PlayerListFilters['role'] = roleParam === 'admin' || roleParam === 'teacher' || roleParam === 'player' ? roleParam : null;
    const hasBlast = req.query.hasBlast === 'true';
    const mmrMin = req.query.mmrMin ? parseInt(req.query.mmrMin as string) : null;
    const mmrMax = req.query.mmrMax ? parseInt(req.query.mmrMax as string) : null;
    const daysSinceActive = req.query.daysSinceActive ? parseInt(req.query.daysSinceActive as string) : null;

    let query = supabase
      .from('profiles')
      .select(`
        id, username, display_name, avatar_emoji, avatar_color, avatar_image, avatar_config,
        total_score, total_games, total_words, total_time_played, total_xp, current_level,
        casual_games, ranked_games, casual_wins, ranked_wins,
        ranked_mmr, peak_mmr, longest_word, longest_word_length,
        total_coins, lifetime_coins_earned, total_hints_used,
        prestige_level, prestige_multiplier,
        country_code, referral_count, user_role, is_admin, blast_access,
        daily_email_subscribed, last_seen_at, last_game_at, created_at
      `, { count: 'exact' });

    query = applyPlayerListFilters(query as never, {
      search,
      country,
      role,
      hasBlast: hasBlast ? true : null,
      mmrMin: Number.isFinite(mmrMin) ? mmrMin : null,
      mmrMax: Number.isFinite(mmrMax) ? mmrMax : null,
      daysSinceActive: Number.isFinite(daysSinceActive) ? daysSinceActive : null,
    }) as never;

    const validSortFields = ['created_at', 'last_game_at', 'total_games', 'total_score', 'username', 'ranked_mmr'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';

    query = query.order(sortField, { ascending: sortOrder });
    query = query.range(offset, offset + limit - 1);

    const { data: players, error, count } = await query;

    if (error) throw error;

    res.json({
      players,
      total: count || 0,
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });

  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Get players error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

/**
 * POST /api/admin/users/:userId/set-teacher-role
 * Promote a user to the teacher role.
 * Only admins (is_admin = true) may call this.
 * - Returns 404 if user not found
 * - Returns 409 ALREADY_TEACHER if user is already a teacher
 * - Returns 409 ALREADY_ADMIN if user is an admin (cannot downgrade via this endpoint)
 */
router.post('/users/:userId/set-teacher-role', async (req: AdminRequest, res: Response): Promise<void> => {
  const { userId } = req.params;

  try {
    const supabase = getSupabase();
    if (!supabase) { res.status(503).json({ error: 'Database not available' }); return; }

    // Fetch the target user's current role
    const { data: profile, error: lookupError } = await supabase
      .from('profiles')
      .select('id, user_role, is_admin')
      .eq('id', userId)
      .single();

    if (lookupError || !profile) {
      res.status(404).json({ error: 'USER_NOT_FOUND', message: 'User not found' });
      return;
    }

    // Prevent accidentally downgrading an admin
    if (profile.is_admin || profile.user_role === 'admin') {
      res.status(409).json({ error: 'ALREADY_ADMIN', message: 'Cannot change role of an admin user' });
      return;
    }

    // Idempotency: already a teacher
    if (profile.user_role === 'teacher') {
      res.status(409).json({ error: 'ALREADY_TEACHER', message: 'User is already a teacher' });
      return;
    }

    // Promote to teacher
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ user_role: 'teacher' })
      .eq('id', userId)
      .select('id, user_role')
      .single();

    if (updateError || !updated) {
      logger.error('ADMIN_API', `Failed to set teacher role for ${userId}: ${updateError?.message}`);
      res.status(500).json({ error: 'UPDATE_FAILED', message: 'Failed to update user role' });
      return;
    }

    logger.info('ADMIN_API', `Admin ${req.adminUser?.email} promoted user ${userId} to teacher`);
    res.json({ success: true, userId, user_role: updated.user_role });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Set teacher role error: ${err.message}`);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Internal server error' });
  }
});

/**
 * POST /api/admin/players/:id/blast-access
 * Grant or revoke blast mode access for a specific player
 * Body: { enabled: boolean }
 */
router.post('/players/:id/blast-access', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      res.status(400).json({ error: 'enabled (boolean) is required' });
      return;
    }

    const supabase = getSupabase();
    if (!supabase) { res.status(503).json({ error: 'Database not available' }); return; }
    const { error } = await supabase
      .from('profiles')
      .update({ blast_access: enabled })
      .eq('id', id);

    if (error) throw error;

    logger.info('ADMIN_API', `Blast access ${enabled ? 'granted' : 'revoked'} for player ${id}`);
    res.json({ success: true, blast_access: enabled });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Blast access update error: ${err.message}`);
    res.status(500).json({ error: 'Failed to update blast access' });
  }
});

export default router;
