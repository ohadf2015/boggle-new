'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Coins, Sparkles } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AvatarRenderer from '@/components/avatar/AvatarRenderer';
import { DEFAULT_AVATAR_CONFIG, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { getStoredCustomAvatar } from '@/utils/profileStorage';
import { RARITY_TOKENS } from '@/lib/avatar/rarity';
import { queryKeys } from '@/lib/queryKeys';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { trackGrowthEvent } from '@/utils/growthTracking';
import type { ChestDropSource, ChestPartDrop } from '@/lib/avatar/chestDrops';
import { chestDropToReveal, chestPartNameKey } from '@/lib/avatar/chestReveal';

const ConnectedUnlockReveal = dynamic(() => import('@/components/avatar/reveal/ConnectedUnlockReveal'), { ssr: false });

interface ChestPartPrizeProps {
  drop: ChestPartDrop;
  source: ChestDropSource;
  /** Open the full rarity reveal right away (first open, not a replay). */
  autoReveal?: boolean;
}

/**
 * The avatar part a chest held: the player's own avatar already wearing it,
 * its rarity (color + word), "New!" or the duplicate coins, and a button into
 * the full rarity reveal where they can equip it. A legendary pulls the full
 * reveal open on its own, because that moment should take the whole screen.
 */
export default function ChestPartPrize({ drop, source, autoReveal = false }: ChestPartPrizeProps) {
  const { t, language } = useLanguage();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const token = RARITY_TOKENS[drop.rarity];
  const [revealOpen, setRevealOpen] = useState(false);
  const tracked = useRef(false);

  const config = useMemo<CustomAvatarConfig>(() => {
    const own = (profile?.avatar_config as CustomAvatarConfig | null | undefined) ?? getStoredCustomAvatar() ?? DEFAULT_AVATAR_CONFIG;
    return { ...own, [drop.category]: drop.partId } as CustomAvatarConfig;
  }, [profile?.avatar_config, drop.category, drop.partId]);

  const name = t(`revealUnlock.parts.${drop.partId}`, t(chestPartNameKey(drop), t(`avatarBuilder.${drop.category === 'accessory' ? 'accessories' : drop.category}`)));

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackGrowthEvent('avatar_chest_part_shown', { source, part: drop.key, rarity: drop.rarity, duplicate: drop.duplicate });
    // The editor reads owned parts from this query: show the new part as owned right away.
    if (!drop.duplicate) void queryClient.invalidateQueries({ queryKey: queryKeys.avatar.premiumParts() });
  }, [drop, queryClient, source]);

  // A fresh legendary takes the whole screen once, as soon as the host allows it.
  const autoRevealed = useRef(false);
  useEffect(() => {
    if (!autoReveal || autoRevealed.current || drop.duplicate || drop.rarity !== 'legendary') return;
    autoRevealed.current = true;
    setRevealOpen(true);
  }, [autoReveal, drop]);

  const openReveal = useCallback(() => {
    trackGrowthEvent('avatar_chest_part_reveal_open', { source, part: drop.key, rarity: drop.rarity });
    setRevealOpen(true);
  }, [drop, source]);

  return (
    <div
      data-testid="chest-part-prize"
      data-rarity={drop.rarity}
      data-duplicate={drop.duplicate ? 'true' : 'false'}
      className="relative w-full flex items-center gap-3 rounded-2xl border-3 border-neo-black bg-neo-navy p-2.5 pe-3 text-start shadow-[4px_4px_0_black]"
      style={{ boxShadow: `inset 0 0 0 2px ${token.hex}, 4px 4px 0 #000` }}
    >
      <div className="relative shrink-0">
        <AvatarRenderer config={config} size={76} />
        {!drop.duplicate && (
          <span className="absolute -top-2 -start-2 px-1.5 py-0.5 rounded-md border-2 border-black bg-neo-lime text-neo-black text-[10px] font-black uppercase tracking-wider -rotate-6">
            {t('avatarChest.new')}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] leading-none">
          <span className="inline-block w-2.5 h-2.5 rotate-45 border-2 border-black" style={{ background: token.hex }} aria-hidden="true" />
          <span style={{ color: token.hex }}>{t(token.labelKey)}</span>
          <span className="text-neo-white/60 truncate">· {t('avatarChest.avatarPart')}</span>
        </p>
        <p data-testid="chest-part-name" className="mt-1 font-neo-display font-black text-lg leading-tight text-neo-white truncate">
          {name}
        </p>
        {drop.duplicate ? (
          <p data-testid="chest-part-duplicate" className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-neo-yellow">
            <Coins className="w-3.5 h-3.5" aria-hidden="true" />
            {t('avatarChest.duplicate', { coins: safeToLocaleString(drop.refundCoins, language) })}
          </p>
        ) : (
          <button
            type="button"
            data-testid="chest-part-see"
            onClick={openReveal}
            className="mt-1.5 inline-flex items-center gap-1 h-8 px-2.5 rounded-neo border-2 border-black text-neo-black text-xs font-black uppercase tracking-wide shadow-hard-sm active:translate-x-px active:translate-y-px active:shadow-none transition-transform"
            style={{ background: token.hex }}
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            {t('avatarChest.wearIt')}
          </button>
        )}
      </div>
      {revealOpen && (
        <ConnectedUnlockReveal reveal={chestDropToReveal(drop, source)} onClose={() => setRevealOpen(false)} />
      )}
    </div>
  );
}
