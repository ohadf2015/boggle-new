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
} from './types';
import { auditLog } from './middleware';
import logger from '../../utils/logger';
import invalidWordRouter from './invalidWordRoutes';

const { getSupabase } = require('../../modules/supabaseServer');

const router: Router = express.Router();

// Validation Schemas
const supportedLanguages = ['en', 'he', 'sv', 'ja', 'es', 'ru', 'fr', 'de'] as const;

const wordModSchema = z.object({
  word: z.string().min(1).max(50).transform((s: string) => s.toLowerCase().trim()),
  language: z.enum(supportedLanguages),
  reason: z.string().max(200).optional().nullable(),
  addToDictionary: z.boolean().optional(),
  addToBlacklist: z.boolean().optional(),
});

const blacklistAddSchema = wordModSchema.pick({ word: true, language: true, reason: true });

// ==================== Bot Words Routes ====================

router.get('/bot-words', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const language = (req.query.language as string) || null;

    let query = supabase
      .from('word_votes')
      .select('word, language, vote_type, created_at, game_code')
      .eq('is_bot_word', true);

    if (language) query = query.eq('language', language);

    const { data: votes, error } = await query;

    if (error) {
      if (error.message?.includes('is_bot_word')) {
        res.json({ words: [], message: 'Bot word tracking not yet enabled. Run migration 013.' });
        return;
      }
      throw error;
    }

    const wordStats: Record<string, WordStatBuilder> = {};
    votes?.forEach((vote: VoteRow) => {
      const key = `${vote.word}:${vote.language}`;
      if (!wordStats[key]) {
        wordStats[key] = {
          word: vote.word, language: vote.language,
          likes: 0, dislikes: 0, gameCodes: new Set(),
          firstSeen: vote.created_at, lastSeen: vote.created_at
        };
      }
      if (vote.vote_type === 'like') wordStats[key].likes++;
      else wordStats[key].dislikes++;
      wordStats[key].gameCodes.add(vote.game_code);
      if (vote.created_at < wordStats[key].firstSeen) wordStats[key].firstSeen = vote.created_at;
      if (vote.created_at > wordStats[key].lastSeen) wordStats[key].lastSeen = vote.created_at;
    });

    const words: WordStat[] = Object.values(wordStats)
      .map((w: WordStatBuilder) => ({ ...w, gameCodes: Array.from(w.gameCodes), netScore: w.likes - w.dislikes }))
      .filter((w: WordStat) => w.dislikes > 0)
      .sort((a: WordStat, b: WordStat) => b.dislikes - a.dislikes);

    res.json({ words });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Bot words error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch bot words' });
  }
});

router.get('/bot-blacklist', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const language = (req.query.language as string) || null;

    let query = supabase
      .from('bot_word_blacklist')
      .select('id, word, language, reason, created_at')
      .order('created_at', { ascending: false });

    if (language) query = query.eq('language', language);

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

router.post('/bot-blacklist', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
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
      .insert({ word, language, reason: reason || null, blacklisted_by: req.adminUser!.id })
      .select().single();

    if (error) {
      if (error.code === '23505') { res.status(409).json({ error: 'Word already blacklisted' }); return; }
      throw error;
    }

    auditLog(req.adminUser, 'BLACKLIST_ADD', { word, language, reason, entryId: data.id });
    res.json({ success: true, blacklistEntry: data });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Add blacklist error: ${err.message}`);
    res.status(500).json({ error: 'Failed to add word to blacklist' });
  }
});

router.delete('/bot-blacklist/:id', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;
    const { error } = await supabase.from('bot_word_blacklist').delete().eq('id', id);
    if (error) throw error;
    auditLog(req.adminUser, 'BLACKLIST_REMOVE', { entryId: id });
    res.json({ success: true });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Delete blacklist error: ${err.message}`);
    res.status(500).json({ error: 'Failed to remove word from blacklist' });
  }
});

