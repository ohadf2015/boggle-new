/**
 * Daily Buzz Challenge API Routes
 * RESTful endpoints for trend-based daily word challenges
 */

import { Router, Request, Response, NextFunction } from 'express';
import { generateDailyBuzz, getDailyBuzz } from '../services/buzzGenerator';
import { fetchGoogleTrends } from '../services/serpApiClient';

const { getSupabase, isSupabaseConfigured } = require('../modules/supabaseServer');
import logger from '../utils/logger';

const router = Router();

// ==================== Admin Authentication Middleware ====================

interface AdminUser {
  id: string;
  email: string;
  username?: string;
}

interface AdminRequest extends Request {
  adminUser?: AdminUser;
}

/**
 * Admin authentication middleware for Buzz admin routes
 * Verifies JWT token and checks for admin role
 */
async function buzzAdminAuth(req: AdminRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('BUZZ_ADMIN', 'Missing auth header');
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.substring(7);
  if (!isSupabaseConfigured()) {
    res.status(503).json({ error: 'Auth service not available' });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logger.warn('BUZZ_ADMIN', 'Invalid token');
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, username')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      logger.warn('BUZZ_ADMIN', `Non-admin access attempt by ${user.email}`);
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    req.adminUser = { id: user.id, email: user.email!, username: profile.username };
    logger.debug('BUZZ_ADMIN', `Admin access: ${user.email} -> ${req.method} ${req.path}`);
    next();
  } catch (error) {
    const err = error as Error;
    logger.error('BUZZ_ADMIN', `Auth error: ${err.message}`);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Map backend challenge types to frontend-expected types
 * Backend (AI-generated): anagram, fill_blank, word_chain, definition_match, trending_trio, riddle
 * Frontend (components): scrambled, fillBlank, chain, spotOn, trio
 */
function mapChallengeType(backendType: string): string {
  const typeMap: Record<string, string> = {
    anagram: 'scrambled',
    fill_blank: 'fillBlank',
    word_chain: 'chain',
    definition_match: 'spotOn',
    trending_trio: 'trio',
    riddle: 'scrambled', // Riddles use the scrambled UI with a clue
    wordle_guess: 'wordle', // Wordle-style 5-letter word guessing
  };
  return typeMap[backendType] || backendType;
}

/**
 * Transform database response (snake_case) to frontend format (camelCase)
 * Only transforms top-level keys that the frontend expects
 */
interface BuzzApiResponse {
  id?: number;
  puzzleDate: string;
  language: string;
  trendingSummary: string;
  trendingTopics: Array<{
    query: string;
    volume?: number;
    newsSnippet?: string;
  }>;
  challenges: Array<{
    type: string;
    trendTopic: string;
    prompt: string;
    answer: string;
    hint?: string;
    difficulty: string;
    trendingContext?: string;
    options?: string[];
  }>;
  imageUrl?: string;
}

function transformBuzzResponse(dbData: Record<string, unknown>): BuzzApiResponse {
  return {
    id: dbData.id as number | undefined,
    puzzleDate: dbData.puzzle_date as string,
    language: dbData.language as string,
    trendingSummary: dbData.trending_summary as string,
    trendingTopics: (dbData.trending_topics as Array<Record<string, unknown>> || []).map((topic) => ({
      query: topic.query as string,
      volume: topic.search_volume as number | undefined,
      newsSnippet: topic.news_snippet as string | undefined,
    })),
    challenges: (dbData.challenges as Array<Record<string, unknown>> || []).map((challenge) => ({
      type: mapChallengeType(challenge.type as string),
      trendTopic: challenge.trend_topic as string,
      prompt: challenge.prompt as string,
      answer: challenge.answer as string,
      hint: challenge.hint as string | undefined,
      difficulty: challenge.difficulty as string,
      trendingContext: challenge.trending_context as string | undefined,
      options: challenge.options as string[] | undefined,
    })),
    imageUrl: dbData.image_url as string | undefined,
  };
}

/**
 * GET /buzz/:date/:language
 * Fetch daily buzz challenge for a specific date and language
 */
router.get(
  '/buzz/:date/:language',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { date, language } = req.params;

      // Validate date format (YYYY-MM-DD)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
        return;
      }

      // Validate language
      const supportedLanguages = ['en', 'he', 'sv', 'ja', 'es'];
      if (!supportedLanguages.includes(language)) {
        res
          .status(400)
          .json({ error: 'Unsupported language. Use: en, he, sv, ja, or es' });
        return;
      }

      // Get challenge from database
      let challenge = await getDailyBuzz(date, language);

      // If not found, generate it (for manual requests or testing)
      if (!challenge) {
        console.log(`[BUZZ] Challenge not found, generating for ${date} (${language})`);
        challenge = await generateDailyBuzz(new Date(date), language);
      }

      // Transform snake_case database response to camelCase for frontend
      const transformedData = transformBuzzResponse(challenge as unknown as Record<string, unknown>);

      res.json({
        success: true,
        data: transformedData,
      });
    } catch (error: any) {
      console.error('[BUZZ] Error fetching challenge:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch daily challenge',
      });
    }
  }
);

