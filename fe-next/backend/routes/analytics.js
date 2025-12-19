/**
 * Analytics API Routes
 * Handles /api/analytics/* endpoints for event tracking
 */

const express = require('express');
const router = express.Router();
const { getSupabase, isSupabaseConfigured } = require('../modules/supabaseServer');
const logger = require('../utils/logger');

/**
 * POST /api/analytics/track
 * Track analytics events (including guest players)
 */
router.post('/track', async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.json({ success: false, error: 'Analytics service not available' });
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
      return res.status(400).json({ error: 'event_type is required' });
    }

    // Get country from geolocation if available
    const country_code = req.geoData?.countryCode || req.headers['x-country-code'] || null;

    // Include guest_name in metadata for tracking
    const enrichedMetadata = {
      ...metadata,
      guest_name: guest_name || null,
      user_agent: req.headers['user-agent'] || null,
    };

    const { data, error } = await supabase
      .from('analytics_events')
      .insert({
        event_type,
        session_id: session_id || null,
        country_code,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        referrer: referrer || null,
        metadata: enrichedMetadata,
      })
      .select()
      .single();

    if (error) {
      logger.error('ANALYTICS_API', `Track error: ${error.message}`);
      return res.json({ success: false, error: error.message });
    }

    res.json({ success: true, event_id: data?.id });
  } catch (error) {
    logger.error('ANALYTICS_API', `Track error: ${error.message}`);
    res.json({ success: false, error: 'Failed to track event' });
  }
});

module.exports = router;
