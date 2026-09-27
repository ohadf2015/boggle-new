/**
 * Invalid Word Tracker — per-round rejected-word list
 *
 * Every game mode already funnels dictionary rejections through this module.
 * The results screens need to read them back so a player can appeal a word the
 * dictionary refused (the #1 complaint across EN + RU word-game reviews —
 * see docs/2026-08-02-word-game-player-complaints-research.md).
 */

describe('invalidWordTracker — round list', () => {
  let mockFetch: jest.Mock;
  let tracker: typeof import('../invalidWordTracker');

  beforeEach(async () => {
    mockFetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) }));
    global.fetch = mockFetch as unknown as typeof fetch;
    vi.resetModules();
    tracker = await import('../invalidWordTracker');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts empty', () => {
    expect(tracker.getRejectedWords()).toEqual([]);
  });

  it('collects words rejected for not being in the dictionary', () => {
    tracker.recordNotInDictionary('quixotry', 'en', 'daily_word_hunt');

    expect(tracker.getRejectedWords()).toEqual([{ word: 'quixotry', language: 'en' }]);
  });

  it('does NOT collect words rejected for not being on the board', () => {
    // Not-on-board is the player's mistake, not a dictionary gap — nothing to appeal.
    tracker.recordNotOnBoard('zebra', 'en', 'daily_word_hunt');

    expect(tracker.getRejectedWords()).toEqual([]);
  });

  it('keeps the word once even when the network dedupe window suppresses the POST', () => {
    tracker.recordNotInDictionary('quixotry', 'en', 'daily_word_hunt');
    tracker.recordNotInDictionary('quixotry', 'en', 'daily_word_hunt');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(tracker.getRejectedWords()).toEqual([{ word: 'quixotry', language: 'en' }]);
  });

  it('records the same word separately per language', () => {
    tracker.recordNotInDictionary('sol', 'en', 'single_player');
    tracker.recordNotInDictionary('sol', 'es', 'single_player');

    expect(tracker.getRejectedWords()).toEqual([
      { word: 'sol', language: 'en' },
      { word: 'sol', language: 'es' },
    ]);
  });

  it('clears between rounds so round N does not show round N-1 rejections', () => {
    tracker.recordNotInDictionary('quixotry', 'en', 'daily_word_hunt');
    tracker.clearRejectedWords();

    expect(tracker.getRejectedWords()).toEqual([]);
  });

  it('re-collects a word after a clear even inside the network dedupe window', () => {
    tracker.recordNotInDictionary('quixotry', 'en', 'daily_word_hunt');
    tracker.clearRejectedWords();
    tracker.recordNotInDictionary('quixotry', 'en', 'daily_word_hunt');

    expect(tracker.getRejectedWords()).toEqual([{ word: 'quixotry', language: 'en' }]);
  });

  it('drops the previous mode\'s rejections when a new mode starts recording', () => {
    // Only survival calls clearRejectedWords(); single-player and adventure never
    // do. Without self-scoping, a word refused in solo would surface on the daily
    // results screen as if the daily dictionary had refused it (rules/60 Class 2).
    tracker.recordNotInDictionary('quixotry', 'en', 'single_player');
    tracker.recordNotInDictionary('zyzzyva', 'en', 'daily_word_hunt');

    expect(tracker.getRejectedWords()).toEqual([{ word: 'zyzzyva', language: 'en' }]);
  });

  it('returns a copy so callers cannot mutate internal state', () => {
    tracker.recordNotInDictionary('quixotry', 'en', 'daily_word_hunt');
    tracker.getRejectedWords().push({ word: 'injected', language: 'en' });

    expect(tracker.getRejectedWords()).toHaveLength(1);
  });

  it('caps the list so a spammer cannot grow it without bound', () => {
    for (let i = 0; i < 100; i += 1) {
      tracker.recordNotInDictionary(`word${i}`, 'en', 'daily_word_hunt');
    }

    expect(tracker.getRejectedWords().length).toBeLessThanOrEqual(50);
  });
});
