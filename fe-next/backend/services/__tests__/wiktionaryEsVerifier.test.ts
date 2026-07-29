/**
 * Tests for Spanish Wiktionary verifier.
 * Uses en.wiktionary.org, checks body.es — mirrors wiktionaryEnVerifier test pattern.
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
  parseWiktionaryEsResponse,
  verifyWordOnWiktionaryEs,
  processWiktionaryEsVerificationQueue,
} from '../wiktionaryEsVerifier';

function makeJsonResponse(body: unknown) {
  return { json: () => Promise.resolve(body) };
}

describe('WiktionaryEsVerifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSetex.mockResolvedValue('OK');
  });

  describe('parseWiktionaryEsResponse', () => {
    it('verifies a noun like "gato"', () => {
      const result = parseWiktionaryEsResponse(
        { es: [{ partOfSpeech: 'Noun', language: 'Spanish' }] },
        'gato'
      );
      expect(result.verified).toBe(true);
      expect(result.status).toBe('verified');
      expect(result.wordType).toBe('noun');
    });

    it('verifies a verb', () => {
      const result = parseWiktionaryEsResponse(
        { es: [{ partOfSpeech: 'Verb', language: 'Spanish' }] },
        'correr'
      );
      expect(result.verified).toBe(true);
      expect(result.wordType).toBe('verb');
    });

    it('verifies an adjective', () => {
      const result = parseWiktionaryEsResponse(
        { es: [{ partOfSpeech: 'Adjective', language: 'Spanish' }] },
        'bonito'
      );
      expect(result.verified).toBe(true);
      expect(result.wordType).toBe('adjective');
    });

    it('rejects proper noun like "Madrid"', () => {
      const result = parseWiktionaryEsResponse(
        { es: [{ partOfSpeech: 'Proper noun', language: 'Spanish' }] },
        'madrid'
      );
      expect(result.verified).toBe(false);
      expect(result.status).toBe('rejected_type');
      expect(result.wordType).toBe('proper_name');
    });

    it('rejects abbreviation', () => {
      const result = parseWiktionaryEsResponse(
        { es: [{ partOfSpeech: 'Abbreviation', language: 'Spanish' }] },
        'etc'
      );
      expect(result.verified).toBe(false);
      expect(result.status).toBe('rejected_type');
      expect(result.wordType).toBe('abbreviation');
    });

    it('returns not_found when es section is absent', () => {
      const result = parseWiktionaryEsResponse(
        { en: [{ partOfSpeech: 'Noun' }] },
        'something'
      );
      expect(result.verified).toBe(false);
      expect(result.status).toBe('not_found');
    });

    it('returns needs_review for unknown POS', () => {
      const result = parseWiktionaryEsResponse(
        { es: [{ partOfSpeech: 'Phrase', language: 'Spanish' }] },
        'hola'
      );
      expect(result.verified).toBe(false);
      expect(result.status).toBe('needs_review');
      expect(result.wordType).toBe('unknown');
    });

    it('rejects single-char words', () => {
      const result = parseWiktionaryEsResponse(
        { es: [{ partOfSpeech: 'Noun' }] },
        'a'
      );
      expect(result.verified).toBe(false);
      expect(result.status).toBe('rejected_type');
    });

    it('returns url on verified word', () => {
      const result = parseWiktionaryEsResponse(
        { es: [{ partOfSpeech: 'Noun' }] },
        'agua'
      );
      expect(result.url).toContain('en.wiktionary.org');
      expect(result.url).toContain('agua');
    });

    it('rejects if ANY sense is a proper noun even with accepted POS present', () => {
      // Default-deny: "gato" Noun + Proper noun → reject (safe for word games)
      const result = parseWiktionaryEsResponse(
        { es: [{ partOfSpeech: 'Noun' }, { partOfSpeech: 'Proper noun' }] },
        'gato'
      );
      expect(result.verified).toBe(false);
      expect(result.status).toBe('rejected_type');
    });
  });

  describe('verifyWordOnWiktionaryEs', () => {
    it('returns cached result on cache hit', async () => {
      const cached = JSON.stringify({ verified: true, status: 'verified', wordType: 'noun' });
      mockRedisGet.mockResolvedValue(cached);

      const result = await verifyWordOnWiktionaryEs('agua');
      expect(result.verified).toBe(true);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('fetches from API on cache miss and caches result', async () => {
      mockGet.mockReturnValue(makeJsonResponse({ es: [{ partOfSpeech: 'Noun' }] }));

      const result = await verifyWordOnWiktionaryEs('agua');
      expect(result.verified).toBe(true);
      expect(mockRedisSetex).toHaveBeenCalledWith(
        'wiktionary-es:agua',
        expect.any(Number),
        expect.stringContaining('verified')
      );
    });

    it('returns not_found on 404', async () => {
      const { HTTPError } = await import('ky');
       
      mockGet.mockImplementationOnce(() => { throw new (HTTPError as any)(404); });

      const result = await verifyWordOnWiktionaryEs('xyznonexistent');
      expect(result.verified).toBe(false);
      expect(result.status).toBe('not_found');
    });

    it('returns error status on network failure', async () => {
      mockGet.mockReturnValue({ json: () => Promise.reject(new Error('Network error')) });

      const result = await verifyWordOnWiktionaryEs('agua');
      expect(result.verified).toBe(false);
      expect(result.status).toBe('error');
    });
  });

  describe('processWiktionaryEsVerificationQueue', () => {
    it('returns empty result when queue is empty', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await processWiktionaryEsVerificationQueue();
      expect(result.processed).toBe(0);
      expect(result.verified).toBe(0);
    });

    it('processes queue and counts verified words', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: [{ id: '1', word: 'gato' }, { id: '2', word: 'perro' }], error: null })
        .mockResolvedValue({ data: null, error: null });

      mockGet.mockReturnValue(makeJsonResponse({ es: [{ partOfSpeech: 'Noun' }] }));

      const result = await processWiktionaryEsVerificationQueue();
      expect(result.processed).toBe(2);
      expect(result.verified).toBe(2);
    });

    it('uses p_language: "es" in queue RPC call', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await processWiktionaryEsVerificationQueue();
      expect(mockRpc).toHaveBeenCalledWith('get_verification_queue', expect.objectContaining({
        p_language: 'es',
      }));
    });

    it('counts not_found correctly', async () => {
      mockRpc
        .mockResolvedValueOnce({ data: [{ id: '1', word: 'fakword' }], error: null })
        .mockResolvedValue({ data: null, error: null });

      mockGet.mockReturnValue(makeJsonResponse({ en: [{ partOfSpeech: 'Noun' }] }));

      const result = await processWiktionaryEsVerificationQueue();
      expect(result.notFound).toBe(1);
    });

    it('throws on queue fetch error', async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } });

      await expect(processWiktionaryEsVerificationQueue()).rejects.toMatchObject({ message: 'DB error' });
    });
  });
});
