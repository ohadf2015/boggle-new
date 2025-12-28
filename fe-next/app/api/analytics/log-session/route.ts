/**
 * API Route: /api/analytics/log-session
 * Logs game sessions for analytics and history tracking
 * Supports both authenticated users and guest players
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit, rateLimitResponse } from '@/lib/apiRateLimit';

// Import backend services (dynamic to avoid server/client issues)
let logGameSession: any;
let updateGameSession: any;

async function getLoggers() {
  if (!logGameSession || !updateGameSession) {
    const module = await import('@/backend/modules/gameSessionLogger');
    logGameSession = module.logGameSession;
    updateGameSession = module.updateGameSession;
  }
  return { logGameSession, updateGameSession };
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

      if (!userId && !guestSessionId) {
        return NextResponse.json(
          { error: 'Either userId or guestSessionId must be provided' },
          { status: 400 }
        );
      }

      // Validate mode
      if (!['singleplayer', 'multiplayer', 'daily_challenge'].includes(mode)) {
        return NextResponse.json(
          { error: 'Invalid mode. Must be singleplayer, multiplayer, or daily_challenge' },
          { status: 400 }
        );
      }

      const { logGameSession: logFn } = await getLoggers();

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

      const updates: any = {};
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
