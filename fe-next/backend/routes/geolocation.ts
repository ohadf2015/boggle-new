/**
 * Geolocation API Routes
 * Handles /api/geolocation endpoint
 */

import express, { Request, Response, Router } from 'express';
 
const { getCountryFromRequest } = require('../utils/geolocation');
import logger from '../utils/logger';

const router: Router = express.Router();

interface GeoData {
  countryCode: string | null;
  source?: string;
}

interface GeoRequest extends Request {
  geoData?: GeoData;
}

interface GeoResponse {
  success: boolean;
  countryCode?: string | null;
  source?: string;
  error?: string;
}

/**
 * GET /api/geolocation
 * Get geolocation data for the requesting client
 */
router.get('/', async (req: GeoRequest, res: Response): Promise<void> => {
  try {
    // First check if middleware already populated geoData (more efficient)
    if (req.geoData && req.geoData.countryCode) {
      res.json({
        success: true,
        ...req.geoData
      } as GeoResponse);
      return;
    }

    // Fallback to fetching geolocation if middleware didn't run or failed
    const geoData = await getCountryFromRequest(req);
    res.json({
      success: true,
      ...geoData
    } as GeoResponse);
  } catch (error) {
    const err = error as Error;
    logger.error('API', `Geolocation error: ${err.message}`);
    // Return a graceful response with null countryCode instead of 500 error
    res.json({
      success: false,
      error: 'Failed to get geolocation',
      countryCode: null,
      source: 'error'
    } as GeoResponse);
  }
});

export default router;
