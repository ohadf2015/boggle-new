/**
 * Admin API Routes
 * Handles all /api/admin/* endpoints for the admin dashboard
 *
 * Security features:
 * - JWT authentication via Supabase
 * - Admin role verification
 * - Rate limiting per IP
 * - Audit logging for sensitive operations
 */

import express, { Request, Response, Router, NextFunction } from 'express';
import { z } from 'zod';
 
const { getSupabase, isSupabaseConfigured } = require('../modules/supabaseServer');
 
const { getAllGames } = require('../modules/gameStateManager');
 
const { isInProgress } = require('../utils/gameStateMachine');
import { getActiveSinglePlayerCount } from './singlePlayer';
import logger from '../utils/logger';

const router: Router = express.Router();

// ==================== Types ====================

interface AdminUser {
  id: string;
  email: string;
  username?: string;
}

interface AdminRequest extends Request {
  requestId?: string;
  adminUser?: AdminUser;
  query: Request['query'];
  params: Request['params'];
  body: Request['body'];
  headers: Request['headers'];
  socket: Request['socket'];
  method: Request['method'];
  path: Request['path'];
  app: Request['app'];
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface SocketIO {
  sockets: {
    sockets: Map<string, unknown>;
  };
}

interface GameInfo {
  playerCount: number;
  gameState: string;
}

// Response types
interface StatsResponse {
  overview: {
    totalPlayers: number;
    totalGames: number;
    totalGameTimeHours: number;
    totalWords: number;
  };
  activity: {
    gamesToday: number;
    uniquePlayersToday: number;
    uniquePlayersWeek: number;
    uniquePlayersMonth: number;
    signupsToday: number;
    signupsWeek: number;
  };
  languages: Record<string, number>;
  guests?: {
    totalGuestGames: number;
    guestGamesToday: number;
    uniqueGuestSessions: number;
  };
}

interface CountryData {
  country: string;
  count: number;
}

interface NameCountData {
  name: string;
  count: number;
}

interface WordStat {
  word: string;
  language: string;
  likes: number;
  dislikes: number;
  gameCodes: string[];
  firstSeen: string;
  lastSeen: string;
  netScore: number;
}

interface BlacklistEntry {
  id: string;
  word: string;
  language: string;
  reason?: string | null;
  created_at: string;
}

interface GuestPlayerStat {
  name: string;
  events: number;
  utm_source?: string | null;
  utm_medium?: string | null;
  referrer?: string | null;
  country_code?: string | null;
  first_seen: string;
  last_seen: string;
}

interface CommunityWordEntry {
  word: string;
  language: string;
  likes_count: number;
  dislikes_count: number;
  net_score: number;
  is_potentially_valid: boolean;
  first_submitter: string | null;
  last_voted_at: string | null;
  first_voted_at: string | null;
  status: 'validated' | 'pending_review' | 'rejected' | 'pending';
}

// ==================== Request Validation Schemas ====================

const blacklistAddSchema = z.object({
  word: z.string().min(1).max(50).transform((s: string) => s.toLowerCase().trim()),
  language: z.enum(['en', 'he', 'sv', 'ja', 'es', 'fr', 'de']),
  reason: z.string().max(200).optional().nullable(),
});

// ==================== Rate Limiting ====================

/**
 * Simple in-memory rate limiter for admin endpoints
 * More restrictive than general API rate limiting
 */
const adminRateLimiter = {
  requests: new Map<string, RateLimitRecord>(),
  maxRequests: 100,       // Max requests per window
  windowMs: 60 * 1000,    // 1 minute window

  isAllowed(ip: string): boolean {
    const now = Date.now();
    const key = `admin:${ip}`;

    if (!this.requests.has(key)) {
      this.requests.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    const record = this.requests.get(key)!;
    if (now > record.resetAt) {
      record.count = 1;
      record.resetAt = now + this.windowMs;
      return true;
    }

    if (record.count >= this.maxRequests) {
      logger.warn('ADMIN_API', `Rate limit exceeded for IP: ${ip}`);
      return false;
    }

    record.count++;
    return true;
  },

  // Cleanup old entries every 5 minutes
  cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.requests) {
      if (now > record.resetAt + this.windowMs) {
        this.requests.delete(key);
      }
    }
  }
};

// Run cleanup periodically
setInterval(() => adminRateLimiter.cleanup(), 5 * 60 * 1000);

// ==================== Audit Logging ====================

/**
 * Log admin actions for audit trail
 */
function auditLog(adminUser: AdminUser | undefined, action: string, details: Record<string, unknown> = {}): void {
  logger.info('ADMIN_AUDIT', JSON.stringify({
    timestamp: new Date().toISOString(),
    adminId: adminUser?.id || 'unknown',
    adminEmail: adminUser?.email || 'unknown',
    action,
    details,
  }));
}

// ==================== Middleware ====================

/**
 * Rate limiting middleware for admin routes
 */
function adminRateLimit(req: AdminRequest, res: Response, next: NextFunction): void {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0]?.trim() : undefined) ||
             (req.headers['x-real-ip'] as string) ||
             req.socket.remoteAddress ||
             'unknown';

  if (!adminRateLimiter.isAllowed(ip)) {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: 60
    });
    return;
  }

  next();
}

/**
 * Admin authentication middleware
 * Verifies JWT token and checks for admin role
 */
