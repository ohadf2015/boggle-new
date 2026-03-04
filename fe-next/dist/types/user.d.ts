/**
 * User and Authentication Type Definitions
 */
import type { Avatar, LeaderboardEntry } from '../shared/types/game';
export interface Session {
    gameCode: string;
    username: string;
    isHost: boolean;
    roomName?: string;
    hostUsername?: string;
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
    isAdmin?: boolean;
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
    icon: string;
    unlockedAt: string;
    tier?: 'bronze' | 'silver' | 'gold';
}
export interface Leaderboard {
    period: 'daily' | 'weekly' | 'monthly' | 'all-time';
    entries: LeaderboardEntry[];
    lastUpdated: number;
}
export type { LeaderboardEntry };
