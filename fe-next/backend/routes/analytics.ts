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
  try {
    if (!isSupabaseConfigured()) {
      res.json({ success: false, error: 'Analytics service not available' } as TrackResponse);
      return;
    }

    const supabase = getSupabase();
    const {
      event_type,
      session_id,
      guest_name,
      utm_source,
      utm_medium,
      utm_campaign,
      referrer,
      metadata = {}
    } = req.body;

    if (!event_type) {
      res.status(400).json({ error: 'event_type is required' });
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
      res.json({ success: false, error: error.message } as TrackResponse);
      return;
    }

    res.json({ success: true, event_id: data?.id } as TrackResponse);
  } catch (error) {
    const err = error as Error;
    logger.error('ANALYTICS_API', `Track error: ${err.message}`);
    res.json({ success: false, error: 'Failed to track event' } as TrackResponse);
  }
});

export default router;
