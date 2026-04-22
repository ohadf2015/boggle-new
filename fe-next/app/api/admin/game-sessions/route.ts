/**
 * API Route: /api/admin/game-sessions
 * Admin endpoint for querying game sessions and analytics
 * GET: Fetch game sessions with filters and pagination
 * Only accessible to admin users
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { captureApiError } from '@/utils/sentry';
import type { GameSessionFilters } from '@/backend/modules/gameSessionLogger';

type GameSessionLoggerModule = typeof import('@/backend/modules/gameSessionLogger');
type GuestTrackerModule = typeof import('@/backend/modules/guestTracker');

let getGameSessions: GameSessionLoggerModule['getGameSessions'] | undefined;
let getGameSessionStats: GameSessionLoggerModule['getGameSessionStats'] | undefined;
let getGuestSessionAnalytics: GuestTrackerModule['getGuestSessionAnalytics'] | undefined;

async function getServices() {
  if (!getGameSessions || !getGameSessionStats || !getGuestSessionAnalytics) {
    const gameModule = await import('@/backend/modules/gameSessionLogger');
    const guestModule = await import('@/backend/modules/guestTracker');
    getGameSessions = gameModule.getGameSessions;
    getGameSessionStats = gameModule.getGameSessionStats;
    getGuestSessionAnalytics = guestModule.getGuestSessionAnalytics;
  }
  return { getGameSessions, getGameSessionStats, getGuestSessionAnalytics };
}

/**
 * GET - Fetch game sessions with filters
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'sessions';
    const mode = searchParams.get('mode');
    const language = searchParams.get('language');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const completed = searchParams.get('completed');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const filterUserId = searchParams.get('userId');
    const guestSessionId = searchParams.get('guestSessionId');

    const { getGameSessions: fetchSessions, getGameSessionStats: fetchStats, getGuestSessionAnalytics: fetchGuestAnalytics } = await getServices();

    // Handle different actions
    if (action === 'stats') {
      // Get game session statistics
      const filters: GameSessionFilters = {};
      if (mode) filters.mode = mode;
      if (language) filters.language = language;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      if (completed !== null && completed !== undefined) {
        filters.completed = completed === 'true';
      }

      const stats = await fetchStats(filters);

      return NextResponse.json({
        success: true,
        stats,
      });
    }

    if (action === 'guest-analytics') {
      // Get guest session analytics
      const analytics = await fetchGuestAnalytics();

      return NextResponse.json({
        success: true,
        analytics,
      });
    }

    // Default: Fetch sessions
    const filters: GameSessionFilters = {
      limit,
      offset,
    };

    if (mode) filters.mode = mode;
    if (language) filters.language = language;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (completed !== null && completed !== undefined) {
      filters.completed = completed === 'true';
    }
    if (filterUserId) filters.userId = filterUserId;
    if (guestSessionId) filters.guestSessionId = guestSessionId;

    const sessions = await fetchSessions(filters);

    return NextResponse.json({
      success: true,
      sessions,
      count: sessions.length,
      offset,
      limit,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('[admin/game-sessions] Error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/game-sessions',
      { method: 'GET', statusCode: 500 }
    );
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
