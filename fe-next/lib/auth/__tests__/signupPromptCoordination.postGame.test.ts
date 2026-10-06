
import { describe, it, expect, beforeEach } from 'vitest';
import {
  markPostGameCompleted,
  hasPostGameCompleted,
  isResultsPath,
  POST_GAME_COMPLETED_KEY,
} from '../signupPromptCoordination';

describe('signupPromptCoordination — post-game latch (UR 2026-10-06 P0)', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('latches post-game completed in sessionStorage', () => {
    expect(hasPostGameCompleted()).toBe(false);
    markPostGameCompleted();
    expect(hasPostGameCompleted()).toBe(true);
    expect(sessionStorage.getItem(POST_GAME_COMPLETED_KEY)).toBe('1');
  });

  it('isResultsPath recognizes results-like surfaces', () => {
    expect(isResultsPath('/en/singleplayer')).toBe(true);
    expect(isResultsPath('/es/daily/word-hunt')).toBe(true);
    expect(isResultsPath('/en/multiplayer')).toBe(true);
    expect(isResultsPath('/en')).toBe(false);
    expect(isResultsPath('/he/words/samurai')).toBe(false);
    expect(isResultsPath('/en/pricing')).toBe(false);
  });
});
