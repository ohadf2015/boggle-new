/**
 * UGC Boards API Routes
 * Handles /api/ugc/boards/* endpoints for community-created boards.
 */

import express, { Request, Response, Router } from 'express';
import { getSupabase } from '../modules/supabaseServer';
import logger from '../utils/logger';
// Use require to avoid rootDir constraint (customPuzzle is outside backend/)
const { generatePuzzleCode, isValidPuzzleCode } = require('../../utils/customPuzzle');
import { validateUgcText, REPORT_REASONS } from '../modules/ugcModeration';
import {
  createBoard,
  getBoardByCode,
  getGallery,
  recordPlay,
  upsertRating,
  submitReport,
  getCreatorBoards,
  getFeaturedBoards,
  uploadBoardCoverImage,
  type GalleryParams,
} from '../modules/supabase/ugcBoards';
import {
  hebrewLetters,
  swedishLetters,
  spanishLetterPool,
  japaneseLetters,
} from '../utils/gameUtils';

// Use require for cross-rootDir modules (outside backend/)
const { embedMultipleWordsInGrid: _embedMultipleWordsInGrid } = require('../../utils/dailyChallenge/gridPathFinding');
import { findWordsForBots as _findWordsForBots } from '../modules/boggleSolver';

function getGridEmbedder() {
  return _embedMultipleWordsInGrid as (...args: unknown[]) => string[][];
}

function getSolver() {
  return _findWordsForBots;
}

const router: Router = express.Router();

const VALID_GRID_SIZES = [4, 5, 6] as const;
const VALID_SORTS = ['newest', 'popular', 'top_rated', 'featured'] as const;
const VALID_DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'] as const;
const DEFAULT_TIMER: Record<number, number> = { 4: 90, 5: 120, 6: 180 };

// ---- Auth helper ----

async function getAuthUser(req: Request): Promise<{ id: string } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  return { id: user.id };
}

function computeDifficulty(wordCount: number): 'EASY' | 'MEDIUM' | 'HARD' {
  if (wordCount >= 30) return 'EASY';
  if (wordCount >= 15) return 'MEDIUM';
  return 'HARD';
}

// ---- Routes ----

/**
 * POST /generate
 * Generate a grid from seed words. Returns grid + stats. No auth required.
 */
router.post('/generate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { seedWords, gridSize, language } = req.body;

    if (!seedWords || !Array.isArray(seedWords) || seedWords.length === 0) {
      res.status(400).json({ error: 'seedWords must be a non-empty array' });
      return;
    }

    if (!VALID_GRID_SIZES.includes(gridSize)) {
      res.status(400).json({ error: `gridSize must be one of: ${VALID_GRID_SIZES.join(', ')}` });
      return;
    }

    if (!language || typeof language !== 'string') {
      res.status(400).json({ error: 'language is required' });
      return;
    }

    const embedMultipleWordsInGrid = getGridEmbedder();
    const findWordsForBots = getSolver();

    if (!embedMultipleWordsInGrid || !findWordsForBots) {
      res.status(503).json({ error: 'Board generation service not ready, try again' });
      return;
    }

    // Use first seed word as primary, rest as bonus
    const [primary, ...bonus] = seedWords as string[];
    const letterPoolByLang: Record<string, string[]> = {
      en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
      he: hebrewLetters,
      sv: swedishLetters,
      ja: japaneseLetters,
      es: spanishLetterPool,
    };
    const letters = letterPoolByLang[language] ?? letterPoolByLang.en;
    const seededRandom = () => Math.random();

    const rawGrid = embedMultipleWordsInGrid(
      primary, bonus, letters, gridSize, gridSize, seededRandom, language
    );

    if (!rawGrid || (Array.isArray(rawGrid) && rawGrid.length === 0)) {
      res.status(500).json({ error: 'Failed to generate grid from seed words' });
      return;
    }

    // Normalize grid to string[][]
    const grid: string[][] = Array.isArray(rawGrid[0])
      ? (rawGrid as unknown as string[][])
      : Array.from({ length: gridSize }, (_, r) =>
          Array.from({ length: gridSize }, (__, c) => (rawGrid as unknown as string[])[r * gridSize + c] ?? '')
        );

    let totalFindableWords = 0;
    try {
      const result = findWordsForBots(grid, language);
      if (result) {
        totalFindableWords = (result.easy?.length ?? 0) + (result.medium?.length ?? 0) + (result.hard?.length ?? 0);
      }
    } catch (solverErr) {
      logger.warn('UGC', `Word solver failed for language ${language}, continuing with 0 findable words`);
    }
    const difficulty = totalFindableWords > 0 ? computeDifficulty(totalFindableWords) : 'HARD';

    res.json({
      grid,
      totalFindableWords,
      difficulty,
      seedWordsPlaced: seedWords,
    });
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `generate error: ${err.message}`);
    res.status(500).json({ error: 'Failed to generate grid' });
  }
});

