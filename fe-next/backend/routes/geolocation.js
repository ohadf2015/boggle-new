/**
 * Geolocation API Routes
 * Handles /api/geolocation endpoint
 */

const express = require('express');
const router = express.Router();
const { getCountryFromRequest } = require('../utils/geolocation');
const logger = require('../utils/logger');

/**
 * GET /api/geolocation
 * Get geolocation data for the requesting client
 */
router.get('/', async (req, res) => {
  try {
    // First check if middleware already populated geoData (more efficient)
    if (req.geoData && req.geoData.countryCode) {
      return res.json({
        success: true,
        ...req.geoData
      });
    }

    // Fallback to fetching geolocation if middleware didn't run or failed
    const geoData = await getCountryFromRequest(req);
    res.json({
      success: true,
      ...geoData
    });
  } catch (error) {
    logger.error('API', `Geolocation error: ${error.message}`);
    // Return a graceful response with null countryCode instead of 500 error
    res.json({
      success: false,
      error: 'Failed to get geolocation',
      countryCode: null,
      source: 'error'
    });
  }
});

module.exports = router;
