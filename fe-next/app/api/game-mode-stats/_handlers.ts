import type { GameModeStats } from '@/lib/landing/fetchGameModeStats';
import type { MpModeBreakdownStat } from '@/lib/admin/fetchMpModeBreakdown';

// In-memory cache keyed by days (5 min TTL)
export const statsCache = new Map<number, { stats: GameModeStats[]; mpBreakdown: MpModeBreakdownStat[]; timestamp: number }>();
export const CACHE_TTL_MS = 5 * 60 * 1000;
