'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Gift } from 'lucide-react';
import { CollectionGrid } from '@/components/CollectionGrid';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/Loader';
import { Skeleton } from '@/components/ui/EnhancedLoading';
import { EnhancedEmptyState } from '@/components/ui/EnhancedEmptyState';
import type { PlayerCollectible } from '@/contexts/auth/authTypes';

interface ProfileCollectionProps {
  collectibles: PlayerCollectible[];
  isLoading: boolean;
  isDarkMode: boolean;
  delay?: number;
}

export function ProfileCollection({
  collectibles,
  isLoading,
  isDarkMode,
  delay = 0.35
}: ProfileCollectionProps): React.ReactNode {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'rounded-2xl p-4 mb-4',
        isDarkMode ? 'bg-slate-800/50 border border-slate-700' : 'bg-white border border-gray-200 shadow-lg'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className={cn(
          'text-base font-bold flex items-center gap-2',
          isDarkMode ? 'text-white' : 'text-gray-900'
        )}>
          <Gift className="text-neo-pink" />
          {t('collectibles.title') || 'My Collection'}
        </h2>
        {collectibles.length > 0 && (
          <span className={cn(
            'text-xs px-2 py-1 rounded-full',
            isDarkMode ? 'bg-slate-700 text-gray-300' : 'bg-gray-100 text-gray-600'
          )}>
            {collectibles.length} {t('collectibles.items') || 'items'}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-4 gap-3 py-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} variant="circular" width={64} height={64} />
          ))}
        </div>
      ) : collectibles.length === 0 ? (
        <EnhancedEmptyState
          title={t('collectibles.emptyCollection') || 'No collectibles yet'}
          description={t('collectibles.earnByPlaying') || 'Earn coins by playing games'}
          icon="sparkles"
          compact
        />
      ) : (
        <CollectionGrid collectibles={collectibles} />
      )}

      <div className={cn(
        'mt-3 pt-3 border-t text-center',
        isDarkMode ? 'border-slate-700' : 'border-gray-200'
      )}>
        <p className={cn('text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-500')}>
          {t('collectibles.shopComingSoon') || 'Shop coming soon! Collect special avatars, badges, and titles.'}
        </p>
      </div>
    </motion.div>
  );
}

export default ProfileCollection;
