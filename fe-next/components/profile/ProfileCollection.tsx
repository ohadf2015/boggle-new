'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Gift } from 'lucide-react';
import { CollectionGrid } from '@/components/CollectionGrid';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
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
      className="rounded-3xl p-6 mb-4 bg-slate-800/80 border-3 border-slate-600"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black font-neo-display uppercase flex items-center gap-2 text-white">
          <Gift className="text-neo-pink" />
          {t('collectibles.title')}
        </h2>
        {collectibles.length > 0 && (
          <span className="text-xs font-black uppercase px-3 py-1.5 rounded-full bg-black text-neo-pink border-2 border-neo-pink shadow-hard-sm">
            {collectibles.length} {t('collectibles.items')}
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
          title={t('collectibles.emptyCollection')}
          description={t('collectibles.earnByPlaying')}
          icon="sparkles"
          compact
        />
      ) : (
        <CollectionGrid collectibles={collectibles} />
      )}

      <div className="mt-4 pt-3 border-t border-slate-700 text-center">
        <p className="text-xs text-gray-500">
          {t('collectibles.shopComingSoon')}
        </p>
      </div>
    </motion.div>
  );
}

export default ProfileCollection;
