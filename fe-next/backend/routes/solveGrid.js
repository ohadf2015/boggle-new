/**
 * Solve Grid API Routes
 * Handles /api/solve-grid endpoint for single-player bot simulation
 */

const express = require('express');
const router = express.Router();
const { load: loadDictionary } = require('../dictionary');
const { findWordsForBots } = require('../modules/boggleSolver');
const logger = require('../utils/logger');

// Rate limiting store (simple in-memory)
const rateLimitStore = new Map();
const RATE_LIMIT = {
  maxRequests: 30,
  windowMs: 60000,
};

/**
 * Simple rate limiter middleware
 */
function rateLimit(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();

  const data = rateLimitStore.get(ip);
  if (!data || now > data.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT.windowMs });
    return next();
  }

  data.count++;
  if (data.count > RATE_LIMIT.maxRequests) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests',
    });
  }

  next();
}

/**
 * POST /api/solve-grid
 * Find all valid words on a Boggle grid for bot simulation
 */
router.post('/', rateLimit, async (req, res) => {
  const { grid, language = 'en' } = req.body;

  // Validate grid
  if (!grid || !Array.isArray(grid) || grid.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Grid is required and must be a 2D array',
    });
  }

  // Validate grid structure (must be rectangular)
  const rowLength = grid[0]?.length || 0;
  if (!grid.every(row => Array.isArray(row) && row.length === rowLength)) {
    return res.status(400).json({
      success: false,
      error: 'Grid must be rectangular (all rows same length)',
    });
  }

  // Validate grid size (4x4 to 11x11 - matches DIFFICULTIES in consts.ts)
  if (grid.length < 4 || grid.length > 11 || rowLength < 4 || rowLength > 11) {
    return res.status(400).json({
      success: false,
      error: 'Grid must be between 4x4 and 11x11',
    });
  }

  try {
    // Ensure dictionary is loaded
    await loadDictionary();

    const words = findWordsForBots(grid, language, {
      minLength: 3,
      maxLength: 10,
    });

    return res.json({
      success: true,
      words,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('SOLVE-GRID', `Error: ${msg}`);

    return res.status(500).json({
      success: false,
      error: 'Failed to solve grid',
    });
  }
});

module.exports = router;