/**
 * GET /gallery
 * Paginated public board gallery. Must come before /:boardCode.
 */
router.get('/gallery', async (req: Request, res: Response): Promise<void> => {
  try {
    const sort = (req.query.sort as string) || 'newest';
    const language = req.query.language as string | undefined;
    const difficulty = req.query.difficulty as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

    if (!VALID_SORTS.includes(sort as typeof VALID_SORTS[number])) {
      res.status(400).json({ error: `sort must be one of: ${VALID_SORTS.join(', ')}` });
      return;
    }

    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty as typeof VALID_DIFFICULTIES[number])) {
      res.status(400).json({ error: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}` });
      return;
    }

    const params: GalleryParams = {
      sort: sort as GalleryParams['sort'],
      page,
      limit,
    };
    if (language) params.language = language;
    if (difficulty) params.difficulty = difficulty as GalleryParams['difficulty'];

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    const { boards, total } = await getGallery(params);

    res.json({ boards, total, page, limit });
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `gallery error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

/**
 * GET /mine
 * Return authenticated user's created boards. Must come before /:boardCode.
 */
router.get('/mine', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const boards = await getCreatorBoards(user.id);
    res.json({ boards });
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `mine error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
});

/**
 * GET /featured
 * Return featured boards. Must come before /:boardCode.
 */
router.get('/featured', async (_req: Request, res: Response): Promise<void> => {
  try {
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    const boards = await getFeaturedBoards(6);
    res.json({ boards });
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `featured error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch featured boards' });
  }
});

/**
 * POST /publish
 * Create a new public board. Requires auth.
 */
router.post('/publish', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const {
      title,
      description,
      grid,
      gridSize,
      language,
      seedWords,
      totalFindableWords,
      difficulty,
      timerSeconds,
      isPublic,
      creatorDisplayName,
      creatorAvatar,
    } = req.body;

    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    if (!grid || !Array.isArray(grid) || grid.length === 0) {
      res.status(400).json({ error: 'grid is required and must not be empty' });
      return;
    }

    if (!Array.isArray(grid[0]) || grid[0].length === 0) {
      res.status(400).json({ error: 'grid rows must be non-empty arrays' });
      return;
    }

    const titleValidation = validateUgcText(title, 'title', 100);
    if (!titleValidation.valid) {
      res.status(400).json({ error: `Title rejected: ${titleValidation.error}` });
      return;
    }

    if (description) {
      const descValidation = validateUgcText(description, 'description', 500);
      if (!descValidation.valid) {
        res.status(400).json({ error: `Description rejected: ${descValidation.error}` });
        return;
      }
    }

    const board_code = generatePuzzleCode();
    const resolvedGridSize = gridSize ?? (Array.isArray(grid[0]) ? grid[0].length : 4);
    const resolvedTimer = timerSeconds ?? DEFAULT_TIMER[resolvedGridSize] ?? 120;

    const board = await createBoard({
      board_code,
      creator_id: user.id,
      creator_display_name: creatorDisplayName ?? 'Anonymous',
      creator_avatar: creatorAvatar ?? null,
      creator_profile_picture_url: null,
      language: language ?? 'en',
      title,
      description: description ?? null,
      grid,
      grid_size: resolvedGridSize,
      seed_words: seedWords ?? null,
      total_findable_words: totalFindableWords ?? 0,
      difficulty: difficulty ?? 'MEDIUM',
      timer_seconds: resolvedTimer,
      is_public: isPublic ?? true,
      cover_image_url: null,
    });

    res.status(201).json({ boardCode: board.board_code, board });
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `publish error: ${err.message}`);
    res.status(500).json({ error: 'Failed to publish board' });
  }
});

// ---- Image upload constants ----
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};

function validateMagicBytes(buffer: Buffer, declaredType: string): boolean {
  const signatures = MAGIC_BYTES[declaredType];
  if (!signatures) return false;
  return signatures.some(sig =>
    sig.every((byte, i) => buffer.length > i && buffer[i] === byte)
  );
}

/**
 * POST /:boardCode/cover-image
 * Upload a cover image for a board. Requires auth + board ownership.
 */
router.post('/:boardCode/cover-image', express.raw({ type: ALLOWED_MIME_TYPES, limit: '2mb' }), async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const boardCode = req.params.boardCode as string;
    if (!isValidPuzzleCode(boardCode)) {
      res.status(400).json({ error: 'Invalid board code format' });
      return;
    }

    const contentType = req.headers['content-type'] ?? '';
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      res.status(400).json({ error: `Unsupported image type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}` });
      return;
    }

    const buffer = req.body as Buffer;
    if (!buffer || buffer.length === 0) {
      res.status(400).json({ error: 'No image data received' });
      return;
    }

    if (buffer.length > MAX_IMAGE_SIZE) {
      res.status(400).json({ error: 'Image too large. Maximum size is 2MB' });
      return;
    }

    if (!validateMagicBytes(buffer, contentType)) {
      res.status(400).json({ error: 'File content does not match declared type' });
      return;
    }

    const board = await getBoardByCode(boardCode);
    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }
    if (board.creator_id !== user.id) {
      res.status(403).json({ error: 'You can only upload images to your own boards' });
      return;
    }

    const publicUrl = await uploadBoardCoverImage(user.id, boardCode, buffer, contentType);
    res.json({ coverImageUrl: publicUrl });
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `cover-image upload error: ${err.message}`);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

