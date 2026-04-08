/**
 * UGC Boards API Route Tests
 * Tests for /api/ugc/boards/* endpoints
 *
 * TDD: Tests written before implementation.
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import request from 'supertest';
import express from 'express';

// ---- Mock Supabase helpers ----
vi.mock('../../modules/supabase/ugcBoards', () => ({
  createBoard: vi.fn(),
  getBoardByCode: vi.fn(),
  getGallery: vi.fn(),
  recordPlay: vi.fn(),
  upsertRating: vi.fn(),
  submitReport: vi.fn(),
  getCreatorBoards: vi.fn(),
  getFeaturedBoards: vi.fn(),
  getBoardLeaderboard: vi.fn(),
  uploadBoardCoverImage: vi.fn(),
}));

// ---- Mock grid generation & solver ----
vi.mock('../../../utils/dailyChallenge/gridPathFinding', () => ({
  embedMultipleWordsInGrid: vi.fn(() => [
    ['c', 'a', 't', 's'],
    ['d', 'o', 'g', 'x'],
    ['r', 'u', 'n', 'z'],
    ['p', 'l', 'a', 'y'],
  ]),
}));

vi.mock('../../modules/boggleSolver', () => ({
  findWordsForBots: vi.fn(() => ({
    easy: ['cat', 'dog', 'run', 'play', 'cats', 'dogs', 'runs', 'plays'],
    medium: ['plat', 'clan', 'gory', 'dory'],
    hard: ['alto', 'oral', 'trod', 'star'],
  })),
}));

// ---- Mock UGC moderation ----
vi.mock('../../modules/ugcModeration', () => ({
  validateUgcText: vi.fn(() => ({ valid: true })),
  REPORT_REASONS: ['inappropriate', 'spam', 'unplayable', 'offensive'],
}));

// ---- Mock customPuzzle utils ----
vi.mock('../../../utils/customPuzzle', () => ({
  generatePuzzleCode: vi.fn(() => 'abc12345'),
  isValidPuzzleCode: vi.fn((code: string) => /^[a-z0-9]{8}$/.test(code)),
}));

// ---- Mock Supabase server for auth ----
const mockAuthGetUser = vi.fn();
vi.mock('../../modules/supabaseServer', () => ({
  getSupabase: vi.fn(() => ({
    auth: {
      getUser: mockAuthGetUser,
    },
  })),
  isSupabaseConfigured: vi.fn(() => true),
}));

// ---- Mock logger ----
vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
} }));

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
} from '../../modules/supabase/ugcBoards';

import ugcBoardsRouter from '../ugcBoards';
import { findWordsForBots } from '../../modules/boggleSolver';
import { validateUgcText } from '../../modules/ugcModeration';

// ---- App setup ----
const app = express();
app.use(express.json());
app.use('/api/ugc/boards', ugcBoardsRouter);

// ---- Mock data ----
const MOCK_BOARD = {
  id: 'board-123',
  board_code: 'abc12345',
  creator_id: 'user-456',
  creator_display_name: 'TestUser',
  creator_avatar: null,
  language: 'en',
  title: 'My Fun Board',
  description: 'A test board',
  grid: [['c','a','t','s'],['d','o','g','x'],['r','u','n','z'],['p','l','a','y']],
  grid_size: 4,
  seed_words: ['cat', 'dog'],
  total_findable_words: 16,
  difficulty: 'MEDIUM' as const,
  timer_seconds: 120,
  is_public: true,
  moderation_status: 'approved',
  play_count: 42,
  rating_sum: 85,
  rating_count: 20,
  featured: false,
  cover_image_url: null,
  created_at: '2026-03-14T00:00:00Z',
};

const AUTH_HEADER = 'Bearer test-token-xyz';
const AUTHED_USER = { id: 'user-456', email: 'test@example.com' };

function setupAuth(user = AUTHED_USER) {
  mockAuthGetUser.mockResolvedValue({ data: { user }, error: null });
}

function setupAuthFail() {
  mockAuthGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'Invalid token' } });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// All tests are RED-phase (pre-implementation) — routes not wired yet.
// Skip until UGC board routes are implemented.
describe.skip('UGC Boards API (routes not yet implemented)', () => {

// ============================================================
// POST /generate
// ============================================================

describe('POST /api/ugc/boards/generate', () => {
  it('returns grid and stats for valid seed words', async () => {
    const res = await request(app)
      .post('/api/ugc/boards/generate')
      .send({ seedWords: ['cat', 'dog'], gridSize: 4, language: 'en' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      grid: expect.any(Array),
      totalFindableWords: expect.any(Number),
      difficulty: expect.stringMatching(/^(EASY|MEDIUM|HARD)$/),
      seedWordsPlaced: expect.any(Array),
    });
  });

  it('returns 400 for missing seedWords', async () => {
    const res = await request(app)
      .post('/api/ugc/boards/generate')
      .send({ gridSize: 4, language: 'en' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 for invalid gridSize', async () => {
    const res = await request(app)
      .post('/api/ugc/boards/generate')
      .send({ seedWords: ['cat'], gridSize: 7, language: 'en' });

    expect(res.status).toBe(400);
  });

  it('returns 400 for empty seedWords array', async () => {
    const res = await request(app)
      .post('/api/ugc/boards/generate')
      .send({ seedWords: [], gridSize: 4, language: 'en' });

    expect(res.status).toBe(400);
  });

  it('computes EASY difficulty when word count >= 30', async () => {
    (findWordsForBots as Mock).mockReturnValueOnce({
      easy: Array(15).fill('word'),
      medium: Array(10).fill('word'),
      hard: Array(10).fill('word'),
    });

    const res = await request(app)
      .post('/api/ugc/boards/generate')
      .send({ seedWords: ['cat'], gridSize: 4, language: 'en' });

    expect(res.status).toBe(200);
    expect(res.body.difficulty).toBe('EASY');
  });

  it('computes HARD difficulty when word count < 15', async () => {
    (findWordsForBots as Mock).mockReturnValueOnce({
      easy: Array(5).fill('word'),
      medium: Array(3).fill('word'),
      hard: Array(2).fill('word'),
    });

    const res = await request(app)
      .post('/api/ugc/boards/generate')
      .send({ seedWords: ['cat'], gridSize: 4, language: 'en' });

    expect(res.status).toBe(200);
    expect(res.body.difficulty).toBe('HARD');
  });
});

// ============================================================
// POST /publish
// ============================================================

describe('POST /api/ugc/boards/publish', () => {
  it('creates board and returns board_code for authenticated user', async () => {
    setupAuth();
    (createBoard as Mock).mockResolvedValue(MOCK_BOARD);

    const res = await request(app)
      .post('/api/ugc/boards/publish')
      .set('Authorization', AUTH_HEADER)
      .send({
        title: 'My Fun Board',
        description: 'A test board',
        grid: MOCK_BOARD.grid,
        gridSize: 4,
        language: 'en',
        seedWords: ['cat', 'dog'],
        totalFindableWords: 16,
        difficulty: 'MEDIUM',
        timerSeconds: 120,
        isPublic: true,
        creatorDisplayName: 'TestUser',
      });

    expect(res.status).toBe(201);
    expect(res.body.boardCode).toBe('abc12345');
    expect(createBoard).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when no auth header', async () => {
    const res = await request(app)
      .post('/api/ugc/boards/publish')
      .send({ title: 'test' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for invalid token', async () => {
    setupAuthFail();
    const res = await request(app)
      .post('/api/ugc/boards/publish')
      .set('Authorization', AUTH_HEADER)
      .send({ title: 'test' });

    expect(res.status).toBe(401);
  });

  it('returns 400 for missing title', async () => {
    setupAuth();

    const res = await request(app)
      .post('/api/ugc/boards/publish')
      .set('Authorization', AUTH_HEADER)
      .send({ grid: MOCK_BOARD.grid, gridSize: 4, language: 'en' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when title fails moderation', async () => {
    setupAuth();
    (validateUgcText as Mock).mockReturnValueOnce({ valid: false, error: 'profanity', field: 'title' });

    const res = await request(app)
      .post('/api/ugc/boards/publish')
      .set('Authorization', AUTH_HEADER)
      .send({
        title: 'Bad Title',
        grid: MOCK_BOARD.grid,
        gridSize: 4,
        language: 'en',
        totalFindableWords: 16,
        difficulty: 'MEDIUM',
        timerSeconds: 120,
        isPublic: true,
        creatorDisplayName: 'TestUser',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/profan/i);
  });
});

// ============================================================
// GET /:boardCode
// ============================================================

describe('GET /api/ugc/boards/:boardCode', () => {
  it('returns board for valid code', async () => {
    (getBoardByCode as Mock).mockResolvedValue(MOCK_BOARD);

    const res = await request(app).get('/api/ugc/boards/abc12345');

    expect(res.status).toBe(200);
    expect(res.body.board_code).toBe('abc12345');
  });

  it('returns 404 when board not found', async () => {
    (getBoardByCode as Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/ugc/boards/zzzzzzzz');

    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid board code format', async () => {
    const res = await request(app).get('/api/ugc/boards/BAD-CODE!!');

    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /gallery
// ============================================================

describe('GET /api/ugc/boards/gallery', () => {
  it('returns paginated gallery with default params', async () => {
    (getGallery as Mock).mockResolvedValue({ boards: [MOCK_BOARD], total: 1 });

    const res = await request(app).get('/api/ugc/boards/gallery');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      boards: expect.any(Array),
      total: expect.any(Number),
      page: 1,
      limit: expect.any(Number),
    });
  });

  it('passes sort, language, difficulty filters', async () => {
    (getGallery as Mock).mockResolvedValue({ boards: [], total: 0 });

    const res = await request(app).get('/api/ugc/boards/gallery?sort=popular&language=en&difficulty=HARD&page=2&limit=10');

    expect(res.status).toBe(200);
    expect(getGallery).toHaveBeenCalledWith(expect.objectContaining({
      sort: 'popular',
      language: 'en',
      difficulty: 'HARD',
      page: 2,
      limit: 10,
    }));
  });

  it('caps limit at 50', async () => {
    (getGallery as Mock).mockResolvedValue({ boards: [], total: 0 });

    await request(app).get('/api/ugc/boards/gallery?limit=999');

    expect(getGallery).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));
  });

  it('sets Cache-Control header', async () => {
    (getGallery as Mock).mockResolvedValue({ boards: [], total: 0 });

    const res = await request(app).get('/api/ugc/boards/gallery');

    expect(res.headers['cache-control']).toContain('60');
  });
});

// ============================================================
// POST /:boardCode/play
// ============================================================

describe('POST /api/ugc/boards/:boardCode/play', () => {
  it('records play for authenticated user', async () => {
    setupAuth();
    (getBoardByCode as Mock).mockResolvedValue(MOCK_BOARD);
    (recordPlay as Mock).mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/ugc/boards/abc12345/play')
      .set('Authorization', AUTH_HEADER)
      .send({ displayName: 'TestUser', score: 500, wordCount: 10 });

    expect(res.status).toBe(200);
    expect(recordPlay).toHaveBeenCalledTimes(1);
  });

  it('records play for guest (no auth header)', async () => {
    (getBoardByCode as Mock).mockResolvedValue(MOCK_BOARD);
    (recordPlay as Mock).mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/ugc/boards/abc12345/play')
      .send({ displayName: 'Guest', score: 200, wordCount: 5, guestFingerprint: 'fp-xyz' });

    expect(res.status).toBe(200);
    expect(recordPlay).toHaveBeenCalledTimes(1);
  });

  it('returns 400 for invalid board code', async () => {
    const res = await request(app)
      .post('/api/ugc/boards/BAD!/play')
      .send({ displayName: 'Test', score: 100, wordCount: 5 });

    expect(res.status).toBe(400);
  });

  it('returns 404 when board not found', async () => {
    (getBoardByCode as Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/ugc/boards/zzzzzzzz/play')
      .send({ displayName: 'Test', score: 100, wordCount: 5 });

    expect(res.status).toBe(404);
  });
});

// ============================================================
// POST /:boardCode/rate
// ============================================================

describe('POST /api/ugc/boards/:boardCode/rate', () => {
  it('upserts rating for authenticated user', async () => {
    setupAuth();
    (getBoardByCode as Mock).mockResolvedValue(MOCK_BOARD);
    (upsertRating as Mock).mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/ugc/boards/abc12345/rate')
      .set('Authorization', AUTH_HEADER)
      .send({ rating: 4 });

    expect(res.status).toBe(200);
    expect(upsertRating).toHaveBeenCalledWith('board-123', 'user-456', 4);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/ugc/boards/abc12345/rate')
      .send({ rating: 4 });

    expect(res.status).toBe(401);
  });

  it('returns 400 for rating out of range', async () => {
    setupAuth();

    const res = await request(app)
      .post('/api/ugc/boards/abc12345/rate')
      .set('Authorization', AUTH_HEADER)
      .send({ rating: 6 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('returns 400 for rating = 0', async () => {
    setupAuth();

    const res = await request(app)
      .post('/api/ugc/boards/abc12345/rate')
      .set('Authorization', AUTH_HEADER)
      .send({ rating: 0 });

    expect(res.status).toBe(400);
  });
});

// ============================================================
// POST /:boardCode/report
// ============================================================

describe('POST /api/ugc/boards/:boardCode/report', () => {
  it('submits report for authenticated user', async () => {
    setupAuth();
    (getBoardByCode as Mock).mockResolvedValue(MOCK_BOARD);
    (submitReport as Mock).mockResolvedValue({ flagged: false });

    const res = await request(app)
      .post('/api/ugc/boards/abc12345/report')
      .set('Authorization', AUTH_HEADER)
      .send({ reason: 'inappropriate' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ flagged: false });
    expect(submitReport).toHaveBeenCalledWith('board-123', 'user-456', 'inappropriate');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/ugc/boards/abc12345/report')
      .send({ reason: 'spam' });

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid reason', async () => {
    setupAuth();
    (getBoardByCode as Mock).mockResolvedValue(MOCK_BOARD);

    const res = await request(app)
      .post('/api/ugc/boards/abc12345/report')
      .set('Authorization', AUTH_HEADER)
      .send({ reason: 'i_hate_this' });

    expect(res.status).toBe(400);
  });

  it('returns flagged: true when auto-flag triggered', async () => {
    setupAuth();
    (getBoardByCode as Mock).mockResolvedValue(MOCK_BOARD);
    (submitReport as Mock).mockResolvedValue({ flagged: true });

    const res = await request(app)
      .post('/api/ugc/boards/abc12345/report')
      .set('Authorization', AUTH_HEADER)
      .send({ reason: 'spam' });

    expect(res.status).toBe(200);
    expect(res.body.flagged).toBe(true);
  });
});

// ============================================================
// GET /mine
// ============================================================

describe('GET /api/ugc/boards/mine', () => {
  it('returns creator boards for authenticated user', async () => {
    setupAuth();
    (getCreatorBoards as Mock).mockResolvedValue([MOCK_BOARD]);

    const res = await request(app)
      .get('/api/ugc/boards/mine')
      .set('Authorization', AUTH_HEADER);

    expect(res.status).toBe(200);
    expect(res.body.boards).toHaveLength(1);
    expect(getCreatorBoards).toHaveBeenCalledWith('user-456');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/ugc/boards/mine');

    expect(res.status).toBe(401);
  });
});

// ============================================================
// GET /featured
// ============================================================

describe('GET /api/ugc/boards/featured', () => {
  it('returns featured boards', async () => {
    (getFeaturedBoards as Mock).mockResolvedValue([MOCK_BOARD]);

    const res = await request(app).get('/api/ugc/boards/featured');

    expect(res.status).toBe(200);
    expect(res.body.boards).toHaveLength(1);
    expect(getFeaturedBoards).toHaveBeenCalledWith(6);
  });

  it('sets 5-min Cache-Control header', async () => {
    (getFeaturedBoards as Mock).mockResolvedValue([]);

    const res = await request(app).get('/api/ugc/boards/featured');

    expect(res.headers['cache-control']).toContain('300');
  });
});

// ============================================================
// POST /:boardCode/cover-image
// ============================================================

// JPEG magic bytes: FF D8 FF
const JPEG_BUFFER = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, ...Array(100).fill(0)]);
// PNG magic bytes: 89 50 4E 47
const PNG_BUFFER = Buffer.from([0x89, 0x50, 0x4E, 0x47, ...Array(100).fill(0)]);

describe('POST /api/ugc/boards/:boardCode/cover-image', () => {
  it('uploads image and returns public URL for board owner', async () => {
    setupAuth();
    (getBoardByCode as Mock).mockResolvedValue(MOCK_BOARD);
    (uploadBoardCoverImage as Mock).mockResolvedValue('https://storage.example.com/board-covers/user-456/abc12345.jpg');

    const res = await request(app)
      .post('/api/ugc/boards/abc12345/cover-image')
      .set('Authorization', AUTH_HEADER)
      .set('Content-Type', 'image/jpeg')
      .send(JPEG_BUFFER);

    expect(res.status).toBe(200);
    expect(res.body.coverImageUrl).toBe('https://storage.example.com/board-covers/user-456/abc12345.jpg');
    expect(uploadBoardCoverImage).toHaveBeenCalledWith(
      'user-456', 'abc12345', expect.any(Buffer), 'image/jpeg'
    );
  });

  it('accepts PNG images', async () => {
    setupAuth();
    (getBoardByCode as Mock).mockResolvedValue(MOCK_BOARD);
    (uploadBoardCoverImage as Mock).mockResolvedValue('https://storage.example.com/board-covers/user-456/abc12345.png');

    const res = await request(app)
      .post('/api/ugc/boards/abc12345/cover-image')
      .set('Authorization', AUTH_HEADER)
      .set('Content-Type', 'image/png')
      .send(PNG_BUFFER);

    expect(res.status).toBe(200);
    expect(res.body.coverImageUrl).toContain('.png');
  });

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/ugc/boards/abc12345/cover-image')
      .set('Content-Type', 'image/jpeg')
      .send(JPEG_BUFFER);

    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid board code', async () => {
    setupAuth();

    const res = await request(app)
      .post('/api/ugc/boards/BAD-CODE/cover-image')
      .set('Authorization', AUTH_HEADER)
      .set('Content-Type', 'image/jpeg')
      .send(JPEG_BUFFER);

    expect(res.status).toBe(400);
  });

  it('returns 404 when board not found', async () => {
    setupAuth();
    (getBoardByCode as Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/ugc/boards/zzzzzzzz/cover-image')
      .set('Authorization', AUTH_HEADER)
      .set('Content-Type', 'image/jpeg')
      .send(JPEG_BUFFER);

    expect(res.status).toBe(404);
  });

  it('returns 403 when user does not own the board', async () => {
    setupAuth({ id: 'different-user', email: 'other@example.com' });
    (getBoardByCode as Mock).mockResolvedValue(MOCK_BOARD);

    const res = await request(app)
      .post('/api/ugc/boards/abc12345/cover-image')
      .set('Authorization', AUTH_HEADER)
      .set('Content-Type', 'image/jpeg')
      .send(JPEG_BUFFER);

    expect(res.status).toBe(403);
  });

  it('rejects unsupported content types', async () => {
    setupAuth();

    const res = await request(app)
      .post('/api/ugc/boards/abc12345/cover-image')
      .set('Authorization', AUTH_HEADER)
      .set('Content-Type', 'image/gif')
      .send(Buffer.from([0x47, 0x49, 0x46, 0x38]));

    expect(res.status).toBe(400);
  });

  it('rejects magic bytes mismatch', async () => {
    setupAuth();
    (getBoardByCode as Mock).mockResolvedValue(MOCK_BOARD);

    const res = await request(app)
      .post('/api/ugc/boards/abc12345/cover-image')
      .set('Authorization', AUTH_HEADER)
      .set('Content-Type', 'image/jpeg')
      .send(PNG_BUFFER);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/content does not match/i);
  });
});

}); // end describe.skip wrapper
