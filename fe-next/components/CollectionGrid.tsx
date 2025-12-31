'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CollectibleItem, PlayerCollectible } from '@/contexts/auth/authTypes';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CollectionGridProps {
  collectibles: PlayerCollectible[];
  className?: string;
}

// Rarity colors for borders
const rarityColors: Record<string, string> = {
  common: 'border-gray-400',
  uncommon: 'border-green-500',
  rare: 'border-blue-500',
  epic: 'border-purple-500',
  legendary: 'border-yellow-500'
};

const rarityBgColors: Record<string, string> = {
  common: 'bg-gray-100 dark:bg-gray-800',
  uncommon: 'bg-green-50 dark:bg-green-900/30',
  rare: 'bg-blue-50 dark:bg-blue-900/30',
  epic: 'bg-purple-50 dark:bg-purple-900/30',
  legendary: 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30'
};

export function CollectionGrid({ collectibles, className }: CollectionGridProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDarkMode = theme === 'dark';

  if (collectibles.length === 0) {
    return (
      <div className={cn(
        'text-center py-8',
        isDarkMode ? 'text-gray-500' : 'text-gray-400'
      )}>
        <span className="text-4xl mb-2 block">🎁</span>
        <p>{t('collectibles.emptyCollection') || 'No collectibles yet!'}</p>
        <p className="text-sm mt-1">{t('collectibles.earnByPlaying') || 'Earn coins by playing games'}</p>
      </div>
    );
  }

  // Group by category
  const byCategory = collectibles.reduce((acc, item) => {
    const category = item.collectible?.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, PlayerCollectible[]>);

  const categoryOrder = ['avatar', 'badge', 'title', 'effect'];
  const categoryIcons: Record<string, string> = {
    avatar: '🎭',
    badge: '🏅',
    title: '📜',
    effect: '✨'
  };

  return (
    <TooltipProvider>
      <div className={cn('space-y-4', className)}>
        {categoryOrder.map(category => {
          const items = byCategory[category];
          if (!items || items.length === 0) return null;

          return (
            <div key={category}>
              <h3 className={cn(
                'text-sm font-semibold mb-2 flex items-center gap-2',
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              )}>
                <span>{categoryIcons[category]}</span>
                {t(`collectibles.category.${category}`) || category}
                <span className="text-xs opacity-60">({items.length})</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {items.map((item, index) => (
                  <CollectibleBadge
                    key={item.id}
                    item={item}
                    index={index}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

interface CollectibleBadgeProps {
  item: PlayerCollectible;
  index: number;
  isDarkMode: boolean;
}

function CollectibleBadge({ item, index, isDarkMode }: CollectibleBadgeProps) {
  const { t } = useLanguage();
  const collectible = item.collectible;
  if (!collectible) return null;

  const rarity = collectible.rarity || 'common';
  const itemName = t(collectible.name_key) || collectible.id;
  const rarityLabel = t(`collectibles.rarity.${rarity}`) || rarity;
  const equippedLabel = item.is_equipped ? ` (${t('collectibles.equipped') || 'Equipped'})` : '';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          role="button"
          tabIndex={0}
          aria-label={`${itemName} - ${rarityLabel}${equippedLabel}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
          whileHover={{ scale: 1.1, y: -2 }}
          className={cn(
            'w-12 h-12 flex items-center justify-center rounded-lg border-2 cursor-pointer transition-shadow overflow-hidden',
            'shadow-sm hover:shadow-hard focus:outline-none focus:ring-2 focus:ring-neo-cyan',
            rarityColors[rarity],
            rarityBgColors[rarity],
            item.is_equipped && 'ring-2 ring-neo-lime ring-offset-2'
          )}
        >
          {collectible.image_url ? (
            <img
              src={collectible.image_url}
              alt=""
              aria-hidden="true"
              className="w-10 h-10 object-cover rounded"
            />
          ) : (
            <span className="text-2xl" aria-hidden="true">{collectible.icon}</span>
          )}
          {item.is_equipped && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-neo-lime text-neo-black rounded-full flex items-center justify-center text-[10px] border border-neo-black" aria-hidden="true">
              ✓
            </span>
          )}
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="text-center">
          <p className="font-bold">{t(collectible.name_key) || collectible.id}</p>
          <p className="text-xs opacity-80">{t(collectible.description_key) || ''}</p>
          <p className={cn(
            'text-xs mt-1 font-medium',
            rarity === 'common' && 'text-gray-500',
            rarity === 'uncommon' && 'text-green-500',
            rarity === 'rare' && 'text-blue-500',
            rarity === 'epic' && 'text-purple-500',
            rarity === 'legendary' && 'text-yellow-500'
          )}>
            {t(`collectibles.rarity.${rarity}`) || rarity}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default CollectionGrid;
