/**
 * Daily Buzz Challenge API Routes
 * RESTful endpoints for trend-based daily word challenges
 */

import { Router, Request, Response } from 'express';
import { generateDailyBuzz, getDailyBuzz } from '../services/buzzGenerator';
import { fetchGoogleTrends } from '../services/serpApiClient';

const { getSupabase, isSupabaseConfigured } = require('../modules/supabaseServer');
import logger from '../utils/logger';
import {
  REGION_MAP,
  SUPPORTED_LANGUAGES,
  type AdminRequest,
  transformBuzzResponse,
  buzzAdminAuth,
} from './buzzChallenge/types';

const router = Router();

// Prevents duplicate concurrent AI generations for the same date/language
const inFlightGenerations = new Map<string, Promise<unknown>>();

// ==================== Public Routes ====================

/**
 * GET /buzz/history/:language
 * NOTE: Must be before /buzz/:date/:language to prevent "history" matching as date
 */
router.get('/buzz/history/:language', async (req: Request, res: Response): Promise<void> => {
  try {
    const { language } = req.params;
    const limit = parseInt(req.query.limit as string) || 30;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      res.status(400).json({ error: 'Unsupported language. Use: en, he, sv, ja, or es' });
      return;
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data, error, count } = await supabase
      .from('daily_buzz_challenges')
      .select('puzzle_date, trending_summary, image_url', { count: 'exact' })
      .eq('language', language)
      .order('puzzle_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[BUZZ] Error fetching history:', error.message);
      res.status(500).json({ error: 'Failed to fetch challenge history' });
      return;
    }

    res.json({
      success: true, data: data || [],
      pagination: { total: count || 0, limit, offset, hasMore: (count || 0) > offset + limit },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BUZZ] Error fetching history:', errorMessage);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to fetch challenge history' });
  }
});

/**
 * GET /buzz/:date/:language
 */
router.get('/buzz/:date/:language', async (req: Request, res: Response): Promise<void> => {
  try {
    const { date, language } = req.params;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      return;
    }

    if (!SUPPORTED_LANGUAGES.includes(language)) {
      res.status(400).json({ error: 'Unsupported language. Use: en, he, sv, ja, or es' });
      return;
    }

    let challenge = await getDailyBuzz(date, language);

    if (!challenge) {
      const genKey = `${date}:${language}`;
      const existing = inFlightGenerations.get(genKey);
      if (existing) {
        console.log(`[BUZZ] Generation already in flight for ${genKey}, waiting...`);
        try {
          await existing;
          challenge = await getDailyBuzz(date, language);
        } catch {
          // Generation failed, fall through to 404
        }
      } else {
        console.log(`[BUZZ] Challenge not found, generating for ${date} (${language})`);
        const genPromise = generateDailyBuzz(new Date(date), language);
        inFlightGenerations.set(genKey, genPromise);
        try {
          challenge = await genPromise;
        } catch (genError: any) {
          console.error(`[BUZZ] On-demand generation failed for ${genKey}: ${genError.message}`);
        } finally {
          inFlightGenerations.delete(genKey);
        }
      }
    }

    if (!challenge) {
      res.status(404).json({ success: false, error: 'Challenge not available. Try again later.' });
      return;
    }

    res.json({ success: true, data: transformBuzzResponse(challenge as unknown as Record<string, unknown>) });
  } catch (error: any) {
    console.error('[BUZZ] Error fetching challenge:', error.message);
    if (res.headersSent) return;
    res.status(500).json({ success: false, error: 'Failed to fetch daily challenge' });
  }
});

/**
 * POST /buzz/submit
 */
router.post('/buzz/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { challenge_id, player_id, guest_fingerprint, completed, challenges_solved, score, completion_time_seconds } = req.body;

    if (!challenge_id) { res.status(400).json({ error: 'challenge_id is required' }); return; }
    if (!player_id && !guest_fingerprint) { res.status(400).json({ error: 'player_id or guest_fingerprint required' }); return; }

    const existingQuery = supabase.from('daily_buzz_attempts').select('id').eq('challenge_id', challenge_id);
    if (player_id) existingQuery.eq('player_id', player_id);
    else existingQuery.eq('guest_fingerprint', guest_fingerprint);

    const { data: existing } = await existingQuery.single();
    if (existing) { res.status(409).json({ error: 'Challenge already submitted' }); return; }

    const { data, error } = await supabase.from('daily_buzz_attempts')
      .insert({
        challenge_id, player_id: player_id || null, guest_fingerprint: guest_fingerprint || null,
        completed, challenges_solved, score, completion_time_seconds,
      })
      .select().single();

    if (error) throw error;

    if (player_id && completed) {
      const { data: challengeData } = await supabase.from('daily_buzz_challenges')
        .select('puzzle_date').eq('id', challenge_id).single();

      if (challengeData) {
        await supabase.rpc('update_buzz_streak', { p_player_id: player_id, p_completion_date: challengeData.puzzle_date });
      }
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[BUZZ] Error submitting challenge:', error.message);
    if (res.headersSent) return;
    res.status(500).json({ success: false, error: 'Failed to submit challenge' });
  }
});

