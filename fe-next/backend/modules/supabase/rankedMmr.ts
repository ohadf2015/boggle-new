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

const logger = require('../../utils/logger');

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
}

/**
 * Update MMR for ranked game participants using ELO calculation.
 * Updates both profiles.ranked_mmr (via batch RPC) and player_ratings table.
 */
export async function updateRankedMmr(participants: RankedParticipant[]): Promise<void> {
  const client = getSupabase();
  if (!client || participants.length === 0) return;

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
            wins: isWin ? (p.gamesPlayed || 0) + 1 : undefined,
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
}

// CommonJS exports for backward compatibility
module.exports = {
  updateRankedMmr,
};