router.post('/bot-words/approve', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  const validation = wordModSchema.safeParse(req.body);
  if (!validation.success) { res.status(400).json({ error: 'Invalid request', details: validation.error.issues }); return; }

  const normalizedWord = validation.data.word;
  const language = validation.data.language;

  try {
    await supabase.from('bot_word_blacklist').delete().eq('word', normalizedWord).eq('language', language);

    const { data: currentScore } = await supabase.from('word_scores')
      .select('likes_count, dislikes_count, net_score').eq('word', normalizedWord).eq('language', language).single();

    const currentLikes = currentScore?.likes_count || 0;
    const currentDislikes = currentScore?.dislikes_count || 0;
    const currentNet = currentScore?.net_score || 0;
    const votesNeeded = Math.max(10 - currentNet, 10);

    const { error: scoreError } = await supabase.from('word_scores').upsert({
      word: normalizedWord, language,
      likes_count: currentLikes + votesNeeded, dislikes_count: currentDislikes,
      last_voted_at: new Date().toISOString(),
    }, { onConflict: 'word,language' });

    if (scoreError) {
      logger.error('ADMIN_API', `Score update failed: ${scoreError.message}`);
      res.status(500).json({ error: 'Failed to update word score' }); return;
    }

    await supabase.from('word_votes').upsert({
      word: normalizedWord, language, user_id: req.adminUser!.id,
      game_code: `admin_approval_${Date.now()}`, vote_type: 'like', is_bot_word: true
    }, { onConflict: 'user_id,word,language', ignoreDuplicates: true });

    auditLog(req.adminUser, 'BOT_WORD_APPROVE', { word: normalizedWord, language });
    res.json({ success: true });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Approve error: ${err.message}`);
    res.status(500).json({ error: 'Failed to approve word' });
  }
});

router.post('/bot-words/disapprove', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  const validation = wordModSchema.safeParse(req.body);
  if (!validation.success) { res.status(400).json({ error: 'Invalid request', details: validation.error.issues }); return; }

  const normalizedWord = validation.data.word;
  const language = validation.data.language;
  const reason = validation.data.reason;

  try {
    await supabase.from('bot_word_blacklist').upsert({
      word: normalizedWord, language, reason: reason || 'Admin disapproval',
      blacklisted_by: req.adminUser!.id
    }, { onConflict: 'word,language' });

    const { data: currentScore } = await supabase.from('word_scores')
      .select('likes_count, dislikes_count').eq('word', normalizedWord).eq('language', language).single();

    const currentLikes = currentScore?.likes_count || 0;
    const currentDislikes = currentScore?.dislikes_count || 0;

    const { error: scoreError } = await supabase.from('word_scores').upsert({
      word: normalizedWord, language,
      likes_count: currentLikes, dislikes_count: currentDislikes + 5,
      last_voted_at: new Date().toISOString(),
    }, { onConflict: 'word,language' });

    if (scoreError) {
      logger.error('ADMIN_API', `Score update failed: ${scoreError.message}`);
      res.status(500).json({ error: 'Failed to update word score' }); return;
    }

    await supabase.from('word_votes').upsert({
      word: normalizedWord, language, user_id: req.adminUser!.id,
      game_code: `admin_disapproval_${Date.now()}`, vote_type: 'dislike', is_bot_word: true
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

    let query = supabase
      .from('word_scores')
      .select('word, language, likes_count, dislikes_count, net_score, is_potentially_valid, first_submitter, last_voted_at, first_voted_at', { count: 'exact' });

    if (language) query = query.eq('language', language);
    if (search) query = query.ilike('word', `%${search}%`);

    if (status === 'validated') query = query.gte('net_score', 10);
    else if (status === 'pending_review') query = query.gte('net_score', 3).lt('net_score', 10);
    else if (status === 'rejected') query = query.lt('net_score', 0);
    else if (status === 'pending') query = query.gte('net_score', 0).lt('net_score', 3);

    const validSortFields = ['net_score', 'likes_count', 'dislikes_count', 'created_at', 'last_voted_at'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'net_score';
    query = query.order(sortField, { ascending: sortOrder }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    const words: CommunityWordEntry[] = (data as WordScoreRow[] || []).map((row: WordScoreRow) => {
      let wordStatus: CommunityWordEntry['status'] = 'pending';
      if (row.net_score >= 10) wordStatus = 'validated';
      else if (row.net_score >= 3) wordStatus = 'pending_review';
      else if (row.net_score < 0) wordStatus = 'rejected';
      return { ...row, status: wordStatus };
    });

    const { data: statsData } = await supabase.from('word_scores').select('net_score').throwOnError();
    const typedStatsData = statsData as NetScoreRow[] | null;
    const stats = {
      total: typedStatsData?.length || 0,
      validated: typedStatsData?.filter((w: NetScoreRow) => w.net_score >= 10).length || 0,
      pendingReview: typedStatsData?.filter((w: NetScoreRow) => w.net_score >= 3 && w.net_score < 10).length || 0,
      rejected: typedStatsData?.filter((w: NetScoreRow) => w.net_score < 0).length || 0,
      pending: typedStatsData?.filter((w: NetScoreRow) => w.net_score >= 0 && w.net_score < 3).length || 0,
    };

    res.json({
      words, total: count || 0, stats,
      pagination: { limit, offset, hasMore: (count || 0) > offset + limit },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Community words error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch community words' });
  }
});

router.post('/community-words/approve', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  const validation = wordModSchema.safeParse(req.body);
  if (!validation.success) { res.status(400).json({ error: 'Invalid request', details: validation.error.issues }); return; }

  const normalizedWord = validation.data.word;
  const language = validation.data.language;
  const addToDictionary = validation.data.addToDictionary;

  try {
    const { data: currentScore } = await supabase.from('word_scores')
      .select('likes_count, dislikes_count, net_score').eq('word', normalizedWord).eq('language', language).single();

    const currentNet = currentScore?.net_score || 0;
    const votesNeeded = Math.max(10 - currentNet, 5);
    const currentLikes = currentScore?.likes_count || 0;
    const currentDislikes = currentScore?.dislikes_count || 0;

    const { error: scoreError } = await supabase.from('word_scores').upsert({
      word: normalizedWord, language,
      likes_count: currentLikes + votesNeeded, dislikes_count: currentDislikes,
      last_voted_at: new Date().toISOString(),
    }, { onConflict: 'word,language' });

    if (scoreError) {
      logger.error('ADMIN_API', `Score update failed: ${scoreError.message}`);
      res.status(500).json({ error: 'Failed to update word score' }); return;
    }

    await supabase.from('word_votes').upsert({
      word: normalizedWord, language, user_id: req.adminUser!.id,
      game_code: `admin_community_approve_${Date.now()}`, vote_type: 'like', is_bot_word: false,
    }, { onConflict: 'user_id,word,language', ignoreDuplicates: true });

    await supabase.from('bot_word_blacklist').delete().eq('word', normalizedWord).eq('language', language);

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

router.post('/community-words/disapprove', async (req: AdminRequest, res: Response): Promise<void> => {
  const supabase = getSupabase();
  const validation = wordModSchema.safeParse(req.body);
  if (!validation.success) { res.status(400).json({ error: 'Invalid request', details: validation.error.issues }); return; }

  const normalizedWord = validation.data.word;
  const language = validation.data.language;
  const reason = validation.data.reason;
  const addToBlacklist = validation.data.addToBlacklist;

  try {
    const { data: currentScore } = await supabase.from('word_scores')
      .select('likes_count, dislikes_count').eq('word', normalizedWord).eq('language', language).single();

    const currentLikes = currentScore?.likes_count || 0;
    const currentDislikes = currentScore?.dislikes_count || 0;

    const { error: scoreError } = await supabase.from('word_scores').upsert({
      word: normalizedWord, language,
      likes_count: currentLikes, dislikes_count: currentDislikes + 10,
      last_voted_at: new Date().toISOString(),
    }, { onConflict: 'word,language' });

    if (scoreError) {
      logger.error('ADMIN_API', `Score update failed: ${scoreError.message}`);
      res.status(500).json({ error: 'Failed to update word score' }); return;
    }

    await supabase.from('word_votes').upsert({
      word: normalizedWord, language, user_id: req.adminUser!.id,
      game_code: `admin_community_disapprove_${Date.now()}`, vote_type: 'dislike', is_bot_word: false,
    }, { onConflict: 'user_id,word,language', ignoreDuplicates: true });

    if (addToBlacklist) {
      await supabase.from('bot_word_blacklist').upsert({
        word: normalizedWord, language, reason: reason || 'Admin disapproval',
        blacklisted_by: req.adminUser!.id, auto_blacklisted: false,
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

router.get('/community-words/stats', async (req: AdminRequest, res: Response): Promise<void> => {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('word_scores').select('language, net_score');
    if (error) throw error;

    const statsByLanguage: Record<string, { total: number; validated: number; pendingReview: number; rejected: number; pending: number }> = {};

    (data as LanguageScoreRow[] || []).forEach((row: LanguageScoreRow) => {
      if (!statsByLanguage[row.language]) {
        statsByLanguage[row.language] = { total: 0, validated: 0, pendingReview: 0, rejected: 0, pending: 0 };
      }
      statsByLanguage[row.language].total++;
      if (row.net_score >= 10) statsByLanguage[row.language].validated++;
      else if (row.net_score >= 3) statsByLanguage[row.language].pendingReview++;
      else if (row.net_score < 0) statsByLanguage[row.language].rejected++;
      else statsByLanguage[row.language].pending++;
    });

    res.json({ statsByLanguage });
  } catch (error) {
    const err = error as Error;
    logger.error('ADMIN_API', `Community words stats error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch community words stats' });
  }
});

// Mount invalid word routes
router.use('/invalid-words', invalidWordRouter);

export default router;
