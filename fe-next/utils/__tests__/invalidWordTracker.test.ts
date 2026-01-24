/**
 * Invalid Word Tracker Tests
 *
 * Tests for the client-side invalid word tracking utility.
 */

// Mock fetch globally
const mockFetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ success: true }),
  })
);

global.fetch = mockFetch as unknown as typeof fetch;

// Import after mocking
import {
  recordInvalidWord,
  recordNotOnBoard,
  recordNotInDictionary,
  type InvalidWordReason,
  type GameMode,
} from '../invalidWordTracker';

describe('invalidWordTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the module state between tests to clear deduplication cache
    jest.resetModules();
  });

  describe('recordInvalidWord', () => {
    it('sends POST request to API with correct payload', () => {
      recordInvalidWord({
        word: 'testword',
        language: 'en',
        reason: 'not_in_dictionary',
        gameMode: 'daily_word_hunt',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/invalid-word/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: 'testword',
          language: 'en',
          reason: 'not_in_dictionary',
          gameMode: 'daily_word_hunt',
        }),
      });
    });

    it('skips very short words (< 3 chars)', () => {
      recordInvalidWord({
        word: 'ab',
        language: 'en',
        reason: 'not_in_dictionary',
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('skips empty words', () => {
      recordInvalidWord({
        word: '',
        language: 'en',
        reason: 'not_in_dictionary',
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('skips too_short reason', () => {
      recordInvalidWord({
        word: 'testword',
        language: 'en',
        reason: 'too_short',
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('handles API errors silently', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      expect(() => {
        recordInvalidWord({
          word: 'testword',
          language: 'en',
          reason: 'not_in_dictionary',
        });
      }).not.toThrow();
    });

    it('works without gameMode', () => {
      recordInvalidWord({
        word: 'testword',
        language: 'en',
        reason: 'not_on_board',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/invalid-word/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: 'testword',
          language: 'en',
          reason: 'not_on_board',
          gameMode: undefined,
        }),
      });
    });

    it('supports all valid reasons', () => {
      const reasons: InvalidWordReason[] = ['not_on_board', 'not_in_dictionary', 'peer_rejected'];

      reasons.forEach((reason, index) => {
        recordInvalidWord({
          word: `word${index}unique`,
          language: 'en',
          reason,
        });
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('supports all valid game modes', () => {
      const gameModes: GameMode[] = [
        'multiplayer',
        'adventure',
        'daily_word_hunt',
        'daily_buzz',
        'single_player',
        'drill',
      ];

      gameModes.forEach((gameMode, index) => {
        recordInvalidWord({
          word: `mode${index}word`,
          language: 'en',
          reason: 'not_in_dictionary',
          gameMode,
        });
      });

      expect(mockFetch).toHaveBeenCalledTimes(6);
    });

    it('supports Hebrew language', () => {
      recordInvalidWord({
        word: 'מילה',
        language: 'he',
        reason: 'not_in_dictionary',
        gameMode: 'adventure',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/invalid-word/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: 'מילה',
          language: 'he',
          reason: 'not_in_dictionary',
          gameMode: 'adventure',
        }),
      });
    });
  });

  describe('recordNotOnBoard', () => {
    it('calls recordInvalidWord with not_on_board reason', () => {
      recordNotOnBoard('testword', 'en', 'adventure');

      expect(mockFetch).toHaveBeenCalledWith('/api/invalid-word/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: 'testword',
          language: 'en',
          reason: 'not_on_board',
          gameMode: 'adventure',
        }),
      });
    });

    it('works without gameMode', () => {
      recordNotOnBoard('newword', 'sv');

      expect(mockFetch).toHaveBeenCalledWith('/api/invalid-word/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: 'newword',
          language: 'sv',
          reason: 'not_on_board',
          gameMode: undefined,
        }),
      });
    });
  });

  describe('recordNotInDictionary', () => {
    it('calls recordInvalidWord with not_in_dictionary reason', () => {
      recordNotInDictionary('unknownword', 'ja', 'daily_buzz');

      expect(mockFetch).toHaveBeenCalledWith('/api/invalid-word/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: 'unknownword',
          language: 'ja',
          reason: 'not_in_dictionary',
          gameMode: 'daily_buzz',
        }),
      });
    });

    it('works without gameMode', () => {
      recordNotInDictionary('anotherword', 'es');

      expect(mockFetch).toHaveBeenCalledWith('/api/invalid-word/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: 'anotherword',
          language: 'es',
          reason: 'not_in_dictionary',
          gameMode: undefined,
        }),
      });
    });
  });
});
