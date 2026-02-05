/**
 * UpgradeShop Component
 *
 * Displays available stat upgrades and handles purchase interactions.
 * Shows costs, stack counts, and validation feedback.
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../../contexts/LanguageContext';
import type { UpgradeId, PurchaseResult } from '../../../shared/types/progression';
import { STAT_UPGRADES, getUpgradeCost } from '../../../shared/utils/currencyUtils';

/**
 * Component props
 */
export interface UpgradeShopProps {
  /** Player's current gold balance */
  gold: number;
  /** Current upgrade stacks by ID */
  upgrades: Record<UpgradeId, number>;
  /** Callback when upgrade is purchased */
  onPurchase: (upgradeId: UpgradeId) => PurchaseResult;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Shop interface for purchasing stat upgrades.
 *
 * Features:
 * - List of available upgrades with descriptions
 * - Cost and stack count display
 * - Purchase validation (gold check, max stacks)
 * - Visual feedback on purchase/error
 * - Neo-brutalist styling
 *
 * @example
 * ```tsx
 * <UpgradeShop
 *   gold={1500}
 *   upgrades={{ timeBonus: 2, scoreBonus: 1, xpBonus: 0 }}
 *   onPurchase={handlePurchase}
 * />
 * ```
 */
export function UpgradeShop({
  gold,
  upgrades,
  onPurchase,
  className = '',
}: UpgradeShopProps) {
  const { t } = useLanguage();
  const [purchaseStatus, setPurchaseStatus] = useState<{
    upgradeId: UpgradeId;
    success: boolean;
  } | null>(null);

  // Handle purchase click
  const handlePurchase = (upgradeId: UpgradeId) => {
    const result = onPurchase(upgradeId);

    // Show feedback animation
    setPurchaseStatus({ upgradeId, success: result.success });
    setTimeout(() => setPurchaseStatus(null), 1000);
  };

  // Render upgrade card
  const renderUpgradeCard = (upgradeId: UpgradeId) => {
    const upgrade = STAT_UPGRADES[upgradeId];
    const currentStacks = upgrades[upgradeId];
    const cost = getUpgradeCost(upgradeId, currentStacks);
    const canAfford = gold >= cost;
    const isMaxed = currentStacks >= upgrade.maxStacks;
    const goldNeeded = Math.max(0, cost - gold);

    // Translation keys based on upgrade ID
    const nameKey = `adventure.upgrades.${upgradeId}`;
    const descKey = `adventure.upgrades.${upgradeId}Desc`;

    return (
      <div
        key={upgradeId}
        data-testid="upgrade-card"
        className="
          bg-neo-navy border-3 border-black rounded-neo
          shadow-hard p-4
          flex flex-col gap-3
        "
      >
        {/* Header: Name and Icon */}
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label={upgrade.icon}>
            {upgrade.icon === 'clock' && '⏱️'}
            {upgrade.icon === 'star' && '⭐'}
            {upgrade.icon === 'lightning' && '⚡'}
          </span>
          <h3 className="font-neo-display font-bold text-lg">
            {t(nameKey)}
          </h3>
        </div>

        {/* Description */}
        <p className="font-neo-body text-sm text-neo-white/70">
          {t(descKey)}
        </p>

        {/* Stack count */}
        <div className="text-sm font-neo-body">
          {currentStacks}/{upgrade.maxStacks} stacks
        </div>

        {/* Cost and Purchase */}
        <div className="flex items-center justify-between mt-2">
          {/* Cost */}
          <div className="flex items-center gap-1">
            <span className="text-lg" role="img" aria-label="coin">
              🪙
            </span>
            <span className="font-neo-display font-bold">
              {cost.toLocaleString('en-US')}
            </span>
          </div>

          {/* Purchase button or status */}
          {isMaxed ? (
            <div className="
              bg-neo-navy/80 text-neo-white/50
              px-4 py-2 rounded-neo
              border-2 border-black
              font-neo-display font-bold text-sm
            ">
              {t('adventure.upgrades.maxLevel')}
            </div>
          ) : (
            <motion.button
              onClick={() => handlePurchase(upgradeId)}
              disabled={!canAfford}
              className={`
                px-4 py-2 rounded-neo
                border-2 border-black
                font-neo-display font-bold text-sm
                transition-all
                ${
                  canAfford
                    ? 'bg-neo-lime hover:bg-neo-lime/90 shadow-hard hover:shadow-hard-pressed active:shadow-hard-pressed'
                    : 'bg-neo-navy/60 text-neo-white/40 cursor-not-allowed'
                }
              `}
              whileHover={canAfford ? { scale: 1.05 } : {}}
              whileTap={canAfford ? { scale: 0.95 } : {}}
            >
              {t('adventure.upgrades.purchase')}
            </motion.button>
          )}
        </div>

        {/* Insufficient gold message */}
        {!isMaxed && !canAfford && goldNeeded > 0 && (
          <div className="text-xs text-neo-orange font-neo-body">
            {t('adventure.upgrades.needMore').replace('{amount}', goldNeeded.toString())}
          </div>
        )}

        {/* Purchase feedback */}
        {purchaseStatus?.upgradeId === upgradeId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`
              text-center text-sm font-neo-display font-bold py-1 rounded
              ${
                purchaseStatus.success
                  ? 'bg-neo-lime/20 text-neo-lime'
                  : 'bg-neo-orange/20 text-neo-orange'
              }
            `}
          >
            {purchaseStatus.success ? '✓ Purchased!' : '✗ Failed'}
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
      {/* Render all upgrades */}
      {(['timeBonus', 'scoreBonus', 'xpBonus'] as UpgradeId[]).map(
        renderUpgradeCard
      )}
    </div>
  );
}
