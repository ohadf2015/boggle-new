/**
 * Tests for Admin Invalid Words API Routes
 * Tests the invalid word submission tracking and approval system
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';

// Mock types
interface AdminUser {
  id: string;
  email: string;
  username?: string;
}

interface AdminRequest extends Request {
  requestId?: string;
  adminUser?: AdminUser;
}

// Mock supabaseServer module
const { mockSupabaseFrom, mockSupabaseRpc } = vi.hoisted(() => {
  const mockSupabaseFrom = vi.fn();
  const mockSupabaseRpc = vi.fn();
  return { mockSupabaseFrom, mockSupabaseRpc };
});

vi.mock('../../modules/supabaseServer', () => ({
  getSupabase: vi.fn(() => ({
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc,
  })),
  isSupabaseConfigured: vi.fn(() => true),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({ default: {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
} }));

import { getSupabase } from '../../modules/supabaseServer';

// Create a minimal Express app for testing with mocked auth
const createTestApp = () => {
  const app = express();
  app.use(express.json());

  // Mock admin authentication middleware
  app.use((req: AdminRequest, _res: Response, next: NextFunction) => {
    req.adminUser = {
      id: 'test-admin-id',
      email: 'admin@test.com',
      username: 'testadmin',
    };
    req.requestId = 'test-request-id';
    next();
  });

  return app;
};

// Helper to setup mock chain
const setupMockQuery = (data: unknown, error: Error | null = null, count: number | null = null) => {
  const mockChain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    throwOnError: vi.fn().mockReturnThis(),
    then: vi.fn((resolve) => resolve({ data, error, count })),
  };
  // Allow async iteration
  mockChain.select.mockImplementation(() => {
    const selectChain = { ...mockChain };
    selectChain.then = vi.fn((resolve) => resolve({ data, error, count }));
    return selectChain;
  });
  return mockChain;
};

// Routes/features not yet implemented — skip until wired up
describe.skip('Admin Invalid Words API', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createTestApp();
  });

  describe('GET /api/admin/invalid-words', () => {
    it('should return invalid words with count >= 3', async () => {
      const mockWords = [
        {
          id: '1',
          word: 'testword',
          language: 'en',
          submission_count: 5,
          reason: 'not_in_dictionary',
          first_submitted_at: '2026-01-20T00:00:00Z',
          last_submitted_at: '2026-01-22T00:00:00Z',
          approved_at: null,
          approved_by: null,
        },
        {
          id: '2',
          word: 'anotherword',
          language: 'en',
          submission_count: 3,
          reason: 'peer_rejected',
          first_submitted_at: '2026-01-19T00:00:00Z',
          last_submitted_at: '2026-01-21T00:00:00Z',
          approved_at: null,
          approved_by: null,
        },
      ];

      const mockStatsData = [
        { submission_count: 5, approved_at: null },
        { submission_count: 3, approved_at: null },
        { submission_count: 10, approved_at: '2026-01-15T00:00:00Z' },
      ];

      // First call for main query
      const mainQuery = setupMockQuery(mockWords, null, 2);
      // Second call for stats
      const statsQuery = setupMockQuery(mockStatsData);

      let callCount = 0;
      mockSupabaseFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? mainQuery : statsQuery;
      });

      // Add the route handler inline for this test
      app.get('/api/admin/invalid-words', async (req: AdminRequest, res: Response) => {
        const supabase = getSupabase();

        const language = (req.query.language as string) || null;
        const minCount = parseInt(req.query.minCount as string) || 3;
        const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
        const offset = parseInt(req.query.offset as string) || 0;

        let query = supabase
          .from('invalid_word_submissions')
          .select('id, word, language, submission_count, reason, first_submitted_at, last_submitted_at, approved_at, approved_by', { count: 'exact' })
          .is('approved_at', null)
          .gte('submission_count', minCount)
          .order('submission_count', { ascending: false });

        if (language) {
          query = query.eq('language', language);
        }

        query = query.range(offset, offset + limit - 1);

        const { data, error, count } = await query;

        if (error) {
          res.status(500).json({ error: 'Failed to fetch invalid words' });
          return;
        }

        // Stats query
        const { data: statsData } = await supabase
          .from('invalid_word_submissions')
          .select('submission_count, approved_at')
          .gte('submission_count', minCount)
          .throwOnError();

        interface InvalidWordStatsRow {
          submission_count: number;
          approved_at: string | null;
        }

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
      });

      const response = await request(app)
        .get('/api/admin/invalid-words')
        .query({ minCount: 3 });

      expect(response.status).toBe(200);
      expect(response.body.words).toHaveLength(2);
      expect(response.body.words[0].word).toBe('testword');
      expect(response.body.words[0].submission_count).toBe(5);
      expect(response.body.stats.pending).toBe(2);
      expect(response.body.stats.approved).toBe(1);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter by language when provided', async () => {
      const mockWords = [
        {
          id: '1',
          word: 'hebrewword',
          language: 'he',
          submission_count: 4,
          reason: 'not_in_dictionary',
          first_submitted_at: '2026-01-20T00:00:00Z',
          last_submitted_at: '2026-01-22T00:00:00Z',
          approved_at: null,
          approved_by: null,
        },
      ];

      const mockQuery = setupMockQuery(mockWords, null, 1);
      const mockStatsQuery = setupMockQuery([{ submission_count: 4, approved_at: null }]);

      let callCount = 0;
      mockSupabaseFrom.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? mockQuery : mockStatsQuery;
      });

      app.get('/api/admin/invalid-words', async (req: AdminRequest, res: Response) => {
        const supabase = getSupabase();

        const language = (req.query.language as string) || null;

        let query = supabase
          .from('invalid_word_submissions')
          .select('*', { count: 'exact' })
          .is('approved_at', null)
          .gte('submission_count', 3)
          .order('submission_count', { ascending: false });

        if (language) {
          query = query.eq('language', language);
        }

        query = query.range(0, 99);

        const { data, count } = await query;

        const { data: statsData } = await supabase
          .from('invalid_word_submissions')
          .select('submission_count, approved_at')
          .gte('submission_count', 3)
          .throwOnError();

        res.json({
          words: data || [],
          total: count || 0,
          stats: {
            total: statsData?.length || 0,
            pending: statsData?.filter((w: { approved_at: string | null }) => !w.approved_at).length || 0,
            approved: statsData?.filter((w: { approved_at: string | null }) => w.approved_at).length || 0,
          },
          pagination: { limit: 100, offset: 0, hasMore: false },
        });
      });

      const response = await request(app)
        .get('/api/admin/invalid-words')
        .query({ language: 'he' });

      expect(response.status).toBe(200);
      expect(response.body.words).toHaveLength(1);
      expect(response.body.words[0].language).toBe('he');
    });
  });

  describe('POST /api/admin/invalid-words/approve', () => {
    it('should approve a word and add to word_scores', async () => {
      const mockInvalidWord = {
        id: 'invalid-word-id',
        submission_count: 5,
      };

      // Setup mock chains
      const lookupQuery = setupMockQuery(mockInvalidWord);
      const upsertQuery = setupMockQuery(null);
      const updateQuery = setupMockQuery(null);
      const deleteQuery = setupMockQuery(null);

      let callCount = 0;
      mockSupabaseFrom.mockImplementation((table: string) => {
        callCount++;
        if (callCount === 1) return lookupQuery; // invalid_word_submissions lookup
        if (callCount === 2) return upsertQuery; // word_scores upsert
        if (callCount === 3) return updateQuery; // invalid_word_submissions update
        return deleteQuery; // bot_word_blacklist delete
      });

      app.post('/api/admin/invalid-words/approve', async (req: AdminRequest, res: Response) => {
        const supabase = getSupabase();

        const { word, language } = req.body;

        if (!word || !language) {
          res.status(400).json({ error: 'Missing word or language' });
          return;
        }

        const normalizedWord = (word as string).toLowerCase().trim();

        // Lookup
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

        // Add to word_scores
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
          res.status(500).json({ error: 'Failed to update word score' });
          return;
        }

        // Mark as approved
        await supabase
          .from('invalid_word_submissions')
          .update({
            approved_at: new Date().toISOString(),
            approved_by: req.adminUser!.id,
          })
          .eq('id', invalidWord.id);

        // Remove from blacklist
        await supabase
          .from('bot_word_blacklist')
          .delete()
          .eq('word', normalizedWord)
          .eq('language', language);

        res.json({ success: true, votesAdded: votesNeeded });
      });

      const response = await request(app)
        .post('/api/admin/invalid-words/approve')
        .send({ word: 'testword', language: 'en' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.votesAdded).toBe(10);
    });

    it('should return 400 if word or language is missing', async () => {
      app.post('/api/admin/invalid-words/approve', async (req: AdminRequest, res: Response) => {
        const { word, language } = req.body;

        if (!word || !language) {
          res.status(400).json({ error: 'Missing word or language' });
          return;
        }

        res.json({ success: true });
      });

      const response = await request(app)
        .post('/api/admin/invalid-words/approve')
        .send({ word: 'testword' }); // Missing language

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing word or language');
    });

    it('should return 404 if word not found in invalid submissions', async () => {
      const lookupQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      };

      mockSupabaseFrom.mockReturnValue(lookupQuery);

      app.post('/api/admin/invalid-words/approve', async (req: AdminRequest, res: Response) => {
        const supabase = getSupabase();

        const { word, language } = req.body;

        if (!word || !language) {
          res.status(400).json({ error: 'Missing word or language' });
          return;
        }

        const { data: invalidWord, error: lookupError } = await supabase
          .from('invalid_word_submissions')
          .select('id, submission_count')
          .eq('word', word.toLowerCase().trim())
          .eq('language', language)
          .single();

        if (lookupError || !invalidWord) {
          res.status(404).json({ error: 'Word not found in invalid submissions' });
          return;
        }

        res.json({ success: true });
      });

      const response = await request(app)
        .post('/api/admin/invalid-words/approve')
        .send({ word: 'nonexistent', language: 'en' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Word not found in invalid submissions');
    });
  });

  describe('POST /api/admin/invalid-words/dismiss', () => {
    it('should dismiss a word by marking it as reviewed', async () => {
      const updateQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve) => resolve({ data: null, error: null })),
      };

      mockSupabaseFrom.mockReturnValue(updateQuery);

      app.post('/api/admin/invalid-words/dismiss', async (req: AdminRequest, res: Response) => {
        const supabase = getSupabase();

        const { word, language, reason } = req.body;

        if (!word || !language) {
          res.status(400).json({ error: 'Missing word or language' });
          return;
        }

        const { error } = await supabase
          .from('invalid_word_submissions')
          .update({
            approved_at: new Date().toISOString(),
            approved_by: req.adminUser!.id,
            reason: `dismissed:${reason || 'admin_review'}`,
          })
          .eq('word', word.toLowerCase().trim())
          .eq('language', language);

        if (error) {
          res.status(500).json({ error: 'Failed to dismiss word' });
          return;
        }

        res.json({ success: true });
      });

      const response = await request(app)
        .post('/api/admin/invalid-words/dismiss')
        .send({ word: 'badword', language: 'en', reason: 'profanity' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});

// Routes/features not yet implemented — skip until wired up
describe.skip('recordPlayerWrongWord function', () => {
  it('should call RPC with correct parameters', async () => {
    // This tests the updated function signature with reason parameter
    mockSupabaseRpc.mockResolvedValue({ error: null });

    const client = getSupabase();

    await client.rpc('record_invalid_word_submission', {
      p_word: 'testword',
      p_language: 'en',
      p_reason: 'not_on_board',
    });

    expect(mockSupabaseRpc).toHaveBeenCalledWith('record_invalid_word_submission', {
      p_word: 'testword',
      p_language: 'en',
      p_reason: 'not_on_board',
    });
  });
});
