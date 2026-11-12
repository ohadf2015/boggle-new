'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Paintbrush } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { RARITY_TOKENS } from '@/lib/avatar/rarity';
import { COSMETICS, type CosmeticCategory } from '@/lib/cosmetics';
import { RarityChip } from '@/components/progression/RarityChip';
import { EQUIPPED_KEY, PURCHASED_KEY, announceEquipped, syncCosmeticsToSupabase } from '@/hooks/useCosmetics';
import { getJsonFromLocalStorage, saveJsonToLocalStorage } from '@/utils/storageHelpers';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { ChestCosmeticDrop, ChestDropSource } from '@/lib/avatar/chestDrops';

interface ChestCosmeticPrizeProps {
  drop: ChestCosmeticDrop;
  source: ChestDropSource;
}

type Equipped = Partial<Record<CosmeticCategory, string>>;

/**
 * A tile skin or board theme out of a chest: a swatch of the look, its rarity,
 * "New!", and one button that puts it on right away. The server already added
 * it to the player's owned items; this device learns it here too, so the
 * profile's collection shows it unlocked without a reload.
 */
export default function ChestCosmeticPrize({ drop, source }: ChestCosmeticPrizeProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const token = RARITY_TOKENS[drop.rarity];
  const cosmetic = COSMETICS.find((c) => c.id === drop.cosmeticId);
  const [inUse, setInUse] = useState(
    () => getJsonFromLocalStorage<Equipped>(EQUIPPED_KEY, {})[drop.cosmeticCategory] === drop.cosmeticId,
  );
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackGrowthEvent('chest_cosmetic_shown', { source, cosmetic: drop.cosmeticId, rarity: drop.rarity });
    const owned = getJsonFromLocalStorage<string[]>(PURCHASED_KEY, []);
    if (!owned.includes(drop.cosmeticId)) saveJsonToLocalStorage(PURCHASED_KEY, [...owned, drop.cosmeticId]);
  }, [drop, source]);

  const putOn = () => {
    const next: Equipped = { ...getJsonFromLocalStorage<Equipped>(EQUIPPED_KEY, {}), [drop.cosmeticCategory]: drop.cosmeticId };
    saveJsonToLocalStorage(EQUIPPED_KEY, next);
    announceEquipped();
    if (user?.id) syncCosmeticsToSupabase(user.id, next);
    setInUse(true);
    trackGrowthEvent('chest_cosmetic_equipped', { source, cosmetic: drop.cosmeticId });
  };

  if (!cosmetic) return null;
  const kindLabel = t(drop.cosmeticCategory === 'tileSkin' ? 'avatarChest.tileSkin' : 'avatarChest.boardTheme');

  return (
    <div
      data-testid="chest-cosmetic-prize"
      data-rarity={drop.rarity}
      className="relative w-full flex items-center gap-3 rounded-2xl border-3 border-neo-black bg-neo-navy p-2.5 pe-3 text-start"
      style={{ boxShadow: `inset 0 0 0 2px ${token.hex}, 4px 4px 0 #000` }}
    >
      <div className="relative shrink-0">
        <div aria-hidden className={`w-[76px] h-[76px] rounded-xl bg-neo-navy-light flex items-center justify-center ${cosmetic.preview}`}>
          <span className="font-neo-display font-black text-2xl text-neo-white drop-shadow-[2px_2px_0_black]">Aa</span>
        </div>
        <span className="absolute -top-2 -start-2 px-1.5 py-0.5 rounded-md border-2 border-black bg-neo-lime text-neo-black text-[10px] font-black uppercase tracking-wider -rotate-6">
          {t('avatarChest.new')}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] leading-none">
          <RarityChip rarity={drop.rarity} size="xs" />
          <span className="text-neo-white/60 truncate">· {kindLabel}</span>
        </p>
        <p data-testid="chest-cosmetic-name" className="mt-1 font-neo-display font-black text-lg leading-tight text-neo-white truncate">
          {t(cosmetic.name)}
        </p>
        <button
          type="button"
          data-testid="chest-cosmetic-use"
          onClick={putOn}
          disabled={inUse}
          className="mt-1.5 inline-flex items-center gap-1 h-8 px-2.5 rounded-neo border-2 border-black text-neo-black text-xs font-black uppercase tracking-wide shadow-hard-sm active:translate-x-px active:translate-y-px active:shadow-none transition-transform disabled:shadow-none disabled:opacity-90"
          style={{ background: token.hex }}
        >
          {inUse ? <Check className="w-3.5 h-3.5" aria-hidden="true" /> : <Paintbrush className="w-3.5 h-3.5" aria-hidden="true" />}
          {t(inUse ? 'avatarChest.inUse' : 'avatarChest.useIt')}
        </button>
      </div>
    </div>
  );
}
