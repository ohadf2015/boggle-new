/**
 * Word Forge — Upgrade Shop Component
 *
 * Displays upgrade categories with tiered items, purchase buttons,
 * and visual icons. Inspired by Gold Miner / Motherload shop screens.
 */

'use client';

import { useState, useMemo } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import Image from 'next/image';
import { Coins, Lock, Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import {
  UPGRADE_CATEGORIES,
  getUpgradesByCategory,
  getUpgradeTier,
  getNextTierCost,
  canAffordUpgrade,
  purchaseUpgrade,
  type UpgradeCategory,
  type UpgradeState,
  type UpgradeDefinition,
} from '@/lib/adventure/upgradeConfig';
import { MascotWithEntrance } from '@/components/ui/Mascot';

export interface UpgradeShopProps {
  gold: number;
  upgrades: UpgradeState;
  currentWorld: number;
  onPurchase: (upgradeId: string, newState: UpgradeState, newGold: number) => void;
  className?: string;
}

export function UpgradeShop({
  gold,
  upgrades,
  currentWorld,
  onPurchase,
  className = '',
}: UpgradeShopProps) {
  const { t } = useLanguage();
  const { playUpgradePurchaseSound } = useSoundEffects();
  const [activeCategory, setActiveCategory] = useState<UpgradeCategory>('excavation');
  const [flashId, setFlashId] = useState<string | null>(null);

  // Show EVERY upgrade in the category — locked ones (unlockWorld > currentWorld) render as
  // greyed "Unlocks at World N" teasers so the shop reads full and gives the player goals,
  // instead of an near-empty modal early on. Buyable upgrades sort to the top.
  const categoryUpgrades = useMemo(() => {
    return getUpgradesByCategory(activeCategory)
      .map(u => ({ upgrade: u, isLocked: u.unlockWorld > currentWorld }))
      .sort((a, b) => Number(a.isLocked) - Number(b.isLocked));
  }, [activeCategory, currentWorld]);

  const handlePurchase = (upgradeId: string) => {
    const result = purchaseUpgrade(upgrades, upgradeId, gold);
    if (!result) return;
    setFlashId(upgradeId);
    setTimeout(() => setFlashId(null), 800);
    playUpgradePurchaseSound();
    onPurchase(upgradeId, result.state, result.gold);
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <MascotWithEntrance variant="shopkeeper" size="md" delay={0.2} clipBorder="none" />
        <div>
          <h2 className="font-neo-display font-bold text-xl">{t('adventure.shop.title')}</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <Coins className="w-4 h-4 text-neo-yellow" />
            <span className="font-neo-display font-bold text-neo-yellow">{gold.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {UPGRADE_CATEGORIES.map(cat => {
          const catCount = getUpgradesByCategory(cat.id).length;
          if (catCount === 0) return null;
          return (
            <button
              type="button"
              key={cat.id}
              data-testid={`category-${cat.id}`}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-neo border-3 font-neo-display font-bold text-sm whitespace-nowrap transition-all',
                activeCategory === cat.id
                  ? 'bg-neo-yellow text-neo-black border-neo-black shadow-hard-pressed'
                  : 'bg-neo-navy text-neo-white border-neo-black/50 shadow-hard hover:shadow-hard-pressed'
              )}
            >
              <span>{cat.icon}</span>
              <span>{t(cat.nameKey)}</span>
            </button>
          );
        })}
      </div>

      {/* Upgrade cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <AdaptiveAnimatePresence mode="popLayout">
          {categoryUpgrades.map(({ upgrade, isLocked }) => (
            <UpgradeCard
              key={upgrade.id}
              upgrade={upgrade}
              tier={getUpgradeTier(upgrades, upgrade.id)}
              nextCost={getNextTierCost(upgrades, upgrade.id)}
              canAfford={canAffordUpgrade(upgrades, upgrade.id, gold)}
              isFlashing={flashId === upgrade.id}
              isLocked={isLocked}
              onPurchase={handlePurchase}
              t={t}
            />
          ))}
        </AdaptiveAnimatePresence>
      </div>
    </div>
  );
}

// ==============================================
// UPGRADE CARD
// ==============================================

interface UpgradeCardProps {
  upgrade: UpgradeDefinition;
  tier: number;
  nextCost: number | null;
  canAfford: boolean;
  isFlashing: boolean;
  isLocked?: boolean;
  onPurchase: (id: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function UpgradeCard({ upgrade, tier, nextCost, canAfford, isFlashing, isLocked = false, onPurchase, t }: UpgradeCardProps) {
  const isMaxed = nextCost === null;
  const maxTier = upgrade.tiers.length;

  return (
    <AdaptiveMotion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      data-testid="upgrade-card"
      aria-disabled={isLocked || undefined}
      className={cn(
        'relative bg-neo-navy border-3 border-neo-black rounded-neo shadow-hard p-4 flex flex-col gap-3',
        isFlashing && 'ring-2 ring-neo-lime',
        isLocked && 'opacity-70 grayscale-[0.4]'
      )}
    >
      {/* Icon + Name */}
      <div className="flex items-center gap-3">
        <div className={cn('relative w-12 h-12 shrink-0', isLocked && 'opacity-60')}>
          <Image
            src={`/images/upgrades/${upgrade.icon}`}
            alt={t(upgrade.nameKey)}
            fill
            className="object-contain"
            sizes="48px"
          />
        </div>
        <div className="min-w-0">
          <h3 className="font-neo-display font-bold text-sm leading-tight truncate">
            {t(upgrade.nameKey)}
          </h3>
          <p className="text-xs text-neo-white font-neo-body leading-snug mt-0.5">
            {t(upgrade.descriptionKey)}
          </p>
        </div>
      </div>

      {/* Locked teaser — show the player what's coming and when it unlocks. */}
      {isLocked && (
        <div
          data-testid="upgrade-card-locked"
          className="mt-auto flex items-center justify-center gap-2 pt-2 border-t border-neo-white/10 text-neo-yellow"
        >
          <Lock className="w-4 h-4" />
          <span className="text-xs font-neo-display font-bold uppercase tracking-wide">
            {t('adventure.upgrades.unlocksAtWorld', { world: upgrade.unlockWorld })}
          </span>
        </div>
      )}

      {!isLocked && (
        <>

      {/* Tier pips */}
      <div className="flex items-center gap-1">
        {upgrade.tiers.map((_, i) => (
          <div
            key={`tier-pip-${i}`}
            className={cn(
              'h-2 flex-1 rounded-full border border-neo-black/40',
              i < tier ? 'bg-neo-lime' : 'bg-neo-white/10'
            )}
          />
        ))}
        <span className="text-xs font-mono font-bold text-neo-white ms-1.5">
          {tier}/{maxTier}
        </span>
      </div>

      {/* Current tier effect */}
      {tier > 0 && (
        <div className="text-xs text-neo-cyan font-neo-body flex items-center gap-1">
          <Check className="w-3 h-3" />
          <span>{t(upgrade.tiers[tier - 1].effectKey)}</span>
        </div>
      )}

      {/* Next tier preview with delta highlight */}
      {!isMaxed && tier < maxTier && (
        <div className="text-xs font-neo-body">
          <div className="flex items-center gap-1 text-neo-white">
            <ChevronRight className="w-3 h-3 rtl:scale-x-[-1]" />
            <span>{t(upgrade.tiers[tier].effectKey)}</span>
          </div>
          {/* Delta badge: shows current → next value */}
          {tier > 0 && (
            <div dir="ltr" className="mt-1 ms-4 inline-flex items-center gap-1 px-1.5 py-0.5 bg-neo-lime/10 border border-neo-lime/30 rounded text-[10px] font-bold text-neo-lime">
              <span>{upgrade.tiers[tier - 1].value}</span>
              <span className="text-neo-white">→</span>
              <span>{upgrade.tiers[tier].value}</span>
            </div>
          )}
        </div>
      )}

      {/* Purchase row */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t border-neo-white/10">
        {isMaxed ? (
          <div className="flex items-center gap-1 text-neo-white">
            <Check className="w-4 h-4" />
            <span className="text-xs font-neo-display font-bold">{t('adventure.upgrades.maxLevel')}</span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-neo-yellow" />
              <span className={cn('text-sm font-neo-display font-bold', canAfford ? 'text-neo-yellow' : 'text-neo-orange')}>
                {nextCost!.toLocaleString()}
              </span>
            </div>
            <AdaptiveMotion.button
              onClick={() => onPurchase(upgrade.id)}
              disabled={!canAfford}
              className={cn(
                'px-3 py-1.5 rounded-neo border-2 border-neo-black font-neo-display font-bold text-xs transition-all',
                canAfford
                  ? 'bg-neo-lime text-neo-black shadow-hard hover:shadow-hard-pressed active:shadow-hard-pressed'
                  : 'bg-neo-navy/60 text-neo-white cursor-not-allowed'
              )}
              whileHover={canAfford ? { scale: 1.05 } : {}}
              whileTap={canAfford ? { scale: 0.95 } : {}}
            >
              {canAfford ? t('adventure.upgrades.purchase') : (
                <span className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {t('adventure.upgrades.needMore', { amount: nextCost ?? 0 })}
                </span>
              )}
            </AdaptiveMotion.button>
          </>
        )}
      </div>

      {/* Purchase flash */}
      <AdaptiveAnimatePresence>
        {isFlashing && (
          <AdaptiveMotion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-neo-lime/20 rounded-neo pointer-events-none"
          >
            <span className="text-2xl font-neo-display font-black text-neo-lime">✓</span>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>
        </>
      )}
    </AdaptiveMotion.div>
  );
}
