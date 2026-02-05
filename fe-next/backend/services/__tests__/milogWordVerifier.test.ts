/**
 * Tests for Milog Word Verifier Service
 * Verifies Hebrew words against milog.co.il dictionary
 */

import axios from 'axios';
import {
  verifyWordOnMilog,
  parseVerificationResult,
  processMilogVerificationQueue,
} from '../milogWordVerifier';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock Redis client - use a single instance for all tests
const mockRedisGet = jest.fn();
const mockRedisSetex = jest.fn();
jest.mock('../../redisClient', () => ({
  getRedisClient: jest.fn(() => ({
    get: mockRedisGet,
    setex: mockRedisSetex,
  })),
}));

// Mock Supabase client
const mockRpc = jest.fn();
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    rpc: mockRpc,
  })),
}));

describe('MilogWordVerifier', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
  });
});
