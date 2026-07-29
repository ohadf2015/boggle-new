'use client';

import React, { useRef } from 'react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { UpgradeShop } from './meta/UpgradeShop';
import type { UpgradeState } from '@/lib/adventure/upgradeConfig';
import WordAlbumPanel from './WordAlbumPanel';
import WeeklyChallengePanel from './WeeklyChallengePanel';
import CollectionPanel from './CollectionPanel';
import { AchievementGrid } from './achievements/AchievementGrid';
import type { InventoryItem } from '@/hooks/useAdventureInventory';

interface AdventureViewModalsProps {
  showShop: boolean;
  showWordAlbum: boolean;
  showWeeklyChallenge: boolean;
  isPlaying: boolean;
  gold: number;
  upgrades: Record<string, number>;
  selectedWorld: number | null;
  wordAlbum: string[];
  wordAlbumClaimedMilestones: number[];
  onCloseShop: () => void;
  onCloseWordAlbum: () => void;
  onCloseWeeklyChallenge: () => void;
  onPlayWeeklyChallenge: () => void;
  onShopPurchase: (upgradeId: string, newState: UpgradeState, newGold: number) => void;
  showCollection: boolean;
  onCloseCollection: () => void;
  collectionInventory: InventoryItem[];
  showAchievements: boolean;
  onCloseAchievements: () => void;
  t: (key: string) => string;
}

export default function AdventureViewModals({
  showShop,
  showWordAlbum,
  showWeeklyChallenge,
  isPlaying,
  gold,
  upgrades,
  selectedWorld,
  wordAlbum,
  wordAlbumClaimedMilestones,
  onCloseShop,
  onCloseWordAlbum,
  onCloseWeeklyChallenge,
  onPlayWeeklyChallenge,
  onShopPurchase,
  showCollection,
  onCloseCollection,
  collectionInventory,
  showAchievements,
  onCloseAchievements,
  t,
}: AdventureViewModalsProps): React.JSX.Element {
  const shopRef = useRef<HTMLDivElement>(null);
  useFocusTrap(shopRef, showShop && !isPlaying, onCloseShop);

  return (
    <AdaptiveAnimatePresence>
      {showShop && !isPlaying && (
        <AdaptiveMotion.div
          key="shop-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={onCloseShop}
        >
          <AdaptiveMotion.div
            ref={shopRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('adventure.upgrades.shopTitle')}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'relative w-full max-w-lg lg:max-w-2xl max-h-[min(80dvh,600px)] lg:max-h-[min(85dvh,800px)] overflow-y-auto',
              'bg-neo-navy border-3 border-neo-black rounded-neo shadow-hard-lg p-4 lg:p-6'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onCloseShop}
              className={cn(
                'absolute top-3 inset-e-3 z-10 p-1.5',
                'bg-neo-navy border-2 border-neo-white/20 rounded-neo',
                'text-neo-white hover:bg-neo-red/30 transition-colors'
              )}
              aria-label={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
            <UpgradeShop
              gold={gold}
              upgrades={upgrades}
              currentWorld={selectedWorld ?? 1}
              onPurchase={onShopPurchase}
            />
          </AdaptiveMotion.div>
        </AdaptiveMotion.div>
      )}

      {/* Word Album Panel */}
      {showWordAlbum && (
        <WordAlbumPanel
          key="word-album"
          isOpen={showWordAlbum}
          onClose={onCloseWordAlbum}
          words={wordAlbum}
          claimedMilestones={wordAlbumClaimedMilestones}
        />
      )}

      {/* Weekly Challenge Panel */}
      {showWeeklyChallenge && (
        <WeeklyChallengePanel
          key="weekly-challenge"
          isOpen={showWeeklyChallenge}
          onClose={onCloseWeeklyChallenge}
          onPlay={onPlayWeeklyChallenge}
        />
      )}
      {/* Collection Gallery */}
      {showCollection && (
        <CollectionPanel
          key="collection"
          isOpen={showCollection}
          onClose={onCloseCollection}
          inventory={collectionInventory}
        />
      )}
      {/* Achievement Grid */}
      {showAchievements && (
        <AdaptiveMotion.div
          key="achievements-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          onClick={onCloseAchievements}
        >
          <AdaptiveMotion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('adventure.achievements.title')}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'relative w-full max-w-lg lg:max-w-2xl max-h-[min(80dvh,600px)] lg:max-h-[min(85dvh,800px)] overflow-y-auto',
              'bg-neo-navy border-3 border-neo-black rounded-neo shadow-hard-lg p-4 lg:p-6'
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onCloseAchievements}
              className={cn(
                'absolute top-3 inset-e-3 z-10 p-1.5',
                'bg-neo-navy border-2 border-neo-white/20 rounded-neo',
                'text-neo-white hover:bg-neo-red/30 transition-colors'
              )}
              aria-label={t('common.close')}
            >
              <X className="w-4 h-4" />
            </button>
            <AchievementGrid />
          </AdaptiveMotion.div>
        </AdaptiveMotion.div>
      )}
    </AdaptiveAnimatePresence>
  );
}
