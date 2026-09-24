/**
 * SERVER-ONLY. Word Tower coins are the app's coins: the balance lives in
 * `profiles.total_coins` (the same wallet Daily, Adventure milestones, duels
 * and ads pay into) and moves only through the `sync_coins` RPC, whose
 * non-negative guard is the overdraft check. The estate row no longer holds a
 * balance — see estateServer (`loadEstate` folds any legacy column coins in).
 */
import type { Db } from './estateServer';

export type WalletResult = { ok: true; balance: number } | { ok: false; reason: string };

export interface Wallet {
  balance(playerId: string): Promise<number>;
  /** Signed delta; a debit that would go negative is refused, never clamped. */
  apply(playerId: string, delta: number, reason: string): Promise<WalletResult>;
}

type SyncRow = { success: boolean; new_balance: number; error_message: string | null };

export function dbWallet(db: Db): Wallet {
  return {
    async balance(playerId) {
      const { data, error } = await db.from('profiles').select('total_coins').eq('id', playerId).maybeSingle();
      if (error) throw error;
      return Math.max(0, Number((data as { total_coins?: number } | null)?.total_coins) || 0);
    },
    async apply(playerId, delta, reason) {
      const { data, error } = await db.rpc('sync_coins', { p_user_id: playerId, p_amount: Math.trunc(delta), p_reason: reason, p_metadata: {} });
      if (error) return { ok: false, reason: error.message };
      const row = (data as SyncRow[] | null)?.[0];
      return row?.success ? { ok: true, balance: row.new_balance } : { ok: false, reason: row?.error_message || 'sync_coins failed' };
    },
  };
}