/**
 * GET /:boardCode
 * Fetch a single board by its code.
 */
router.get('/:boardCode', async (req: Request, res: Response): Promise<void> => {
  try {
    const boardCode = req.params.boardCode as string;

    if (!isValidPuzzleCode(boardCode)) {
      res.status(400).json({ error: 'Invalid board code format' });
      return;
    }

    const board = await getBoardByCode(boardCode);
    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    res.json(board);
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `get board error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

/**
 * POST /:boardCode/play
 * Record a play result. Auth optional (supports guests).
 */
router.post('/:boardCode/play', async (req: Request, res: Response): Promise<void> => {
  try {
    const boardCode = req.params.boardCode as string;

    if (!isValidPuzzleCode(boardCode)) {
      res.status(400).json({ error: 'Invalid board code format' });
      return;
    }

    const board = await getBoardByCode(boardCode);
    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    const user = await getAuthUser(req);
    const { displayName, score, wordCount, longestWord, timeSeconds, guestFingerprint, customAvatar } = req.body;

    await recordPlay({
      board_id: board.id,
      player_id: user?.id ?? null,
      guest_fingerprint: user ? null : (guestFingerprint ?? null),
      display_name: displayName ?? 'Anonymous',
      custom_avatar: customAvatar ?? null,
      score: score ?? 0,
      word_count: wordCount ?? 0,
      longest_word: longestWord ?? null,
      time_seconds: timeSeconds ?? null,
    });

    res.json({ ok: true });
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `play error: ${err.message}`);
    res.status(500).json({ error: 'Failed to record play' });
  }
});

/**
 * POST /:boardCode/rate
 * Upsert a 1-5 rating. Requires auth.
 */
router.post('/:boardCode/rate', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const boardCode = req.params.boardCode as string;
    const { rating } = req.body;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
      return;
    }

    const board = await getBoardByCode(boardCode);
    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    await upsertRating(board.id, user.id, rating);
    res.json({ ok: true });
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `rate error: ${err.message}`);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

/**
 * POST /:boardCode/report
 * Submit a content report. Requires auth.
 */
router.post('/:boardCode/report', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const boardCode = req.params.boardCode as string;
    const { reason } = req.body;

    if (!reason || !REPORT_REASONS.includes(reason)) {
      res.status(400).json({ error: `reason must be one of: ${REPORT_REASONS.join(', ')}` });
      return;
    }

    const board = await getBoardByCode(boardCode);
    if (!board) {
      res.status(404).json({ error: 'Board not found' });
      return;
    }

    const result = await submitReport(board.id, user.id, reason);
    res.json(result);
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `report error: ${err.message}`);
    res.status(500).json({ error: 'Failed to submit report' });
  }
});

/**
 * GET /creators/top
 * Top creators ranked by total plays. Cached 5 min.
 */
router.get('/creators/top', async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 50));
    const supabase = getSupabase();
    if (!supabase) {
      res.status(503).json({ error: 'Database unavailable' });
      return;
    }

    const { data, error } = await supabase
      .from('community_board_creator_stats')
      .select('creator_id, boards_created, total_plays, average_rating')
      .order('total_plays', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Join with profiles for display names and avatars
    const creatorIds = (data ?? []).map((r) => r.creator_id);
    let profileMap: Record<string, { display_name: string; avatar_config: unknown }> = {};

    if (creatorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_config')
        .in('id', creatorIds);

      for (const p of profiles ?? []) {
        profileMap[p.id] = {
          display_name: p.display_name ?? 'Creator',
          avatar_config: p.avatar_config ?? null,
        };
      }
    }

    const creators = (data ?? []).map((row) => ({
      creator_id: row.creator_id,
      display_name: profileMap[row.creator_id]?.display_name ?? 'Creator',
      avatar_config: profileMap[row.creator_id]?.avatar_config ?? null,
      boards_created: row.boards_created ?? 0,
      total_plays: row.total_plays ?? 0,
      avg_rating: row.average_rating ?? null,
    }));

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.json({ creators });
  } catch (error) {
    const err = error as Error;
    logger.error('UGC', `creators/top error: ${err.message}`);
    res.status(500).json({ error: 'Failed to fetch top creators' });
  }
});

export default router;
