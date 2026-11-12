'use client';

import ChestPartPrize from './ChestPartPrize';
import ChestCosmeticPrize from './ChestCosmeticPrize';
import { isChestCosmeticDrop, isChestPartDrop, type ChestDropSource } from '@/lib/avatar/chestDrops';

/** Whatever item a chest held: an avatar part, or a tile skin / board theme. Nothing for anything else. */
export default function ChestItemPrize({ drop, source, autoReveal }: { drop: unknown; source: ChestDropSource; autoReveal?: boolean }) {
  if (isChestCosmeticDrop(drop)) return <ChestCosmeticPrize drop={drop} source={source} />;
  if (isChestPartDrop(drop)) return <ChestPartPrize drop={drop} source={source} autoReveal={autoReveal} />;
  return null;
}
