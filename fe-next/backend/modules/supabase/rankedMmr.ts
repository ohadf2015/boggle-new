/**
 * Ranked MMR Module
 * MMR calculations and updates for ranked games
 */

import { getSupabase } from './client';

const logger = require('../../utils/logger');

export interface RankedParticipant {
  playerId: string;
  placement: number;
  currentMmr?: number;
  peakMmr?: number;
}

/**
 * Update MMR for ranked game participants
 * Uses batch RPC to update all participants in a single database call
 */
export async function updateRankedMmr(participants: RankedParticipant[]): Promise<void> {
  const client = getSupabase();
  if (!client || participants.length === 0) return;

  // Calculate MMR changes for all participants
  const totalPlayers = participants.length;

  const participantUpdates = participants.map(participant => {
    let mmrChange = 0;

    if (participant.placement === 1) {
      mmrChange = 25;
    } else if (participant.placement === 2) {
      mmrChange = totalPlayers > 2 ? 10 : -15;
    } else if (participant.placement === 3) {
      mmrChange = totalPlayers > 3 ? 0 : -20;
    } else {
      mmrChange = -20;
    }

    const currentMmr = participant.currentMmr || 1000;
    const newMmr = Math.max(0, currentMmr + mmrChange);
    const peakMmr = participant.peakMmr || currentMmr;

    return {
      player_id: participant.playerId,
      new_mmr: newMmr,
      new_peak_mmr: Math.max(newMmr, peakMmr)
    };
  });

  try {
    // Single batch update instead of N individual queries
    const { data, error } = await client.rpc('batch_update_ranked_mmr', {
      p_participants: participantUpdates
    });

    if (error) {
      logger.error('SUPABASE', `Error in batch MMR update: ${error.message}`);
    } else {
      logger.debug('SUPABASE', `Batch updated MMR for ${data} participants`);
    }
  } catch (error) {
    logger.error('SUPABASE', 'Error calling batch_update_ranked_mmr RPC', error);
  }
}

// CommonJS exports for backward compatibility
module.exports = {
  updateRankedMmr,
};
