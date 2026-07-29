/**
 * Admin API Types
 * Shared interfaces and types for admin route handlers.
 */

import { Request } from 'express';

// ==================== Core Types ====================

export interface AdminUser {
  id: string;
  email: string;
  username?: string;
  admin_role?: 'viewer' | 'moderator' | 'operator' | 'superadmin';
}

export interface AdminRequest extends Request {
  requestId?: string;
  adminUser?: AdminUser;
  query: Request['query'];
  params: Request['params'];
  body: Request['body'];
  headers: Request['headers'];
  socket: Request['socket'];
  method: Request['method'];
  path: Request['path'];
  app: Request['app'];
}

export interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export interface SocketIO {
  sockets: {
    sockets: Map<string, unknown>;
  };
}

export interface GameInfo {
  playerCount: number;
  gameState: string;
}

// ==================== Response Types ====================

export interface StatsResponse {
  overview: {
    totalPlayers: number;
    totalGames: number;
    totalGameTimeHours: number;
    totalWords: number;
  };
  activity: {
    gamesToday: number;
    uniquePlayersToday: number;
    uniquePlayersWeek: number;
    uniquePlayersMonth: number;
    signupsToday: number;
    signupsWeek: number;
  };
  languages: Record<string, number>;
  guests?: {
    totalGuestGames: number;
    guestGamesToday: number;
    uniqueGuestSessions: number;
  };
}

export interface CountryData {
  country: string;
  count: number;
}

export interface NameCountData {
  name: string;
  count: number;
}

export interface WordStat {
  word: string;
  language: string;
  likes: number;
  dislikes: number;
  gameCodes: string[];
  firstSeen: string;
  lastSeen: string;
  netScore: number;
}

export interface BlacklistEntry {
  id: string;
  word: string;
  language: string;
  reason?: string | null;
  created_at: string;
}

export interface GuestPlayerStat {
  name: string;
  events: number;
  utm_source?: string | null;
  utm_medium?: string | null;
  referrer?: string | null;
  country_code?: string | null;
  first_seen: string;
  last_seen: string;
}

export interface CommunityWordEntry {
  word: string;
  language: string;
  likes_count: number;
  dislikes_count: number;
  net_score: number;
  is_potentially_valid: boolean;
  first_submitter: string | null;
  last_voted_at: string | null;
  first_voted_at: string | null;
  status: 'validated' | 'pending_review' | 'rejected' | 'pending';
}

// ==================== Database Row Types ====================

export interface ProfileRow {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
}

export interface EventRow {
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  referrer?: string | null;
  country_code?: string | null;
  metadata?: { guest_name?: string };
  created_at?: string;
}

export interface VoteRow {
  word: string;
  language: string;
  vote_type: 'like' | 'dislike';
  created_at: string;
  game_code: string;
}

export interface WordStatBuilder {
  word: string;
  language: string;
  likes: number;
  dislikes: number;
  gameCodes: Set<string>;
  firstSeen: string;
  lastSeen: string;
}

export interface WordScoreRow {
  word: string;
  language: string;
  likes_count: number;
  dislikes_count: number;
  net_score: number;
  is_potentially_valid: boolean;
  first_submitter: string | null;
  last_voted_at: string | null;
  first_voted_at: string | null;
}

export interface NetScoreRow {
  net_score: number;
}

export interface LanguageScoreRow {
  language: string;
  net_score: number;
}

export interface GuestSession {
  id: string;
  guest_session_id: string;
  mode: string;
  language: string;
  score: number;
  words_found: unknown[] | null;
  duration_seconds: number;
  completed: boolean;
  room_code: string | null;
  player_count: number | null;
  final_rank: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface DailyDataEntry {
  games: number;
  guestGames: number;
  uniquePlayers: Set<string>;
  uniqueGuests: Set<string>;
  signups: number;
}

export interface InvalidWordStatsRow {
  submission_count: number;
  approved_at: string | null;
}

export interface CountMaps {
  registered: Record<string, number>;
  guests: Record<string, number>;
}