/**
 * POST /buzz/submit
 * Submit completed challenge
 */
router.post('/buzz/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const {
      challenge_id,
      player_id,
      guest_fingerprint,
      completed,
      challenges_solved,
      score,
      completion_time_seconds,
    } = req.body;

    // Validation
    if (!challenge_id) {
      res.status(400).json({ error: 'challenge_id is required' });
      return;
    }

    if (!player_id && !guest_fingerprint) {
      res.status(400).json({ error: 'player_id or guest_fingerprint required' });
      return;
    }

    // Check for duplicate submission
    const existingQuery = supabase
      .from('daily_buzz_attempts')
      .select('id')
      .eq('challenge_id', challenge_id);

    if (player_id) {
      existingQuery.eq('player_id', player_id);
    } else {
      existingQuery.eq('guest_fingerprint', guest_fingerprint);
    }

    const { data: existing } = await existingQuery.single();

    if (existing) {
      res.status(409).json({
        error: 'Challenge already submitted',
      });
      return;
    }

    // Insert attempt
    const { data, error } = await supabase
      .from('daily_buzz_attempts')
      .insert({
        challenge_id,
        player_id: player_id || null,
        guest_fingerprint: guest_fingerprint || null,
        completed,
        challenges_solved,
        score,
        completion_time_seconds,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update streak if authenticated user and completed
    if (player_id && completed) {
      const { data: challengeData } = await supabase
        .from('daily_buzz_challenges')
        .select('puzzle_date')
        .eq('id', challenge_id)
        .single();

      if (challengeData) {
        // Call database function to update streak
        await supabase.rpc('update_buzz_streak', {
          p_player_id: player_id,
          p_completion_date: challengeData.puzzle_date,
        });
      }
    }

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('[BUZZ] Error submitting challenge:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to submit challenge',
    });
  }
});

/**
 * GET /buzz/leaderboard/:date/:language
 * Get daily leaderboard for specific date and language
 */
router.get(
  '/buzz/leaderboard/:date/:language',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { date, language } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;

      // Get challenge ID first
      const regionMap: Record<string, string> = {
        en: 'US',
        he: 'IL',
        sv: 'SE',
        ja: 'JP',
        es: 'ES',
      };
      const region = regionMap[language] || 'US';

      const { data: challenge } = await supabase
        .from('daily_buzz_challenges')
        .select('id')
        .eq('puzzle_date', date)
        .eq('language', language)
        .eq('region', region)
        .single();

      if (!challenge) {
        res.status(404).json({ error: 'Challenge not found' });
        return;
      }

      // Use the view for leaderboard
      const { data, error } = await supabase
        .from('daily_buzz_leaderboard')
        .select('*')
        .eq('challenge_id', challenge.id)
        .limit(limit);

      if (error) {
        throw error;
      }

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      console.error('[BUZZ] Error fetching leaderboard:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch leaderboard',
      });
    }
  }
);

/**
 * GET /buzz/stats/:date/:language
 * Get aggregate stats for a specific challenge
 */
router.get(
  '/buzz/stats/:date/:language',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { date, language } = req.params;

      const regionMap: Record<string, string> = {
        en: 'US',
        he: 'IL',
        sv: 'SE',
        ja: 'JP',
        es: 'ES',
      };
      const region = regionMap[language] || 'US';

      const { data: challenge } = await supabase
        .from('daily_buzz_challenges')
        .select('id')
        .eq('puzzle_date', date)
        .eq('language', language)
        .eq('region', region)
        .single();

      if (!challenge) {
        res.status(404).json({ error: 'Challenge not found' });
        return;
      }

      // Get stats
      const { data: attempts, error } = await supabase
        .from('daily_buzz_attempts')
        .select('completed, score')
        .eq('challenge_id', challenge.id);

      if (error) {
        throw error;
      }

      const totalAttempts = attempts?.length || 0;
      const completedAttempts = attempts?.filter((a) => a.completed).length || 0;
      const averageScore =
        attempts && attempts.length > 0
          ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length
          : 0;

      res.json({
        success: true,
        data: {
          total_attempts: totalAttempts,
          completed_attempts: completedAttempts,
          completion_rate: totalAttempts > 0 ? (completedAttempts / totalAttempts) * 100 : 0,
          average_score: Math.round(averageScore),
        },
      });
    } catch (error: any) {
      console.error('[BUZZ] Error fetching stats:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch stats',
      });
    }
  }
);

/**
 * GET /buzz/check-played/:date/:language
 * Check if user has already played today's challenge
 */