async function adminAuth(req: AdminRequest, res: Response, next: NextFunction): Promise<void> {
  // Generate request ID for tracing
  const requestId = `admin-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('ADMIN_API', `Missing auth header [${requestId}]`);
    res.status(401).json({ error: 'Missing authorization header', requestId });
    return;
  }

  const token = authHeader.substring(7);
  if (!isSupabaseConfigured()) {
    res.status(503).json({ error: 'Auth service not available', requestId });
    return;
  }

  try {
    const supabase = getSupabase();
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logger.warn('ADMIN_API', `Invalid token [${requestId}]`);
      res.status(401).json({ error: 'Invalid token', requestId });
      return;
    }

    // Check if user is admin - server-side verification
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, username')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      logger.warn('ADMIN_API', `Non-admin access attempt by ${user.email} [${requestId}]`);
      res.status(403).json({ error: 'Admin access required', requestId });
      return;
    }

    req.adminUser = { ...user, username: profile.username };

    // Log successful admin access
    logger.debug('ADMIN_API', `Admin access: ${user.email} -> ${req.method} ${req.path} [${requestId}]`);

    next();
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Auth error: ${err.message} [${requestId}]`);
    res.status(500).json({ error: 'Authentication failed', requestId });
  }
}

// Apply rate limiting first, then auth
router.use(adminRateLimit);
router.use(adminAuth);

/**
 * GET /api/admin/stats
 * Get main dashboard statistics
 */
router.get('/stats', async (_req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get total unique players
    const { count: totalPlayers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get total games played
    const { count: totalGames } = await supabase
      .from('game_results')
      .select('*', { count: 'exact', head: true });

    // Get games today
    const { count: gamesToday } = await supabase
      .from('game_results')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart);

    // Get unique players today
    const { data: todayPlayersData } = await supabase
      .from('game_results')
      .select('player_id')
      .gte('created_at', todayStart);
    const uniquePlayersToday = new Set(todayPlayersData?.map((r: { player_id: string }) => r.player_id)).size;

    // Get unique players this week
    const { data: weekPlayersData } = await supabase
      .from('game_results')
      .select('player_id')
      .gte('created_at', weekAgo);
    const uniquePlayersWeek = new Set(weekPlayersData?.map((r: { player_id: string }) => r.player_id)).size;

    // Get unique players this month
    const { data: monthPlayersData } = await supabase
      .from('game_results')
      .select('player_id')
      .gte('created_at', monthAgo);
    const uniquePlayersMonth = new Set(monthPlayersData?.map((r: { player_id: string }) => r.player_id)).size;

    // Get cumulative game time (in hours)
    const { data: timeData } = await supabase
      .from('profiles')
      .select('total_time_played');
    const totalGameTimeSeconds = timeData?.reduce((sum: number, p: { total_time_played?: number }) => sum + (p.total_time_played || 0), 0) || 0;
    const totalGameTimeHours = Math.round(totalGameTimeSeconds / 3600 * 10) / 10;

    // Get new signups today
    const { count: signupsToday } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart);

    // Get new signups this week
    const { count: signupsWeek } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo);

    // Get total words found
    const { data: wordsData } = await supabase
      .from('profiles')
      .select('total_words');
    const totalWords = wordsData?.reduce((sum: number, p: { total_words?: number }) => sum + (p.total_words || 0), 0) || 0;

    // Get games by language
    const { data: langData } = await supabase
      .from('game_results')
      .select('language');
    const languageCounts: Record<string, number> = {};
    langData?.forEach((g: { language?: string }) => {
      const lang = g.language || 'en';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });

    // Get guest game stats from game_sessions table
    let guestStats: StatsResponse['guests'] = undefined;
    try {
      // Total guest games (sessions with guest_session_id but no user_id)
      const { count: totalGuestGames } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true })
        .is('user_id', null)
        .not('guest_session_id', 'is', null);

      // Guest games today
      const { count: guestGamesToday } = await supabase
        .from('game_sessions')
        .select('*', { count: 'exact', head: true })
        .is('user_id', null)
        .not('guest_session_id', 'is', null)
        .gte('started_at', todayStart);

      // Unique guest sessions
      const { data: guestSessionsData } = await supabase
        .from('game_sessions')
        .select('guest_session_id')
        .is('user_id', null)
        .not('guest_session_id', 'is', null);
      const uniqueGuestSessions = new Set(
        guestSessionsData?.map((s: { guest_session_id: string }) => s.guest_session_id)
      ).size;

      guestStats = {
        totalGuestGames: totalGuestGames || 0,
        guestGamesToday: guestGamesToday || 0,
        uniqueGuestSessions,
      };
    } catch (guestError) {
      // game_sessions table might not exist yet, just skip guest stats
      logger.debug('ADMIN_API', 'Guest stats unavailable: game_sessions table may not exist');
    }

    const response: StatsResponse = {
      overview: {
        totalPlayers: totalPlayers || 0,
        totalGames: totalGames || 0,
        totalGameTimeHours,
        totalWords,
      },
      activity: {
        gamesToday: gamesToday || 0,
        uniquePlayersToday,
        uniquePlayersWeek,
        uniquePlayersMonth,
        signupsToday: signupsToday || 0,
        signupsWeek: signupsWeek || 0,
      },
      languages: languageCounts,
      guests: guestStats,
    };

    res.json(response);
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Stats error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/admin/players/countries
 * Get player distribution by country (includes both authenticated and guest players)
 */
