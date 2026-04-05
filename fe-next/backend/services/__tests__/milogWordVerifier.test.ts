/**
 * Tests for Milog Word Verifier Service
 * Verifies Hebrew words against milog.co.il dictionary
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import axios from 'axios';
import {
  verifyWordOnMilog,
  parseVerificationResult,
  processMilogVerificationQueue,
  invalidateMilogCache,
} from '../milogWordVerifier';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as Mocked<typeof axios>;

// Mock Redis client - use a single instance for all tests
const mockRedisGet = vi.fn();
const mockRedisSetex = vi.fn();
const mockRedisDel = vi.fn();
vi.mock('../../redisClient', () => ({
  getRedisClient: vi.fn(() => ({
    get: mockRedisGet,
    setex: mockRedisSetex,
    del: mockRedisDel,
  })),
}));

// Mock Supabase client
const mockRpc = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

describe('MilogWordVerifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseVerificationResult', () => {
    it('should return verified=true when word has definition links', () => {
      // HTML structure when word exists - has links with /word/e_[id] pattern
      const html = `
        <html>
          <body>
            <div class="sr">
              <a href="https://milog.co.il/שלום/e_2839">שָׁלוֹם</a>
              <span>מצב של שקט ובטחון</span>
            </div>
            <div class="sr">
              <a href="https://milog.co.il/שלום/e_2840">שָׁלוֹם</a>
              <span>ברכה</span>
            </div>
          </body>
        </html>
      `;

      const result = parseVerificationResult(html, 'שלום');

      expect(result.verified).toBe(true);
      expect(result.definitionCount).toBeGreaterThan(0);
      // URL is encoded
      expect(result.url).toContain('milog.co.il/');
    });

    it('should return verified=false when no definition links found', () => {
      // HTML structure when word doesn't exist
      const html = `
        <html>
          <body>
            <div class="no-results">
              לא נמצאו תוצאות
            </div>
          </body>
        </html>
      `;

      const result = parseVerificationResult(html, 'לאמילה');

      expect(result.verified).toBe(false);
      expect(result.definitionCount).toBe(0);
    });

    it('should handle empty HTML gracefully', () => {
      const result = parseVerificationResult('', 'מילה');

      expect(result.verified).toBe(false);
      expect(result.definitionCount).toBe(0);
    });

    it('should extract definition count from multiple results', () => {
      const html = `
        <html>
          <body>
            <a href="https://milog.co.il/בית/e_1001">definition 1</a>
            <a href="https://milog.co.il/בית/e_1002">definition 2</a>
            <a href="https://milog.co.il/בית/e_1003">definition 3</a>
          </body>
        </html>
      `;

      const result = parseVerificationResult(html, 'בית');

      expect(result.verified).toBe(true);
      expect(result.definitionCount).toBe(3);
    });

    it('should accept a noun (שם עצם)', () => {
      const html = `
        <html><body>
          <div class="sr_e">
            <a href="https://milog.co.il/שלום/e_2839">שָׁלוֹם - שם עצם, זכר</a>
          </div>
        </body></html>
      `;

      const result = parseVerificationResult(html, 'שלום');

      expect(result.verified).toBe(true);
      expect(result.status).toBe('verified');
      expect(result.wordType).toBe('noun');
      expect(result.wordTypeRaw).toBe('שם עצם');
    });

    it('should accept a verb (פועל)', () => {
      const html = `
        <html><body>
          <div class="sr_e">
            <a href="https://milog.co.il/רץ/e_5001">רָץ - פועל</a>
          </div>
        </body></html>
      `;

      const result = parseVerificationResult(html, 'רץ');

      expect(result.verified).toBe(true);
      expect(result.status).toBe('verified');
      expect(result.wordType).toBe('verb');
    });

    it('should accept an adjective (שם תואר)', () => {
      const html = `
        <html><body>
          <div class="sr_e">
            <a href="https://milog.co.il/גדול/e_3001">גָּדוֹל - שם תואר</a>
          </div>
        </body></html>
      `;

      const result = parseVerificationResult(html, 'גדול');

      expect(result.verified).toBe(true);
      expect(result.wordType).toBe('adjective');
    });

    it('should reject an abbreviation (ראשי תיבות)', () => {
      const html = `
        <html><body>
          <div class="sr_e">
            <a href="https://milog.co.il/רמבם/e_8001">רַמְבָּ"ם - ראשי תיבות</a>
          </div>
        </body></html>
      `;

      const result = parseVerificationResult(html, 'רמבם');

      expect(result.verified).toBe(false);
      expect(result.status).toBe('rejected_type');
      expect(result.wordType).toBe('abbreviation');
      expect(result.rejectedReason).toContain('abbreviation');
    });

    it('should reject a proper name (שם פרטי)', () => {
      const html = `
        <html><body>
          <div class="sr_e">
            <a href="https://milog.co.il/דוד/e_9001">דָּוִד - שם פרטי</a>
          </div>
        </body></html>
      `;

      const result = parseVerificationResult(html, 'דוד');

      expect(result.verified).toBe(false);
      expect(result.status).toBe('rejected_type');
      expect(result.wordType).toBe('proper_name');
      expect(result.rejectedReason).toContain('proper_name');
    });

    it('should reject when mixed types include an abbreviation (strict mode)', () => {
      // Word with both proper name and noun - but if ANY rejected type, reject
      const html = `
        <html><body>
          <div class="sr_e">
            <a href="https://milog.co.il/צהל/e_7001">צה"ל - ראשי תיבות</a>
          </div>
          <div class="sr_e">
            <a href="https://milog.co.il/צהל/e_7002">צָהַל - פועל</a>
          </div>
        </body></html>
      `;

      const result = parseVerificationResult(html, 'צהל');

      // Strict: reject if ANY definition is abbreviation
      expect(result.verified).toBe(false);
      expect(result.status).toBe('rejected_type');
      expect(result.wordType).toBe('abbreviation');
    });

    it('should accept when mixed types include accepted but no abbreviation/proper_name', () => {
      // Word with noun and adjective - both accepted types
      const html = `
        <html><body>
          <div class="sr_e">
            <a href="https://milog.co.il/חם/e_7001">חַם - שם תואר</a>
          </div>
          <div class="sr_e">
            <a href="https://milog.co.il/חם/e_7002">חָם - שם עצם</a>
          </div>
        </body></html>
      `;

      const result = parseVerificationResult(html, 'חם');

      expect(result.verified).toBe(true);
      expect(result.status).toBe('verified');
    });

    it('should reject single-letter words', () => {
      const html = `
        <html><body>
          <div class="sr_e">
            <a href="https://milog.co.il/א/e_100">א - שם עצם</a>
          </div>
        </body></html>
      `;

      const result = parseVerificationResult(html, 'א');

      expect(result.verified).toBe(false);
      expect(result.status).toBe('rejected_type');
      expect(result.rejectedReason).toContain('too short');
    });

    it('should fall back to verified when type is unparseable but links exist', () => {
      // Links exist but no recognizable word type label
      const html = `
        <html><body>
          <div class="sr_e">
            <a href="https://milog.co.il/מילה/e_4001">מִילָה</a>
          </div>
        </body></html>
      `;

      const result = parseVerificationResult(html, 'מילה');

      expect(result.verified).toBe(true);
      expect(result.status).toBe('verified');
      expect(result.wordType).toBe('unknown');
    });

    it('should accept an adverb (תואר הפועל)', () => {
      const html = `
        <html><body>
          <div class="sr_e">
            <a href="https://milog.co.il/מהר/e_6001">מַהֵר - תואר הפועל</a>
          </div>
        </body></html>
      `;

      const result = parseVerificationResult(html, 'מהר');

      expect(result.verified).toBe(true);
      expect(result.wordType).toBe('adverb');
    });

    it('should return not_found for gibberish Hebrew in HTML', () => {
      // When milog shows no results for gibberish, there are no /e_[id] links
      const html = `
        <html>
          <body>
            <div class="search-results">
              <p>לא נמצאו תוצאות עבור "שדגשכשדכשד"</p>
              <p>אולי התכוונת ל:</p>
              <ul>
                <li><a href="https://milog.co.il/search?q=שד">שד</a></li>
              </ul>
            </div>
          </body>
        </html>
      `;

      const result = parseVerificationResult(html, 'שדגשכשדכשד');

      // The search suggestion links don't have /e_[id] pattern, so word is not found
      expect(result.verified).toBe(false);
      expect(result.definitionCount).toBe(0);
    });
  });

  describe('verifyWordOnMilog', () => {
    it('should return verified when word exists on milog', async () => {
      const html = `
        <html>
          <body>
            <a href="https://milog.co.il/שלום/e_2839">שָׁלוֹם</a>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: html, status: 200 });

      const result = await verifyWordOnMilog('שלום');

      expect(result.verified).toBe(true);
      expect(result.status).toBe('verified');
      // URL is encoded
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('milog.co.il/'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('LexiClash'),
          }),
        })
      );
    });

    it('should return not_found when word does not exist', async () => {
      const html = `
        <html>
          <body>
            <div class="no-results">לא נמצאו תוצאות</div>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: html, status: 200 });

      const result = await verifyWordOnMilog('xyzלאמילה');

      expect(result.verified).toBe(false);
      expect(result.status).toBe('not_found');
    });

    it('should return not_found for gibberish Hebrew words', async () => {
      // Gibberish Hebrew like שדגשכשדכשד should not have any definitions
      const html = `
        <html>
          <body>
            <div class="search-results">
              <p>לא נמצאו תוצאות עבור "שדגשכשדכשד"</p>
            </div>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({ data: html, status: 200 });
      mockRedisGet.mockResolvedValueOnce(null);

      const result = await verifyWordOnMilog('שדגשכשדכשד');

      expect(result.verified).toBe(false);
      expect(result.status).toBe('not_found');
      expect(result.definitionCount).toBe(0);
    });

    it('should return error status on network failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await verifyWordOnMilog('מילה');

      expect(result.status).toBe('error');
      expect(result.error).toBeDefined();
    });

    it('should use cached result when available', async () => {
      mockRedisGet.mockResolvedValueOnce(JSON.stringify({
        verified: true,
        status: 'verified',
        definitionCount: 2,
        url: 'https://milog.co.il/שלום',
      }));

      const result = await verifyWordOnMilog('שלום');

      expect(result.verified).toBe(true);
      expect(result.status).toBe('verified');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should cache successful verification results', async () => {
      mockRedisGet.mockResolvedValueOnce(null); // No cache

      const html = `<a href="https://milog.co.il/בית/e_1001">בית</a>`;
      mockedAxios.get.mockResolvedValueOnce({ data: html, status: 200 });

      await verifyWordOnMilog('בית');

      expect(mockRedisSetex).toHaveBeenCalledWith(
        expect.stringContaining('milog:בית'),
        expect.any(Number),
        expect.any(String)
      );
    });

    it('should make requests with proper headers', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockedAxios.get.mockResolvedValue({ data: '<html></html>', status: 200 });

      await verifyWordOnMilog('מילה');

      // Should have made request with proper User-Agent
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('milog.co.il'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('LexiClash'),
          }),
        })
      );
    });
  });

  describe('processMilogVerificationQueue', () => {
    beforeEach(() => {
      mockRpc.mockReset();
    });

    it('should process batch of words from queue', async () => {
      // Mock get_milog_verification_queue RPC
      mockRpc.mockResolvedValueOnce({
        data: [
          { id: 'uuid-1', word: 'שלום', submission_count: 5, milog_attempts: 0 },
          { id: 'uuid-2', word: 'בוקר', submission_count: 3, milog_attempts: 0 },
        ],
        error: null,
      });

      // Mock update_milog_verification RPC calls
      mockRpc.mockResolvedValue({ error: null });

      // Mock axios responses
      mockedAxios.get
        .mockResolvedValueOnce({
          data: '<a href="https://milog.co.il/שלום/e_1">def</a>',
          status: 200
        })
        .mockResolvedValueOnce({
          data: '<a href="https://milog.co.il/בוקר/e_2">def</a>',
          status: 200
        });

      mockRedisGet.mockResolvedValue(null);

      const result = await processMilogVerificationQueue({ batchSize: 10 });

      expect(result.processed).toBe(2);
      expect(result.verified).toBe(2);
    });

    it('should handle empty queue gracefully', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await processMilogVerificationQueue({ batchSize: 10 });

      expect(result.processed).toBe(0);
      expect(result.verified).toBe(0);
    });

    it('should update database with verification results', async () => {
      mockRpc
        .mockResolvedValueOnce({
          data: [{ id: 'uuid-1', word: 'בדיקה', submission_count: 2, milog_attempts: 0 }],
          error: null,
        })
        .mockResolvedValue({ error: null });

      mockedAxios.get.mockResolvedValueOnce({
        data: '<a href="https://milog.co.il/בדיקה/e_1">def</a>',
        status: 200
      });

      mockRedisGet.mockResolvedValue(null);

      await processMilogVerificationQueue({ batchSize: 10 });

      // Should have called update_milog_verification RPC
      expect(mockRpc).toHaveBeenCalledWith(
        'update_milog_verification',
        expect.objectContaining({
          p_word_id: 'uuid-1',
          p_status: 'verified',
        })
      );
    });

    it('should count rejected_type words in result', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [
          { id: 'uuid-1', word: 'רמבם', submission_count: 3, milog_attempts: 0 },
        ],
        error: null,
      });

      mockRpc.mockResolvedValue({ error: null });

      // HTML with abbreviation type
      const html = `
        <div class="sr_e">
          <a href="https://milog.co.il/רמבם/e_8001">רַמְבָּ"ם - ראשי תיבות</a>
        </div>
      `;
      mockedAxios.get.mockResolvedValueOnce({ data: html, status: 200 });
      mockRedisGet.mockResolvedValue(null);

      const result = await processMilogVerificationQueue({ batchSize: 10 });

      // rejected_type words are processed but not counted as verified
      expect(result.processed).toBe(1);
      expect(result.verified).toBe(0);
      expect(result.rejectedType).toBe(1);

      // RPC should be called with rejected_type status and word type info
      expect(mockRpc).toHaveBeenCalledWith(
        'update_milog_verification',
        expect.objectContaining({
          p_word_id: 'uuid-1',
          p_status: 'rejected_type',
          p_word_type: 'abbreviation',
          p_rejected_reason: expect.stringContaining('abbreviation'),
        })
      );
    });
  });

  describe('invalidateMilogCache', () => {
    it('should delete the Redis cache key for a word', async () => {
      mockRedisDel.mockResolvedValueOnce(1);

      await invalidateMilogCache('שלום');

      expect(mockRedisDel).toHaveBeenCalledWith('milog:שלום');
    });

    it('should handle Redis errors gracefully', async () => {
      mockRedisDel.mockRejectedValueOnce(new Error('Redis down'));

      // Should not throw
      await expect(invalidateMilogCache('מילה')).resolves.toBeUndefined();
    });
  });
});
