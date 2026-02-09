/**
 * Admin Word Moderation Routes
 * Bot words, community words, and invalid word submissions management.
 */

import express, { Response, Router } from 'express';
import { z } from 'zod';
import type {
  AdminRequest,
  WordStat,
  WordStatBuilder,
  VoteRow,
  BlacklistEntry,
  CommunityWordEntry,
  WordScoreRow,
  NetScoreRow,
  LanguageScoreRow,
  InvalidWordStatsRow,
} from './types';
import { auditLog } from './middleware';
import logger from '../../utils/logger';

const { getSupabase } = require('../../modules/supabaseServer');

const router: Router = express.Router();

// ==================== Validation Schemas ====================

const blacklistAddSchema = z.object({
  word: z.string().min(1).max(50).transform((s: string) => s.toLowerCase().trim()),
  language: z.enum(['en', 'he', 'sv', 'ja', 'es', 'fr', 'de']),
  reason: z.string().max(200).optional().nullable(),
});

// ==================== Bot Words Routes ====================

/**
 * GET /api/admin/bot-words
 * Get bot words with negative votes for review
 */
router.get('/bot-words', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const language = (req.query.language as string) || null;

    let query = supabase
      .from('word_votes')
      .select('word, language, vote_type, created_at, game_code')
      .eq('is_bot_word', true);

    if (language) {
      query = query.eq('language', language);
    }

    const { data: votes, error } = await query;

    if (error) {
      if (error.message?.includes('is_bot_word')) {
        res.json({ words: [], message: 'Bot word tracking not yet enabled. Run migration 013.' });
        return;
      }
      throw error;
    }

    // Aggregate votes by word
    const wordStats: Record<string, WordStatBuilder> = {};
    votes?.forEach((vote: VoteRow) => {
      const key = `${vote.word}:${vote.language}`;
      if (!wordStats[key]) {
        wordStats[key] = {
          word: vote.word,
          language: vote.language,
          likes: 0,
          dislikes: 0,
          gameCodes: new Set(),
          firstSeen: vote.created_at,
          lastSeen: vote.created_at
        };
      }
      if (vote.vote_type === 'like') {
        wordStats[key].likes++;
      } else {
        wordStats[key].dislikes++;
      }
      wordStats[key].gameCodes.add(vote.game_code);
      if (vote.created_at < wordStats[key].firstSeen) {
        wordStats[key].firstSeen = vote.created_at;
      }
      if (vote.created_at > wordStats[key].lastSeen) {
        wordStats[key].lastSeen = vote.created_at;
      }
    });

    const words: WordStat[] = Object.values(wordStats)
      .map((w: WordStatBuilder) => ({
        ...w,
        gameCodes: Array.from(w.gameCodes),
        netScore: w.likes - w.dislikes
      }))
      .filter((w: WordStat) => w.dislikes > 0)
      .sort((a: WordStat, b: WordStat) => b.dislikes - a.dislikes);

    res.json({ words });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Bot words error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch bot words' });
  }
});

/**
 * GET /api/admin/bot-blacklist
 * Get the bot word blacklist
 */
router.get('/bot-blacklist', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const language = (req.query.language as string) || null;

    let query = supabase
      .from('bot_word_blacklist')
      .select('id, word, language, reason, created_at')
      .order('created_at', { ascending: false });

    if (language) {
      query = query.eq('language', language);
    }

    const { data, error } = await query;

    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42P01') {
        res.json({ blacklist: [], message: 'Blacklist table not yet created. Run migration 013.' });
        return;
      }
      throw error;
    }

    res.json({ blacklist: (data || []) as BlacklistEntry[] });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Bot blacklist error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch bot blacklist' });
  }
});

/**
 * POST /api/admin/bot-blacklist
 * Add a word to the blacklist
 */