router.get('/players/countries', async (_req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();

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

    interface CountMaps {
      registered: Record<string, number>;
      guests: Record<string, number>;
    }

    const sourceCounts: CountMaps = { registered: {}, guests: {} };
    const mediumCounts: CountMaps = { registered: {}, guests: {} };
    const campaignCounts: CountMaps = { registered: {}, guests: {} };
    const referrerCounts: CountMaps = { registered: {}, guests: {} };
    const guestNames: Record<string, boolean> = {};

    interface ProfileRow {
      utm_source?: string | null;
      utm_medium?: string | null;
      utm_campaign?: string | null;
      referrer?: string | null;
    }

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

    interface EventRow {
      utm_source?: string | null;
      utm_medium?: string | null;
      utm_campaign?: string | null;
      referrer?: string | null;
      metadata?: { guest_name?: string };
    }

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
 * Get top players by score
 */
router.get('/players/top', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_emoji, avatar_color, total_score, total_games, total_words, total_time_played, ranked_mmr, current_level, created_at')
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
 * Get recently active players
 */
router.get('/players/recent', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_emoji, avatar_color, total_score, total_games, last_game_at, created_at')
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
 * GET /api/admin/games/history
 * Get recent games history
 */
router.get('/games/history', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('game_results')
      .select(`
        id,
        game_code,
        score,
        word_count,
        placement,
        is_ranked,
        language,
        time_played,
        created_at,
        player_id,
        profiles:player_id (username, display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ games: data || [] });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Games history error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch games history' });
  }
});

/**
 * GET /api/admin/activity/daily
 * Get daily activity for charts (includes both authenticated and guest games)
 */
router.get('/activity/daily', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);
    const supabase = getSupabase();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get authenticated user games from game_results
    const { data: gamesData, error: gamesError } = await supabase
      .from('game_results')
      .select('created_at, player_id')
      .gte('created_at', startDate.toISOString());

    if (gamesError) throw gamesError;

    // Get guest games from game_sessions
    let guestGamesData: { started_at: string; guest_session_id: string }[] = [];
    try {
      const { data: guestData } = await supabase
        .from('game_sessions')
        .select('started_at, guest_session_id')
        .is('user_id', null)
        .not('guest_session_id', 'is', null)
        .eq('completed', true)
        .gte('started_at', startDate.toISOString());

      guestGamesData = guestData || [];
    } catch {
      // game_sessions table might not exist or have different structure
      logger.debug('ADMIN_API', 'Guest game sessions unavailable for daily activity');
    }

    const { data: signupsData, error: signupsError } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', startDate.toISOString());

    if (signupsError) throw signupsError;

    interface DailyDataEntry {
      games: number;
      guestGames: number;
      uniquePlayers: Set<string>;
      uniqueGuests: Set<string>;
      signups: number;
    }

    // Aggregate by day
    const dailyData: Record<string, DailyDataEntry> = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = { games: 0, guestGames: 0, uniquePlayers: new Set(), uniqueGuests: new Set(), signups: 0 };
    }

    // Add authenticated games
    gamesData?.forEach((game: { created_at: string; player_id: string }) => {
      const dateStr = game.created_at.split('T')[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].games++;
        dailyData[dateStr].uniquePlayers.add(game.player_id);
      }
    });

    // Add guest games
    guestGamesData.forEach((game: { started_at: string; guest_session_id: string }) => {
      const dateStr = game.started_at.split('T')[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].guestGames++;
        dailyData[dateStr].uniqueGuests.add(game.guest_session_id);
      }
    });

    signupsData?.forEach((profile: { created_at: string }) => {
      const dateStr = profile.created_at.split('T')[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].signups++;
      }
    });

    const result = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        games: data.games,
        guestGames: data.guestGames,
        totalGames: data.games + data.guestGames,
        uniquePlayers: data.uniquePlayers.size,
        uniqueGuests: data.uniqueGuests.size,
        totalUniquePlayers: data.uniquePlayers.size + data.uniqueGuests.size,
        signups: data.signups,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({ daily: result });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Daily activity error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch daily activity' });
  }
});

/**
 * GET /api/admin/realtime
 * Get current realtime stats
 */
router.get('/realtime', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const games = getAllGames() as GameInfo[];
    const io = req.app.get('io') as SocketIO | undefined;

    const activeRooms = games.length;
    const playersOnline = games.reduce((sum: number, g: GameInfo) => sum + g.playerCount, 0);
    // Fixed: was checking for 'playing' which is not a valid state - use state machine helper
    const gamesInProgress = games.filter((g: GameInfo) => isInProgress(g.gameState)).length;
    const socketConnections = io ? io.sockets.sockets.size : 0;
    const singlePlayerCount = getActiveSinglePlayerCount();

    res.json({
      activeRooms,
      playersOnline,
      gamesInProgress,
      socketConnections,
      singlePlayerCount,
      timestamp: Date.now(),
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Realtime error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch realtime stats' });
  }
});

/**
 * GET /api/admin/bot-words
 * Get bot words with negative votes for review
 */
router.get('/bot-words', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const language = (req.query.language as string) || null;

    let query = supabase
      .from('word_votes')
      .select('word, language, vote_type, created_at, game_code')
      .eq('is_bot_word', true);

    if (language) {
      query = query.eq('language', language);
    }

    const { data: votes, error } = await query;

    if (error) {
      if (error.message?.includes('is_bot_word')) {
        res.json({ words: [], message: 'Bot word tracking not yet enabled. Run migration 013.' });
        return;
      }
      throw error;
    }

    interface VoteRow {
      word: string;
      language: string;
      vote_type: 'like' | 'dislike';
      created_at: string;
      game_code: string;
    }

    interface WordStatBuilder {
      word: string;
      language: string;
      likes: number;
      dislikes: number;
      gameCodes: Set<string>;
      firstSeen: string;
      lastSeen: string;
    }

    // Aggregate votes by word
    const wordStats: Record<string, WordStatBuilder> = {};
    votes?.forEach((vote: VoteRow) => {
      const key = `${vote.word}:${vote.language}`;
      if (!wordStats[key]) {
        wordStats[key] = {
          word: vote.word,
          language: vote.language,
          likes: 0,
          dislikes: 0,
          gameCodes: new Set(),
          firstSeen: vote.created_at,
          lastSeen: vote.created_at
        };
      }
      if (vote.vote_type === 'like') {
        wordStats[key].likes++;
      } else {
        wordStats[key].dislikes++;
      }
      wordStats[key].gameCodes.add(vote.game_code);
      if (vote.created_at < wordStats[key].firstSeen) {
        wordStats[key].firstSeen = vote.created_at;
      }
      if (vote.created_at > wordStats[key].lastSeen) {
        wordStats[key].lastSeen = vote.created_at;
      }
    });

    const words: WordStat[] = Object.values(wordStats)
      .map((w: WordStatBuilder) => ({
        ...w,
        gameCodes: Array.from(w.gameCodes),
        netScore: w.likes - w.dislikes
      }))
      .filter((w: WordStat) => w.dislikes > 0)
      .sort((a: WordStat, b: WordStat) => b.dislikes - a.dislikes);

    res.json({ words });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Bot words error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch bot words' });
  }
});

/**
 * GET /api/admin/bot-blacklist
 * Get the bot word blacklist
 */
router.get('/bot-blacklist', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const language = (req.query.language as string) || null;

    let query = supabase
      .from('bot_word_blacklist')
      .select('id, word, language, reason, created_at')
      .order('created_at', { ascending: false });

    if (language) {
      query = query.eq('language', language);
    }

    const { data, error } = await query;

    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        res.json({ blacklist: [], message: 'Blacklist table not yet created. Run migration 013.' });
        return;
      }
      throw error;
    }

    res.json({ blacklist: (data || []) as BlacklistEntry[] });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Bot blacklist error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch bot blacklist' });
  }
});

/**
 * POST /api/admin/bot-blacklist
 * Add a word to the blacklist
 */
router.post('/bot-blacklist', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();

    // Validate request body
    const validation = blacklistAddSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`)
      });
      return;
    }

    const { word, language, reason } = validation.data;

    const { data, error } = await supabase
      .from('bot_word_blacklist')
      .insert({
        word,
        language,
        reason: reason || null,
        blacklisted_by: req.adminUser!.id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'Word already blacklisted' });
        return;
      }
      throw error;
    }

    // Audit log for security trail
    auditLog(req.adminUser, 'BLACKLIST_ADD', { word, language, reason, entryId: data.id });
    res.json({ success: true, blacklistEntry: data });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Add blacklist error: ${err.message}`);
    res.status(500).json({ error: 'Failed to add word to blacklist' });
  }
});

/**
 * DELETE /api/admin/bot-blacklist/:id
 * Remove a word from the blacklist
 */
router.delete('/bot-blacklist/:id', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;

    const { error } = await supabase
      .from('bot_word_blacklist')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Audit log for security trail
    auditLog(req.adminUser, 'BLACKLIST_REMOVE', { entryId: id });
    res.json({ success: true });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Delete blacklist error: ${err.message}`);
    res.status(500).json({ error: 'Failed to remove word from blacklist' });
  }
});

