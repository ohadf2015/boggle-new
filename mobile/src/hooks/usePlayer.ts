// usePlayer - Custom hook for player data and profile management
// Manages player profile, stats, achievements, and preferences
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PlayerProfile {
  id?: string;
  username: string;
  displayName?: string;
  avatarEmoji: string;
  avatarColor: string;

  // Stats
  totalGames: number;
  totalWins: number;
  totalScore: number;
  totalWords: number;
  totalTimePlayed: number; // in seconds
  bestScore: number;
  longestWord: string;

  // Achievements
  achievements: Achievement[];
  achievementCounts: Record<string, number>;

  // Preferences
  preferredLanguage: 'en' | 'he' | 'sv' | 'ja';
  preferredDifficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'master';

  // Timestamps
  createdAt: string;
  lastPlayedAt: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
  gameCode?: string;
}

export interface GameResult {
  score: number;
  words: string[];
  validWords: string[];
  invalidWords: string[];
  rank: number;
  totalPlayers: number;
  duration: number;
  achievements: Achievement[];
}

const STORAGE_KEY = 'lexiclash_player_profile';
const STORAGE_KEY_HISTORY = 'lexiclash_game_history';

// Default player profile
const createDefaultProfile = (): PlayerProfile => ({
  username: 'Guest',
  avatarEmoji: '🐶',
  avatarColor: '#4ECDC4',
  totalGames: 0,
  totalWins: 0,
  totalScore: 0,
  totalWords: 0,
  totalTimePlayed: 0,
  bestScore: 0,
  longestWord: '',
  achievements: [],
  achievementCounts: {},
  preferredLanguage: 'he',
  preferredDifficulty: 'medium',
  createdAt: new Date().toISOString(),
  lastPlayedAt: new Date().toISOString(),
});

export function usePlayer() {
  const [profile, setProfile] = useState<PlayerProfile>(createDefaultProfile());
  const [gameHistory, setGameHistory] = useState<GameResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const [savedProfile, savedHistory] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem(STORAGE_KEY_HISTORY),
        ]);

        if (savedProfile) {
          setProfile(JSON.parse(savedProfile));
        }

        if (savedHistory) {
          setGameHistory(JSON.parse(savedHistory));
        }
      } catch (error) {
        console.error('[Player] Failed to load profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  // Save profile when it changes
  useEffect(() => {
    const saveProfile = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      } catch (error) {
        console.error('[Player] Failed to save profile:', error);
      }
    };

    if (!isLoading) {
      saveProfile();
    }
  }, [profile, isLoading]);

  // Save game history when it changes
  useEffect(() => {
    const saveHistory = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(gameHistory));
      } catch (error) {
        console.error('[Player] Failed to save history:', error);
      }
    };

    if (!isLoading) {
      saveHistory();
    }
  }, [gameHistory, isLoading]);

  // Update profile
  const updateProfile = useCallback((updates: Partial<PlayerProfile>) => {
    setProfile((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Update username
  const updateUsername = useCallback((username: string) => {
    setProfile((prev) => ({
      ...prev,
      username: username.trim(),
    }));
  }, []);

  // Update avatar
  const updateAvatar = useCallback((emoji: string, color: string) => {
    setProfile((prev) => ({
      ...prev,
      avatarEmoji: emoji,
      avatarColor: color,
    }));
  }, []);

  // Record game result
  const recordGameResult = useCallback((result: GameResult) => {
    const isWin = result.rank === 1;
    const newAchievements = result.achievements || [];

    setProfile((prev) => {
      // Update achievement counts
      const achievementCounts = { ...prev.achievementCounts };
      newAchievements.forEach((achievement) => {
        achievementCounts[achievement.id] = (achievementCounts[achievement.id] || 0) + 1;
      });

      // Find longest word
      const longestInGame = result.validWords.reduce((longest, word) =>
        word.length > longest.length ? word : longest, ''
      );
      const longestWord = longestInGame.length > prev.longestWord.length
        ? longestInGame
        : prev.longestWord;

      return {
        ...prev,
        totalGames: prev.totalGames + 1,
        totalWins: prev.totalWins + (isWin ? 1 : 0),
        totalScore: prev.totalScore + result.score,
        totalWords: prev.totalWords + result.validWords.length,
        totalTimePlayed: prev.totalTimePlayed + result.duration,
        bestScore: Math.max(prev.bestScore, result.score),
        longestWord,
        achievements: [...prev.achievements, ...newAchievements],
        achievementCounts,
        lastPlayedAt: new Date().toISOString(),
      };
    });

    // Add to history (keep last 50 games)
    setGameHistory((prev) => {
      const updated = [result, ...prev];
      return updated.slice(0, 50);
    });
  }, []);

  // Get stats summary
  const getStats = useCallback(() => {
    const winRate = profile.totalGames > 0
      ? ((profile.totalWins / profile.totalGames) * 100).toFixed(1)
      : '0.0';

    const avgScore = profile.totalGames > 0
      ? Math.round(profile.totalScore / profile.totalGames)
      : 0;

    const avgWordsPerGame = profile.totalGames > 0
      ? Math.round(profile.totalWords / profile.totalGames)
      : 0;

    const totalHoursPlayed = Math.floor(profile.totalTimePlayed / 3600);
    const totalMinutesPlayed = Math.floor((profile.totalTimePlayed % 3600) / 60);

    return {
      totalGames: profile.totalGames,
      totalWins: profile.totalWins,
      winRate: `${winRate}%`,
      totalScore: profile.totalScore,
      avgScore,
      bestScore: profile.bestScore,
      totalWords: profile.totalWords,
      avgWordsPerGame,
      longestWord: profile.longestWord || '—',
      totalTimePlayed: profile.totalTimePlayed,
      timePlayedFormatted: totalHoursPlayed > 0
        ? `${totalHoursPlayed}h ${totalMinutesPlayed}m`
        : `${totalMinutesPlayed}m`,
      totalAchievements: profile.achievements.length,
      uniqueAchievements: Object.keys(profile.achievementCounts).length,
    };
  }, [profile]);

  // Get recent games
  const getRecentGames = useCallback((limit = 10) => {
    return gameHistory.slice(0, limit);
  }, [gameHistory]);

  // Clear all data
  const clearData = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEY),
        AsyncStorage.removeItem(STORAGE_KEY_HISTORY),
      ]);
      setProfile(createDefaultProfile());
      setGameHistory([]);
    } catch (error) {
      console.error('[Player] Failed to clear data:', error);
    }
  }, []);

  // Reset profile (keep username/avatar)
  const resetStats = useCallback(() => {
    setProfile((prev) => ({
      ...createDefaultProfile(),
      username: prev.username,
      avatarEmoji: prev.avatarEmoji,
      avatarColor: prev.avatarColor,
      preferredLanguage: prev.preferredLanguage,
      preferredDifficulty: prev.preferredDifficulty,
      createdAt: prev.createdAt,
    }));
    setGameHistory([]);
  }, []);

  return {
    // State
    profile,
    gameHistory,
    isLoading,

    // Actions
    updateProfile,
    updateUsername,
    updateAvatar,
    recordGameResult,

    // Getters
    getStats,
    getRecentGames,

    // Utilities
    clearData,
    resetStats,
  };
}
