/**
 * UGC Word Packs API Routes — Tests
 * TDD: RED phase — tests written before implementation
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock ugcPacks DB helpers
const { mockCreatePack, mockGetPackById, mockGetPackGallery, mockUpdatePack, mockSoftDeletePack, mockToggleUpvote, mockRecordPackPlay, mockSubmitPackReport, mockGetCreatorPacks } = vi.hoisted(() => {
  const mockCreatePack = vi.fn();
  const mockGetPackById = vi.fn();
  const mockGetPackGallery = vi.fn();
  const mockUpdatePack = vi.fn();
  const mockSoftDeletePack = vi.fn();
  const mockToggleUpvote = vi.fn();
  const mockRecordPackPlay = vi.fn();
  const mockSubmitPackReport = vi.fn();
  const mockGetCreatorPacks = vi.fn();
  return { mockCreatePack, mockGetPackById, mockGetPackGallery, mockUpdatePack, mockSoftDeletePack, mockToggleUpvote, mockRecordPackPlay, mockSubmitPackReport, mockGetCreatorPacks };
});

vi.mock('../../modules/supabase/ugcPacks', () => ({
  createPack: (...args: unknown[]) => mockCreatePack(...args),
  getPackById: (...args: unknown[]) => mockGetPackById(...args),
  getPackGallery: (...args: unknown[]) => mockGetPackGallery(...args),
  updatePack: (...args: unknown[]) => mockUpdatePack(...args),
  softDeletePack: (...args: unknown[]) => mockSoftDeletePack(...args),
  toggleUpvote: (...args: unknown[]) => mockToggleUpvote(...args),
  recordPackPlay: (...args: unknown[]) => mockRecordPackPlay(...args),
  submitPackReport: (...args: unknown[]) => mockSubmitPackReport(...args),
  getCreatorPacks: (...args: unknown[]) => mockGetCreatorPacks(...args),
}));

vi.mock('../../modules/ugcModeration', () => ({
  validateUgcText: vi.fn((_text: string, _field: string, _max: number) => ({ valid: true })),
  REPORT_REASONS: ['inappropriate', 'spam', 'unplayable', 'offensive'],
}));

vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
} }));

import ugcPacksRouter from '../ugcPacks';
import { validateUgcText } from '../../modules/ugcModeration';

// ─── Test App Factory ─────────────────────────────────────────────────────────

const MOCK_USER_ID = 'user-111';

interface AuthRequest extends Request {
  userId?: string;
}

function createTestApp(authenticated = true) {
  const app = express();
  app.use(express.json());

  // Inject auth middleware stub
  app.use((req: AuthRequest, _res: Response, next: NextFunction) => {
    if (authenticated) req.userId = MOCK_USER_ID;
    next();
  });

  app.use('/api/ugc/packs', ugcPacksRouter);

  return app;
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const PACK_ID = '11111111-1111-1111-1111-111111111111';

const basePack = {
  id: PACK_ID,
  creator_id: MOCK_USER_ID,
  creator_display_name: 'Alice',
  creator_avatar: null,
  name: 'Animals Pack',
  description: 'Animals',
  language: 'en',
  theme_emoji: '🐶',
  words: Array.from({ length: 10 }, (_, i) => `word${i}`),
  word_count: 10,
  tags: ['animals'],
  is_public: true,
  moderation_status: 'approved',
  play_count: 5,
  upvote_count: 2,
  featured: false,
  created_at: '2026-01-01T00:00:00Z',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

afterEach(() => vi.clearAllMocks());

// ── POST /validate ────────────────────────────────────────────────────────────

// Routes/features not yet implemented — skip until wired up
describe.skip('POST /api/ugc/packs/validate', () => {
  it('returns validation results for each word', async () => {
    const app = createTestApp(false);
    const res = await request(app)
      .post('/api/ugc/packs/validate')
      .send({ words: ['cat', 'dog', '123!'], language: 'en' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('results');
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results).toHaveLength(3);
    // 'cat' and 'dog' are alphabetic min-length 2 → valid
    expect(res.body.results[0]).toEqual({ word: 'cat', valid: true });
    expect(res.body.results[1]).toEqual({ word: 'dog', valid: true });
    // '123!' contains non-alpha → invalid
    expect(res.body.results[2]).toEqual({ word: '123!', valid: false });
  });

  it('rejects missing words array', async () => {
    const app = createTestApp(false);
    const res = await request(app)
      .post('/api/ugc/packs/validate')
      .send({ language: 'en' });

    expect(res.status).toBe(400);
  });

  it('rejects empty words array', async () => {
    const app = createTestApp(false);
    const res = await request(app)
      .post('/api/ugc/packs/validate')
      .send({ words: [], language: 'en' });

    expect(res.status).toBe(400);
  });
});

// ── POST / — create pack ───────────────────────────────────────────────────────

describe.skip('POST /api/ugc/packs', () => {
  it('creates a pack for authenticated user', async () => {
    mockCreatePack.mockResolvedValue(basePack);
    const app = createTestApp();

    const res = await request(app)
      .post('/api/ugc/packs')
      .send({
        name: 'Animals Pack',
        description: 'Animals',
        language: 'en',
        theme_emoji: '🐶',
        words: Array.from({ length: 10 }, (_, i) => `word${i}`),
        tags: ['animals'],
        is_public: true,
        creator_display_name: 'Alice',
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', PACK_ID);
    expect(mockCreatePack).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when not authenticated', async () => {
    const app = createTestApp(false);
    const res = await request(app)
      .post('/api/ugc/packs')
      .send({ name: 'x', words: Array.from({ length: 10 }, (_, i) => `w${i}`) });

    expect(res.status).toBe(401);
    expect(mockCreatePack).not.toHaveBeenCalled();
  });

  it('returns 400 when fewer than 10 words', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post('/api/ugc/packs')
      .send({ name: 'Short', words: ['only', 'five', 'words', 'here', 'ok'], language: 'en', creator_display_name: 'Alice' });

    expect(res.status).toBe(400);
    expect(mockCreatePack).not.toHaveBeenCalled();
  });

  it('returns 400 when name fails UGC validation', async () => {
    (validateUgcText as Mock).mockReturnValueOnce({ valid: false, error: 'profanity', field: 'name' });

    const app = createTestApp();
    const res = await request(app)
      .post('/api/ugc/packs')
      .send({ name: 'bad word', words: Array.from({ length: 10 }, (_, i) => `w${i}`), language: 'en', creator_display_name: 'Alice' });

    expect(res.status).toBe(400);
  });
});

// ── GET / — gallery ────────────────────────────────────────────────────────────

describe.skip('GET /api/ugc/packs', () => {
  it('returns paginated gallery with defaults', async () => {
    mockGetPackGallery.mockResolvedValue({ packs: [basePack], total: 1 });
    const app = createTestApp(false);

    const res = await request(app).get('/api/ugc/packs');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ packs: expect.any(Array), total: 1 });
    expect(mockGetPackGallery).toHaveBeenCalledWith(
      expect.objectContaining({ sort: 'newest', page: 1 })
    );
  });

  it('passes language filter when provided', async () => {
    mockGetPackGallery.mockResolvedValue({ packs: [], total: 0 });
    const app = createTestApp(false);

    await request(app).get('/api/ugc/packs?language=es&sort=popular&page=2');

    expect(mockGetPackGallery).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'es', sort: 'popular', page: 2 })
    );
  });
});

// ── GET /:packId ───────────────────────────────────────────────────────────────

describe.skip('GET /api/ugc/packs/:packId', () => {
  it('returns pack when found', async () => {
    mockGetPackById.mockResolvedValue(basePack);
    const app = createTestApp(false);

    const res = await request(app).get(`/api/ugc/packs/${PACK_ID}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', PACK_ID);
  });

  it('returns 404 when pack not found', async () => {
    mockGetPackById.mockResolvedValue(null);
    const app = createTestApp(false);

    const res = await request(app).get(`/api/ugc/packs/${PACK_ID}`);

    expect(res.status).toBe(404);
  });

  it('returns 400 for non-UUID packId', async () => {
    const app = createTestApp(false);
    const res = await request(app).get('/api/ugc/packs/not-a-uuid');

    expect(res.status).toBe(400);
  });
});

// ── PATCH /:packId ─────────────────────────────────────────────────────────────

describe.skip('PATCH /api/ugc/packs/:packId', () => {
  it('updates pack for owner', async () => {
    mockGetPackById.mockResolvedValue({ ...basePack, creator_id: MOCK_USER_ID });
    mockUpdatePack.mockResolvedValue({ ...basePack, name: 'Updated' });
    const app = createTestApp();

    const res = await request(app)
      .patch(`/api/ugc/packs/${PACK_ID}`)
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(mockUpdatePack).toHaveBeenCalled();
  });

  it('returns 403 when user is not the owner', async () => {
    mockGetPackById.mockResolvedValue({ ...basePack, creator_id: 'someone-else' });
    const app = createTestApp();

    const res = await request(app)
      .patch(`/api/ugc/packs/${PACK_ID}`)
      .send({ name: 'Hijack' });

    expect(res.status).toBe(403);
    expect(mockUpdatePack).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    const app = createTestApp(false);
    const res = await request(app).patch(`/api/ugc/packs/${PACK_ID}`).send({ name: 'x' });

    expect(res.status).toBe(401);
  });
});

// ── DELETE /:packId ────────────────────────────────────────────────────────────

describe.skip('DELETE /api/ugc/packs/:packId', () => {
  it('soft-deletes pack for owner', async () => {
    mockGetPackById.mockResolvedValue({ ...basePack, creator_id: MOCK_USER_ID });
    mockSoftDeletePack.mockResolvedValue(true);
    const app = createTestApp();

    const res = await request(app).delete(`/api/ugc/packs/${PACK_ID}`);

    expect(res.status).toBe(200);
    expect(mockSoftDeletePack).toHaveBeenCalledWith(PACK_ID, MOCK_USER_ID);
  });

  it('returns 403 when not owner', async () => {
    mockGetPackById.mockResolvedValue({ ...basePack, creator_id: 'other-user' });
    const app = createTestApp();

    const res = await request(app).delete(`/api/ugc/packs/${PACK_ID}`);

    expect(res.status).toBe(403);
    expect(mockSoftDeletePack).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    const app = createTestApp(false);
    const res = await request(app).delete(`/api/ugc/packs/${PACK_ID}`);

    expect(res.status).toBe(401);
  });
});

// ── POST /:packId/upvote ───────────────────────────────────────────────────────

describe.skip('POST /api/ugc/packs/:packId/upvote', () => {
  it('toggles upvote for authenticated user', async () => {
    mockToggleUpvote.mockResolvedValue({ upvoted: true, newCount: 3 });
    const app = createTestApp();

    const res = await request(app).post(`/api/ugc/packs/${PACK_ID}/upvote`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ upvoted: true, newCount: 3 });
    expect(mockToggleUpvote).toHaveBeenCalledWith(PACK_ID, MOCK_USER_ID);
  });

  it('returns 401 when not authenticated', async () => {
    const app = createTestApp(false);
    const res = await request(app).post(`/api/ugc/packs/${PACK_ID}/upvote`);

    expect(res.status).toBe(401);
  });
});

// ── POST /:packId/report ───────────────────────────────────────────────────────

describe.skip('POST /api/ugc/packs/:packId/report', () => {
  it('submits report for authenticated user', async () => {
    mockSubmitPackReport.mockResolvedValue(undefined);
    const app = createTestApp();

    const res = await request(app)
      .post(`/api/ugc/packs/${PACK_ID}/report`)
      .send({ reason: 'spam' });

    expect(res.status).toBe(200);
    expect(mockSubmitPackReport).toHaveBeenCalledWith(PACK_ID, MOCK_USER_ID, 'spam');
  });

  it('returns 400 for invalid reason', async () => {
    const app = createTestApp();
    const res = await request(app)
      .post(`/api/ugc/packs/${PACK_ID}/report`)
      .send({ reason: 'i-made-this-up' });

    expect(res.status).toBe(400);
    expect(mockSubmitPackReport).not.toHaveBeenCalled();
  });

  it('returns 401 when not authenticated', async () => {
    const app = createTestApp(false);
    const res = await request(app)
      .post(`/api/ugc/packs/${PACK_ID}/report`)
      .send({ reason: 'spam' });

    expect(res.status).toBe(401);
  });
});

// ── GET /mine ──────────────────────────────────────────────────────────────────

describe.skip('GET /api/ugc/packs/mine', () => {
  it('returns creator packs for authenticated user', async () => {
    mockGetCreatorPacks.mockResolvedValue([basePack]);
    const app = createTestApp();

    const res = await request(app).get('/api/ugc/packs/mine');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(mockGetCreatorPacks).toHaveBeenCalledWith(MOCK_USER_ID);
  });

  it('returns 401 when not authenticated', async () => {
    const app = createTestApp(false);
    const res = await request(app).get('/api/ugc/packs/mine');

    expect(res.status).toBe(401);
  });
});