router.post('/bot-blacklist', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();

    // Validate request body
    const validation = blacklistAddSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: 'Invalid request',
        details: validation.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`)
      });
      return;
    }

    const { word, language, reason } = validation.data;

    const { data, error } = await supabase
      .from('bot_word_blacklist')
      .insert({
        word,
        language,
        reason: reason || null,
        blacklisted_by: req.adminUser!.id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'Word already blacklisted' });
        return;
      }
      throw error;
    }

    // Audit log for security trail
    auditLog(req.adminUser, 'BLACKLIST_ADD', { word, language, reason, entryId: data.id });
    res.json({ success: true, blacklistEntry: data });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Add blacklist error: ${err.message}`);
    res.status(500).json({ error: 'Failed to add word to blacklist' });
  }
});

/**
 * DELETE /api/admin/bot-blacklist/:id
 * Remove a word from the blacklist
 */
router.delete('/bot-blacklist/:id', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;

    const { error } = await supabase
      .from('bot_word_blacklist')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Audit log for security trail
    auditLog(req.adminUser, 'BLACKLIST_REMOVE', { entryId: id });
    res.json({ success: true });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Delete blacklist error: ${err.message}`);
    res.status(500).json({ error: 'Failed to remove word from blacklist' });
  }
});

/**
 * POST /api/admin/bot-words/approve
 * Approve word permanently - remove from blacklist and add to approved words
 */
router.post('/bot-words/approve', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  const { word, language } = req.body;

  if (!word || !language) {
    res.status(400).json({ error: 'Missing word or language' });
    return;
  }

  const normalizedWord = (word as string).toLowerCase().trim();

  try {
    // 1. Remove from blacklist
    await supabase
      .from('bot_word_blacklist')
      .delete()
      .eq('word', normalizedWord)
      .eq('language', language);

    // 2. Get current score
    const { data: currentScore } = await supabase
      .from('word_scores')
      .select('likes_count, dislikes_count, net_score')
      .eq('word', normalizedWord)
      .eq('language', language)
      .single();

    const currentLikes = currentScore?.likes_count || 0;
    const currentDislikes = currentScore?.dislikes_count || 0;
    const currentNet = currentScore?.net_score || 0;
    const votesNeeded = Math.max(10 - currentNet, 10); // At least 10 votes

    // 3. Update word_scores directly
    const { error: scoreError } = await supabase
      .from('word_scores')
      .upsert({
        word: normalizedWord,
        language,
        likes_count: currentLikes + votesNeeded,
        dislikes_count: currentDislikes,
        last_voted_at: new Date().toISOString(),
      }, { onConflict: 'word,language' });

    if (scoreError) {
      logger.error('ADMIN_API', `Score update failed: ${scoreError.message}`);
      res.status(500).json({ error: 'Failed to update word score' });
      return;
    }

    // 4. Record a single admin vote for audit trail
    await supabase.from('word_votes').upsert({
      word: normalizedWord,
      language,
      user_id: req.adminUser!.id,
      game_code: `admin_approval_${Date.now()}`,
      vote_type: 'like',
      is_bot_word: true
    }, { onConflict: 'user_id,word,language', ignoreDuplicates: true });

    auditLog(req.adminUser, 'BOT_WORD_APPROVE', { word: normalizedWord, language });
    res.json({ success: true });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Approve error: ${err.message}`);
    res.status(500).json({ error: 'Failed to approve word' });
  }
});

/**
 * POST /api/admin/bot-words/disapprove
 * Disapprove word permanently - add to blacklist and add negative votes
 */
