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

const express = require('express');
const router = express.Router();
const { getSupabase, isSupabaseConfigured } = require('../modules/supabaseServer');
const { getAllGames } = require('../modules/gameStateManager');
const logger = require('../utils/logger');

// ==================== Rate Limiting ====================

/**
 * Simple in-memory rate limiter for admin endpoints
 * More restrictive than general API rate limiting
 */
const adminRateLimiter = {
  requests: new Map(),
  maxRequests: 100,       // Max requests per window
  windowMs: 60 * 1000,    // 1 minute window

  isAllowed(ip) {
    const now = Date.now();
    const key = `admin:${ip}`;

    if (!this.requests.has(key)) {
      this.requests.set(key, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    const record = this.requests.get(key);
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
  cleanup() {
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
function auditLog(adminUser, action, details = {}) {
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
function adminRateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
             req.headers['x-real-ip'] ||
             req.socket.remoteAddress ||
             'unknown';

  if (!adminRateLimiter.isAllowed(ip)) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: 60
    });
  }

  next();
}

/**
 * Admin authentication middleware
 * Verifies JWT token and checks for admin role
 */
async function adminAuth(req, res, next) {
  // Generate request ID for tracing
  const requestId = `admin-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('ADMIN_API', `Missing auth header [${requestId}]`);
    return res.status(401).json({ error: 'Missing authorization header', requestId });
  }

  const token = authHeader.substring(7);
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Auth service not available', requestId });
  }

  try {
    const supabase = getSupabase();
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logger.warn('ADMIN_API', `Invalid token [${requestId}]`);
      return res.status(401).json({ error: 'Invalid token', requestId });
    }

    // Check if user is admin - server-side verification
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, username')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      logger.warn('ADMIN_API', `Non-admin access attempt by ${user.email} [${requestId}]`);
      return res.status(403).json({ error: 'Admin access required', requestId });
    }

    req.adminUser = { ...user, username: profile.username };

    // Log successful admin access
    logger.debug('ADMIN_API', `Admin access: ${user.email} -> ${req.method} ${req.path} [${requestId}]`);

    next();
  } catch (error) {
    logger.error('ADMIN_API', `Auth error: ${error.message} [${requestId}]`);
    return res.status(500).json({ error: 'Authentication failed', requestId });
  }
}

// Apply rate limiting first, then auth
router.use(adminRateLimit);
router.use(adminAuth);

/**
 * GET /api/admin/stats
 * Get main dashboard statistics
 */
router.get('/stats', async (_req, res) => {
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
    const uniquePlayersToday = new Set(todayPlayersData?.map(r => r.player_id)).size;

    // Get unique players this week
    const { data: weekPlayersData } = await supabase
      .from('game_results')
      .select('player_id')
      .gte('created_at', weekAgo);
    const uniquePlayersWeek = new Set(weekPlayersData?.map(r => r.player_id)).size;

    // Get unique players this month
    const { data: monthPlayersData } = await supabase
      .from('game_results')
      .select('player_id')
      .gte('created_at', monthAgo);
    const uniquePlayersMonth = new Set(monthPlayersData?.map(r => r.player_id)).size;

    // Get cumulative game time (in hours)
    const { data: timeData } = await supabase
      .from('profiles')
      .select('total_time_played');
    const totalGameTimeSeconds = timeData?.reduce((sum, p) => sum + (p.total_time_played || 0), 0) || 0;
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
    const totalWords = wordsData?.reduce((sum, p) => sum + (p.total_words || 0), 0) || 0;

    // Get games by language
    const { data: langData } = await supabase
      .from('game_results')
      .select('language');
    const languageCounts = {};
    langData?.forEach(g => {
      const lang = g.language || 'en';
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    });

    res.json({
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
    });
  } catch (error) {
    logger.error('ADMIN_API', `Stats error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/admin/players/countries
 * Get player distribution by country
 */
router.get('/players/countries', async (_req, res) => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('profiles')
      .select('country_code')
      .not('country_code', 'is', null);

    if (error) throw error;

    const countryCounts = {};
    data?.forEach(p => {
      const country = p.country_code || 'Unknown';
      countryCounts[country] = (countryCounts[country] || 0) + 1;
    });

    // Sort by count descending
    const sorted = Object.entries(countryCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([country, count]) => ({ country, count }));

    res.json({ countries: sorted });
  } catch (error) {
    logger.error('ADMIN_API', `Countries error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch country data' });
  }
});

/**
 * GET /api/admin/players/sources
 * Get player acquisition sources (UTM tracking)
 */
router.get('/players/sources', async (_req, res) => {
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

    const sourceCounts = { registered: {}, guests: {} };
    const mediumCounts = { registered: {}, guests: {} };
    const campaignCounts = { registered: {}, guests: {} };
    const referrerCounts = { registered: {}, guests: {} };
    const guestNames = {};

    // Process registered user data
    profileData?.forEach(p => {
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
    eventData?.forEach(event => {
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
    const combineCounts = (registered, guests) => {
      const combined = { ...registered };
      Object.entries(guests).forEach(([key, count]) => {
        combined[key] = (combined[key] || 0) + count;
      });
      return combined;
    };

    const sortByCount = (obj) => Object.entries(obj)
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
    logger.error('ADMIN_API', `Sources error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch source data' });
  }
});

/**
 * GET /api/admin/players/top
 * Get top players by score
 */
router.get('/players/top', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_emoji, avatar_color, total_score, total_games, total_words, total_time_played, ranked_mmr, current_level, created_at')
      .order('total_score', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({ players: data || [] });
  } catch (error) {
    logger.error('ADMIN_API', `Top players error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch top players' });
  }
});

/**
 * GET /api/admin/players/recent
 * Get recently active players
 */
router.get('/players/recent', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_emoji, avatar_color, total_score, total_games, last_game_at, created_at')
      .order('last_game_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) throw error;

    res.json({ players: data || [] });
  } catch (error) {
    logger.error('ADMIN_API', `Recent players error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch recent players' });
  }
});

/**
 * GET /api/admin/games/history
 * Get recent games history
 */
router.get('/games/history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
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
    logger.error('ADMIN_API', `Games history error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch games history' });
  }
});

/**
 * GET /api/admin/activity/daily
 * Get daily activity for charts
 */
router.get('/activity/daily', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const supabase = getSupabase();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data: gamesData, error: gamesError } = await supabase
      .from('game_results')
      .select('created_at, player_id')
      .gte('created_at', startDate.toISOString());

    if (gamesError) throw gamesError;

    const { data: signupsData, error: signupsError } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', startDate.toISOString());

    if (signupsError) throw signupsError;

    // Aggregate by day
    const dailyData = {};
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      dailyData[dateStr] = { games: 0, uniquePlayers: new Set(), signups: 0 };
    }

    gamesData?.forEach(game => {
      const dateStr = game.created_at.split('T')[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].games++;
        dailyData[dateStr].uniquePlayers.add(game.player_id);
      }
    });

    signupsData?.forEach(profile => {
      const dateStr = profile.created_at.split('T')[0];
      if (dailyData[dateStr]) {
        dailyData[dateStr].signups++;
      }
    });

    const result = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        games: data.games,
        uniquePlayers: data.uniquePlayers.size,
        signups: data.signups,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({ daily: result });
  } catch (error) {
    logger.error('ADMIN_API', `Daily activity error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch daily activity' });
  }
});

/**
 * GET /api/admin/realtime
 * Get current realtime stats
 */
router.get('/realtime', async (req, res) => {
  try {
    const games = getAllGames();
    const io = req.app.get('io');

    const activeRooms = games.length;
    const playersOnline = games.reduce((sum, g) => sum + g.playerCount, 0);
    const gamesInProgress = games.filter(g => g.gameState === 'playing').length;
    const socketConnections = io ? io.sockets.sockets.size : 0;

    res.json({
      activeRooms,
      playersOnline,
      gamesInProgress,
      socketConnections,
      timestamp: Date.now(),
    });
  } catch (error) {
    logger.error('ADMIN_API', `Realtime error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch realtime stats' });
  }
});

/**
 * GET /api/admin/bot-words
 * Get bot words with negative votes for review
 */
router.get('/bot-words', async (req, res) => {
  try {
    const supabase = getSupabase();
    const language = req.query.language || null;

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
        return res.json({ words: [], message: 'Bot word tracking not yet enabled. Run migration 013.' });
      }
      throw error;
    }

    // Aggregate votes by word
    const wordStats = {};
    votes?.forEach(vote => {
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

    const words = Object.values(wordStats)
      .map(w => ({
        ...w,
        gameCodes: Array.from(w.gameCodes),
        netScore: w.likes - w.dislikes
      }))
      .filter(w => w.dislikes > 0)
      .sort((a, b) => b.dislikes - a.dislikes);

    res.json({ words });
  } catch (error) {
    logger.error('ADMIN_API', `Bot words error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch bot words' });
  }
});

/**
 * GET /api/admin/bot-blacklist
 * Get the bot word blacklist
 */
router.get('/bot-blacklist', async (req, res) => {
  try {
    const supabase = getSupabase();
    const language = req.query.language || null;

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
        return res.json({ blacklist: [], message: 'Blacklist table not yet created. Run migration 013.' });
      }
      throw error;
    }

    res.json({ blacklist: data || [] });
  } catch (error) {
    logger.error('ADMIN_API', `Bot blacklist error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch bot blacklist' });
  }
});

/**
 * POST /api/admin/bot-blacklist
 * Add a word to the blacklist
 */
router.post('/bot-blacklist', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { word, language, reason } = req.body;

    if (!word || !language) {
      return res.status(400).json({ error: 'word and language are required' });
    }

    const { data, error } = await supabase
      .from('bot_word_blacklist')
      .insert({
        word: word.toLowerCase().trim(),
        language,
        reason: reason || null,
        blacklisted_by: req.adminUser.id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Word already blacklisted' });
      }
      throw error;
    }

    // Audit log for security trail
    auditLog(req.adminUser, 'BLACKLIST_ADD', { word, language, reason, entryId: data.id });
    res.json({ success: true, blacklistEntry: data });
  } catch (error) {
    logger.error('ADMIN_API', `Add blacklist error: ${error.message}`);
    res.status(500).json({ error: 'Failed to add word to blacklist' });
  }
});

/**
 * DELETE /api/admin/bot-blacklist/:id
 * Remove a word from the blacklist
 */
router.delete('/bot-blacklist/:id', async (req, res) => {
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
    logger.error('ADMIN_API', `Delete blacklist error: ${error.message}`);
    res.status(500).json({ error: 'Failed to remove word from blacklist' });
  }
});

/**
 * GET /api/admin/analytics/guest-players
 * Get guest player statistics
 */
router.get('/analytics/guest-players', async (req, res) => {
  try {
    const supabase = getSupabase();
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);

    const { data: events, error } = await supabase
      .from('analytics_events')
      .select('metadata, utm_source, utm_medium, utm_campaign, referrer, country_code, created_at')
      .not('metadata->guest_name', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Aggregate by guest name
    const guestStats = {};
    events?.forEach(event => {
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
    const sourceStats = {};
    guests.forEach(guest => {
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
    logger.error('ADMIN_API', `Guest players error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch guest player data' });
  }
});

module.exports = router;
