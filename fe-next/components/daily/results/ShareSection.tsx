/**
 * ShareSection Component
 * Simplified share and retry section - platform icons moved to share modal
 */

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Share2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CoinBalanceBadge } from '@/components/ui/CoinBalanceBadge';
import { cn } from '@/lib/utils';

export interface ShareSectionProps {
  solved: boolean;
  onShare: () => void;
  onRetry: () => void;
  canAffordRetry: boolean;
  retryCost: number;
  currentCoins: number;
  onWhatsApp: () => void;
  onTwitter: () => void;
  onTelegram: () => void;
  onCopy: () => void;
  onDownloadImage: () => void;
  copied: boolean;
  isGeneratingImage: boolean;
  t: (key: string) => string;
}

export const ShareSection: React.FC<ShareSectionProps> = ({
  solved,
  onShare,
  onRetry,
  canAffordRetry,
  retryCost,
  currentCoins,
  t,
}) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.3 }}
    className="space-y-2"
  >
    {/* Failed players: Retry is primary, Share is secondary */}
    {!solved ? (
      <>
        <div className="relative">
          <Button
            onClick={onRetry}
            disabled={!canAffordRetry}
            className={cn(
              "w-full max-w-btn py-3.5 text-lg font-black uppercase border-3 rounded-neo transition-all",
              canAffordRetry
                ? "bg-gradient-to-r from-amber-400 to-orange-500 text-neo-black border-neo-black shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5"
                : "bg-gray-400 text-gray-600 border-neo-black cursor-not-allowed shadow-hard"
            )}
          >
            <RotateCcw className="mr-2 w-5 h-5" />
            {t('wordHunt.results.retry') || 'Retry'}
            <span className="ms-2 text-sm opacity-70">({retryCost}🪙)</span>
          </Button>
          <CoinBalanceBadge
            balance={currentCoins}
            size="sm"
            canAfford={canAffordRetry}
            className="absolute -top-2 end-2"
          />
        </div>
        <Button
          onClick={onShare}
          variant="ghost"
          className="w-full max-w-btn py-2 text-sm font-medium uppercase text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 border-2 border-gray-300 dark:border-gray-600 rounded-neo"
        >
          <Share2 className="mr-1.5 w-4 h-4" />
          {t('wordHunt.results.share') || 'Share'}
        </Button>
      </>
    ) : (
      /* Winners: Only show Share button, no retry option */
      <Button
        onClick={onShare}
        className="w-full max-w-btn py-3.5 text-lg font-black uppercase bg-gradient-to-r from-neo-lime via-neo-lime to-neo-pink text-neo-black border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 transition-all"
      >
        <Share2 className="mr-2 w-5 h-5" />
        {t('wordHunt.results.share') || 'Share'}
      </Button>
    )}
  </motion.div>
);

export default ShareSection;
