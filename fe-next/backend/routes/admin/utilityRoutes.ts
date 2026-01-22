/**
 * Admin Utility Routes
 * Daily challenge management and email testing.
 */

import express, { Response, Router } from 'express';
import type { AdminRequest } from './types';
import { auditLog } from './middleware';
import logger from '../../utils/logger';

const { getSupabase } = require('../../modules/supabaseServer');

const router: Router = express.Router();

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
    const { sendTestEmail, isEmailServiceConfigured } = await import('../../../lib/email');

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

export default router;
