/**
 * User and Authentication Type Definitions
 */

import type { Avatar } from './game';

export interface Session {
  gameCode: string;
  username: string;
  isHost: boolean;
  roomName?: string;
  language: string;
  timestamp: number;
}

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar?: Avatar;
  createdAt: string;
  updatedAt: string;
}

export interface GuestUser {
  username: string;
  avatar: Avatar;
  guestTokenHash: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  avatar: Avatar;
  stats: UserStats;
  achievements: Achievement[];
  isGuest: boolean;
}

export interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  longestWord: string;
  averageScore: number;
  totalWordsFound: number;
  favoriteLanguage: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: string;
  tier?: 'bronze' | 'silver' | 'gold';
}

export interface Leaderboard {
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  entries: LeaderboardEntry[];
  lastUpdated: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  avatar: Avatar;
  score: number;
  gamesPlayed: number;
  gamesWon: number;
  achievements: number;
}
