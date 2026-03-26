/**
 * Invalid Word Tracker Tests
 *
 * Tests for the client-side invalid word tracking utility.
 */

// Use jest.isolateModules to ensure fresh module state for each test
describe('invalidWordTracker', () => {
  let mockFetch: jest.Mock;
  let recordInvalidWord: typeof import('../invalidWordTracker').recordInvalidWord;
  let recordNotOnBoard: typeof import('../invalidWordTracker').recordNotOnBoard;
  let recordNotInDictionary: typeof import('../invalidWordTracker').recordNotInDictionary;

  beforeEach(async () => {
    // Create fresh mock for each test
    mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    );
    global.fetch = mockFetch as unknown as typeof fetch;

    // Re-import module to get fresh state (clear deduplication cache)
    vi.resetModules();
    const tracker = await import('../invalidWordTracker');
    recordInvalidWord = tracker.recordInvalidWord;
    recordNotOnBoard = tracker.recordNotOnBoard;
    recordNotInDictionary = tracker.recordNotInDictionary;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('recordInvalidWord', () => {
    it('sends POST request to API with correct payload', () => {
      recordInvalidWord({
        word: 'uniqueword1',
        language: 'en',
        reason: 'not_in_dictionary',
        gameMode: 'daily_word_hunt',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/invalid-word/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: 'uniqueword1',
          language: 'en',
          reason: 'not_in_dictionary',
          gameMode: 'daily_word_hunt',
        }),
      });
    });

    it('skips very short words (< 2 chars)', () => {
      recordInvalidWord({
        word: 'a',
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
        word: 'uniqueword2',
        language: 'en',
        reason: 'too_short',
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('handles API errors silently', () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      expect(() => {
        recordInvalidWord({
          word: 'uniqueword3',
          language: 'en',
          reason: 'not_in_dictionary',
        });
      }).not.toThrow();
    });

    it('works without gameMode', () => {
      recordInvalidWord({
        word: 'uniqueword4',
        language: 'en',
        reason: 'not_on_board',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/invalid-word/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: 'uniqueword4',
          language: 'en',
          reason: 'not_on_board',
          gameMode: undefined,
        }),
      });
    });

    it('supports all valid reasons', () => {
      const reasons = ['not_on_board', 'not_in_dictionary', 'peer_rejected'] as const;

      reasons.forEach((reason, index) => {
        recordInvalidWord({
          word: `reasonword${index}`,
          language: 'en',
          reason,
        });
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('supports all valid game modes', () => {
      const gameModes = [
        'multiplayer',
        'adventure',
        'daily_word_hunt',
        'single_player',
        'drill',
      ] as const;

      gameModes.forEach((gameMode, index) => {
        recordInvalidWord({
          word: `gamemodeword${index}`,
          language: 'en',
          reason: 'not_in_dictionary',
          gameMode,
        });
      });

      expect(mockFetch).toHaveBeenCalledTimes(5);
    });

    it('supports Hebrew language', () => {
      recordInvalidWord({
        word: 'מילהארוכה',
        language: 'he',
        reason: 'not_in_dictionary',
        gameMode: 'adventure',
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/invalid-word/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: 'מילהארוכה',
          language: 'he',
          reason: 'not_in_dictionary',
          gameMode: 'adventure',
        }),
      });
    });

    it('deduplicates repeated submissions of same word', () => {
      recordInvalidWord({
        word: 'duplicateword',
        language: 'en',
        reason: 'not_in_dictionary',
      });

      recordInvalidWord({
        word: 'duplicateword',
        language: 'en',
        reason: 'not_in_dictionary',
      });

      // Should only call once due to deduplication
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('recordNotOnBoard', () => {
    it('calls recordInvalidWord with not_on_board reason', () => {
      recordNotOnBoard('notonboardword', 'en', 'adventure');

      expect(mockFetch).toHaveBeenCalledWith('/api/invalid-word/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: 'notonboardword',
          language: 'en',
          reason: 'not_on_board',
          gameMode: 'adventure',
        }),
      });
    });

    it('works without gameMode', () => {
      recordNotOnBoard('newwordboard', 'sv');

      expect(mockFetch).toHaveBeenCalledWith('/api/invalid-word/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: 'newwordboard',
          language: 'sv',
          reason: 'not_on_board',
          gameMode: undefined,
        }),
      });
    });
  });

  describe('recordNotInDictionary', () => {
    it('calls recordInvalidWord with not_in_dictionary reason', () => {
      recordNotInDictionary('notindictword', 'ja', 'daily_word_hunt');

      expect(mockFetch).toHaveBeenCalledWith('/api/invalid-word/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: 'notindictword',
          language: 'ja',
          reason: 'not_in_dictionary',
          gameMode: 'daily_word_hunt',
        }),
      });
    });

    it('works without gameMode', () => {
      recordNotInDictionary('anothernotdict', 'es');

      expect(mockFetch).toHaveBeenCalledWith('/api/invalid-word/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: 'anothernotdict',
          language: 'es',
          reason: 'not_in_dictionary',
          gameMode: undefined,
        }),
      });
    });
  });
});
