/**
 * Tests for English Wiktionary verifier — Sprint C of
 * word-validation-pipeline-2026-05-01 audit. Mirrors the Milog verifier
 * pattern: rate-limit, redis cache 7d, retry, type-aware accept/reject.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock('ky', () => ({
  default: { get: mockGet },
  HTTPError: class HTTPError extends Error {
    response: { status: number };
    constructor(status: number) {
      super(`HTTPError: ${status}`);
      this.name = 'HTTPError';
      this.response = { status };
    }
  },
}));

const mockRedisGet = vi.fn();
const mockRedisSetex = vi.fn();
vi.mock('../../redisClient', () => ({
  getRedisClient: vi.fn(() => ({ get: mockRedisGet, setex: mockRedisSetex, del: vi.fn() })),
}));

const mockRpc = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ rpc: mockRpc })),
}));

import {
  parseWiktionaryResponse,
  verifyWordOnWiktionaryEn,
  processWiktionaryEnVerificationQueue,
} from '../wiktionaryEnVerifier';

function makeJsonResponse(body: unknown) {
  return { json: () => Promise.resolve(body) };
}

describe('WiktionaryEnVerifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSetex.mockResolvedValue('OK');
  });

  describe('parseWiktionaryResponse', () => {
    it('verifies a regular noun like "cat"', () => {
      const result = parseWiktionaryResponse(
        { en: [{ partOfSpeech: 'Noun', language: 'English' }] },
        'cat'
      );
      expect(result.verified).toBe(true);
      expect(result.status).toBe('verified');
      expect(result.wordType).toBe('noun');
    });

    it('verifies a verb', () => {
      const result = parseWiktionaryResponse(
        { en: [{ partOfSpeech: 'Verb', language: 'English' }] },
        'run'
      );
      expect(result.verified).toBe(true);
      expect(result.wordType).toBe('verb');
    });

    it('rejects proper noun like "NASA"', () => {
      const result = parseWiktionaryResponse(
        { en: [{ partOfSpeech: 'Proper noun', language: 'English' }] },
        'NASA'
      );
      expect(result.verified).toBe(false);
      expect(result.status).toBe('rejected_type');
      expect(result.wordType).toBe('proper_name');
    });

    it('rejects abbreviation', () => {
      const result = parseWiktionaryResponse(
        { en: [{ partOfSpeech: 'Abbreviation', language: 'English' }] },
        'etc'
      );
      expect(result.verified).toBe(false);
      expect(result.status).toBe('rejected_type');
      expect(result.wordType).toBe('abbreviation');
    });

    it('rejects initialism', () => {
      const result = parseWiktionaryResponse(
        { en: [{ partOfSpeech: 'Initialism', language: 'English' }] },
        'fyi'
      );
      expect(result.verified).toBe(false);
      expect(result.status).toBe('rejected_type');
      expect(result.wordType).toBe('abbreviation');
    });

    it('rejects symbol', () => {
      const result = parseWiktionaryResponse(
        { en: [{ partOfSpeech: 'Symbol', language: 'English' }] },
        'a'
      );
      expect(result.verified).toBe(false);
      expect(result.status).toBe('rejected_type');
    });

    it('rejects when ANY sense is rejected type, even if other senses pass', () => {
      // "us" can be Pronoun (valid) AND Proper noun "US" (rejected) — be strict
      const result = parseWiktionaryResponse(
        {
          en: [
            { partOfSpeech: 'Pronoun', language: 'English' },
            { partOfSpeech: 'Proper noun', language: 'English' },
          ],
        },
        'us'
      );
      expect(result.verified).toBe(false);
      expect(result.status).toBe('rejected_type');
    });

    it('returns not_found when no English entries', () => {
      const result = parseWiktionaryResponse({ fr: [{ partOfSpeech: 'Noun' }] }, 'maison');
      expect(result.verified).toBe(false);
      expect(result.status).toBe('not_found');
    });

    it('returns not_found when response is empty', () => {
      const result = parseWiktionaryResponse({}, 'xyzzy');
      expect(result.verified).toBe(false);
      expect(result.status).toBe('not_found');
    });

    it('rejects too-short words (length < 2)', () => {
      const result = parseWiktionaryResponse(
        { en: [{ partOfSpeech: 'Noun' }] },
        'a'
      );
      expect(result.verified).toBe(false);
      expect(result.status).toBe('rejected_type');
    });

    it('handles unknown partOfSpeech as needs_review (default-deny)', () => {
      const result = parseWiktionaryResponse(
        { en: [{ partOfSpeech: 'GibberishType', language: 'English' }] },
        'cat'
      );
      // Per audit H3: unknown types should NOT auto-promote — flip to needs_review
      expect(result.status).toBe('needs_review');
      expect(result.verified).toBe(false);
    });
  });

  describe('verifyWordOnWiktionaryEn', () => {
    it('returns verified for cat (200 with Noun)', async () => {
      mockGet.mockReturnValueOnce(makeJsonResponse({ en: [{ partOfSpeech: 'Noun' }] }));
      const result = await verifyWordOnWiktionaryEn('cat');
      expect(result.verified).toBe(true);
      expect(result.status).toBe('verified');
    });

    it('returns not_found on 404', async () => {
      const HTTPError = (await import('ky')).HTTPError;
      mockGet.mockReturnValueOnce({
        json: () => Promise.reject(new HTTPError(404 as never)),
      });
      // ky's .get() returns a thenable response object — for 404 we throw at fetch time
      mockGet.mockImplementationOnce(() => {
        throw new HTTPError(404 as never);
      });
      const result = await verifyWordOnWiktionaryEn('xqzjwz');
      expect(result.verified).toBe(false);
      expect(result.status).toBe('not_found');
    });

    it('uses redis cache when available', async () => {
      mockRedisGet.mockResolvedValueOnce(
        JSON.stringify({ verified: true, status: 'verified', wordType: 'noun' })
      );
      const result = await verifyWordOnWiktionaryEn('cat');
      expect(result.verified).toBe(true);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('writes successful result to redis', async () => {
      mockGet.mockReturnValueOnce(makeJsonResponse({ en: [{ partOfSpeech: 'Noun' }] }));
      await verifyWordOnWiktionaryEn('cat');
      expect(mockRedisSetex).toHaveBeenCalledWith(
        expect.stringContaining('wiktionary-en:cat'),
        expect.any(Number),
        expect.stringContaining('verified')
      );
    });
  });

  describe('processWiktionaryEnVerificationQueue', () => {
    beforeEach(() => {
      // Stub Supabase env so the queue runner can construct a client.
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://test.local';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
      // mockReset clears both call history AND any leaked mockReturnValueOnce
      // queues from earlier tests (vi.clearAllMocks does not).
      mockGet.mockReset();
      mockRpc.mockReset();
      mockRedisGet.mockReset().mockResolvedValue(null);
      mockRedisSetex.mockReset().mockResolvedValue('OK');
    });

    it('returns zero counts when queue is empty', async () => {
      mockRpc.mockResolvedValueOnce({ data: [], error: null });
      const result = await processWiktionaryEnVerificationQueue();
      expect(result).toEqual({ processed: 0, verified: 0, notFound: 0, rejectedType: 0, errors: 0 });
      expect(mockRpc).toHaveBeenCalledWith('get_verification_queue', expect.objectContaining({ p_language: 'en' }));
    });

    it('verifies, rejects, and tallies a mixed batch', async () => {
      // Queue returns 3 candidates
      mockRpc.mockResolvedValueOnce({
        data: [
          { id: 'id-1', word: 'cat', language: 'en' },
          { id: 'id-2', word: 'NASA', language: 'en' },
          { id: 'id-3', word: 'xqzjwz', language: 'en' },
        ],
        error: null,
      });
      // Three update RPCs follow (one per word)
      mockRpc.mockResolvedValue({ data: null, error: null });

      // HTTP responses per-word:
      mockGet.mockReturnValueOnce(makeJsonResponse({ en: [{ partOfSpeech: 'Noun' }] }));    // cat → verified
      mockGet.mockReturnValueOnce(makeJsonResponse({ en: [{ partOfSpeech: 'Proper noun' }] })); // NASA → rejected
      const HTTPError = (await import('ky')).HTTPError;
      mockGet.mockImplementationOnce(() => { throw new HTTPError(404 as never); }); // xqzjwz → not_found

      const result = await processWiktionaryEnVerificationQueue({ batchSize: 10 });

      expect(result.processed).toBe(3);
      expect(result.verified).toBe(1);
      expect(result.rejectedType).toBe(1);
      expect(result.notFound).toBe(1);
      expect(result.errors).toBe(0);

      // Verify update RPC was called with status 'verified' for cat
      const updateCalls = mockRpc.mock.calls.filter(c => c[0] === 'update_verification_result');
      expect(updateCalls.length).toBe(3);
      expect(updateCalls[0][1]).toMatchObject({ p_word_id: 'id-1', p_status: 'verified', p_source: 'wiktionary_en' });
      expect(updateCalls[1][1]).toMatchObject({ p_word_id: 'id-2', p_status: 'rejected_type' });
      expect(updateCalls[2][1]).toMatchObject({ p_word_id: 'id-3', p_status: 'not_found' });
    });

    it('counts errors when update RPC fails', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ id: 'id-1', word: 'cat', language: 'en' }],
        error: null,
      });
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'db down' } });
      mockGet.mockReturnValueOnce(makeJsonResponse({ en: [{ partOfSpeech: 'Noun' }] }));

      const result = await processWiktionaryEnVerificationQueue();
      expect(result.errors).toBe(1);
      expect(result.processed).toBe(0);
    });
  });
});
