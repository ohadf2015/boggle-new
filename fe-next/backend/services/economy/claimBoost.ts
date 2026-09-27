import { getSupabase } from '../../modules/supabase/client';
import { signBoostToken } from '../../utils/boostToken';
import { isBoostType, type BoostType, type ClaimBoostResult } from '@/shared/types/boosts';
import logger from '../../utils/logger';

type RpcRow = { success: boolean; remaining: number; error_message: string | null };

export async function claimBoostServer(
  playerId: string,
  sessionId: string,
  boostType: BoostType,
): Promise<ClaimBoostResult> {
  if (!isBoostType(boostType)) {
    return { success: false, error: 'invalid_type' };
  }
  const supabase = getSupabase();
  if (!supabase) {
    logger.warn('BOOSTS', `claim refused: supabase unavailable (player=${playerId})`);
    return { success: false, error: 'no_supabase' };
  }
  try {
    const { data, error } = await supabase.rpc('claim_boost', {
      p_user_id: playerId,
      p_session_id: sessionId,
      p_boost_type: boostType,
    });
    if (error) {
      logger.error('BOOSTS', `claim_boost rpc failed: ${error.message}`);
      return { success: false, error: 'rpc_failed' };
    }
    const row = (data as RpcRow[] | null)?.[0];
    if (!row) {
      logger.error('BOOSTS', `claim_boost returned no row (player=${playerId})`);
      return { success: false, error: 'rpc_failed' };
    }
    if (!row.success) {
      return { success: false, error: (row.error_message as ClaimBoostResult['error']) ?? 'rpc_failed', remaining: row.remaining };
    }
    const token = signBoostToken(sessionId, boostType);
    logger.info('BOOSTS', `Claimed ${boostType} for ${playerId} (sess=${sessionId}, remaining=${row.remaining})`);
    return { success: true, remaining: row.remaining, token };
  } catch (err) {
    logger.error('BOOSTS', `claim_boost threw: ${(err as Error).message}`);
    return { success: false, error: 'rpc_failed' };
  }
}