router.get(
  '/buzz/check-played/:date/:language',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { date, language } = req.params;
      const { player_id, guest_fingerprint } = req.query;

      if (!player_id && !guest_fingerprint) {
        res.status(400).json({ error: 'player_id or guest_fingerprint required' });
        return;
      }

      const regionMap: Record<string, string> = {
        en: 'US',
        he: 'IL',
        sv: 'SE',
        ja: 'JP',
        es: 'ES',
      };
      const region = regionMap[language] || 'US';

      // Get challenge ID
      const { data: challenge } = await supabase
        .from('daily_buzz_challenges')
        .select('id')
        .eq('puzzle_date', date)
        .eq('language', language)
        .eq('region', region)
        .single();

      if (!challenge) {
        res.json({
          success: true,
          data: { played: false },
        });
        return;
      }

      // Check if user has played
      const query = supabase
        .from('daily_buzz_attempts')
        .select('completed, score')
        .eq('challenge_id', challenge.id);

      if (player_id) {
        query.eq('player_id', player_id as string);
      } else {
        query.eq('guest_fingerprint', guest_fingerprint as string);
      }

      const { data: attempt } = await query.single();

      res.json({
        success: true,
        data: {
          played: !!attempt,
          completed: attempt?.completed || false,
          score: attempt?.score || 0,
        },
      });
    } catch (error: any) {
      console.error('[BUZZ] Error checking play status:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to check play status',
      });
    }
  }
);

/**
 * GET /buzz/streak/:playerId
 * Get user's buzz streak
 */
router.get(
  '/buzz/streak/:playerId',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { playerId } = req.params;

      const { data, error } = await supabase
        .from('buzz_streaks')
        .select('*')
        .eq('player_id', playerId)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (user has no streak yet)
        throw error;
      }

      res.json({
        success: true,
        data: data || {
          current_streak: 0,
          longest_streak: 0,
          total_challenges_completed: 0,
          favorite_topics: [],
        },
      });
    } catch (error: any) {
      console.error('[BUZZ] Error fetching streak:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch streak',
      });
    }
  }
);

/**
 * GET /buzz/trending-preview/:language
 * Get preview of today's trending topics (no spoilers)
 */
router.get(
  '/buzz/trending-preview/:language',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { language } = req.params;
      const today = new Date().toISOString().split('T')[0];

      // Get challenge
      const challenge = await getDailyBuzz(today, language);

      if (!challenge) {
        res.status(404).json({ error: 'No challenge available for today' });
        return;
      }

      // Return only topic names and categories (no challenges)
      const preview = {
        date: challenge.puzzle_date,
        trending_summary: challenge.trending_summary,
        topics: challenge.trending_topics.slice(0, 3).map((topic) => ({
          query: topic.query,
          volume: topic.search_volume
            ? `${(topic.search_volume / 1000).toFixed(0)}K+`
            : 'trending',
        })),
        total_challenges: challenge.challenges.length,
      };

      res.json({
        success: true,
        data: preview,
      });
    } catch (error: any) {
      console.error('[BUZZ] Error fetching preview:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch preview',
      });
    }
  }
);

// ==========================================
// Admin Routes
// ==========================================

/**
 * POST /buzz/admin/generate
 * Manually trigger challenge generation (admin only)
 */
router.post(
  '/buzz/admin/generate',
  buzzAdminAuth,
  async (req: AdminRequest, res: Response): Promise<void> => {
    try {
      const { date, language, force } = req.body;

      if (!date || !language) {
        res.status(400).json({ error: 'date and language required' });
        return;
      }

      // Check if already exists (unless force = true)
      const existing = await getDailyBuzz(date, language);
      if (existing && !force) {
        res.status(409).json({
          error: 'Challenge already exists. Use force=true to regenerate',
        });
        return;
      }

      // Fetch fresh trends
      const regionMap: Record<string, string> = {
        en: 'US',
        he: 'IL',
        sv: 'SE',
        ja: 'JP',
        es: 'ES',
      };
      const region = regionMap[language] || 'US';
      const trends = await fetchGoogleTrends(region, language);

      // Generate challenge
      const challenge = await generateDailyBuzz(new Date(date), language, trends);

      res.json({
        success: true,
        data: challenge,
      });
    } catch (error: any) {
      console.error('[BUZZ] Error generating challenge:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to generate challenge',
      });
    }
  }
);

/**
 * GET /buzz/admin/trends/:region
 * View raw SERP API trends for debugging (admin only)
 */
router.get(
  '/buzz/admin/trends/:region',
  buzzAdminAuth,
  async (req: AdminRequest, res: Response): Promise<void> => {
    try {
      const { region } = req.params;
      const language = req.query.language as string;

      const trends = await fetchGoogleTrends(region, language);

      res.json({
        success: true,
        data: trends,
      });
    } catch (error: any) {
      console.error('[BUZZ] Error fetching trends:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch trends',
      });
    }
  }
);

export default router;