router.post('/bot-words/disapprove', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  const { word, language, reason } = req.body;

  if (!word || !language) {
    res.status(400).json({ error: 'Missing word or language' });
    return;
  }

  const normalizedWord = (word as string).toLowerCase().trim();

  try {
    // 1. Add to blacklist (manual, not auto)
    await supabase
      .from('bot_word_blacklist')
      .upsert({
        word: normalizedWord,
        language,
        reason: reason || 'Admin disapproval',
        blacklisted_by: req.adminUser!.id
      }, { onConflict: 'word,language' });

    // 2. Get current score
    const { data: currentScore } = await supabase
      .from('word_scores')
      .select('likes_count, dislikes_count')
      .eq('word', normalizedWord)
      .eq('language', language)
      .single();

    const currentLikes = currentScore?.likes_count || 0;
    const currentDislikes = currentScore?.dislikes_count || 0;
    const votesToAdd = 5; // Add 5 negative votes to mark as invalid

    // 3. Update word_scores directly
    const { error: scoreError } = await supabase
      .from('word_scores')
      .upsert({
        word: normalizedWord,
        language,
        likes_count: currentLikes,
        dislikes_count: currentDislikes + votesToAdd,
        last_voted_at: new Date().toISOString(),
      }, { onConflict: 'word,language' });

    if (scoreError) {
      logger.error('ADMIN_API', `Score update failed: ${scoreError.message}`);
      res.status(500).json({ error: 'Failed to update word score' });
      return;
    }

    // 4. Record a single admin vote for audit trail
    await supabase.from('word_votes').upsert({
      word: normalizedWord,
      language,
      user_id: req.adminUser!.id,
      game_code: `admin_disapproval_${Date.now()}`,
      vote_type: 'dislike',
      is_bot_word: true
    }, { onConflict: 'user_id,word,language', ignoreDuplicates: true });

    auditLog(req.adminUser, 'BOT_WORD_DISAPPROVE', { word: normalizedWord, language, reason });
    res.json({ success: true });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Disapprove error: ${err.message}`);
    res.status(500).json({ error: 'Failed to disapprove word' });
  }
});

// ==================== Community Words Routes ====================

/**
 * GET /api/admin/community-words
 * Get all community words with filtering and pagination
 */
router.get('/community-words', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const language = (req.query.language as string) || null;
    const status = (req.query.status as string) || null;
    const search = (req.query.search as string) || null;
    const sortBy = (req.query.sortBy as string) || 'net_score';
    const sortOrder = (req.query.sortOrder as string) === 'asc' ? true : false;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    // Build query
    let query = supabase
      .from('word_scores')
      .select('word, language, likes_count, dislikes_count, net_score, is_potentially_valid, first_submitter, last_voted_at, first_voted_at', { count: 'exact' });

    // Apply filters
    if (language) {
      query = query.eq('language', language);
    }

    if (search) {
      query = query.ilike('word', `%${search}%`);
    }

    // Status filtering
    if (status === 'validated') {
      query = query.gte('net_score', 10);
    } else if (status === 'pending_review') {
      query = query.gte('net_score', 3).lt('net_score', 10);
    } else if (status === 'rejected') {
      query = query.lt('net_score', 0);
    } else if (status === 'pending') {
      query = query.gte('net_score', 0).lt('net_score', 3);
    }

    // Apply sorting
    const validSortFields = ['net_score', 'likes_count', 'dislikes_count', 'created_at', 'last_voted_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'net_score';
    query = query.order(sortField, { ascending: sortOrder });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    // Transform data to include computed status
    const words: CommunityWordEntry[] = (data as WordScoreRow[] || []).map((row: WordScoreRow) => {
      let wordStatus: CommunityWordEntry['status'] = 'pending';
      if (row.net_score >= 10) {
        wordStatus = 'validated';
      } else if (row.net_score >= 3) {
        wordStatus = 'pending_review';
      } else if (row.net_score < 0) {
        wordStatus = 'rejected';
      }
      return {
        ...row,
        status: wordStatus,
      };
    });

    // Get summary stats
    const { data: statsData } = await supabase
      .from('word_scores')
      .select('net_score')
      .throwOnError();

    const typedStatsData = statsData as NetScoreRow[] | null;
    const stats = {
      total: typedStatsData?.length || 0,
      validated: typedStatsData?.filter((w: NetScoreRow) => w.net_score >= 10).length || 0,
      pendingReview: typedStatsData?.filter((w: NetScoreRow) => w.net_score >= 3 && w.net_score < 10).length || 0,
      rejected: typedStatsData?.filter((w: NetScoreRow) => w.net_score < 0).length || 0,
      pending: typedStatsData?.filter((w: NetScoreRow) => w.net_score >= 0 && w.net_score < 3).length || 0,
    };

    res.json({
      words,
      total: count || 0,
      stats,
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Community words error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch community words' });
  }
});

/**
 * POST /api/admin/community-words/approve
 * Approve a community word - adds positive votes to push over threshold
 */
router.post('/community-words/approve', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  const { word, language, addToDictionary } = req.body;

  if (!word || !language) {
    res.status(400).json({ error: 'Missing word or language' });
    return;
  }

  const normalizedWord = (word as string).toLowerCase().trim();

  try {
    // Get current score with full counts
    const { data: currentScore } = await supabase
      .from('word_scores')
      .select('likes_count, dislikes_count, net_score')
      .eq('word', normalizedWord)
      .eq('language', language)
      .single();

    // Calculate votes needed to reach threshold of 10
    const currentNet = currentScore?.net_score || 0;
    const votesNeeded = Math.max(10 - currentNet, 5); // At least 5 votes to show intent

    // Calculate new likes_count by adding votesNeeded to existing
    const currentLikes = currentScore?.likes_count || 0;
    const currentDislikes = currentScore?.dislikes_count || 0;
    const newLikesCount = currentLikes + votesNeeded;

    // Update word_scores directly
    const { error: scoreError } = await supabase
      .from('word_scores')
      .upsert({
        word: normalizedWord,
        language,
        likes_count: newLikesCount,
        dislikes_count: currentDislikes,
        last_voted_at: new Date().toISOString(),
      }, { onConflict: 'word,language' });

    if (scoreError) {
      logger.error('ADMIN_API', `Score update failed: ${scoreError.message}`);
      res.status(500).json({ error: 'Failed to update word score' });
      return;
    }

    // Also record a single admin vote for audit trail
    await supabase.from('word_votes').upsert({
      word: normalizedWord,
      language,
      user_id: req.adminUser!.id,
      game_code: `admin_community_approve_${Date.now()}`,
      vote_type: 'like',
      is_bot_word: false,
    }, { onConflict: 'user_id,word,language', ignoreDuplicates: true });

    // Remove from blacklist if present
    await supabase
      .from('bot_word_blacklist')
      .delete()
      .eq('word', normalizedWord)
      .eq('language', language);

    // Optionally add to permanent dictionary file
    if (addToDictionary) {
      try {
        const dictionary = require('../../../backend/dictionary');
        await dictionary.addApprovedWord(normalizedWord, language);
        auditLog(req.adminUser, 'COMMUNITY_WORD_ADD_TO_DICTIONARY', { word: normalizedWord, language });
      } catch (dictError) {
        logger.warn('ADMIN_API', `Dictionary add failed: ${(dictError as Error).message}`);
      }
    }

    auditLog(req.adminUser, 'COMMUNITY_WORD_APPROVE', { word: normalizedWord, language, votesAdded: votesNeeded, addToDictionary });
    res.json({ success: true, votesAdded: votesNeeded });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Community word approve error: ${err.message}`);
    res.status(500).json({ error: 'Failed to approve word' });
  }
});

