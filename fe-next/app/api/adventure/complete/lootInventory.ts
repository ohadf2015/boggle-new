/**
 * Loot inventory persistence for POST /api/adventure/complete.
 * Split from route.ts. Called from inside `after()` so response is already sent.
 *
 * Gold drops are filtered out here — gold is tracked on player_progression,
 * not player_inventory.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { LootDrop } from '@/lib/adventure/lootGenerator';

const LOOT_CATEGORY: Record<string, string> = {
  runeFragment: 'rune',
  loreScroll: 'scroll',
  bossTrophy: 'trophy',
  goldenQuill: 'relic',
  worldEssence: 'relic',
  ancientRelic: 'relic',
  cosmicShard: 'relic',
};

function resolveItemId(dropType: string, world: number, level: number): string {
  switch (dropType) {
    case 'runeFragment': return 'rune-fragment';
    case 'loreScroll': return `lore-scroll-w${world}-l${level}`;
    case 'bossTrophy': return `boss-trophy-w${world}`;
    case 'worldEssence': return `world-essence-w${world}`;
    case 'ancientRelic': return `ancient-relic-w${world}`;
    case 'cosmicShard': return 'cosmic-shard';
    case 'goldenQuill': return 'golden-quill';
    default: return dropType;
  }
}

/**
 * Upsert collectible loot drops into player_inventory.
 * Swallows errors — callers run this in a fire-and-forget `after()` block.
 */
export async function persistLootToInventory(
  supabase: SupabaseClient,
  userId: string,
  world: number,
  level: number,
  lootDrops: LootDrop[],
): Promise<void> {
  try {
    const collectibleDrops = lootDrops.filter((d) => d.type !== 'gold');
    if (collectibleDrops.length === 0) return;

    const inventoryPayloads = collectibleDrops.map((drop) => ({
      user_id: userId,
      item_id: resolveItemId(drop.type, world, level),
      item_type: drop.type,
      category: LOOT_CATEGORY[drop.type] ?? 'relic',
      rarity: drop.rarity,
      quantity: drop.quantity,
      source_world: world,
      source_level: level,
    }));

    const { error } = await supabase
      .from('player_inventory')
      .upsert(inventoryPayloads, { onConflict: 'user_id,item_id' });

    if (error) {
      console.error('[ADVENTURE COMPLETE API] Inventory upsert error:', error);
    }
  } catch (err) {
    console.error('[ADVENTURE COMPLETE API] Inventory persistence failed:', err);
  }
}
