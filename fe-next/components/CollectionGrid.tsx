'use client';

import Image from 'next/image';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/utils/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PlayerCollectible } from '@/contexts/auth/authTypes';
import { MobileTooltip } from '@/components/ui/MobileTooltip';

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
  common: 'bg-gray-100 dark:bg-neo-navy-light',
  uncommon: 'bg-green-50 dark:bg-green-900/30',
  rare: 'bg-blue-50 dark:bg-blue-900/30',
  epic: 'bg-purple-50 dark:bg-purple-900/30',
  legendary: 'bg-linear-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30'
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
        <m.span
          className="text-4xl mb-2 block"
          animate={{ scale: [1, 1.15, 1], rotate: [0, -8, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          🎁
        </m.span>
        <p>{t('collectibles.emptyCollection')}</p>
        <p className="text-sm mt-1">{t('collectibles.earnByPlaying')}</p>
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
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface CollectibleBadgeProps {
  item: PlayerCollectible;
  index: number;
}

function CollectibleBadge({ item, index }: CollectibleBadgeProps) {
  const { t } = useLanguage();
  const collectible = item.collectible;
  if (!collectible) return null;

  const rarity = collectible.rarity || 'common';
  const itemName = t(collectible.name_key) || collectible.id;
  const rarityLabel = t(`collectibles.rarity.${rarity}`) || rarity;
  const equippedLabel = item.is_equipped ? ` (${t('collectibles.equipped')})` : '';

  const tooltipContent = (
    <div className="text-center">
      <p className="font-bold">{t(collectible.name_key) || collectible.id}</p>
      <p className="text-xs opacity-80">{t(collectible.description_key)}</p>
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
  );

  return (
    <MobileTooltip content={tooltipContent} side="top" contentClassName="max-w-xs">
      <m.button
        type="button"
        aria-label={`${itemName} - ${rarityLabel}${equippedLabel}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
        whileHover={{ scale: 1.1, y: -2 }}
        className={cn(
          'w-12 h-12 flex items-center justify-center rounded-lg border-2 cursor-pointer transition-shadow overflow-hidden',
          'shadow-xs hover:shadow-hard focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2',
          rarityColors[rarity],
          rarityBgColors[rarity],
          item.is_equipped && 'ring-2 ring-neo-lime ring-offset-2'
        )}
      >
        {collectible.image_url ? (
          <Image
            src={collectible.image_url}
            alt=""
            aria-hidden="true"
            width={40}
            height={40}
            className="w-10 h-10 object-cover rounded"
            unoptimized
          />
        ) : (
          <span className="text-2xl" aria-hidden="true">{collectible.icon}</span>
        )}
        {item.is_equipped && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-neo-lime text-neo-black rounded-full flex items-center justify-center text-[10px] border border-neo-black" aria-hidden="true">
            ✓
          </span>
        )}
      </m.button>
    </MobileTooltip>
  );
}

export default CollectionGrid;
