/**
 * Server side of chest part drops: roll, record, grant — once per chest.
 *
 * Order matters (rules/60 Class 4: no silent half-grants):
 *   1. an existing ledger row for (player, source, key) → answer with it (retry);
 *   2. roll from the player's current parts + level (lib/avatar/chestDrops);
 *   3. insert the ledger row — its primary key is the double-grant guard;
 *   4. append the part to profiles.premium_avatar_parts under the snapshot
 *      lock (re-read + retry on a concurrent write), or pay the duplicate coins.
 * If step 4 fails the ledger row is removed so a retry can grant again.
 *
 * Never throws: a chest still pays its coins when the part side is down
 * (e.g. the ledger table not migrated yet); the failure is logged loudly.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { awardCoinsServer } from '@/backend/services/economy/awardCoins';
import logger from '@/utils/logger';
import { lockOnPartsSnapshot } from './partsSnapshotLock';
import { rollChestPart, type ChestDropRarity, type ChestDropSource, type ChestPartCategory, type ChestPartDrop } from './chestDrops';

const LEDGER = 'avatar_part_drops';
const LOCK_RETRIES = 3;

interface LedgerRow {
  part_key: string;
  rarity: ChestDropRarity;
  duplicate: boolean;
  refund_coins: number;
}

function fromRow(row: LedgerRow): ChestPartDrop {
  const sep = row.part_key.indexOf(':');
  return {
    key: row.part_key,
    category: row.part_key.slice(0, sep) as ChestPartCategory,
    partId: row.part_key.slice(sep + 1),
    rarity: row.rarity,
    duplicate: row.duplicate,
    refundCoins: row.refund_coins,
  };
}

async function readLedger(supabase: SupabaseClient, playerId: string, source: ChestDropSource, sourceKey: string): Promise<LedgerRow | null> {
  const { data, error } = await supabase
    .from(LEDGER)
    .select('part_key, rarity, duplicate, refund_coins')
    .eq('player_id', playerId)
    .eq('source', source)
    .eq('source_key', sourceKey)
    .limit(1);
  if (error) throw new Error(`${LEDGER} read: ${error.message}`);
  return (data?.[0] as LedgerRow | undefined) ?? null;
}

async function readProfile(supabase: SupabaseClient, playerId: string): Promise<{ parts: string[]; level: number | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('premium_avatar_parts, current_level')
    .eq('id', playerId)
    .single();
  if (error || !data) throw new Error(`profiles read: ${error?.message ?? 'no row'}`);
  const parts = Array.isArray(data.premium_avatar_parts) ? (data.premium_avatar_parts as string[]) : [];
  return { parts, level: typeof data.current_level === 'number' ? data.current_level : null };
}

/** Append one key under the optimistic lock; re-read and retry if someone else wrote first. */
async function appendPart(supabase: SupabaseClient, playerId: string, key: string, firstSnapshot: string[]): Promise<boolean> {
  let snapshot = firstSnapshot;
  for (let attempt = 0; attempt < LOCK_RETRIES; attempt++) {
    if (snapshot.includes(key)) return true;
    const { data, error } = await lockOnPartsSnapshot(
      supabase
        .from('profiles')
        .update({ premium_avatar_parts: [...snapshot, key], updated_at: new Date().toISOString() })
        .eq('id', playerId),
      snapshot,
    ).select('id');
    if (error) throw new Error(`profiles parts update: ${error.message}`);
    if (data && data.length > 0) return true;
    snapshot = (await readProfile(supabase, playerId)).parts;
  }
  return false;
}

export interface GrantChestPartArgs {
  supabase: SupabaseClient;
  playerId: string;
  source: ChestDropSource;
  /** One chest = one key: the claim date, or the weekly cycle start. */
  sourceKey: string;
}

export interface GrantChestPartResult {
  drop: ChestPartDrop;
  /** False when this chest's part was already granted earlier (a retry). */
  fresh: boolean;
}

export async function grantChestPart({ supabase, playerId, source, sourceKey }: GrantChestPartArgs): Promise<GrantChestPartResult | null> {
  try {
    const existing = await readLedger(supabase, playerId, source, sourceKey);
    if (existing) return { drop: fromRow(existing), fresh: false };

    const profile = await readProfile(supabase, playerId);
    const drop = rollChestPart({ source, seed: `${playerId}|${source}|${sourceKey}`, ownedKeys: profile.parts, level: profile.level });

    const { error: insertError } = await supabase.from(LEDGER).insert({
      player_id: playerId,
      source,
      source_key: sourceKey,
      part_key: drop.key,
      rarity: drop.rarity,
      duplicate: drop.duplicate,
      refund_coins: drop.refundCoins,
    });
    if (insertError) {
      if ((insertError as { code?: string }).code === '23505') {
        const row = await readLedger(supabase, playerId, source, sourceKey);
        return row ? { drop: fromRow(row), fresh: false } : null;
      }
      throw new Error(`${LEDGER} insert: ${insertError.message}`);
    }

    const granted = drop.duplicate
      ? (await awardCoinsServer(playerId, drop.refundCoins, 'avatar_part_duplicate', { source, part: drop.key, rarity: drop.rarity })).success
      : await appendPart(supabase, playerId, drop.key, profile.parts);

    if (!granted) {
      // Undo the ledger row so a retry can grant; never leave "granted" with nothing given.
      const { error: undoError } = await supabase
        .from(LEDGER)
        .delete()
        .eq('player_id', playerId)
        .eq('source', source)
        .eq('source_key', sourceKey);
      logger.error('AVATAR_CHEST', `grant failed for ${playerId} ${source}/${sourceKey} (${drop.key})${undoError ? `; undo failed: ${undoError.message}` : ''}`);
      return null;
    }
    logger.info('AVATAR_CHEST', `${source}/${sourceKey}: ${drop.duplicate ? `duplicate ${drop.key} +${drop.refundCoins} coins` : `granted ${drop.key}`} (${drop.rarity}) to ${playerId}`);
    return { drop, fresh: true };
  } catch (error) {
    logger.error('AVATAR_CHEST', `chest part ${source}/${sourceKey} for ${playerId} failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}
