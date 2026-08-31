/**
 * Ranked Match Result API
 *
 * POST /api/ranked/match — Submit a ranked match result
 *
 * Called by the backend after a ranked game ends.
 * Calculates ELO changes and records the match.
 */

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import {
  calculateNewRatings,
  calculateMultiplayerRatings,
  type PlayerRating,
} from '@/shared/utils/eloRating';
import { captureApiError } from '@/utils/sentry';

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return { url, key };
}

interface MatchPlayer {
  userId: string;
  score: number;
  placement: number;
}

interface MatchPayload {
  players: MatchPlayer[];
  gameMode?: string;
  /** Shared secret to authenticate backend-to-API calls */
  serverSecret?: string;
}

/**
 * POST /api/ranked/match — Submit ranked match result
 */
export async function POST(request: NextRequest) {
  try {
    const rateLimitResult = checkApiRateLimit(request, 'ranked-match', {
      maxRequests: 10,
      windowMs: 60_000,
    });
    if (!rateLimitResult.success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const config = getSupabaseConfig();
    if (!config) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const expectedSecret = process.env.RANKED_SERVER_SECRET;
    if (!expectedSecret) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 503 });
    }

    const body: MatchPayload = await request.json();

    // Fail-closed backend-to-API auth: header x-ranked-secret OR body.serverSecret
    const providedSecret = request.headers.get('x-ranked-secret') || body.serverSecret;
    if (!providedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const providedBuf = Buffer.from(providedSecret);
    const expectedBuf = Buffer.from(expectedSecret);
    if (
      providedBuf.length !== expectedBuf.length ||
      !timingSafeEqual(providedBuf, expectedBuf)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { players, gameMode = 'classic' } = body;

    if (!players || players.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 players required' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient(config.url, config.key);

    // Fetch current ratings for all players
    const userIds = players.map(p => p.userId);
    const { data: existingRatings } = await serviceClient
      .from('player_ratings')
      .select('*')
      .in('user_id', userIds);

    const ratingMap = new Map(
      (existingRatings || []).map(r => [r.user_id, r])
    );

    // Build player rating objects
    const playerRatings = players.map(p => {
      const existing = ratingMap.get(p.userId);
      return {
        id: p.userId,
        score: p.score,
        placement: p.placement,
        rating: {
          rating: existing?.rating ?? 1000,
          rd: existing?.rating_deviation ?? 350,
          gamesPlayed: existing?.games_played ?? 0,
        } as PlayerRating,
        ratingBefore: existing?.rating ?? 1000,
      };
    });

    // Sort by placement
    playerRatings.sort((a, b) => a.placement - b.placement);

    // Calculate new ratings
    let newRatings: Map<string, PlayerRating>;

    if (playerRatings.length === 2) {
      // 1v1: use direct ELO
      const result = calculateNewRatings(
        playerRatings[0].rating,
        playerRatings[1].rating
      );
      newRatings = new Map([
        [playerRatings[0].id, result.winner],
        [playerRatings[1].id, result.loser],
      ]);
    } else {
      // Multiplayer: use pairwise ELO
      newRatings = calculateMultiplayerRatings(
        playerRatings.map(p => ({
          id: p.id,
          rating: p.rating,
          placement: p.placement,
        }))
      );
    }

    // Upsert updated ratings
    const upsertPromises = playerRatings.map(async (p) => {
      const newRating = newRatings.get(p.id)!;
      const isWin = p.placement === 1;
      const existing = ratingMap.get(p.id);
      const currentWins = existing?.wins ?? 0;
      const currentLosses = existing?.losses ?? 0;
      const currentPeak = existing?.peak_rating ?? 1000;

      return serviceClient
        .from('player_ratings')
        .upsert({
          user_id: p.id,
          rating: newRating.rating,
          rating_deviation: newRating.rd,
          games_played: newRating.gamesPlayed,
          wins: isWin ? currentWins + 1 : currentWins,
          losses: isWin ? currentLosses : currentLosses + 1,
          peak_rating: Math.max(currentPeak, newRating.rating),
          last_game_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    });

    await Promise.all(upsertPromises);

    // Also sync to profiles.ranked_mmr for backward compatibility
    const profileUpdates = playerRatings.map(p => {
      const newRating = newRatings.get(p.id)!;
      const existing = ratingMap.get(p.id);
      const currentPeak = existing?.peak_rating ?? 1000;
      return serviceClient
        .from('profiles')
        .update({
          ranked_mmr: newRating.rating,
          peak_mmr: Math.max(currentPeak, newRating.rating),
        })
        .eq('id', p.id);
    });
    await Promise.all(profileUpdates);

    // Record match history (for 1v1 games)
    if (playerRatings.length === 2) {
      const winner = playerRatings[0];
      const loser = playerRatings[1];
      const winnerNew = newRatings.get(winner.id)!;
      const loserNew = newRatings.get(loser.id)!;

      await serviceClient.from('ranked_matches').insert({
        winner_id: winner.id,
        loser_id: loser.id,
        winner_rating_before: winner.ratingBefore,
        winner_rating_after: winnerNew.rating,
        loser_rating_before: loser.ratingBefore,
        loser_rating_after: loserNew.rating,
        winner_score: winner.score,
        loser_score: loser.score,
        game_mode: gameMode,
      });
    }

    // Build response with rating changes
    const changes = playerRatings.map(p => {
      const newRating = newRatings.get(p.id)!;
      return {
        userId: p.id,
        ratingBefore: p.ratingBefore,
        ratingAfter: newRating.rating,
        change: newRating.rating - p.ratingBefore,
        placement: p.placement,
      };
    });

    return NextResponse.json({ success: true, changes });
  } catch (err) {
    captureApiError(err as Error, 'ranked-match');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
