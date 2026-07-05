'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { safeToLocaleString } from '@/utils/bcp47Locale';
import { useCosmetics } from '@/hooks/useCosmetics';
import { type CosmeticCategory, RARITY_COLORS, type Cosmetic, formatUnlockHint, formatUnlockProgress, localizeTierParams } from '@/lib/cosmetics';
import { Lock } from 'lucide-react';
import { CosmeticPreview } from './CosmeticPreview';
import { RankProgressBanner } from './RankProgressBanner';

interface CosmeticCollectionProps {
  rankTier: string;
  streakDays: number;
  coins: number;
  /** Lifetime total_score — drives the rank banner + roadmap. */
  totalScore?: number;
  spendCoins?: (amount: number, reason: string, metadata?: Record<string, string | number>) => Promise<boolean>;
}

const TABS: { key: CosmeticCategory; label: string }[] = [
  { key: 'tileSkin', label: 'cosmetics.tileSkins' },
  { key: 'boardTheme', label: 'cosmetics.boardThemes' },
  { key: 'victoryEffect', label: 'cosmetics.victoryEffects' },
  { key: 'profileFrame', label: 'cosmetics.profileFrames' },
];

export function CosmeticCollection({ rankTier, streakDays, coins, totalScore = 0, spendCoins }: CosmeticCollectionProps) {
  const { t, language } = useLanguage();
  const { equipCosmetic, purchaseCosmetic, getCosmeticsByCategory } = useCosmetics({
    rankTier,
    streakDays,
    coins,
    spendCoins,
  });
  const [activeTab, setActiveTab] = useState<CosmeticCategory>('tileSkin');
  const [previewItem, setPreviewItem] = useState<(Cosmetic & { isUnlocked: boolean }) | null>(null);

  const items = getCosmeticsByCategory(activeTab);

  return (
    <div className="w-full">
      <h2 className="text-xl font-neo-display font-bold mb-4">{t('cosmetics.collection')}</h2>

      {/* Current rank + progress to next + expandable ladder */}
      <RankProgressBanner totalScore={totalScore} />

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        {TABS.map((tab) => (
          <button type="button"
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 rounded-neo border-neo font-neo-body text-sm whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-neo-lime text-black shadow-hard-sm'
                : 'bg-neo-navy-light text-neo-white hover:bg-neo-navy'
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
            <div
              key={item.id}
              onClick={() => setPreviewItem(item)}
              className={`relative p-3 rounded-neo border-neo bg-neo-navy-light text-start transition-transform hover:scale-[1.02] cursor-pointer ${rarityClass}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreviewItem(item); } }}
            >
              {/* Preview area */}
              <div className={`h-16 rounded mb-2 bg-neo-navy flex items-center justify-center ${item.preview}`}>
                {!item.isUnlocked && <Lock className="w-6 h-6 text-gray-500" />}
              </div>

              {/* Name */}
              <p className="text-sm font-neo-body text-neo-white truncate">{t(item.name)}</p>

              {/* Rarity */}
              <p className={`text-xs ${rarityClass}`}>
                {t(`cosmetics.rarity.${item.rarity}`)}
              </p>

              {/* Status badges */}
              {item.isEquipped && (
                <span className="absolute top-1 inset-e-1 bg-neo-lime text-black text-xs px-1.5 py-0.5 rounded-neo font-bold">
                  {t('cosmetics.equipped')}
                </span>
              )}
              {!item.isUnlocked && (() => {
                const hint = formatUnlockHint(item);
                const progress = formatUnlockProgress(item, { rankTier, streakDays });
                return (
                  <>
                    <span className="text-xs text-neo-white mt-1 block font-neo-body">
                      {hint ? t(hint.key, localizeTierParams(hint.params, t)) : t('cosmetics.locked')}
                    </span>
                    {progress && (
                      <span className="text-[11px] text-neo-cyan mt-0.5 block font-neo-body font-bold tabular-nums">
                        {t(progress.key, localizeTierParams(progress.params, t))}
                      </span>
                    )}
                  </>
                );
              })()}
              {item.isUnlocked && !item.isEquipped && (
                <button type="button"
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
                <button type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void purchaseCosmetic(item.id);
                  }}
                  className="mt-1 text-xs bg-neo-lime text-black px-2 py-0.5 rounded-neo font-bold border-neo shadow-hard-sm"
                >
                  {t('cosmetics.purchase', { cost: safeToLocaleString(item.unlockCondition.cost, language) })}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Preview modal */}
      {previewItem && (
        <CosmeticPreview
          cosmetic={previewItem}
          isUnlocked={previewItem.isUnlocked}
          onClose={() => setPreviewItem(null)}
          onEquip={(id) => { equipCosmetic(id); setPreviewItem(null); }}
          onPurchase={(id) => { void purchaseCosmetic(id); setPreviewItem(null); }}
        />
      )}
    </div>
  );
}