/**
 * POST /api/admin/bot-words/approve
 * Approve word permanently - remove from blacklist and add to approved words
 */
router.post('/bot-words/approve', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  const { word, language } = req.body;

  if (!word || !language) {
    res.status(400).json({ error: 'Missing word or language' });
    return;
  }

  const normalizedWord = (word as string).toLowerCase().trim();

  try {
    // 1. Remove from blacklist
    await supabase
      .from('bot_word_blacklist')
      .delete()
      .eq('word', normalizedWord)
      .eq('language', language);

    // 2. Get current score
    const { data: currentScore } = await supabase
      .from('word_scores')
      .select('likes_count, dislikes_count, net_score')
      .eq('word', normalizedWord)
      .eq('language', language)
      .single();

    const currentLikes = currentScore?.likes_count || 0;
    const currentDislikes = currentScore?.dislikes_count || 0;
    const currentNet = currentScore?.net_score || 0;
    const votesNeeded = Math.max(10 - currentNet, 10); // At least 10 votes

    // 3. Update word_scores directly (instead of inserting multiple votes which would violate unique constraint)
    const { error: scoreError } = await supabase
      .from('word_scores')
      .upsert({
        word: normalizedWord,
        language,
        likes_count: currentLikes + votesNeeded,
        dislikes_count: currentDislikes,
        last_voted_at: new Date().toISOString(),
      }, { onConflict: 'word,language' });

    if (scoreError) {
      logger.error('ADMIN_API', `Score update failed: ${scoreError.message}`);
      res.status(500).json({ error: 'Failed to update word score' });
      return;
    }

    // 4. Record a single admin vote for audit trail (upsert to handle duplicate)
    await supabase.from('word_votes').upsert({
      word: normalizedWord,
      language,
      user_id: req.adminUser!.id,
      game_code: `admin_approval_${Date.now()}`,
      vote_type: 'like',
      is_bot_word: true
    }, { onConflict: 'user_id,word,language', ignoreDuplicates: true });

    auditLog(req.adminUser, 'BOT_WORD_APPROVE', { word: normalizedWord, language });
    res.json({ success: true });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Approve error: ${err.message}`);
    res.status(500).json({ error: 'Failed to approve word' });
  }
});

/**
 * POST /api/admin/bot-words/disapprove
 * Disapprove word permanently - add to blacklist and add negative votes
 */
router.post('/bot-words/disapprove', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  const { word, language, reason } = req.body;

  if (!word || !language) {
    res.status(400).json({ error: 'Missing word or language' });
    return;
  }

  const normalizedWord = (word as string).toLowerCase().trim();

  try {
    // 1. Add to blacklist (manual, not auto)
    await supabase
      .from('bot_word_blacklist')
      .upsert({
        word: normalizedWord,
        language,
        reason: reason || 'Admin disapproval',
        blacklisted_by: req.adminUser!.id
      }, { onConflict: 'word,language' });

    // 2. Get current score
    const { data: currentScore } = await supabase
      .from('word_scores')
      .select('likes_count, dislikes_count')
      .eq('word', normalizedWord)
      .eq('language', language)
      .single();

    const currentLikes = currentScore?.likes_count || 0;
    const currentDislikes = currentScore?.dislikes_count || 0;
    const votesToAdd = 5; // Add 5 negative votes to mark as invalid

    // 3. Update word_scores directly (instead of inserting multiple votes which would violate unique constraint)
    const { error: scoreError } = await supabase
      .from('word_scores')
      .upsert({
        word: normalizedWord,
        language,
        likes_count: currentLikes,
        dislikes_count: currentDislikes + votesToAdd,
        last_voted_at: new Date().toISOString(),
      }, { onConflict: 'word,language' });

    if (scoreError) {
      logger.error('ADMIN_API', `Score update failed: ${scoreError.message}`);
      res.status(500).json({ error: 'Failed to update word score' });
      return;
    }

    // 4. Record a single admin vote for audit trail (upsert to handle duplicate)
    await supabase.from('word_votes').upsert({
      word: normalizedWord,
      language,
      user_id: req.adminUser!.id,
      game_code: `admin_disapproval_${Date.now()}`,
      vote_type: 'dislike',
      is_bot_word: true
    }, { onConflict: 'user_id,word,language', ignoreDuplicates: true });

    auditLog(req.adminUser, 'BOT_WORD_DISAPPROVE', { word: normalizedWord, language, reason });
    res.json({ success: true });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Disapprove error: ${err.message}`);
    res.status(500).json({ error: 'Failed to disapprove word' });
  }
});

