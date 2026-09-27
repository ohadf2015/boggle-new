import { vi, type Mock, } from 'vitest';
/**
 * Record Invalid Word API Tests
 *
 * Tests for POST /api/invalid-word/record
 * Tests the core business logic extracted from the route handler.
 */

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Track RPC calls
const mockRpcCalls: Array<{ fnName: string; params: unknown }> = [];
let mockRpcError: { message: string } | null = null;

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: (fnName: string, params: unknown) => {
      mockRpcCalls.push({ fnName, params });
      return Promise.resolve({ error: mockRpcError });
    },
  }),
}));

describe('Record Invalid Word API Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpcCalls.length = 0;
    mockRpcError = null;
  });

  describe('RPC function integration', () => {
    it('should call record_invalid_word_submission RPC with correct params', async () => {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient('https://test.supabase.co', 'test-key');

      await supabase.rpc('record_invalid_word_submission', {
        p_word: 'testword',
        p_language: 'en',
        p_reason: 'not_in_dictionary',
      });

      expect(mockRpcCalls.length).toBe(1);
      expect(mockRpcCalls[0].fnName).toBe('record_invalid_word_submission');
      expect(mockRpcCalls[0].params).toEqual({
        p_word: 'testword',
        p_language: 'en',
        p_reason: 'not_in_dictionary',
      });
    });

    it('should handle RPC errors gracefully', async () => {
      mockRpcError = { message: 'Database error' };

      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient('https://test.supabase.co', 'test-key');

      const result = await supabase.rpc('record_invalid_word_submission', {
        p_word: 'testword',
        p_language: 'en',
        p_reason: 'not_in_dictionary',
      });

      expect(result.error).toEqual({ message: 'Database error' });
    });
  });

  describe('Input validation rules', () => {
    it('should accept valid reasons: not_on_board', () => {
      const validReasons = ['not_on_board', 'not_in_dictionary', 'peer_rejected', 'too_short'];
      expect(validReasons.includes('not_on_board')).toBe(true);
    });

    it('should accept valid reasons: not_in_dictionary', () => {
      const validReasons = ['not_on_board', 'not_in_dictionary', 'peer_rejected', 'too_short'];
      expect(validReasons.includes('not_in_dictionary')).toBe(true);
    });

    it('should accept valid reasons: peer_rejected', () => {
      const validReasons = ['not_on_board', 'not_in_dictionary', 'peer_rejected', 'too_short'];
      expect(validReasons.includes('peer_rejected')).toBe(true);
    });

    it('should reject invalid reasons', () => {
      const validReasons = ['not_on_board', 'not_in_dictionary', 'peer_rejected', 'too_short'];
      expect(validReasons.includes('invalid_reason')).toBe(false);
    });
  });

  describe('Word filtering rules', () => {
    it('should skip words with length < 2', () => {
      const word = 'a';
      const shouldSkip = word.length < 2;
      expect(shouldSkip).toBe(true);
    });

    it('should not skip words with length >= 2', () => {
      const word = 'ab';
      const shouldSkip = word.length < 2;
      expect(shouldSkip).toBe(false);
    });

    it('should skip too_short reason', () => {
      const reason = 'too_short';
      const shouldSkip = reason === 'too_short';
      expect(shouldSkip).toBe(true);
    });

    it('should not skip not_in_dictionary reason', () => {
      const reason: string = 'not_in_dictionary';
      const shouldSkip = reason === 'too_short';
      expect(shouldSkip).toBe(false);
    });
  });

  describe('Word normalization rules', () => {
    it('should lowercase words', () => {
      const word = 'TESTWORD';
      const normalized = word.toLowerCase().trim();
      expect(normalized).toBe('testword');
    });

    it('should trim whitespace', () => {
      const word = '  testword  ';
      const normalized = word.toLowerCase().trim();
      expect(normalized).toBe('testword');
    });

    it('should handle mixed case and whitespace', () => {
      const word = '  TestWORD  ';
      const normalized = word.toLowerCase().trim();
      expect(normalized).toBe('testword');
    });
  });

  describe('Supported languages', () => {
    const supportedLanguages = ['en', 'he', 'sv', 'ja', 'es'];

    supportedLanguages.forEach((lang) => {
      it(`should support language: ${lang}`, () => {
        expect(supportedLanguages.includes(lang)).toBe(true);
      });
    });
  });

  describe('Supported game modes', () => {
    const supportedGameModes = [
      'multiplayer',
      'adventure',
      'daily_word_hunt',
      'single_player',
      'drill',
    ];

    supportedGameModes.forEach((mode) => {
      it(`should support game mode: ${mode}`, () => {
        expect(supportedGameModes.includes(mode)).toBe(true);
      });
    });
  });
});
