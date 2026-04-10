/**
 * LootRevealAnimation Component
 *
 * Staggered reveal animation for loot drops earned at level completion.
 * Each item pops in with a spring animation and glow effect.
 * Uses AdaptiveMotion — respects reduced-motion preferences.
 */

'use client';

import { memo } from 'react';
import Image from 'next/image';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

// ==============================================
// TYPES
// ==============================================

export interface LootDrop {
  type: string;
  rarity: 'common' | 'rare' | 'legendary' | string;
  label?: string;
  quantity?: number;
}

export interface LootRevealAnimationProps {
  drops: LootDrop[];
  /** Delay before first item appears (ms, default 800) */
  baseDelay?: number;
  className?: string;
}

// ==============================================
// CONSTANTS
// ==============================================

const LOOT_DROP_IMAGES: Record<string, string> = {
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

const LOOT_TRANSLATION_KEYS: Record<string, string> = {
  gold: 'common.gold',
  runeFragment: 'adventure.runes.fragment',
  loreScroll: 'adventure.loot.loreScroll',
  bossTrophy: 'adventure.loot.bossTrophy',
  goldenQuill: 'adventure.loot.goldenQuill',
  worldEssence: 'adventure.loot.worldEssence',
  ancientRelic: 'adventure.loot.ancientRelic',
  cosmicShard: 'adventure.loot.cosmicShard',
  bonusGold: 'adventure.loot.bonusGold',
  xp: 'common.xp',
};

function getRarityClasses(rarity: string): string {
  if (rarity === 'legendary') {
    return 'bg-neo-yellow/20 border-neo-yellow text-neo-yellow';
  }
  if (rarity === 'rare') {
    return 'bg-neo-purple/20 border-neo-purple text-neo-purple';
  }
  return 'bg-neo-cyan/20 border-neo-cyan/50 text-neo-cyan';
}

// ==============================================
// COMPONENT
// ==============================================

export const LootRevealAnimation = memo<LootRevealAnimationProps>(({
  drops,
  baseDelay = 0.8,
  className,
}) => {
  const { t } = useLanguage();

  if (drops.length === 0) return null;

  const fragmentCount = drops
    .filter(d => d.type === 'runeFragment')
    .reduce((sum, d) => sum + (d.quantity ?? 1), 0);

  return (
    <AdaptiveAnimatePresence>
      {fragmentCount > 0 && (
        <AdaptiveMotion.div
          key="rune-fragment-callout"
          data-testid="loot-rune-fragment-callout"
          initial={{ opacity: 0, y: -8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: baseDelay - 0.05, type: 'spring', stiffness: 320, damping: 22 }}
          className={cn(
            'mx-auto mb-3 flex items-center justify-center gap-3',
            'px-4 py-2 rounded-neo border-3 border-neo-purple',
            'bg-neo-purple/25 shadow-hard-sm max-w-sm w-full'
          )}
        >
          <Image
            src={LOOT_DROP_IMAGES.runeFragment}
            alt="rune fragment"
            width={32}
            height={32}
            className="shrink-0"
          />
          <div className="flex flex-col leading-tight text-start">
            <span className="text-[10px] font-black uppercase tracking-wide text-neo-purple-light">
              {t('adventure.runes.fragmentEarned')}
            </span>
            <span className="text-base font-black text-neo-white">
              +{fragmentCount} {t('adventure.runes.fragment')}
            </span>
          </div>
        </AdaptiveMotion.div>
      )}
      <AdaptiveMotion.div
        data-testid="loot-reveal-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: baseDelay - 0.1 }}
        className={cn('flex flex-wrap gap-2 justify-center', className)}
      >
        {drops.map((drop, i) => {
          const imgSrc = LOOT_DROP_IMAGES[drop.type];
          const rarityClasses = getRarityClasses(drop.rarity);

          return (
            <AdaptiveMotion.div
              key={`loot-${i}`}
              data-testid="loot-item"
              initial={{ scale: 0, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{
                delay: baseDelay + i * 0.12,
                type: 'spring',
                stiffness: 350,
                damping: 18,
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5',
                'rounded-neo border-2 text-xs font-bold',
                'shadow-hard-sm',
                rarityClasses
              )}
            >
              {imgSrc && (
                <Image
                  src={imgSrc}
                  alt={drop.label || drop.type}
                  width={20}
                  height={20}
                  className="shrink-0"
                />
              )}
              {drop.label || (LOOT_TRANSLATION_KEYS[drop.type] ? t(LOOT_TRANSLATION_KEYS[drop.type]) : drop.type)}
            </AdaptiveMotion.div>
          );
        })}
      </AdaptiveMotion.div>
    </AdaptiveAnimatePresence>
  );
});

LootRevealAnimation.displayName = 'LootRevealAnimation';

export default LootRevealAnimation;