/**
 * GET /api/admin/analytics/guest-players
 * Get guest player statistics
 */
router.get('/analytics/guest-players', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('metadata, utm_source, utm_medium, utm_campaign, referrer, country_code, created_at')
      .not('metadata->guest_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    interface EventRow {
      metadata?: { guest_name?: string };
      utm_source?: string | null;
      utm_medium?: string | null;
      utm_campaign?: string | null;
      referrer?: string | null;
      country_code?: string | null;
      created_at: string;
    }

    // Aggregate by guest name
    const guestStats: Record<string, GuestPlayerStat> = {};
    events?.forEach((event: EventRow) => {
      const guestName = event.metadata?.guest_name;
      if (!guestName) return;

      if (!guestStats[guestName]) {
        guestStats[guestName] = {
          name: guestName,
          events: 0,
          utm_source: event.utm_source,
          utm_medium: event.utm_medium,
          referrer: event.referrer,
          country_code: event.country_code,
          first_seen: event.created_at,
          last_seen: event.created_at,
        };
      }
      guestStats[guestName].events++;
      guestStats[guestName].last_seen = event.created_at;
    });

    const guests = Object.values(guestStats).sort((a, b) => b.events - a.events);

    // Count by UTM source
    const sourceStats: Record<string, number> = {};
    guests.forEach((guest) => {
      const source = guest.utm_source || 'direct';
      sourceStats[source] = (sourceStats[source] || 0) + 1;
    });

    res.json({
      guests,
      totalGuests: guests.length,
      bySource: Object.entries(sourceStats)
        .sort((a, b) => b[1] - a[1])
        .map(([source, count]) => ({ source, count })),
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Guest players error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch guest player data' });
  }
});

/**
 * GET /api/admin/analytics/guest-games
 * Get guest game sessions from the game_sessions table
 * This shows actual games played by guests (logged via gameSessionLogger)
 */
