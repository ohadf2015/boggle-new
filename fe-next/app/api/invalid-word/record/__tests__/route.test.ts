/**
 * Record Invalid Word API Tests
 *
 * Tests for POST /api/invalid-word/record
 */

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Track RPC calls
const mockRpcCalls: Array<{ fnName: string; params: unknown }> = [];
let mockRpcError: { message: string } | null = null;

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: (fnName: string, params: unknown) => {
      mockRpcCalls.push({ fnName, params });
      return Promise.resolve({ error: mockRpcError });
    },
  }),
}));

// Import after mocks
import { POST } from '../route';
import { NextRequest } from 'next/server';

// Helper to create mock requests
function createMockRequest(body: unknown): NextRequest {
  const request = new NextRequest('http://localhost/api/invalid-word/record', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '127.0.0.1',
    },
    body: JSON.stringify(body),
  });
  return request;
}

describe('POST /api/invalid-word/record', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRpcCalls.length = 0;
    mockRpcError = null;
  });

  describe('Input validation', () => {
    it('returns 400 if word is missing', async () => {
      const request = createMockRequest({
        language: 'en',
        reason: 'not_in_dictionary',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing or invalid word');
    });

    it('returns 400 if language is missing', async () => {
      const request = createMockRequest({
        word: 'testword',
        reason: 'not_in_dictionary',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing or invalid language');
    });

    it('returns 400 if reason is missing', async () => {
      const request = createMockRequest({
        word: 'testword',
        language: 'en',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing or invalid reason');
    });

    it('returns 400 if reason is invalid', async () => {
      const request = createMockRequest({
        word: 'testword',
        language: 'en',
        reason: 'invalid_reason',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Missing or invalid reason');
    });
  });

  describe('Word filtering', () => {
    it('silently succeeds for very short words (< 3 chars)', async () => {
      const request = createMockRequest({
        word: 'ab',
        language: 'en',
        reason: 'not_in_dictionary',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should not call RPC for short words
      expect(mockRpcCalls.length).toBe(0);
    });

    it('silently succeeds for too_short reason', async () => {
      const request = createMockRequest({
        word: 'testword',
        language: 'en',
        reason: 'too_short',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Should not call RPC for too_short reason
      expect(mockRpcCalls.length).toBe(0);
    });
  });

  describe('Successful recording', () => {
    it('records not_in_dictionary word', async () => {
      const request = createMockRequest({
        word: 'TESTWORD',
        language: 'en',
        reason: 'not_in_dictionary',
        gameMode: 'daily_word_hunt',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockRpcCalls.length).toBe(1);
      expect(mockRpcCalls[0].fnName).toBe('record_invalid_word_submission');
      expect(mockRpcCalls[0].params).toEqual({
        p_word: 'testword', // Should be lowercase
        p_language: 'en',
        p_reason: 'not_in_dictionary',
      });
    });

    it('records not_on_board word', async () => {
      const request = createMockRequest({
        word: 'anotherword',
        language: 'he',
        reason: 'not_on_board',
        gameMode: 'adventure',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockRpcCalls.length).toBe(1);
      expect(mockRpcCalls[0].params).toEqual({
        p_word: 'anotherword',
        p_language: 'he',
        p_reason: 'not_on_board',
      });
    });

    it('records peer_rejected word', async () => {
      const request = createMockRequest({
        word: 'rejectedword',
        language: 'sv',
        reason: 'peer_rejected',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockRpcCalls[0].params).toEqual({
        p_word: 'rejectedword',
        p_language: 'sv',
        p_reason: 'peer_rejected',
      });
    });

    it('normalizes word by trimming whitespace', async () => {
      const request = createMockRequest({
        word: '  testword  ',
        language: 'en',
        reason: 'not_in_dictionary',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockRpcCalls[0].params).toEqual({
        p_word: 'testword',
        p_language: 'en',
        p_reason: 'not_in_dictionary',
      });
    });
  });

  describe('Error handling', () => {
    it('returns success even when RPC fails (non-critical)', async () => {
      mockRpcError = { message: 'Database error' };

      const request = createMockRequest({
        word: 'testword',
        language: 'en',
        reason: 'not_in_dictionary',
      });

      const response = await POST(request);
      const data = await response.json();

      // Should still return success - this is non-critical functionality
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Rate limiting', () => {
    it('allows normal request volume', async () => {
      // Should allow first request
      const request = createMockRequest({
        word: 'testword',
        language: 'en',
        reason: 'not_in_dictionary',
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    // Note: Full rate limit testing would require mocking Date.now()
    // and making 100+ requests, which is complex for unit tests
  });
});