/**
 * POST /api/admin/community-words/disapprove
 * Disapprove a community word - adds negative votes and optionally blacklists
 */
router.post('/community-words/disapprove', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  const { word, language, reason, addToBlacklist } = req.body;

  if (!word || !language) {
    res.status(400).json({ error: 'Missing word or language' });
    return;
  }

  const normalizedWord = (word as string).toLowerCase().trim();

  try {
    // Get current score with full counts
    const { data: currentScore } = await supabase
      .from('word_scores')
      .select('likes_count, dislikes_count')
      .eq('word', normalizedWord)
      .eq('language', language)
      .single();

    const currentLikes = currentScore?.likes_count || 0;
    const currentDislikes = currentScore?.dislikes_count || 0;
    const votesToAdd = 10; // Add 10 negative votes to reject

    // Update word_scores directly
    const { error: scoreError } = await supabase
      .from('word_scores')
      .upsert({
        word: normalizedWord,
        language,
        likes_count: currentLikes,
        dislikes_count: currentDislikes + votesToAdd,
        last_voted_at: new Date().toISOString(),
      }, { onConflict: 'word,language' });

    if (scoreError) {
      logger.error('ADMIN_API', `Score update failed: ${scoreError.message}`);
      res.status(500).json({ error: 'Failed to update word score' });
      return;
    }

    // Also record a single admin vote for audit trail
    await supabase.from('word_votes').upsert({
      word: normalizedWord,
      language,
      user_id: req.adminUser!.id,
      game_code: `admin_community_disapprove_${Date.now()}`,
      vote_type: 'dislike',
      is_bot_word: false,
    }, { onConflict: 'user_id,word,language', ignoreDuplicates: true });

    // Optionally add to blacklist
    if (addToBlacklist) {
      await supabase
        .from('bot_word_blacklist')
        .upsert({
          word: normalizedWord,
          language,
          reason: reason || 'Admin disapproval',
          blacklisted_by: req.adminUser!.id,
          auto_blacklisted: false,
        }, { onConflict: 'word,language' });
    }

    auditLog(req.adminUser, 'COMMUNITY_WORD_DISAPPROVE', { word: normalizedWord, language, reason, addToBlacklist });
    res.json({ success: true, votesAdded: 10 });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Community word disapprove error: ${err.message}`);
    res.status(500).json({ error: 'Failed to disapprove word' });
  }
});

/**
 * GET /api/admin/community-words/stats
 * Get community words statistics by language
 */
router.get('/community-words/stats', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('word_scores')
      .select('language, net_score');

    if (error) throw error;

    // Aggregate by language
    const statsByLanguage: Record<string, { total: number; validated: number; pendingReview: number; rejected: number; pending: number }> = {};

    (data as LanguageScoreRow[] || []).forEach((row: LanguageScoreRow) => {
      if (!statsByLanguage[row.language]) {
        statsByLanguage[row.language] = { total: 0, validated: 0, pendingReview: 0, rejected: 0, pending: 0 };
      }
      statsByLanguage[row.language].total++;

      if (row.net_score >= 10) {
        statsByLanguage[row.language].validated++;
      } else if (row.net_score >= 3) {
        statsByLanguage[row.language].pendingReview++;
      } else if (row.net_score < 0) {
        statsByLanguage[row.language].rejected++;
      } else {
        statsByLanguage[row.language].pending++;
      }
    });

    res.json({ statsByLanguage });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Community words stats error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch community words stats' });
  }
});

// ==================== Invalid Words Routes ====================

/**
 * GET /api/admin/invalid-words
 * Get invalid word submissions for admin review
 */
router.get('/invalid-words', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const language = (req.query.language as string) || null;
    const minCount = parseInt(req.query.minCount as string) || 3;
    const search = (req.query.search as string) || null;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    // Build query for pending (unapproved) invalid words
    let query = supabase
      .from('invalid_word_submissions')
      .select('id, word, language, submission_count, reason, first_submitted_at, last_submitted_at, approved_at, approved_by', { count: 'exact' })
      .is('approved_at', null) // Only pending (unapproved) words
      .gte('submission_count', minCount)
      .order('submission_count', { ascending: false });

    // Apply filters
    if (language) {
      query = query.eq('language', language);
    }

    if (search) {
      query = query.ilike('word', `%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get summary stats
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
      pagination: {
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Invalid words error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch invalid words' });
  }
});