router.get('/analytics/guest-games', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const days = Math.min(parseInt(req.query.days as string) || 30, 90);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get guest game sessions (sessions with guest_session_id but no user_id)
    const { data: guestSessions, error: sessionsError } = await supabase
      .from('game_sessions')
      .select(`
        id,
        guest_session_id,
        mode,
        language,
        score,
        words_found,
        duration_seconds,
        completed,
        room_code,
        player_count,
        final_rank,
        started_at,
        completed_at
      `)
      .is('user_id', null)
      .not('guest_session_id', 'is', null)
      .gte('started_at', startDate.toISOString())
      .order('started_at', { ascending: false })
      .limit(limit);

    if (sessionsError) {
      // Handle case where table doesn't exist yet
      if (sessionsError.message?.includes('does not exist') || sessionsError.code === '42P01') {
        res.json({
          sessions: [],
          stats: { totalGames: 0, totalScore: 0, avgScore: 0, byMode: {}, byLanguage: {} },
          message: 'Game sessions table not yet created.'
        });
        return;
      }
      throw sessionsError;
    }

    interface GuestSession {
      id: string;
      guest_session_id: string;
      mode: string;
      language: string;
      score: number;
      words_found: unknown[] | null;
      duration_seconds: number;
      completed: boolean;
      room_code: string | null;
      player_count: number | null;
      final_rank: number | null;
      started_at: string;
      completed_at: string | null;
    }

    // Calculate stats
    const sessions = (guestSessions || []) as GuestSession[];
    const totalGames = sessions.length;
    const totalScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0);
    const avgScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;

    const byMode: Record<string, number> = {};
    const byLanguage: Record<string, number> = {};
    const uniqueGuests = new Set<string>();

    sessions.forEach((s) => {
      byMode[s.mode] = (byMode[s.mode] || 0) + 1;
      byLanguage[s.language] = (byLanguage[s.language] || 0) + 1;
      if (s.guest_session_id) {
        uniqueGuests.add(s.guest_session_id);
      }
    });

    res.json({
      sessions: sessions.map(s => ({
        ...s,
        wordsCount: Array.isArray(s.words_found) ? s.words_found.length : 0,
      })),
      stats: {
        totalGames,
        totalScore,
        avgScore,
        uniqueGuests: uniqueGuests.size,
        byMode: Object.entries(byMode)
          .sort((a, b) => b[1] - a[1])
          .map(([mode, count]) => ({ mode, count })),
        byLanguage: Object.entries(byLanguage)
          .sort((a, b) => b[1] - a[1])
          .map(([language, count]) => ({ language, count })),
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Guest games error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch guest game data' });
  }
});

// ==================== Community Words Moderation ====================

/**
 * GET /api/admin/community-words
 * Get all community words with filtering and pagination
 *
 * Query params:
 * - language: Filter by language (en, he, sv, ja, es)
 * - status: Filter by status (validated, pending_review, rejected, pending)
 * - search: Search for specific word
 * - sortBy: Sort field (net_score, likes_count, dislikes_count, created_at)
 * - sortOrder: asc or desc
 * - limit: Number of results (max 500)
 * - offset: Pagination offset
 */
