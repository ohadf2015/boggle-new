/**
 * UGC Word Packs API Routes
 * Handles /api/ugc/packs/* endpoints
 */

import express, { Request, Response, Router } from 'express';
import logger from '../utils/logger';
import { getSupabase } from '../modules/supabaseServer';
import {
  createPack,
  getPackById,
  getPackGallery,
  updatePack,
  softDeletePack,
  toggleUpvote,
  submitPackReport,
  getCreatorPacks,
} from '../modules/supabase/ugcPacks';
import { validateUgcText, REPORT_REASONS } from '../modules/ugcModeration';

const router: Router = express.Router();

// UUID regex (any version)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function getAuthUser(req: Request): Promise<{ id: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return { id: data.user.id };
}

async function requireAuth(req: Request, res: Response): Promise<string | null> {
  // Check middleware-injected userId first (e.g. from upstream auth middleware)
   
  const midwareId = (req as any).userId as string | undefined;
  if (midwareId) return midwareId;

  const user = await getAuthUser(req);
  if (!user) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
    return null;
  }
  return user.id;
}

// ─── Word format validator ────────────────────────────────────────────────────

function isValidWordFormat(word: string): boolean {
  // Support Latin (en/sv/es), Hebrew, and Japanese (hiragana/katakana/kanji)
  return /^[\p{L}]{2,}$/u.test(word);
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /validate
 * Batch-validate word format. No auth required.
 */
router.post('/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { words, language } = req.body as { words?: unknown; language?: string };

    if (!Array.isArray(words) || words.length === 0) {
      res.status(400).json({ error: 'INVALID_INPUT', message: 'words must be a non-empty array' });
      return;
    }

    if (!language) {
      res.status(400).json({ error: 'INVALID_INPUT', message: 'language is required' });
      return;
    }

    const results = (words as string[]).map((word) => ({
      word,
      valid: isValidWordFormat(word),
    }));

    res.json({ results });
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `validate error: ${err.message}`);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /mine
 * Returns all packs created by the authenticated user.
 * Must be before /:packId to avoid conflict.
 */
router.get('/mine', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const packs = await getCreatorPacks(userId);
    res.json(packs);
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `getCreatorPacks error: ${err.message}`);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * POST /
 * Create a new word pack. Requires auth.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const {
      name,
      description,
      language = 'en',
      theme_emoji,
      words,
      tags,
      is_public = true,
      creator_display_name,
    } = req.body as {
      name?: string;
      description?: string;
      language?: string;
      theme_emoji?: string;
      words?: unknown;
      tags?: string[];
      is_public?: boolean;
      creator_display_name?: string;
    };

    // Validate name
    const nameValidation = validateUgcText(name, 'name', 80);
    if (!nameValidation.valid) {
      res.status(400).json({ error: 'INVALID_NAME', field: 'name', reason: nameValidation.error });
      return;
    }

    // Validate words array
    if (!Array.isArray(words) || words.length < 10) {
      res.status(400).json({ error: 'INVALID_WORDS', message: 'words must have at least 10 items' });
      return;
    }

    const pack = await createPack({
      creator_id: userId,
      creator_display_name: creator_display_name ?? 'Anonymous',
      creator_avatar: null,
      name: name as string,
      description: description ?? null,
      language,
      theme_emoji: theme_emoji ?? null,
      words: words as string[],
      tags: tags ?? null,
      is_public,
    });

    res.status(201).json(pack);
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `createPack error: ${err.message}`);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /
 * Paginated gallery of public approved packs.
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const sort = (req.query.sort as string) || 'newest';
    const language = req.query.language as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    const validSorts = ['newest', 'popular', 'upvotes'];
    if (!validSorts.includes(sort)) {
      res.status(400).json({ error: 'INVALID_SORT' });
      return;
    }

    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');

    const result = await getPackGallery({
      sort: sort as 'newest' | 'popular' | 'upvotes',
      language,
      page,
      limit,
    });

    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `getPackGallery error: ${err.message}`);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * GET /:packId
 * Single pack detail.
 */
router.get('/:packId', async (req: Request, res: Response): Promise<void> => {
  try {
    const packId = req.params.packId as string;

    if (!UUID_RE.test(packId)) {
      res.status(400).json({ error: 'INVALID_PACK_ID' });
      return;
    }

    const pack = await getPackById(packId);
    if (!pack) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }

    res.json(pack);
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `getPackById error: ${err.message}`);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * PATCH /:packId
 * Update a pack. Owner only.
 */
router.patch('/:packId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const packId = req.params.packId as string;
    if (!UUID_RE.test(packId)) {
      res.status(400).json({ error: 'INVALID_PACK_ID' });
      return;
    }

    const existing = await getPackById(packId);
    if (!existing) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }

    if (existing.creator_id !== userId) {
      res.status(403).json({ error: 'FORBIDDEN' });
      return;
    }

    const { name, description, words, tags, theme_emoji } = req.body as {
      name?: string;
      description?: string;
      words?: string[];
      tags?: string[];
      theme_emoji?: string;
    };

    const updated = await updatePack(packId, userId, { name, description, words, tags, theme_emoji });
    res.json(updated);
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `updatePack error: ${err.message}`);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * DELETE /:packId
 * Soft-delete a pack. Owner only.
 */
router.delete('/:packId', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const packId = req.params.packId as string;
    if (!UUID_RE.test(packId)) {
      res.status(400).json({ error: 'INVALID_PACK_ID' });
      return;
    }

    const existing = await getPackById(packId);
    if (!existing) {
      res.status(404).json({ error: 'NOT_FOUND' });
      return;
    }

    if (existing.creator_id !== userId) {
      res.status(403).json({ error: 'FORBIDDEN' });
      return;
    }

    const deleted = await softDeletePack(packId, userId);
    res.json({ deleted });
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `softDeletePack error: ${err.message}`);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * POST /:packId/upvote
 * Toggle upvote. Requires auth.
 */
router.post('/:packId/upvote', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const packId = req.params.packId as string;
    if (!UUID_RE.test(packId)) {
      res.status(400).json({ error: 'INVALID_PACK_ID' });
      return;
    }

    const result = await toggleUpvote(packId, userId);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `toggleUpvote error: ${err.message}`);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

/**
 * POST /:packId/report
 * Submit a moderation report. Requires auth.
 */
router.post('/:packId/report', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = await requireAuth(req, res);
    if (!userId) return;

    const packId = req.params.packId as string;
    if (!UUID_RE.test(packId)) {
      res.status(400).json({ error: 'INVALID_PACK_ID' });
      return;
    }

    const { reason } = req.body as { reason?: string };

    if (!reason || !(REPORT_REASONS as readonly string[]).includes(reason)) {
      res.status(400).json({
        error: 'INVALID_REASON',
        message: `reason must be one of: ${REPORT_REASONS.join(', ')}`,
      });
      return;
    }

    await submitPackReport(packId, userId, reason);
    res.json({ reported: true });
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `submitPackReport error: ${err.message}`);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
});

export default router;