/**
 * POST /api/admin/invalid-words/approve
 * Approve an invalid word - adds to word_scores with positive votes
 * and marks it as approved in invalid_word_submissions
 */
router.post('/invalid-words/approve', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  const { word, language, addToDictionary } = req.body;

  if (!word || !language) {
    res.status(400).json({ error: 'Missing word or language' });
    return;
  }

  const normalizedWord = (word as string).toLowerCase().trim();

  try {
    // First verify the word exists in invalid_word_submissions
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

    // Calculate votes to add based on submission count (more submissions = more votes)
    const votesNeeded = Math.max(10, Math.min(invalidWord.submission_count * 2, 20));

    // Add to word_scores to make it community-validated
    const { error: scoreError } = await supabase
      .from('word_scores')
      .upsert({
        word: normalizedWord,
        language,
        likes_count: votesNeeded,
        dislikes_count: 0,
        first_submitter: 'admin_approved',
        last_voted_at: new Date().toISOString(),
      }, { onConflict: 'word,language' });

    if (scoreError) {
      logger.error('ADMIN_API', `Word score update failed: ${scoreError.message}`);
      res.status(500).json({ error: 'Failed to update word score' });
      return;
    }

    // Mark as approved in invalid_word_submissions
    const { error: approveError } = await supabase
      .from('invalid_word_submissions')
      .update({
        approved_at: new Date().toISOString(),
        approved_by: req.adminUser!.id,
      })
      .eq('id', invalidWord.id);

    if (approveError) {
      logger.error('ADMIN_API', `Invalid word approval update failed: ${approveError.message}`);
      // Continue anyway - word is already in word_scores
    }

    // Remove from bot blacklist if present
    await supabase
      .from('bot_word_blacklist')
      .delete()
      .eq('word', normalizedWord)
      .eq('language', language);

    // Optionally add to permanent dictionary file
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
      word: normalizedWord,
      language,
      votesAdded: votesNeeded,
      addToDictionary,
      submissionCount: invalidWord.submission_count,
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
 * Dismiss an invalid word - marks it as reviewed without approving
 */
router.post('/invalid-words/dismiss', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  const { word, language, reason } = req.body;

  if (!word || !language) {
    res.status(400).json({ error: 'Missing word or language' });
    return;
  }

  const normalizedWord = (word as string).toLowerCase().trim();

  try {
    // Mark as dismissed by setting approved_at with a special marker
    const { error } = await supabase
      .from('invalid_word_submissions')
      .update({
        approved_at: new Date().toISOString(),
        approved_by: req.adminUser!.id,
        // We'll use the reason field to track this is a dismissal
        reason: `dismissed:${reason || 'admin_review'}`,
      })
      .eq('word', normalizedWord)
      .eq('language', language);

    if (error) {
      throw error;
    }

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
 * Trigger the auto-promotion pipeline manually
 */
router.post('/invalid-words/auto-promote', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const { triggerAutoPromotion } = await import('../../services/cronScheduler');
    const { success, result, duration, error } = await triggerAutoPromotion();

    auditLog(req.adminUser, 'AUTO_PROMOTE_TRIGGERED', {
      promoted: result.promoted,
      failed: result.failed,
      submissionBased: result.words.submissionBased.length,
      milogBased: result.words.milogBased.length,
    });

    if (!success) {
      res.status(500).json({ error: error || 'Auto-promotion failed' });
      return;
    }

    res.json({
      promoted: result.promoted,
      failed: result.failed,
      words: result.words,
      duration,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Auto-promote error: ${err.message}`);
    res.status(500).json({ error: 'Failed to run auto-promotion' });
  }
});

/**
 * GET /api/admin/invalid-words/auto-promote-stats
 * Get auto-promotion statistics for the dashboard
 */
router.get('/invalid-words/auto-promote-stats', async (_req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();

  try {
    // Count auto-promoted words
    const { count: autoPromotedCount, error: countError } = await supabase
      .from('invalid_word_submissions')
      .select('*', { count: 'exact', head: true })
      .not('auto_promoted_at', 'is', null);

    if (countError) throw countError;

    // Count by source
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

    // Count current candidates (eligible for auto-promotion)
    const { count: candidateCount, error: candidateError } = await supabase
      .from('invalid_word_submissions')
      .select('*', { count: 'exact', head: true })
      .eq('reason', 'not_in_dictionary')
      .is('approved_at', null)
      .is('auto_promoted_at', null)
      .gte('submission_count', 10);

    if (candidateError) throw candidateError;

    res.json({
      autoPromoted: autoPromotedCount || 0,
      candidates: candidateCount || 0,
      bySource: sourceCounts,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Auto-promote stats error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch auto-promote stats' });
  }
});

export default router;
