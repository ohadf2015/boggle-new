'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import type { LootDrop, LootRarity } from '@/types/adventure';

type ChestTier = 'wooden' | 'silver' | 'golden';

interface LootChestRevealProps {
  isOpen: boolean;
  drops: LootDrop[];
  onComplete: () => void;
  /** Chest tier determines which chest graphic to show */
  chestTier?: ChestTier;
}

// F12 audit (2026-05-01): tightened from 500→200ms so 4-drop reveal completes
// in ~800ms (well under the 1500ms target). Reframes pacing as abundance, not grind.
const STAGGER_MS = 200;

const GOLD_DROP_TYPES = new Set(['gold', 'bonusGold']);

const RARITY_GLOW: Record<LootRarity, string> = {
  common: 'shadow-hard-sm',
  rare: 'shadow-[0_0_12px_var(--color-neo-cyan)]',
  epic: 'shadow-[0_0_16px_var(--color-neo-pink)]',
  legendary: 'shadow-[0_0_20px_var(--color-neo-yellow)] ring-2 ring-neo-yellow/50',
};

const CHEST_IMAGES: Record<ChestTier, { closed: string; open: string }> = {
  wooden: {
    closed: '/images/adventure/loot/chest-wooden-closed.webp',
    open: '/images/adventure/loot/chest-wooden-open.webp',
  },
  silver: {
    closed: '/images/adventure/loot/chest-silver-closed.webp',
    open: '/images/adventure/loot/chest-silver-open.webp',
  },
  golden: {
    closed: '/images/adventure/loot/chest-golden-closed.webp',
    open: '/images/adventure/loot/chest-golden-open.webp',
  },
};

const DROP_IMAGES: Record<string, string> = {
  gold: '/images/adventure/loot/loot-gold-coins.webp',
  xp: '/images/adventure/loot/loot-xp-star.webp',
  bonusGold: '/images/adventure/loot/loot-bonus-gold.webp',
  bossTrophy: '/images/adventure/loot/loot-boss-trophy.webp',
  runeFragment: '/images/runes/rune-goldvein.webp',
  loreScroll: '/images/adventure/floating-scroll.webp',
  goldenQuill: '/images/adventure/loot/loot-golden-quill.webp',
  worldEssence: '/images/adventure/loot/loot-world-essence.webp',
  ancientRelic: '/images/adventure/loot/loot-ancient-relic.webp',
  cosmicShard: '/images/adventure/loot/loot-cosmic-shard.webp',
};

const DROP_NAME_KEYS: Record<string, string> = {
  gold: 'adventure.loot.gold',
  xp: 'adventure.loot.xp',
  bonusGold: 'adventure.loot.bonusGold',
  runeFragment: 'adventure.loot.runeFragment',
  loreScroll: 'adventure.loot.loreScroll',
  bossTrophy: 'adventure.loot.bossTrophy',
  goldenQuill: 'adventure.loot.goldenQuill',
  worldEssence: 'adventure.loot.worldEssence',
  ancientRelic: 'adventure.loot.ancientRelic',
  cosmicShard: 'adventure.loot.cosmicShard',
};

const CHEST_TIER_BORDER: Record<ChestTier, string> = {
  wooden: 'border-amber-700',
  silver: 'border-slate-400',
  golden: 'border-neo-yellow',
};

export default function LootChestReveal({
  isOpen,
  drops,
  onComplete,
  chestTier = 'wooden',
}: LootChestRevealProps) {
  const { t } = useLanguage();
  const [opened, setOpened] = useState(false);
  const [revealedCount, setRevealedCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setOpened(false);
      setRevealedCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!opened || revealedCount >= drops.length) return;
    const timer = setTimeout(() => setRevealedCount(c => c + 1), STAGGER_MS);
    return () => clearTimeout(timer);
  }, [opened, revealedCount, drops.length]);

  const handleChestClick = useCallback(() => {
    if (!opened) setOpened(true);
  }, [opened]);

  if (!isOpen || drops.length === 0) return null;

  const allRevealed = revealedCount >= drops.length;
  const chestAssets = CHEST_IMAGES[chestTier];

  // F12 audit (2026-05-01): bold total reframes loot as abundance.
  const totalGold = drops
    .filter(d => GOLD_DROP_TYPES.has(d.type))
    .reduce((sum, d) => sum + (d.quantity ?? 1), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <AdaptiveMotion.div
        className="flex flex-col items-center gap-6 p-8"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Chest */}
        <AdaptiveMotion.div
          data-testid="loot-chest"
          className="relative cursor-pointer"
          onClick={handleChestClick}
          whileTap={{ scale: 0.95 }}
          animate={opened ? { y: -10 } : {}}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <Image
            src={opened ? chestAssets.open : chestAssets.closed}
            alt={t('adventure.loot.chest')}
            width={160}
            height={160}
            className="drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
            priority
          />
          {!opened && (
            <p className="mt-2 text-center font-neo-display text-sm text-neo-white animate-pulse">
              {t('adventure.loot.tapToOpen')}
            </p>
          )}
        </AdaptiveMotion.div>

        {/* Drops */}
        <AdaptiveAnimatePresence>
          {opened && (
            <div className="flex flex-wrap justify-center gap-4">
              {drops.map((drop, i) => (
                i < revealedCount && (
                  <AdaptiveMotion.div
                    key={`${drop.type}-${i}`}
                    data-testid={`loot-drop-${drop.type}`}
                    className={`flex flex-col items-center rounded-neo border-3 border-black bg-neo-navy p-3 ${RARITY_GLOW[drop.rarity]}`}
                    initial={{ scale: 0, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  >
                    <Image
                      src={DROP_IMAGES[drop.type] || DROP_IMAGES.gold}
                      alt={t(DROP_NAME_KEYS[drop.type])}
                      width={56}
                      height={56}
                      className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
                    />
                    <span className="mt-1 font-neo-display text-lg text-neo-white">
                      {drop.quantity > 1 ? `×${drop.quantity}` : ''}
                    </span>
                    <span className="text-xs text-neo-white">
                      {t(DROP_NAME_KEYS[drop.type])}
                    </span>
                  </AdaptiveMotion.div>
                )
              ))}
            </div>
          )}
        </AdaptiveAnimatePresence>

        {/* F12 — bold total gold sum, only when there's gold to celebrate */}
        {allRevealed && opened && totalGold > 0 && (
          <AdaptiveMotion.div
            data-testid="loot-total-gold"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18 }}
            className="flex items-baseline gap-2 px-5 py-2 rounded-neo border-3 border-neo-yellow bg-neo-yellow/15 shadow-hard"
          >
            <span className="text-xs font-bold uppercase tracking-wide text-neo-yellow/80">
              {t('adventure.loot.total')}
            </span>
            <span className="font-neo-display text-3xl font-black text-neo-yellow tabular-nums">
              +{totalGold}
            </span>
          </AdaptiveMotion.div>
        )}

        {/* Continue */}
        {allRevealed && opened && (
          <AdaptiveMotion.button
            data-testid="loot-continue"
            className={`rounded-neo border-3 border-black bg-neo-yellow px-6 py-3 font-neo-display text-lg text-black shadow-hard active:shadow-hard-pressed ${CHEST_TIER_BORDER[chestTier]}`}
            onClick={onComplete}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.95 }}
          >
            {t('adventure.loot.continue')}
          </AdaptiveMotion.button>
        )}
      </AdaptiveMotion.div>
    </div>
  );
}
