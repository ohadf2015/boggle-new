/**
 * Admin Invalid Word Routes
 * Handles invalid word submissions review and approval
 */

import express, { Response, Router } from 'express';
import type { AdminRequest, InvalidWordStatsRow } from './types';
import { auditLog } from './middleware';
import logger from '../../utils/logger';

import { getSupabase } from '../../modules/supabaseServer';
import { promoteWordToScores } from '../../modules/wordPromotion';

const router: Router = express.Router();

/**
 * GET /api/admin/invalid-words
 */
router.get('/', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    if (!supabase) { res.status(503).json({ error: 'Database not available' }); return; }
    const language = (req.query.language as string) || null;
    const minCount = parseInt(req.query.minCount as string) || 3;
    const search = (req.query.search as string) || null;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;
    // status filter: 'all' | 'verified' | 'needs_review' | 'pending' | 'rejected_type' | 'not_found'
    const status = (req.query.status as string) || 'all';

    let query = supabase
      .from('invalid_word_submissions')
      .select(
        'id, word, language, submission_count, player_appeal_count, reason, first_submitted_at, last_submitted_at, first_appealed_at, last_appealed_at, approved_at, approved_by, ' +
        'verification_status, verification_source, verification_word_type, verification_url, ' +
        'milog_status, milog_word_type, milog_url',
        { count: 'exact' }
      )
      .is('approved_at', null)
      .gte('submission_count', minCount)
      .order('submission_count', { ascending: false });

    if (language) query = query.eq('language', language);
    if (search) query = query.ilike('word', `%${search}%`);
    if (status !== 'all') {
      // Match either of the per-language status columns. Hebrew uses milog_*, others use verification_*.
      // For 'verified' we want both Hebrew Milog-verified AND non-Hebrew Wiktionary-verified.
      query = query.or(`verification_status.eq.${status},milog_status.eq.${status}`);
    }
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const { data: statsData } = await supabase
      .from('invalid_word_submissions')
      .select('submission_count, approved_at')
      .gte('submission_count', minCount)
      .throwOnError();

    const typedStatsData = statsData as InvalidWordStatsRow[] | null;
    const stats = {
      total: typedStatsData?.length || 0,
      pending: typedStatsData?.filter((w: InvalidWordStatsRow) => !w.approved_at).length || 0,
      approved: typedStatsData?.filter((w: InvalidWordStatsRow) => w.approved_at).length || 0,
    };

    res.json({
      words: data || [],
      total: count || 0,
      stats,
      pagination: { limit, offset, hasMore: (count || 0) > offset + limit },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Invalid words error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch invalid words' });
  }
});

/**
 * POST /api/admin/invalid-words/approve
 */
router.post('/approve', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) { res.status(503).json({ error: 'Database not available' }); return; }
  const { word, language, addToDictionary } = req.body;

  if (!word || !language) {
    res.status(400).json({ error: 'Missing word or language' });
    return;
  }

  const normalizedWord = (word as string).toLowerCase().trim();

  try {
    const { data: invalidWord, error: lookupError } = await supabase
      .from('invalid_word_submissions')
      .select('id, submission_count')
      .eq('word', normalizedWord)
      .eq('language', language)
      .single();

    if (lookupError || !invalidWord) {
      res.status(404).json({ error: 'Word not found in invalid submissions' });
      return;
    }

    const votesNeeded = Math.max(10, Math.min(invalidWord.submission_count * 2, 20));

    try {
      await promoteWordToScores(supabase, normalizedWord, language, {
        votes: votesNeeded,
        submitter: 'admin_approved',
      });
    } catch (scoreError) {
      const msg = (scoreError as Error).message;
      logger.error('ADMIN_API', `Word score update failed: ${msg}`);
      res.status(500).json({ error: 'Failed to update word score' });
      return;
    }

    const { error: approveError } = await supabase
      .from('invalid_word_submissions')
      .update({ approved_at: new Date().toISOString(), approved_by: req.adminUser!.id })
      .eq('id', invalidWord.id);

    if (approveError) {
      logger.error('ADMIN_API', `Invalid word approval update failed: ${approveError.message}`);
    }

    await supabase.from('bot_word_blacklist').delete()
      .eq('word', normalizedWord).eq('language', language);

    if (addToDictionary) {
      try {
        const dictionary = require('../../../backend/dictionary');
        await dictionary.addApprovedWord(normalizedWord, language);
        auditLog(req.adminUser, 'INVALID_WORD_ADD_TO_DICTIONARY', { word: normalizedWord, language });
      } catch (dictError) {
        logger.warn('ADMIN_API', `Dictionary add failed: ${(dictError as Error).message}`);
      }
    }

    auditLog(req.adminUser, 'INVALID_WORD_APPROVE', {
      word: normalizedWord, language, votesAdded: votesNeeded,
      addToDictionary, submissionCount: invalidWord.submission_count,
    });

    res.json({ success: true, votesAdded: votesNeeded });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Invalid word approve error: ${err.message}`);
    res.status(500).json({ error: 'Failed to approve word' });
  }
});

/**
 * POST /api/admin/invalid-words/dismiss
 */
router.post('/dismiss', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) { res.status(503).json({ error: 'Database not available' }); return; }
  const { word, language, reason } = req.body;

  if (!word || !language) {
    res.status(400).json({ error: 'Missing word or language' });
    return;
  }

  const normalizedWord = (word as string).toLowerCase().trim();

  try {
    const { error } = await supabase
      .from('invalid_word_submissions')
      .update({ approved_at: new Date().toISOString(), approved_by: req.adminUser!.id })
      .eq('word', normalizedWord).eq('language', language);

    if (error) throw error;

    auditLog(req.adminUser, 'INVALID_WORD_DISMISS', { word: normalizedWord, language, reason });
    res.json({ success: true });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Invalid word dismiss error: ${err.message}`);
    res.status(500).json({ error: 'Failed to dismiss word' });
  }
});