/**
 * GET /buzz/leaderboard/:date/:language
 */
router.get('/buzz/leaderboard/:date/:language', async (req: Request, res: Response): Promise<void> => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { date, language } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const region = REGION_MAP[language] || 'US';

    const { data: challenge } = await supabase.from('daily_buzz_challenges').select('id')
      .eq('puzzle_date', date).eq('language', language).eq('region', region).single();

    if (!challenge) { res.status(404).json({ error: 'Challenge not found' }); return; }

    const { data, error } = await supabase.from('daily_buzz_leaderboard').select('*')
      .eq('challenge_id', challenge.id).limit(limit);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[BUZZ] Error fetching leaderboard:', error.message);
    if (res.headersSent) return;
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /buzz/stats/:date/:language
 */
router.get('/buzz/stats/:date/:language', async (req: Request, res: Response): Promise<void> => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { date, language } = req.params;
    const region = REGION_MAP[language] || 'US';

    const { data: challenge } = await supabase.from('daily_buzz_challenges').select('id')
      .eq('puzzle_date', date).eq('language', language).eq('region', region).single();

    if (!challenge) { res.status(404).json({ error: 'Challenge not found' }); return; }

    const { data: attempts, error } = await supabase.from('daily_buzz_attempts')
      .select('completed, score').eq('challenge_id', challenge.id);

    if (error) throw error;

    const totalAttempts = attempts?.length || 0;
    const completedAttempts = attempts?.filter((a) => a.completed).length || 0;
    const averageScore = attempts && attempts.length > 0
      ? attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length : 0;

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
    if (res.headersSent) return;
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

/**
 * GET /buzz/check-played/:date/:language
 */
router.get('/buzz/check-played/:date/:language', async (req: Request, res: Response): Promise<void> => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { date, language } = req.params;
    const { player_id, guest_fingerprint } = req.query;

    if (!player_id && !guest_fingerprint) {
      res.status(400).json({ error: 'player_id or guest_fingerprint required' }); return;
    }

    const region = REGION_MAP[language] || 'US';
    const { data: challenge } = await supabase.from('daily_buzz_challenges').select('id')
      .eq('puzzle_date', date).eq('language', language).eq('region', region).single();

    if (!challenge) { res.json({ success: true, data: { played: false } }); return; }

    const query = supabase.from('daily_buzz_attempts').select('completed, score').eq('challenge_id', challenge.id);
    if (player_id) query.eq('player_id', player_id as string);
    else query.eq('guest_fingerprint', guest_fingerprint as string);

    const { data: attempt } = await query.single();

    res.json({
      success: true,
      data: { played: !!attempt, completed: attempt?.completed || false, score: attempt?.score || 0 },
    });
  } catch (error: any) {
    console.error('[BUZZ] Error checking play status:', error.message);
    if (res.headersSent) return;
    res.status(500).json({ success: false, error: 'Failed to check play status' });
  }
});

/**
 * GET /buzz/streak/:playerId
 */
router.get('/buzz/streak/:playerId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    const { data, error } = await supabase.from('buzz_streaks').select('*')
      .eq('player_id', req.params.playerId).single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({
      success: true,
      data: data || { current_streak: 0, longest_streak: 0, total_challenges_completed: 0, favorite_topics: [] },
    });
  } catch (error: any) {
    console.error('[BUZZ] Error fetching streak:', error.message);
    if (res.headersSent) return;
    res.status(500).json({ success: false, error: 'Failed to fetch streak' });
  }
});

/**
 * GET /buzz/trending-preview/:language
 */
