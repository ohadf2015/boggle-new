/**
 * API Route: /api/analytics/log-session
 * Logs game sessions for analytics and history tracking
 * Supports both authenticated users and guest players
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';
import { captureApiError } from '@/utils/sentry';
import type { GameSessionUpdateData } from '@/backend/modules/gameSessionLogger';

type GameSessionLoggerModule = typeof import('@/backend/modules/gameSessionLogger');
type GuestTrackerModule = typeof import('@/backend/modules/guestTracker');

let logGameSession: GameSessionLoggerModule['logGameSession'] | undefined;
let updateGameSession: GameSessionLoggerModule['updateGameSession'] | undefined;
let getOrCreateGuestSession: GuestTrackerModule['getOrCreateGuestSession'] | undefined;

async function getLoggers() {
  if (!logGameSession || !updateGameSession) {
    const loggerModule = await import('@/backend/modules/gameSessionLogger');
    logGameSession = loggerModule.logGameSession;
    updateGameSession = loggerModule.updateGameSession;
  }
  return { logGameSession: logGameSession!, updateGameSession: updateGameSession! };
}

async function getGuestTracker() {
  if (!getOrCreateGuestSession) {
    const guestModule = await import('@/backend/modules/guestTracker');
    getOrCreateGuestSession = guestModule.getOrCreateGuestSession;
  }
  return { getOrCreateGuestSession: getOrCreateGuestSession! };
}

// Rate limit: 60 requests per minute per IP (generous for gameplay)
const RATE_LIMIT_CONFIG = {
  maxRequests: 60,
  windowMs: 60000,
  blockDurationMs: 300000,
};

export async function POST(request: NextRequest) {
  // Check rate limit
  const rateLimit = checkApiRateLimit(request, 'log-session', RATE_LIMIT_CONFIG);
  if (!rateLimit.success) {
    return rateLimitResponse(rateLimit);
  }

  try {
    const body = await request.json();
    const {
      action, // 'start' or 'update'
      sessionId, // For updates
      userId,
      guestSessionId,
      mode,
      language,
      difficulty,
      score,
      wordsFound,
      durationSeconds,
      completed,
      dailyPuzzleNumber,
      targetWord,
      targetFound,
      attemptsUsed,
      lifeRemaining,
      lifeGained,
      tokensEarned,
      tokensSpent,
      cluesUsed,
      roomCode,
      playerCount,
      finalRank,
      deviceType,
      browser,
      country,
      referrerSource,
      isFirstGame,
      startedAt,
      completedAt,
    } = body;

    // Validate required fields for start action
    if (action === 'start') {
      if (!mode || !language) {
        return NextResponse.json(
          { error: 'Missing required fields: mode, language' },
          { status: 400 }
        );
      }

      // Fully anonymous sessions (no userId AND no guestSessionId) are now allowed —
      // they persist with both ids NULL so admin dashboard sees every game.

      // Validate mode
      if (!['singleplayer', 'multiplayer', 'daily_challenge'].includes(mode)) {
        return NextResponse.json(
          { error: 'Invalid mode. Must be singleplayer, multiplayer, or daily_challenge' },
          { status: 400 }
        );
      }

      const { logGameSession: logFn } = await getLoggers();

      // Ensure guest_sessions record exists for guest players (for analytics tracking)
      // Note: This is best-effort - game session will still be logged even if this fails
      if (guestSessionId && !userId) {
        try {
          const { getOrCreateGuestSession: createGuestFn } = await getGuestTracker();
          await createGuestFn({
            sessionId: guestSessionId,
            deviceType: deviceType || null,
            browser: browser || null,
            language: language || null,
          });
        } catch (guestError) {
          // Log error but don't fail the request - guest_sessions is supplementary
          console.warn('[log-session] Failed to track guest session:', guestError instanceof Error ? guestError.message : 'Unknown error');
        }
      }

      // Log new session
      const newSessionId = await logFn({
        userId: userId || null,
        guestSessionId: guestSessionId || null,
        mode,
        language,
        difficulty: difficulty || null,
        score: score || 0,
        wordsFound: wordsFound || [],
        durationSeconds: durationSeconds || null,
        completed: completed || false,
        dailyPuzzleNumber: dailyPuzzleNumber || null,
        targetWord: targetWord || null,
        targetFound: targetFound || false,
        attemptsUsed: attemptsUsed || null,
        lifeRemaining: lifeRemaining || null,
        lifeGained: lifeGained || 0,
        tokensEarned: tokensEarned || 0,
        tokensSpent: tokensSpent || 0,
        cluesUsed: cluesUsed || 0,
        roomCode: roomCode || null,
        playerCount: playerCount || null,
        finalRank: finalRank || null,
        deviceType: deviceType || null,
        browser: browser || null,
        country: country || null,
        referrerSource: referrerSource || null,
        isFirstGame: isFirstGame || false,
        startedAt: startedAt ? new Date(startedAt) : new Date(),
        completedAt: completedAt ? new Date(completedAt) : null,
      });

      if (!newSessionId) {
        return NextResponse.json(
          { error: 'Failed to log game session' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        sessionId: newSessionId,
      });
    }

    // Update existing session
    if (action === 'update') {
      if (!sessionId) {
        return NextResponse.json(
          { error: 'sessionId is required for updates' },
          { status: 400 }
        );
      }

      const { updateGameSession: updateFn } = await getLoggers();

      const updates: GameSessionUpdateData = {};
      if (score !== undefined) updates.score = score;
      if (wordsFound !== undefined) updates.wordsFound = wordsFound;
      if (durationSeconds !== undefined) updates.durationSeconds = durationSeconds;
      if (completed !== undefined) updates.completed = completed;
      if (targetFound !== undefined) updates.targetFound = targetFound;
      if (attemptsUsed !== undefined) updates.attemptsUsed = attemptsUsed;
      if (lifeRemaining !== undefined) updates.lifeRemaining = lifeRemaining;
      if (lifeGained !== undefined) updates.lifeGained = lifeGained;
      if (tokensEarned !== undefined) updates.tokensEarned = tokensEarned;
      if (tokensSpent !== undefined) updates.tokensSpent = tokensSpent;
      if (cluesUsed !== undefined) updates.cluesUsed = cluesUsed;
      if (finalRank !== undefined) updates.finalRank = finalRank;
      if (completedAt !== undefined) updates.completedAt = new Date(completedAt);

      const success = await updateFn(sessionId, updates);

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to update game session' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Must be "start" or "update"' },
      { status: 400 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[log-session] Error:', msg);
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/analytics/log-session',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
