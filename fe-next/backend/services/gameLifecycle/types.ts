/**
 * Types for Game Lifecycle Services
 * Shared types used across game timer, ending, scoring, and results services
 */

import type { WordDetail } from '@/shared/types';

export interface BotSubmission {
  botId: string;
  username: string;
  word: string;
  score: number;
  comboLevel?: number;
}

export interface Bot {
  id: string;
  username: string;
  isActive: boolean;
  gameCode?: string;
}

export interface AIValidationResult {
  isValid: boolean;
  isAiVerified: boolean;
  confidence?: number;
  reason?: string;
  source?: string;
}

export interface PlayerResult {
  username: string;
  totalScore: number;
  wordDetails: WordDetail[];
  achievements: Array<{ key: string; icon: string }>;
  titles?: string[];
}

export interface XpInfo {
  socketId?: string;
  xpEarned: number;
  xpBreakdown: Record<string, number>;
  newTotalXp: number;
  newLevel: number;
  leveledUp?: boolean;
  oldLevel?: number;
  levelsGained?: number;
  newTitles?: string[];
}

export interface LifetimeAchievement {
  key: string;
  icon: string;
}

export interface GameResults {
  xpResults?: Record<string, XpInfo>;
  lifetimeAchievements?: Record<string, LifetimeAchievement[]>;
}

export interface UserData {
  socketId: string;
  avatar?: { emoji: string; color: string };
  authUserId?: string;
  guestTokenHash?: string;
  guestSessionId?: string;
}