router.get('/buzz/trending-preview/:language', async (req: Request, res: Response): Promise<void> => {
  try {
    const { language } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const challenge = await getDailyBuzz(today, language);

    if (!challenge) { res.status(404).json({ error: 'No challenge available for today' }); return; }

    res.json({
      success: true,
      data: {
        date: challenge.puzzle_date,
        trending_summary: challenge.trending_summary,
        topics: challenge.trending_topics.slice(0, 3).map((topic) => ({
          query: topic.query,
          volume: topic.search_volume ? `${(topic.search_volume / 1000).toFixed(0)}K+` : 'trending',
        })),
        total_challenges: challenge.challenges.length,
      },
    });
  } catch (error: any) {
    console.error('[BUZZ] Error fetching preview:', error.message);
    if (res.headersSent) return;
    res.status(500).json({ success: false, error: 'Failed to fetch preview' });
  }
});

/**
 * POST /buzz/request-challenge
 */
router.post('/buzz/request-challenge', async (req: Request, res: Response): Promise<void> => {
  try {
    const { language, player_id, guest_fingerprint, reason } = req.body;

    if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
      res.status(400).json({ error: 'Valid language required (en, he, sv, ja, es)' }); return;
    }
    if (!player_id && !guest_fingerprint) {
      res.status(400).json({ error: 'player_id or guest_fingerprint required' }); return;
    }
    if (!isSupabaseConfigured()) {
      res.status(503).json({ error: 'Database service unavailable' }); return;
    }

    const supabase = getSupabase();
    const today = new Date().toISOString().split('T')[0];

    const duplicateQuery = supabase.from('buzz_challenge_requests').select('id')
      .eq('language', language).eq('request_date', today);
    if (player_id) duplicateQuery.eq('player_id', player_id);
    else duplicateQuery.eq('guest_fingerprint', guest_fingerprint);

    const { data: existingRequest } = await duplicateQuery.single();
    if (existingRequest) {
      res.json({ success: true, message: 'Request already submitted for this language today', alreadyRequested: true });
      return;
    }

    const { error: insertError } = await supabase.from('buzz_challenge_requests').insert({
      language, player_id: player_id || null, guest_fingerprint: guest_fingerprint || null,
      reason: reason || null, request_date: today, status: 'pending',
    });

    if (insertError) {
      logger.error('BUZZ_REQUEST', `Failed to store request: ${insertError.message}`);
      res.status(500).json({ error: 'Failed to store request' }); return;
    }

    const { count: requestCount } = await supabase.from('buzz_challenge_requests')
      .select('*', { count: 'exact', head: true }).eq('language', language).eq('request_date', today);

    logger.info('BUZZ_REQUEST', `Challenge requested for ${language} (total today: ${requestCount})`);
    res.json({ success: true, message: 'Challenge request submitted successfully', requestCount: requestCount || 1 });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('BUZZ_REQUEST', `Error processing request: ${err.message}`);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to process request' });
  }
});

/**
 * GET /buzz/check-availability/:language
 */
router.get('/buzz/check-availability/:language', async (req: Request, res: Response): Promise<void> => {
  try {
    const { language } = req.params;
    if (!SUPPORTED_LANGUAGES.includes(language)) {
      res.status(400).json({ error: 'Unsupported language' }); return;
    }

    const today = new Date().toISOString().split('T')[0];
    const challenge = await getDailyBuzz(today, language);
    res.json({ available: !!challenge, language, date: today });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error('BUZZ', `Error checking availability: ${err.message}`);
    if (res.headersSent) return;
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// ==================== Admin Routes ====================

router.post('/buzz/admin/generate', buzzAdminAuth, async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { date, language, force } = req.body;
    if (!date || !language) { res.status(400).json({ error: 'date and language required' }); return; }

    const existing = await getDailyBuzz(date, language);
    if (existing && !force) {
      res.status(409).json({ error: 'Challenge already exists. Use force=true to regenerate' }); return;
    }

    const region = REGION_MAP[language] || 'US';
    const trends = await fetchGoogleTrends(region, language);
    const challenge = await generateDailyBuzz(new Date(date), language, trends);

    res.json({ success: true, data: challenge });
  } catch (error: any) {
    console.error('[BUZZ] Error generating challenge:', error.message);
    if (res.headersSent) return;
    res.status(500).json({ success: false, error: 'Failed to generate challenge' });
  }
});

router.get('/buzz/admin/trends/:region', buzzAdminAuth, async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const trends = await fetchGoogleTrends(req.params.region, req.query.language as string);
    res.json({ success: true, data: trends });
  } catch (error: any) {
    console.error('[BUZZ] Error fetching trends:', error.message);
    if (res.headersSent) return;
    res.status(500).json({ success: false, error: 'Failed to fetch trends' });
  }
});

export default router;
