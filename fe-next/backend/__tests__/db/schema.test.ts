import {
  profiles,
  leaderboard,
  gameResults,
  guestTokens,
  rankedProgress,
  playerEngagement,
  dailyChallenges,
  weeklyQuests,
  dailyPuzzles,
  dailyPuzzleAttempts,
  dailyPuzzleStreaks,
  playerProgression,
  levelCompletions,
  mysteryRewardsLog,
} from '../../db/schema';

describe('Drizzle schema', () => {
  describe('profiles', () => {
    it('has identity and display columns', () => {
      expect(profiles.id).toBeDefined();
      expect(profiles.username).toBeDefined();
      expect(profiles.displayName).toBeDefined();
      expect(profiles.avatarEmoji).toBeDefined();
      expect(profiles.avatarColor).toBeDefined();
      expect(profiles.profilePictureUrl).toBeDefined();
    });

    it('has game stat columns', () => {
      expect(profiles.totalGames).toBeDefined();
      expect(profiles.totalScore).toBeDefined();
      expect(profiles.totalWords).toBeDefined();
      expect(profiles.longestWord).toBeDefined();
      expect(profiles.casualGames).toBeDefined();
      expect(profiles.rankedGames).toBeDefined();
      expect(profiles.rankedWins).toBeDefined();
      expect(profiles.rankedMmr).toBeDefined();
    });

    it('has XP columns from migration 005/014', () => {
      expect(profiles.totalXp).toBeDefined();
      expect(profiles.currentLevel).toBeDefined();
      expect(profiles.totalHintsUsed).toBeDefined();
      expect(profiles.freeHintsAvailable).toBeDefined();
    });
  });

  describe('leaderboard', () => {
    it('has expected columns', () => {
      expect(leaderboard.playerId).toBeDefined();
      expect(leaderboard.username).toBeDefined();
      expect(leaderboard.totalScore).toBeDefined();
      expect(leaderboard.gamesPlayed).toBeDefined();
      expect(leaderboard.gamesWon).toBeDefined();
      expect(leaderboard.rankedMmr).toBeDefined();
      expect(leaderboard.rankPosition).toBeDefined();
      expect(leaderboard.totalXp).toBeDefined();
      expect(leaderboard.currentLevel).toBeDefined();
    });
  });

  describe('gameResults', () => {
    it('has expected columns', () => {
      expect(gameResults.id).toBeDefined();
      expect(gameResults.playerId).toBeDefined();
      expect(gameResults.gameCode).toBeDefined();
      expect(gameResults.score).toBeDefined();
      expect(gameResults.wordCount).toBeDefined();
      expect(gameResults.isRanked).toBeDefined();
      expect(gameResults.language).toBeDefined();
      expect(gameResults.timePlayed).toBeDefined();
    });
  });

  describe('guestTokens', () => {
    it('has expected columns', () => {
      expect(guestTokens.id).toBeDefined();
      expect(guestTokens.tokenHash).toBeDefined();
      expect(guestTokens.stats).toBeDefined();
      expect(guestTokens.claimedBy).toBeDefined();
    });
  });

  describe('rankedProgress', () => {
    it('has expected columns', () => {
      expect(rankedProgress.playerId).toBeDefined();
      expect(rankedProgress.casualGamesPlayed).toBeDefined();
      expect(rankedProgress.unlockedAt).toBeDefined();
    });
  });

  describe('playerEngagement', () => {
    it('has streak and session columns', () => {
      expect(playerEngagement.playerId).toBeDefined();
      expect(playerEngagement.currentStreak).toBeDefined();
      expect(playerEngagement.longestStreak).toBeDefined();
      expect(playerEngagement.lastLoginDate).toBeDefined();
      expect(playerEngagement.streakFreezesAvailable).toBeDefined();
      expect(playerEngagement.comebackBonusClaimed).toBeDefined();
      expect(playerEngagement.comebackXpMultiplier).toBeDefined();
      expect(playerEngagement.totalSessions).toBeDefined();
      expect(playerEngagement.gamesToday).toBeDefined();
    });
  });

  describe('dailyChallenges', () => {
    it('has expected columns', () => {
      expect(dailyChallenges.id).toBeDefined();
      expect(dailyChallenges.playerId).toBeDefined();
      expect(dailyChallenges.challengeDate).toBeDefined();
      expect(dailyChallenges.challengeType).toBeDefined();
      expect(dailyChallenges.challengeTier).toBeDefined();
      expect(dailyChallenges.targetValue).toBeDefined();
      expect(dailyChallenges.currentValue).toBeDefined();
      expect(dailyChallenges.completed).toBeDefined();
      expect(dailyChallenges.claimed).toBeDefined();
      expect(dailyChallenges.xpReward).toBeDefined();
    });
  });

  describe('weeklyQuests', () => {
    it('has expected columns', () => {
      expect(weeklyQuests.id).toBeDefined();
      expect(weeklyQuests.playerId).toBeDefined();
      expect(weeklyQuests.weekStart).toBeDefined();
      expect(weeklyQuests.questType).toBeDefined();
      expect(weeklyQuests.requirements).toBeDefined();
      expect(weeklyQuests.currentProgress).toBeDefined();
      expect(weeklyQuests.completed).toBeDefined();
    });
  });

  describe('dailyPuzzles', () => {
    it('has expected columns', () => {
      expect(dailyPuzzles.id).toBeDefined();
      expect(dailyPuzzles.puzzleNumber).toBeDefined();
      expect(dailyPuzzles.puzzleDate).toBeDefined();
      expect(dailyPuzzles.gridSeed).toBeDefined();
      expect(dailyPuzzles.totalAttempts).toBeDefined();
      expect(dailyPuzzles.topScore).toBeDefined();
    });
  });

  describe('dailyPuzzleAttempts', () => {
    it('has expected columns', () => {
      expect(dailyPuzzleAttempts.id).toBeDefined();
      expect(dailyPuzzleAttempts.playerId).toBeDefined();
      expect(dailyPuzzleAttempts.guestFingerprint).toBeDefined();
      expect(dailyPuzzleAttempts.puzzleDate).toBeDefined();
      expect(dailyPuzzleAttempts.score).toBeDefined();
      expect(dailyPuzzleAttempts.wordCount).toBeDefined();
      expect(dailyPuzzleAttempts.shared).toBeDefined();
    });
  });

  describe('dailyPuzzleStreaks', () => {
    it('has expected columns', () => {
      expect(dailyPuzzleStreaks.playerId).toBeDefined();
      expect(dailyPuzzleStreaks.currentStreak).toBeDefined();
      expect(dailyPuzzleStreaks.longestStreak).toBeDefined();
      expect(dailyPuzzleStreaks.totalDailiesCompleted).toBeDefined();
      expect(dailyPuzzleStreaks.bestScore).toBeDefined();
    });
  });

  describe('playerProgression', () => {
    it('has adventure mode columns', () => {
      expect(playerProgression.userId).toBeDefined();
      expect(playerProgression.playerLevel).toBeDefined();
      expect(playerProgression.xp).toBeDefined();
      expect(playerProgression.currentWorld).toBeDefined();
      expect(playerProgression.currentLevel).toBeDefined();
      expect(playerProgression.totalStars).toBeDefined();
    });

    it('has gold/upgrades from migration 20260314', () => {
      expect(playerProgression.gold).toBeDefined();
      expect(playerProgression.upgrades).toBeDefined();
    });
  });

  describe('levelCompletions', () => {
    it('has expected columns', () => {
      expect(levelCompletions.id).toBeDefined();
      expect(levelCompletions.userId).toBeDefined();
      expect(levelCompletions.world).toBeDefined();
      expect(levelCompletions.level).toBeDefined();
      expect(levelCompletions.stars).toBeDefined();
      expect(levelCompletions.bestScore).toBeDefined();
      expect(levelCompletions.bestWords).toBeDefined();
    });
  });

  describe('mysteryRewardsLog', () => {
    it('has expected columns', () => {
      expect(mysteryRewardsLog.id).toBeDefined();
      expect(mysteryRewardsLog.playerId).toBeDefined();
      expect(mysteryRewardsLog.triggerType).toBeDefined();
      expect(mysteryRewardsLog.rewardType).toBeDefined();
      expect(mysteryRewardsLog.rewardValue).toBeDefined();
    });
  });
});
