'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCosmetics } from '@/hooks/useCosmetics';
import { type CosmeticCategory, RARITY_COLORS, type Cosmetic } from '@/lib/cosmetics';
import { Lock } from 'lucide-react';

interface CosmeticCollectionProps {
  rankTier: string;
  streakDays: number;
  coins: number;
  onPreview?: (cosmetic: Cosmetic) => void;
}

const TABS: { key: CosmeticCategory; label: string }[] = [
  { key: 'tileSkin', label: 'cosmetics.tileSkins' },
  { key: 'boardTheme', label: 'cosmetics.boardThemes' },
  { key: 'victoryEffect', label: 'cosmetics.victoryEffects' },
  { key: 'profileFrame', label: 'cosmetics.profileFrames' },
];

export function CosmeticCollection({ rankTier, streakDays, coins, onPreview }: CosmeticCollectionProps) {
  const { t } = useLanguage();
  const { equipCosmetic, purchaseCosmetic, getCosmeticsByCategory } = useCosmetics({
    rankTier,
    streakDays,
    coins,
  });
  const [activeTab, setActiveTab] = useState<CosmeticCategory>('tileSkin');

  const items = getCosmeticsByCategory(activeTab);

  return (
    <div className="w-full">
      <h2 className="text-xl font-neo-display font-bold mb-4">{t('cosmetics.collection')}</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 rounded-neo border-neo font-neo-body text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-neo-lime text-black shadow-hard-sm'
                : 'bg-neo-navy-light text-neo-cream hover:bg-neo-navy'
            }`}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map((item) => {
          const rarityClass = RARITY_COLORS[item.rarity];
          return (
            <button
              key={item.id}
              onClick={() => onPreview?.(item)}
              className={`relative p-3 rounded-neo border-neo bg-neo-navy-light text-start transition-transform hover:scale-[1.02] ${rarityClass}`}
            >
              {/* Preview area */}
              <div className={`h-16 rounded mb-2 bg-neo-navy flex items-center justify-center ${item.preview}`}>
                {!item.isUnlocked && <Lock className="w-6 h-6 text-gray-500" />}
              </div>

              {/* Name */}
              <p className="text-sm font-neo-body text-neo-cream truncate">{t(item.name)}</p>

              {/* Rarity */}
              <p className={`text-xs ${rarityClass}`}>
                {t(`cosmetics.rarity.${item.rarity}`)}
              </p>

              {/* Status badges */}
              {item.isEquipped && (
                <span className="absolute top-1 right-1 bg-neo-lime text-black text-xs px-1.5 py-0.5 rounded-neo font-bold">
                  {t('cosmetics.equipped')}
                </span>
              )}
              {!item.isUnlocked && (
                <span className="text-xs text-gray-500 mt-1 block">
                  {t('cosmetics.locked')}
                </span>
              )}
              {item.isUnlocked && !item.isEquipped && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    equipCosmetic(item.id);
                  }}
                  className="mt-1 text-xs bg-neo-cyan text-black px-2 py-0.5 rounded-neo font-bold border-neo shadow-hard-sm hover:shadow-hard-pressed"
                >
                  {t('cosmetics.equip')}
                </button>
              )}
              {!item.isUnlocked && item.unlockCondition.type === 'purchase' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    purchaseCosmetic(item.id);
                  }}
                  className="mt-1 text-xs bg-neo-lime text-black px-2 py-0.5 rounded-neo font-bold border-neo shadow-hard-sm"
                >
                  {t('cosmetics.purchase', { cost: item.unlockCondition.cost })}
                </button>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