/**
 * POST /api/admin/invalid-words/auto-promote
 */
router.post('/auto-promote', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { triggerAutoPromotion } = await import('../../services/cronScheduler');
    const { success, result, duration, error } = await triggerAutoPromotion();

    auditLog(req.adminUser, 'AUTO_PROMOTE_TRIGGERED', {
      promoted: result.promoted, failed: result.failed, blocked: result.blocked,
      milogBased: result.words.milogBased.length,
      wiktionaryBased: result.words.wiktionaryBased.length,
      wiktionaryEsBased: result.words.wiktionaryEsBased.length,
    });

    if (!success) {
      res.status(500).json({ error: error || 'Auto-promotion failed' });
      return;
    }

    res.json({ promoted: result.promoted, failed: result.failed, words: result.words, duration });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Auto-promote error: ${err.message}`);
    res.status(500).json({ error: 'Failed to run auto-promotion' });
  }
});

/**
 * GET /api/admin/invalid-words/auto-promote-stats
 */
router.get('/auto-promote-stats', async (_req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  if (!supabase) { res.status(503).json({ error: 'Database not available' }); return; }

  try {
    const { count: autoPromotedCount, error: countError } = await supabase
      .from('invalid_word_submissions')
      .select('*', { count: 'exact', head: true })
      .not('auto_promoted_at', 'is', null);
    if (countError) throw countError;

    const { data: bySource, error: sourceError } = await supabase
      .from('invalid_word_submissions')
      .select('auto_promoted_by')
      .not('auto_promoted_at', 'is', null);
    if (sourceError) throw sourceError;

    const sourceCounts: Record<string, number> = {};
    for (const row of bySource || []) {
      const source = row.auto_promoted_by || 'unknown';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    }

    const { count: candidateCount, error: candidateError } = await supabase
      .from('invalid_word_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('reason', 'not_in_dictionary')
      .is('approved_at', null)
      .is('auto_promoted_at', null)
      .gte('submission_count', 10);
    if (candidateError) throw candidateError;

    // Verified candidates ready for one-click promotion (Milog he + Wiktionary en).
    const { count: verifiedCandidatesCount, error: verifiedError } = await supabase
      .from('invalid_word_submissions')
      .select('*', { count: 'exact', head: true })
      .or('verification_status.eq.verified,milog_status.eq.verified')
      .is('approved_at', null)
      .is('auto_promoted_at', null)
      .is('rejected_at', null);
    if (verifiedError) throw verifiedError;

    res.json({
      autoPromoted: autoPromotedCount || 0,
      candidates: candidateCount || 0,
      verifiedCandidates: verifiedCandidatesCount || 0,
      bySource: sourceCounts,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Auto-promote stats error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch auto-promote stats' });
  }
});

export default router;
