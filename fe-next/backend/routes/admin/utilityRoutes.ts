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

    // Use configured app URL — never trust client-controlled Host header
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.lexiclash.live';
    const retryUrl = `${appUrl}/${language}/daily?retryToken=${token}`;

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

/**
 * POST /api/admin/send-test-reengagement
 * Send a test re-engagement email to a specified address
 */
router.post('/send-test-reengagement', async (req: AdminRequest, res: Response): Promise<void> => {
  const startTime = Date.now();
  logger.info('ADMIN_API', '====== Send test reengagement email request START ======');

  try {
    const { sendTestReengagementEmail, getFirstLetterForLanguage } = await import('../../../lib/reengagementEmail');
    const { isEmailServiceConfigured } = await import('../../../lib/email');

    if (!isEmailServiceConfigured()) {
      logger.warn('ADMIN_API', 'Email service not configured');
      res.status(503).json({
        error: 'Email service not configured',
        details: {
          hasApiKey: !!process.env.RESEND_API_KEY,
          hasFromEmail: !!process.env.RESEND_FROM_EMAIL,
        }
      });
      return;
    }

    const { email, recipientName, language: reqLanguage } = req.body || {};

    const targetEmail = email || req.adminUser?.email;
    if (!targetEmail) {
      res.status(400).json({ error: 'No email address provided' });
      return;
    }

    const language = reqLanguage || 'en';
    const name = recipientName || req.adminUser?.username || 'Test User';

    const letterData = await getFirstLetterForLanguage(language);
    const firstLetter = letterData?.letter || 'T';

    logger.info('ADMIN_API', `Sending test reengagement email to ${targetEmail} (lang=${language}, letter=${firstLetter})`);

    const result = await sendTestReengagementEmail(targetEmail, name, language, firstLetter);

    if (!result.success) {
      logger.warn('ADMIN_API', `Send failed: ${result.error}`);
      res.status(500).json({ error: result.error || 'Failed to send test email' });
      return;
    }

    logger.info('ADMIN_API', `====== SUCCESS - Total time: ${Date.now() - startTime}ms ======`);
    auditLog(req.adminUser, 'SEND_TEST_REENGAGEMENT_EMAIL', { targetEmail, language, firstLetter });

    res.json({
      success: true,
      message: `Test re-engagement email sent to ${targetEmail}`,
      sentTo: targetEmail,
      language,
      firstLetter,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Send test reengagement email error: ${err.message}`);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * POST /api/admin/send-reengagement-to-player
 * Manually send a re-engagement email to a specific player (real email, not test)
 */
router.post('/send-reengagement-to-player', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const {
      sendReengagementEmail,
      resolveUserLanguage,
      getFirstLetterForLanguage,
    } = await import('../../../lib/reengagementEmail');
    const { isEmailServiceConfigured, generateUnsubscribeToken } = await import('../../../lib/email');

    if (!isEmailServiceConfigured()) {
      res.status(503).json({ error: 'Email service not configured' });
      return;
    }

    const { playerIdentifier } = req.body || {};
    if (!playerIdentifier) {
      res.status(400).json({ error: 'playerIdentifier (email or username) is required' });
      return;
    }

    const supabase = getSupabase();

    // Look up player by email or username
    const isEmail = playerIdentifier.includes('@');
    let userId: string | null = null;
    let playerEmail: string | null = null;
    let profile: { id: string; display_name: string | null; username: string; timezone: string | null; country_code: string | null; email_unsubscribe_token: string | null } | null = null;

    if (isEmail) {
      // Find user by email via service-role filtered query (NOT listUsers which loads all users)
      const { data: authData, error: authError } = await supabase
        .from('auth_users_view')
        .select('id, email')
        .eq('email', playerIdentifier)
        .single();

      // Fallback: use admin API with filter if view doesn't exist
      if (authError) {
        const { data: listResult, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
        // If the view approach failed, try getUserByEmail-like approach via RPC
        // For now, search with pagination to avoid loading all users
        let found = false;
        let page = 1;
        while (!found) {
          const { data: pageResult, error: pageError } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
          if (pageError || !pageResult.users.length) break;
          const match = pageResult.users.find((u: { email?: string }) => u.email === playerIdentifier);
          if (match) {
            userId = match.id;
            playerEmail = match.email || null;
            found = true;
          }
          if (pageResult.users.length < 100) break;
          page++;
        }
        if (!found) {
          res.status(404).json({ error: `No user found with email: ${playerIdentifier}` });
          return;
        }
      } else if (authData) {
        userId = authData.id;
        playerEmail = authData.email || null;
      }
    } else {
      // Find user by username
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, display_name, username, timezone, country_code, email_unsubscribe_token')
        .eq('username', playerIdentifier)
        .single();

      if (profileError || !profileData) {
        res.status(404).json({ error: `No user found with username: ${playerIdentifier}` });
        return;
      }
      userId = profileData.id;
      profile = profileData;

      // Get email from auth for this specific user (not all users)
      const { data: { user: authUser }, error: authError } = await supabase.auth.admin.getUserById(userId);
      if (authError || !authUser) {
        res.status(500).json({ error: 'Failed to look up user email' });
        return;
      }
      playerEmail = authUser.email || null;
    }

    if (!userId || !playerEmail) {
      res.status(404).json({ error: 'Could not resolve player email' });
      return;
    }

    // Get profile if not already fetched
    if (!profile) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, display_name, username, timezone, country_code, email_unsubscribe_token')
        .eq('id', userId)
        .single();
      profile = profileData;
    }

    if (!profile) {
      res.status(404).json({ error: 'Player profile not found' });
      return;
    }

    // Ensure unsubscribe token exists
    if (!profile.email_unsubscribe_token) {
      const token = generateUnsubscribeToken();
      await supabase
        .from('profiles')
        .update({ email_unsubscribe_token: token })
        .eq('id', userId);
      profile.email_unsubscribe_token = token;
    }

    const language = await resolveUserLanguage(userId, profile.country_code);
    const letterData = await getFirstLetterForLanguage(language);

    if (!letterData) {
      res.status(404).json({ error: `No daily word found for language: ${language}` });
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://lexiclash.live';

    const result = await sendReengagementEmail(
      {
        id: userId,
        email: playerEmail,
        display_name: profile.display_name,
        username: profile.username,
        timezone: profile.timezone,
        country_code: profile.country_code,
        email_unsubscribe_token: profile.email_unsubscribe_token,
      },
      language,
      letterData.letter,
      baseUrl
    );

    if (!result.success) {
      res.status(500).json({ error: result.error || 'Failed to send email' });
      return;
    }

    auditLog(req.adminUser, 'SEND_REENGAGEMENT_TO_PLAYER', {
      playerIdentifier,
      playerEmail,
      language,
      letter: letterData.letter,
    });

    logger.info('ADMIN_API', `Sent re-engagement email to player ${playerIdentifier} (${playerEmail})`);

    res.json({
      success: true,
      message: `Re-engagement email sent to ${playerEmail}`,
      sentTo: playerEmail,
      language,
      firstLetter: letterData.letter,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Send reengagement to player error: ${err.message}`);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * POST /api/admin/send-test-game-mode-announcement
 * Send a test game mode announcement email to a specified address
 */
router.post('/send-test-game-mode-announcement', async (req: AdminRequest, res: Response): Promise<void> => {
  const startTime = Date.now();
  logger.info('ADMIN_API', '====== Send test game mode announcement request START ======');

  try {
    const { sendTestGameModeAnnouncement } = await import('../../../lib/gameModeAnnouncementEmail');
    const { isEmailServiceConfigured } = await import('../../../lib/email');

    if (!isEmailServiceConfigured()) {
      logger.warn('ADMIN_API', 'Email service not configured');
      res.status(503).json({
        error: 'Email service not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.',
        details: {
          hasApiKey: !!process.env.RESEND_API_KEY,
          hasFromEmail: !!process.env.RESEND_FROM_EMAIL,
        }
      });
      return;
    }

    const { email, recipientName, language: reqLanguage, mode: reqMode } = req.body || {};

    const targetEmail = email || req.adminUser?.email;
    if (!targetEmail) {
      res.status(400).json({ error: 'No email address provided' });
      return;
    }

    const ALLOWED_MODES = ['blast', 'wordhunt', 'adventure'] as const;
    const ALLOWED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

    const language = ALLOWED_LANGUAGES.includes(reqLanguage) ? reqLanguage : 'en';
    const mode = (ALLOWED_MODES as readonly string[]).includes(reqMode) ? reqMode : 'blast';
    const name = recipientName || req.adminUser?.username || 'Test User';

    logger.info('ADMIN_API', `Sending test game mode (${mode}) announcement to ${targetEmail} (lang=${language})`);

    const result = await sendTestGameModeAnnouncement(targetEmail, name, language, mode);

    if (!result.success) {
      logger.warn('ADMIN_API', `Send failed: ${result.error}`);
      res.status(500).json({ error: result.error || 'Failed to send test email' });
      return;
    }

    logger.info('ADMIN_API', `====== SUCCESS - Total time: ${Date.now() - startTime}ms ======`);
    auditLog(req.adminUser, 'SEND_TEST_GAME_MODE_ANNOUNCEMENT', { targetEmail, language, mode });

    res.json({
      success: true,
      message: `Test ${mode} announcement sent to ${targetEmail}`,
      sentTo: targetEmail,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Send test game mode announcement error: ${err.message}`);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