router.get('/community-words', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const language = (req.query.language as string) || null;
    const status = (req.query.status as string) || null;
    const search = (req.query.search as string) || null;
    const sortBy = (req.query.sortBy as string) || 'net_score';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? true : false;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    // Build query
    let query = supabase
      .from('word_scores')
      .select('word, language, likes_count, dislikes_count, net_score, is_potentially_valid, first_submitter, last_voted_at, first_voted_at', { count: 'exact' });

    // Apply filters
    if (language) {
      query = query.eq('language', language);
    }

    if (search) {
      query = query.ilike('word', `%${search}%`);
    }

    // Status filtering
    if (status === 'validated') {
      query = query.gte('net_score', 10);
    } else if (status === 'pending_review') {
      query = query.gte('net_score', 3).lt('net_score', 10);
    } else if (status === 'rejected') {
      query = query.lt('net_score', 0);
    } else if (status === 'pending') {
      query = query.gte('net_score', 0).lt('net_score', 3);
    }

    // Apply sorting
    const validSortFields = ['net_score', 'likes_count', 'dislikes_count', 'created_at', 'last_voted_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'net_score';
    query = query.order(sortField, { ascending: sortOrder });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    // Transform data to include computed status
    interface WordScoreRow {
      word: string;
      language: string;
      likes_count: number;
      dislikes_count: number;
      net_score: number;
      is_potentially_valid: boolean;
      first_submitter: string | null;
      last_voted_at: string | null;
      first_voted_at: string | null;
    }

    const words: CommunityWordEntry[] = (data as WordScoreRow[] || []).map((row: WordScoreRow) => {
      let wordStatus: CommunityWordEntry['status'] = 'pending';
      if (row.net_score >= 10) {
        wordStatus = 'validated';
      } else if (row.net_score >= 3) {
        wordStatus = 'pending_review';
      } else if (row.net_score < 0) {
        wordStatus = 'rejected';
      }
      return {
        ...row,
        status: wordStatus,
      };
    });

    // Get summary stats
    const { data: statsData } = await supabase
      .from('word_scores')
      .select('net_score')
      .throwOnError();

    interface NetScoreRow {
      net_score: number;
    }

    const typedStatsData = statsData as NetScoreRow[] | null;
    const stats = {
      total: typedStatsData?.length || 0,
      validated: typedStatsData?.filter((w: NetScoreRow) => w.net_score >= 10).length || 0,
      pendingReview: typedStatsData?.filter((w: NetScoreRow) => w.net_score >= 3 && w.net_score < 10).length || 0,
      rejected: typedStatsData?.filter((w: NetScoreRow) => w.net_score < 0).length || 0,
      pending: typedStatsData?.filter((w: NetScoreRow) => w.net_score >= 0 && w.net_score < 3).length || 0,
    };

    res.json({
      words,
      total: count || 0,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Community words error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch community words' });
  }
});

/**
 * POST /api/admin/community-words/approve
 * Approve a community word - adds positive votes to push over threshold
 */
router.post('/community-words/approve', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  const { word, language, addToDictionary } = req.body;

  if (!word || !language) {
    res.status(400).json({ error: 'Missing word or language' });
    return;
  }

  const normalizedWord = (word as string).toLowerCase().trim();

  try {
    // Get current score with full counts
    const { data: currentScore } = await supabase
      .from('word_scores')
      .select('likes_count, dislikes_count, net_score')
      .eq('word', normalizedWord)
      .eq('language', language)
      .single();

    // Calculate votes needed to reach threshold of 10
    const currentNet = currentScore?.net_score || 0;
    const votesNeeded = Math.max(10 - currentNet, 5); // At least 5 votes to show intent

    // Calculate new likes_count by adding votesNeeded to existing
    const currentLikes = currentScore?.likes_count || 0;
    const currentDislikes = currentScore?.dislikes_count || 0;
    const newLikesCount = currentLikes + votesNeeded;

    // Update word_scores directly (instead of inserting multiple votes which would violate unique constraint)
    const { error: scoreError } = await supabase
      .from('word_scores')
      .upsert({
        word: normalizedWord,
        language,
        likes_count: newLikesCount,
        dislikes_count: currentDislikes,
        last_voted_at: new Date().toISOString(),
      }, { onConflict: 'word,language' });

    if (scoreError) {
      logger.error('ADMIN_API', `Score update failed: ${scoreError.message}`);
      res.status(500).json({ error: 'Failed to update word score' });
      return;
    }

    // Also record a single admin vote for audit trail (upsert to handle duplicate)
    await supabase.from('word_votes').upsert({
      word: normalizedWord,
      language,
      user_id: req.adminUser!.id,
      game_code: `admin_community_approve_${Date.now()}`,
      vote_type: 'like',
      is_bot_word: false,
    }, { onConflict: 'user_id,word,language', ignoreDuplicates: true });

    // Remove from blacklist if present
    await supabase
      .from('bot_word_blacklist')
      .delete()
      .eq('word', normalizedWord)
      .eq('language', language);

    // Optionally add to permanent dictionary file
    if (addToDictionary) {
      try {
         
        const dictionary = require('../../backend/dictionary');
        await dictionary.addApprovedWord(normalizedWord, language);
        auditLog(req.adminUser, 'COMMUNITY_WORD_ADD_TO_DICTIONARY', { word: normalizedWord, language });
      } catch (dictError) {
        logger.warn('ADMIN_API', `Dictionary add failed: ${(dictError as Error).message}`);
      }
    }

    auditLog(req.adminUser, 'COMMUNITY_WORD_APPROVE', { word: normalizedWord, language, votesAdded: votesNeeded, addToDictionary });
    res.json({ success: true, votesAdded: votesNeeded });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Community word approve error: ${err.message}`);
    res.status(500).json({ error: 'Failed to approve word' });
  }
});

/**
 * POST /api/admin/community-words/disapprove
 * Disapprove a community word - adds negative votes and optionally blacklists
 */
router.post('/community-words/disapprove', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  const { word, language, reason, addToBlacklist } = req.body;

  if (!word || !language) {
    res.status(400).json({ error: 'Missing word or language' });
    return;
  }

  const normalizedWord = (word as string).toLowerCase().trim();

  try {
    // Get current score with full counts
    const { data: currentScore } = await supabase
      .from('word_scores')
      .select('likes_count, dislikes_count')
      .eq('word', normalizedWord)
      .eq('language', language)
      .single();

    const currentLikes = currentScore?.likes_count || 0;
    const currentDislikes = currentScore?.dislikes_count || 0;
    const votesToAdd = 10; // Add 10 negative votes to reject

    // Update word_scores directly (instead of inserting multiple votes which would violate unique constraint)
    const { error: scoreError } = await supabase
      .from('word_scores')
      .upsert({
        word: normalizedWord,
        language,
        likes_count: currentLikes,
        dislikes_count: currentDislikes + votesToAdd,
        last_voted_at: new Date().toISOString(),
      }, { onConflict: 'word,language' });

    if (scoreError) {
      logger.error('ADMIN_API', `Score update failed: ${scoreError.message}`);
      res.status(500).json({ error: 'Failed to update word score' });
      return;
    }

    // Also record a single admin vote for audit trail (upsert to handle duplicate)
    await supabase.from('word_votes').upsert({
      word: normalizedWord,
      language,
      user_id: req.adminUser!.id,
      game_code: `admin_community_disapprove_${Date.now()}`,
      vote_type: 'dislike',
      is_bot_word: false,
    }, { onConflict: 'user_id,word,language', ignoreDuplicates: true });

    // Optionally add to blacklist
    if (addToBlacklist) {
      await supabase
        .from('bot_word_blacklist')
        .upsert({
          word: normalizedWord,
          language,
          reason: reason || 'Admin disapproval',
          blacklisted_by: req.adminUser!.id,
          auto_blacklisted: false,
        }, { onConflict: 'word,language' });
    }

    auditLog(req.adminUser, 'COMMUNITY_WORD_DISAPPROVE', { word: normalizedWord, language, reason, addToBlacklist });
    res.json({ success: true, votesAdded: 10 });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Community word disapprove error: ${err.message}`);
    res.status(500).json({ error: 'Failed to disapprove word' });
  }
});

