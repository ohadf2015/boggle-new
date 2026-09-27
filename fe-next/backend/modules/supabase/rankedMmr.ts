/**
 * Ranked MMR Module
 * ELO-based MMR calculations and updates for ranked games.
 *
 * Uses proper ELO rating from shared/utils/eloRating for calculations,
 * then persists via batch_update_ranked_mmr RPC for profiles table,
 * and updates player_ratings table for detailed tracking.
 */

import { getSupabase } from './client';
import {
  calculateMultiplayerRatings,
  type PlayerRating,
  DEFAULT_RATING,
  DEFAULT_RD,
} from '@/shared/utils/eloRating';

import logger from '../../utils/logger';

export interface RankedParticipant {
  playerId: string;
  placement: number;
  score?: number;
  currentMmr?: number;
  peakMmr?: number;
  /** Current rating deviation (uncertainty) */
  rd?: number;
  /** Number of ranked games played */
  gamesPlayed?: number;
  /** Cumulative wins before this game (used to increment wins column) */
  priorWins?: number;
}

export interface MmdDelta {
  oldMmr: number;
  newMmr: number;
  delta: number;
}

/**
 * Update MMR for ranked game participants using ELO calculation.
 * Updates both profiles.ranked_mmr (via batch RPC) and player_ratings table.
 * Returns a map of playerId → MMR delta info for surfacing in post-game UI.
 */
export async function updateRankedMmr(participants: RankedParticipant[]): Promise<Map<string, MmdDelta>> {
  const client = getSupabase();
  const result = new Map<string, MmdDelta>();
  if (!client || participants.length === 0) return result;

  // Build player rating objects for ELO calculation
  const playerInputs = participants.map(p => ({
    id: p.playerId,
    placement: p.placement,
    rating: {
      rating: p.currentMmr || DEFAULT_RATING,
      rd: p.rd || DEFAULT_RD,
      gamesPlayed: p.gamesPlayed || 0,
    } as PlayerRating,
  }));

  // Calculate new ratings using proper ELO
  const newRatings = calculateMultiplayerRatings(playerInputs);

  // Build batch update for profiles.ranked_mmr (backward compat)
  const participantUpdates = participants.map(participant => {
    const newRating = newRatings.get(participant.playerId);
    const currentMmr = participant.currentMmr || DEFAULT_RATING;
    const peakMmr = participant.peakMmr || currentMmr;
    const newMmr = newRating ? newRating.rating : currentMmr;

    // Record delta for post-game display
    result.set(participant.playerId, {
      oldMmr: currentMmr,
      newMmr,
      delta: newMmr - currentMmr,
    });

    return {
      player_id: participant.playerId,
      new_mmr: newMmr,
      new_peak_mmr: Math.max(newMmr, peakMmr),
    };
  });

  try {
    // Phase 1: Batch update profiles.ranked_mmr via RPC
    const { data, error } = await client.rpc('batch_update_ranked_mmr', {
      p_participants: participantUpdates,
    });

    if (error) {
      logger.error('SUPABASE', `Error in batch MMR update: ${error.message}`);
    } else {
      logger.debug('SUPABASE', `Batch updated MMR for ${data} participants`);
    }

    // Phase 2: Upsert player_ratings table for detailed ELO tracking
    const ratingUpserts = participants.map(p => {
      const newRating = newRatings.get(p.playerId);
      if (!newRating) return null;

      const isWin = p.placement === 1;
      return client
        .from('player_ratings')
        .upsert(
          {
            user_id: p.playerId,
            rating: newRating.rating,
            rating_deviation: newRating.rd,
            games_played: newRating.gamesPlayed,
            wins: isWin ? (p.priorWins ?? 0) + 1 : undefined,
            peak_rating: Math.max(newRating.rating, p.peakMmr || DEFAULT_RATING),
            last_game_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id', ignoreDuplicates: false }
        );
    });

    const validUpserts = ratingUpserts.filter((u): u is NonNullable<typeof u> => u !== null);
    if (validUpserts.length > 0) {
      const results = await Promise.allSettled(validUpserts.map(u => u.then()));
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        logger.error('SUPABASE', `${failures.length} player_ratings upsert(s) failed`);
      }
    }

    // Log rating changes for debugging
    for (const p of participants) {
      const newRating = newRatings.get(p.playerId);
      if (newRating) {
        const oldMmr = p.currentMmr || DEFAULT_RATING;
        const change = newRating.rating - oldMmr;
        logger.info('RANKED', `Player ${p.playerId}: ${oldMmr} -> ${newRating.rating} (${change >= 0 ? '+' : ''}${change}) [placement: ${p.placement}]`);
      }
    }
  } catch (error) {
    logger.error('SUPABASE', 'Error updating ranked MMR', error);
  }
  return result;
}

export interface RankedBaseline {
  currentMmr: number;
  peakMmr: number;
  rd: number;
  gamesPlayed: number;
  priorWins: number;
}

/**
 * Batch-fetch existing MMR baselines for a set of player IDs (authUserIds).
 * Returns a Map keyed by user_id. Players without a row are omitted —
 * callers should fall back to DEFAULT_RATING / DEFAULT_RD / 0 gamesPlayed.
 */
export async function fetchRankedBaselines(
  playerIds: string[]
): Promise<Map<string, RankedBaseline>> {
  const result = new Map<string, RankedBaseline>();
  const client = getSupabase();
  if (!client || playerIds.length === 0) return result;

  try {
    const { data, error } = await client
      .from('player_ratings')
      .select('user_id, rating, rating_deviation, games_played, peak_rating, wins')
      .in('user_id', playerIds);

    if (error) {
      logger.error('SUPABASE', `fetchRankedBaselines error: ${error.message}`);
      return result;
    }

    for (const row of data || []) {
      result.set(row.user_id as string, {
        currentMmr: (row.rating as number) ?? DEFAULT_RATING,
        peakMmr: (row.peak_rating as number) ?? (row.rating as number) ?? DEFAULT_RATING,
        rd: (row.rating_deviation as number) ?? DEFAULT_RD,
        gamesPlayed: (row.games_played as number) ?? 0,
        priorWins: (row.wins as number) ?? 0,
      });
    }
  } catch (error) {
    logger.error('SUPABASE', 'fetchRankedBaselines threw', error);
  }

  return result;
}

