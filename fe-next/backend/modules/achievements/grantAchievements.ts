import { achievementsForCount, type CountLadder } from './progressionAchievements';

export interface RpcClient {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

const defaultOnError = (message: string) => {
  console.error('[ACHIEVEMENT] grant failed:', message);
};

/**
 * Grants achievements through the service-role `grant_achievements` RPC (atomic,
 * idempotent). Returns the keys that were new. Never throws: an achievement must not
 * fail the action that earned it, but the failure is always reported.
 */
export async function grantAchievements(
  client: RpcClient | null | undefined,
  userId: string | null | undefined,
  keys: readonly string[],
  onError: (message: string) => void = defaultOnError,
): Promise<string[]> {
  if (!client || !userId || keys.length === 0) return [];
  try {
    const { data, error } = await client.rpc('grant_achievements', { p_user_id: userId, p_keys: [...keys] });
    if (error) {
      onError(error.message);
      return [];
    }
    return Array.isArray(data) ? (data as string[]) : [];
  } catch (err) {
    onError(err instanceof Error ? err.message : String(err));
    return [];
  }
}

export function grantCountLadder(
  client: RpcClient | null | undefined,
  userId: string | null | undefined,
  ladder: CountLadder,
  count: number,
  onError?: (message: string) => void,
): Promise<string[]> {
  return grantAchievements(client, userId, achievementsForCount(ladder, count), onError);
}

/** A server write just beat the player's previous best: count it toward RECORD_FIRST / RECORD_10. */
export async function recordPersonalBest(
  client: RpcClient | null | undefined,
  userId: string | null | undefined,
  onError: (message: string) => void = defaultOnError,
): Promise<string[]> {
  if (!client || !userId) return [];
  try {
    const { data, error } = await client.rpc('record_personal_best', { p_user_id: userId });
    if (error) {
      onError(error.message);
      return [];
    }
    return Array.isArray(data) ? (data as string[]) : [];
  } catch (err) {
    onError(err instanceof Error ? err.message : String(err));
    return [];
  }
}