/**
 * POST /api/admin/daily-word/generate-retry-link
 * Generate a retry token that allows any player to replay a specific daily challenge
 */
router.post('/daily-word/generate-retry-link', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();

    // Parse request body
    const { puzzleDate, language } = req.body;

    if (!puzzleDate || !language) {
      res.status(400).json({ error: 'puzzleDate and language are required' });
      return;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(puzzleDate)) {
      res.status(400).json({ error: 'puzzleDate must be in YYYY-MM-DD format' });
      return;
    }

    // Validate language
    const validLanguages = ['en', 'he', 'sv', 'ja', 'es'];
    if (!validLanguages.includes(language)) {
      res.status(400).json({ error: `language must be one of: ${validLanguages.join(', ')}` });
      return;
    }

    // Generate a secure random token (16 characters, URL-safe)
    const crypto = require('crypto');
    const token = crypto.randomBytes(12).toString('base64url');

    // Calculate expiration: end of the puzzle day (midnight UTC of the next day)
    const puzzleDateObj = new Date(puzzleDate + 'T00:00:00Z');
    const expiresAt = new Date(puzzleDateObj);
    expiresAt.setUTCDate(expiresAt.getUTCDate() + 1); // Next day at midnight UTC

    // Insert the token into the database
    const { data: tokenData, error: insertError } = await supabase
      .from('daily_retry_tokens')
      .insert({
        token,
        puzzle_date: puzzleDate,
        language,
        created_by: req.adminUser!.id,
        expires_at: expiresAt.toISOString(),
        use_count: 0,
      })
      .select('id, token, expires_at')
      .single();

    if (insertError) {
      logger.error('ADMIN_API', `Failed to create retry token: ${insertError.message}`);
      res.status(500).json({ error: 'Failed to create retry token' });
      return;
    }

    // Construct the retry URL using the host from the request
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'www.lexiclash.live';
    const retryUrl = `${protocol}://${host}/${language}/daily?retryToken=${token}`;

    auditLog(req.adminUser, 'GENERATE_RETRY_LINK', { puzzleDate, language, token: tokenData.token });

    res.json({
      success: true,
      token: tokenData.token,
      retryUrl,
      puzzleDate,
      language,
      expiresAt: tokenData.expires_at,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Generate retry link error: ${err.message}`);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * POST /api/admin/send-test-email
 * Send a test daily challenge email to a specified address
 */
router.post('/send-test-email', async (req: AdminRequest, res: Response): Promise<void> => {
  const startTime = Date.now();
  logger.info('ADMIN_API', '====== Send test email request START ======');

  try {
    // Dynamic import to avoid issues with ES modules
    const { sendTestEmail, isEmailServiceConfigured } = await import('../../lib/email');

    // Check if email service is configured
    if (!isEmailServiceConfigured()) {
      logger.warn('ADMIN_API', 'Email service not configured');
      res.status(503).json({
        error: 'Email service not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL in your environment variables.',
        details: {
          hasApiKey: !!process.env.RESEND_API_KEY,
          hasFromEmail: !!process.env.RESEND_FROM_EMAIL,
        }
      });
      return;
    }

    // Get admin info from the request (already authenticated by middleware)
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser(req.headers.authorization?.substring(7));

    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Parse request body
    const { email, recipientName } = req.body || {};

    // Use provided email or default to admin's email
    const targetEmail = email || user.email;
    if (!targetEmail) {
      res.status(400).json({ error: 'No email address provided and admin has no email' });
      return;
    }

    // Use provided name or default
    const name = recipientName || req.adminUser?.username || 'Test User';

    logger.info('ADMIN_API', `Sending test email to ${targetEmail}`);

    // Send the test email
    const result = await sendTestEmail(targetEmail, name);

    if (!result.success) {
      logger.warn('ADMIN_API', `Send failed: ${result.error}`);
      res.status(500).json({ error: result.error || 'Failed to send test email' });
      return;
    }

    logger.info('ADMIN_API', `====== SUCCESS - Total time: ${Date.now() - startTime}ms ======`);
    auditLog(req.adminUser, 'SEND_TEST_EMAIL', { targetEmail });

    res.json({
      success: true,
      message: `Test email sent to ${targetEmail}`,
      sentTo: targetEmail,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Send test email error: ${err.message}`);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * GET /api/admin/community-words/stats
 * Get community words statistics by language
 */
router.get('/community-words/stats', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('word_scores')
      .select('language, net_score');

    if (error) throw error;

    // Aggregate by language
    interface LanguageScoreRow {
      language: string;
      net_score: number;
    }

    const statsByLanguage: Record<string, { total: number; validated: number; pendingReview: number; rejected: number; pending: number }> = {};

    (data as LanguageScoreRow[] || []).forEach((row: LanguageScoreRow) => {
      if (!statsByLanguage[row.language]) {
        statsByLanguage[row.language] = { total: 0, validated: 0, pendingReview: 0, rejected: 0, pending: 0 };
      }
      statsByLanguage[row.language].total++;

      if (row.net_score >= 10) {
        statsByLanguage[row.language].validated++;
      } else if (row.net_score >= 3) {
        statsByLanguage[row.language].pendingReview++;
      } else if (row.net_score < 0) {
        statsByLanguage[row.language].rejected++;
      } else {
        statsByLanguage[row.language].pending++;
      }
    });

    res.json({ statsByLanguage });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Community words stats error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch community words stats' });
  }
});

export default router;
