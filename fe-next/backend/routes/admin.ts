/**
 * Admin API Routes
 * Handles all /api/admin/* endpoints for the admin dashboard
 *
 * Security features:
 * - JWT authentication via Supabase
 * - Admin role verification
 * - Rate limiting per IP
 * - Audit logging for sensitive operations
 */

import express, { Request, Response, Router, NextFunction } from 'express';
import { z } from 'zod';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getSupabase, isSupabaseConfigured } = require('../modules/supabaseServer');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getAllGames } = require('../modules/gameStateManager');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { isInProgress } = require('../utils/gameStateMachine');
import { getActiveSinglePlayerCount } from './singlePlayer';
import logger from '../utils/logger';

const router: Router = express.Router();

// ==================== Types ====================

interface AdminUser {
  id: string;
  email: string;
  username?: string;
}

interface AdminRequest extends Request {
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

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

interface SocketIO {
  sockets: {
    sockets: Map<string, unknown>;
  };
}

interface GameInfo {
  playerCount: number;
  gameState: string;
}

// Response types
interface StatsResponse {
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
}

interface CountryData {
  country: string;
  count: number;
}

interface NameCountData {
  name: string;
  count: number;
}

interface WordStat {
  word: string;
  language: string;
  likes: number;
  dislikes: number;
  gameCodes: string[];
  firstSeen: string;
  lastSeen: string;
  netScore: number;
}

interface BlacklistEntry {
  id: string;
  word: string;
  language: string;
  reason?: string | null;
  created_at: string;
}

interface GuestPlayerStat {
  name: string;
  events: number;
  utm_source?: string | null;
  utm_medium?: string | null;
  referrer?: string | null;
  country_code?: string | null;
  first_seen: string;
  last_seen: string;
}

interface CommunityWordEntry {
  word: string;
  language: string;
  likes_count: number;
  dislikes_count: number;
  net_score: number;
  is_potentially_valid: boolean;
  first_submitter: string | null;
  last_voted_at: string | null;
  created_at: string;
  status: 'validated' | 'pending_review' | 'rejected' | 'pending';
}
export default router;
