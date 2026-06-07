/**
 * Test: awardGameEnd — maps a finished game to Play Games leaderboard/achievement calls.
 * Fire-and-forget; the underlying bridge is a no-op off Android.
 */

import { awardGameEnd } from './awardPlayGames';
import * as pgs from '@/utils/nativePGS';
import { PLAY_GAMES_LEADERBOARDS, PLAY_GAMES_ACHIEVEMENTS } from './playGamesIds';

vi.mock('@/utils/nativePGS', () => ({
  submitLeaderboardScore: vi.fn().mockResolvedValue({ success: true }),
  unlockAchievement: vi.fn().mockResolvedValue({ success: true }),
  incrementAchievement: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/utils/platform', () => ({
  isAndroid: vi.fn(() => true),
}));

describe('awardGameEnd', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('submits the score to the High Score leaderboard', async () => {
    await awardGameEnd({ mode: 'blast', score: 1200 });
    expect(pgs.submitLeaderboardScore).toHaveBeenCalledWith(PLAY_GAMES_LEADERBOARDS.highScore, 1200);
  });

  it('also submits to the Daily Challenge leaderboard for the daily mode', async () => {
    await awardGameEnd({ mode: 'daily-challenge', score: 800 });
    expect(pgs.submitLeaderboardScore).toHaveBeenCalledWith(PLAY_GAMES_LEADERBOARDS.highScore, 800);
    expect(pgs.submitLeaderboardScore).toHaveBeenCalledWith(PLAY_GAMES_LEADERBOARDS.dailyChallenge, 800);
  });

  it('does not submit a non-daily mode to the Daily Challenge leaderboard', async () => {
    await awardGameEnd({ mode: 'word-craft', score: 500 });
    expect(pgs.submitLeaderboardScore).not.toHaveBeenCalledWith(PLAY_GAMES_LEADERBOARDS.dailyChallenge, 500);
  });

  it('skips leaderboard submission when score is zero', async () => {
    await awardGameEnd({ mode: 'blast', score: 0 });
    expect(pgs.submitLeaderboardScore).not.toHaveBeenCalled();
  });

  it('unlocks First Victory when the player won', async () => {
    await awardGameEnd({ mode: 'blast', score: 10, isWinner: true });
    expect(pgs.unlockAchievement).toHaveBeenCalledWith(PLAY_GAMES_ACHIEVEMENTS.firstVictory);
  });

  it('does not unlock First Victory when the player did not win', async () => {
    await awardGameEnd({ mode: 'blast', score: 10, isWinner: false });
    expect(pgs.unlockAchievement).not.toHaveBeenCalled();
  });

  describe('First Word', () => {
    it('unlocks on the first game with words, then not again', async () => {
      await awardGameEnd({ mode: 'blast', score: 10, wordCount: 3 });
      expect(pgs.unlockAchievement).toHaveBeenCalledWith(PLAY_GAMES_ACHIEVEMENTS.firstWord);

      (pgs.unlockAchievement as jest.Mock).mockClear();
      await awardGameEnd({ mode: 'blast', score: 20, wordCount: 5 });
      expect(pgs.unlockAchievement).not.toHaveBeenCalledWith(PLAY_GAMES_ACHIEVEMENTS.firstWord);
    });

    it('does not mark awarded (so it retries) when the unlock fails', async () => {
      (pgs.unlockAchievement as jest.Mock).mockResolvedValueOnce({ success: false });
      await awardGameEnd({ mode: 'blast', score: 10, wordCount: 1 });
      // Next game retries because the prior unlock did not succeed.
      await awardGameEnd({ mode: 'blast', score: 10, wordCount: 1 });
      const firstWordCalls = (pgs.unlockAchievement as jest.Mock).mock.calls.filter(
        (c) => c[0] === PLAY_GAMES_ACHIEVEMENTS.firstWord,
      );
      expect(firstWordCalls.length).toBe(2);
    });

    it('does not unlock First Word when no words were submitted', async () => {
      await awardGameEnd({ mode: 'blast', score: 0, wordCount: 0 });
      expect(pgs.unlockAchievement).not.toHaveBeenCalledWith(PLAY_GAMES_ACHIEVEMENTS.firstWord);
    });
  });

  describe('Word Smith', () => {
    it('increments by the game word count', async () => {
      await awardGameEnd({ mode: 'blast', score: 10, wordCount: 7 });
      expect(pgs.incrementAchievement).toHaveBeenCalledWith(PLAY_GAMES_ACHIEVEMENTS.wordSmith, 7);
    });

    it('does not increment when no words', async () => {
      await awardGameEnd({ mode: 'blast', score: 0, wordCount: 0 });
      expect(pgs.incrementAchievement).not.toHaveBeenCalledWith(PLAY_GAMES_ACHIEVEMENTS.wordSmith, 0);
    });
  });

  describe('Polyglot', () => {
    it('unlocks once a second distinct language is played', async () => {
      await awardGameEnd({ mode: 'blast', score: 10, wordCount: 1, language: 'en' });
      expect(pgs.unlockAchievement).not.toHaveBeenCalledWith(PLAY_GAMES_ACHIEVEMENTS.polyglot);

      await awardGameEnd({ mode: 'blast', score: 10, wordCount: 1, language: 'he' });
      expect(pgs.unlockAchievement).toHaveBeenCalledWith(PLAY_GAMES_ACHIEVEMENTS.polyglot);
    });

    it('does not unlock for repeated same language', async () => {
      await awardGameEnd({ mode: 'blast', score: 10, wordCount: 1, language: 'en' });
      await awardGameEnd({ mode: 'blast', score: 10, wordCount: 1, language: 'en' });
      expect(pgs.unlockAchievement).not.toHaveBeenCalledWith(PLAY_GAMES_ACHIEVEMENTS.polyglot);
    });
  });

  describe('Daily Devotee', () => {
    it('increments by 1 on a completed daily challenge', async () => {
      await awardGameEnd({ mode: 'daily-challenge', score: 10, wordCount: 1 });
      expect(pgs.incrementAchievement).toHaveBeenCalledWith(PLAY_GAMES_ACHIEVEMENTS.dailyDevotee, 1);
    });

    it('does not increment Daily Devotee for non-daily modes', async () => {
      await awardGameEnd({ mode: 'blast', score: 10, wordCount: 1 });
      expect(pgs.incrementAchievement).not.toHaveBeenCalledWith(PLAY_GAMES_ACHIEVEMENTS.dailyDevotee, 1);
    });
  });
});
