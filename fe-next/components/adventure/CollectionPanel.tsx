'use client';

import { memo, useMemo, useState } from 'react';
import { X, Trophy, ScrollText, Gem, Sparkles, Lock } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  COLLECTIBLE_ITEMS,
  getCollectiblesByCategory,
  type CollectibleCategory,
  type CollectibleRarity,
} from '@/lib/adventure/collectibleConfig';
import type { InventoryItem } from '@/hooks/useAdventureInventory';

// ==============================================
// TYPES
// ==============================================

export type { InventoryItem } from '@/hooks/useAdventureInventory';

interface CollectionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
}

// ==============================================
// CONSTANTS
// ==============================================

const CATEGORIES: { key: CollectibleCategory; icon: typeof Trophy; color: string }[] = [
  { key: 'trophy', icon: Trophy, color: 'neo-pink' },
  { key: 'scroll', icon: ScrollText, color: 'neo-cyan' },
  { key: 'rune', icon: Gem, color: 'neo-purple' },
  { key: 'relic', icon: Sparkles, color: 'neo-yellow' },
];

const RARITY_BORDER: Record<CollectibleRarity, string> = {
  common: 'border-neo-white/20',
  rare: 'border-neo-cyan/60',
  epic: 'border-neo-pink/60',
  legendary: 'border-neo-yellow/80 ring-1 ring-neo-yellow/30',
};

const RARITY_BG: Record<CollectibleRarity, string> = {
  common: 'bg-neo-white/5',
  rare: 'bg-neo-cyan/10',
  epic: 'bg-neo-pink/10',
  legendary: 'bg-neo-yellow/10',
};

const RARITY_LABEL_COLOR: Record<CollectibleRarity, string> = {
  common: 'text-neo-white',
  rare: 'text-neo-cyan',
  epic: 'text-neo-pink',
  legendary: 'text-neo-yellow',
};

// ==============================================
// COMPONENT
// ==============================================

const CollectionPanel = memo<CollectionPanelProps>(({ isOpen, onClose, inventory }) => {
  const { t } = useLanguageSafe();
  const [activeCategory, setActiveCategory] = useState<CollectibleCategory>('trophy');

  const ownedItemIds = useMemo(() => {
    return new Set(inventory.map(i => i.item_id));
  }, [inventory]);

  const inventoryMap = useMemo(() => {
    const map = new Map<string, InventoryItem>();
    for (const item of inventory) {
      map.set(item.item_id, item);
    }
    return map;
  }, [inventory]);

  const categoryItems = useMemo(() => {
    return getCollectiblesByCategory(activeCategory);
  }, [activeCategory]);

  const ownedCount = useMemo(() => {
    return categoryItems.filter(i => ownedItemIds.has(i.id)).length;
  }, [categoryItems, ownedItemIds]);

  const totalCollected = inventory.length;
  const totalItems = COLLECTIBLE_ITEMS.length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <AdaptiveMotion.div
        data-testid="collection-panel"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={cn(
          'w-full max-w-lg max-h-[85dvh] flex flex-col',
          'bg-neo-navy border-3 border-black rounded-neo shadow-hard-lg',
          'overflow-hidden'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-3 border-black bg-neo-navy-light">
          <div>
            <h2 className="font-neo-display text-xl text-neo-white uppercase tracking-tight">
              {t('adventure.collection.title')}
            </h2>
            <p className="text-xs text-neo-white font-bold mt-0.5">
              {totalCollected}/{totalItems} {t('adventure.collection.collected')}
            </p>
          </div>
          <button
            onClick={onClose}
            data-testid="collection-close"
            className="p-2 rounded-neo border-2 border-neo-white/20 hover:bg-neo-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-neo-white" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b-2 border-neo-white/10">
          {CATEGORIES.map(({ key, icon: Icon, color }) => {
            const isActive = activeCategory === key;
            return (
              <button
                key={key}
                data-testid={`collection-tab-${key}`}
                onClick={() => setActiveCategory(key)}
                className={cn(
                  'flex-1 py-3 flex flex-col items-center gap-1 transition-all',
                  isActive
                    ? `bg-${color}/15 border-b-3 border-${color} text-${color}`
                    : 'text-neo-white hover:text-neo-white hover:bg-neo-white/5'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase">
                  {t(`adventure.collection.category.${key}`)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Category Progress */}
        <div className="px-4 py-2 bg-neo-white/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neo-white">
              {ownedCount}/{categoryItems.length}
            </span>
            <div className="flex-1 mx-3 h-1.5 bg-neo-black/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-neo-lime rounded-full transition-all duration-500"
                style={{ width: categoryItems.length > 0 ? `${(ownedCount / categoryItems.length) * 100}%` : '0%' }}
              />
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <AdaptiveAnimatePresence mode="wait">
            <AdaptiveMotion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-3 gap-3"
            >
              {categoryItems.map((item) => {
                const owned = ownedItemIds.has(item.id);
                const invItem = inventoryMap.get(item.id);
                return (
                  <div
                    key={item.id}
                    data-testid={`collection-item-${item.id}`}
                    className={cn(
                      'flex flex-col items-center p-3 rounded-neo border-2 transition-all',
                      owned
                        ? `${RARITY_BORDER[item.rarity]} ${RARITY_BG[item.rarity]}`
                        : 'border-neo-white/10 bg-neo-white/2 opacity-50'
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      'w-10 h-10 flex items-center justify-center rounded-neo text-2xl mb-1.5',
                      owned ? '' : 'grayscale'
                    )}>
                      {owned ? (
                        <span>{item.icon}</span>
                      ) : (
                        <Lock className="w-5 h-5 text-neo-white" />
                      )}
                    </div>

                    {/* Name */}
                    <span className={cn(
                      'text-[11px] font-bold text-center leading-tight',
                      owned ? 'text-neo-white' : 'text-neo-white'
                    )}>
                      {owned ? t(item.nameKey) : '???'}
                    </span>

                    {/* Rarity badge */}
                    <span className={cn(
                      'text-[9px] font-black uppercase mt-1',
                      owned ? RARITY_LABEL_COLOR[item.rarity] : 'text-neo-white'
                    )}>
                      {t(`adventure.collection.rarity.${item.rarity}`)}
                    </span>

                    {/* Quantity for stackable items */}
                    {owned && invItem && invItem.quantity > 1 && (
                      <span className="text-[10px] font-mono text-neo-white mt-0.5">
                        ×{invItem.quantity}
                      </span>
                    )}
                  </div>
                );
              })}
            </AdaptiveMotion.div>
          </AdaptiveAnimatePresence>
        </div>

        {/* Rarity Legend */}
        <div className="flex items-center justify-center gap-4 py-2 border-t-2 border-neo-white/10 bg-neo-navy-light">
          {(['common', 'rare', 'epic', 'legendary'] as CollectibleRarity[]).map(r => (
            <span key={r} className={cn('text-[9px] font-black uppercase', RARITY_LABEL_COLOR[r])}>
              {t(`adventure.collection.rarity.${r}`)}
            </span>
          ))}
        </div>
      </AdaptiveMotion.div>
    </div>
  );
});

CollectionPanel.displayName = 'CollectionPanel';

export default CollectionPanel;
