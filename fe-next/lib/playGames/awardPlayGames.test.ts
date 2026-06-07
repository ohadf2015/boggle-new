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
}));

vi.mock('@/utils/platform', () => ({
  isAndroid: vi.fn(() => true),
}));

describe('awardGameEnd', () => {
  beforeEach(() => vi.clearAllMocks());

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
});
