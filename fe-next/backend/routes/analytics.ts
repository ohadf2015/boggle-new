/**
 * Analytics API Routes
 * Handles /api/analytics/* endpoints for event tracking
 */

import express, { Request, Response, Router } from 'express';
 
const { getSupabase, isSupabaseConfigured } = require('../modules/supabaseServer');
import logger from '../utils/logger';

const router: Router = express.Router();

interface GeoData {
  countryCode?: string | null;
}

interface TrackRequest extends Request {
  geoData?: GeoData;
  body: Request['body'] & {
    event_type?: string;
    session_id?: string;
    player_id?: string;
    guest_name?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    referrer?: string;
    metadata?: Record<string, unknown>;
  };
  headers: Request['headers'];
}

interface TrackResponse {
  success: boolean;
  event_id?: string;
  error?: string;
}

interface AnalyticsEventInsert {
  event_type: string;
  session_id: string | null;
  player_id: string | null;
  country_code: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  metadata: Record<string, unknown>;
}

/**
 * POST /api/analytics/track
 * Track analytics events (including guest players)
 */
router.post('/track', async (req: TrackRequest, res: Response): Promise<void> => {
  // Idempotent send — guards against double-write when an upstream timeout
  // middleware closes the response before the awaited Supabase call resolves.
  const send = (status: number, body: TrackResponse): void => {
    if (res.headersSent) return;
    res.status(status).json(body);
  };
  try {
    if (!isSupabaseConfigured()) {
      send(200, { success: false, error: 'Analytics service not available' });
      return;
    }

    const supabase = getSupabase();
    const {
      event_type,
      session_id,
      player_id,
      guest_name,
      utm_source,
      utm_medium,
      utm_campaign,
      referrer,
      metadata = {}
    } = req.body;

    if (!event_type) {
      send(400, { success: false, error: 'event_type is required' });
      return;
    }

    // Get country from geolocation if available
    const country_code = req.geoData?.countryCode || req.headers['x-country-code'] as string || null;

    // Include guest_name in metadata for tracking
    const enrichedMetadata: Record<string, unknown> = {
      ...metadata,
      guest_name: guest_name || null,
      user_agent: req.headers['user-agent'] || null,
    };

    const insertData: AnalyticsEventInsert = {
      event_type,
      session_id: session_id || null,
      // Authed user id (client-provided). Lets the admin game log resolve real
      // player names instead of rendering every authed player as "Guest".
      player_id: player_id || null,
      country_code,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      referrer: referrer || null,
      metadata: enrichedMetadata,
    };

    const { data, error } = await supabase
      .from('analytics_events')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      logger.error('ANALYTICS_API', `Track error: ${error.message}`);
      send(200, { success: false, error: error.message });
      return;
    }

    send(200, { success: true, event_id: data?.id });
  } catch (error) {
    const err = error as Error;
    logger.error('ANALYTICS_API', `Track error: ${err.message}`);
    send(200, { success: false, error: 'Failed to track event' });
  }
});

/**
 * GET /api/analytics/active-players
 * Get count of active players (for social proof widget)
 */
router.get('/active-players', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!isSupabaseConfigured()) {
      res.json({ count: 0, error: 'Analytics service not available' });
      return;
    }

    const supabase = getSupabase();

    // Count unique sessions in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { count, error } = await supabase
      .from('analytics_events')
      .select('session_id', { count: 'exact', head: true })
      .gte('created_at', fiveMinutesAgo)
      .not('session_id', 'is', null);

    if (error) {
      logger.error('ANALYTICS_API', `Active players count error: ${error.message}`);
      res.json({ count: 0, error: error.message });
      return;
    }

    // Add a multiplier for better social proof (active sessions * ~2.5 = estimated active players)
    const estimatedPlayers = Math.max(0, (count || 0) * 2.5);

    // Round to nearest 10 for cleaner display
    const roundedCount = Math.round(estimatedPlayers / 10) * 10;

    res.json({
      count: roundedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ANALYTICS_API', `Active players count error: ${err.message}`);
    res.json({ count: 0, error: 'Failed to get active players count' });
  }
});

export default router;
