/**
 * ShareSection Component
 * Simplified share and retry section - platform icons moved to share modal
 */

'use client';

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Share2, RotateCcw, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CoinBalanceBadge } from '@/components/ui/CoinBalanceBadge';
import { cn } from '@/lib/utils';
import { isNative } from '@/utils/platform';
import { useRewardedAd } from '@/hooks/useRewardedAd';
import { trackRewardedAdOffered } from '@/utils/growthTracking';

export interface ShareSectionProps {
  solved: boolean;
  onShare: () => void;
  onChallengeShare?: () => void;
  /** Web retry path — spends coins (wrapped by useCoinActions). */
  onRetry: () => void | Promise<void>;
  /** Native retry path — runs after rewarded-ad reward; no coin spend. */
  onRetryFree?: () => void | Promise<void>;
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
  /** Optional callback when coin spend starts - for animation */
  onSpendStart?: (position: { x: number; y: number }, amount: number) => void;
  t: (key: string) => string;
}

// Native-only retry button: rewarded ad gates a free retry. Web build never
// reaches this — the placeholder ad refuses rewards (see feedback memory).
function WatchAdRetryButton({
  onRetryFree,
  t,
}: {
  onRetryFree: () => void | Promise<void>;
  t: (key: string) => string;
}) {
  const [busy, setBusy] = useState(false);
  const { showAd, status, isAdAvailable, isPlaceholderCooldown } = useRewardedAd({
    rewardKind: 'feature',
    surface: 'retry',
    warm: true,
    onRewardEarned: async () => {
      setBusy(true);
      try {
        await onRetryFree();
      } finally {
        setBusy(false);
      }
    },
  });
  useEffect(() => {
    trackRewardedAdOffered('daily_retry');
  }, []);
  const disabled = busy || status === 'loading' || status === 'showing' || !isAdAvailable || isPlaceholderCooldown;

  return (
    <Button
      onClick={() => void showAd()}
      disabled={disabled}
      className="w-full py-3.5 text-lg font-black uppercase border-3 rounded-neo transition-[transform,translate,scale,rotate,box-shadow,background-color,border-color,color,opacity] bg-neo-orange text-neo-black border-neo-black shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="me-2 w-5 h-5 animate-spin" />
      ) : (
        <Play className="me-2 w-5 h-5" />
      )}
      {t('wordHunt.results.watchAdRetry')}
    </Button>
  );
}

export const ShareSection: React.FC<ShareSectionProps> = ({
  solved,
  onShare,
  onChallengeShare,
  onRetry,
  onRetryFree,
  canAffordRetry,
  retryCost,
  currentCoins,
  onSpendStart,
  t,
}) => {
  const useAdRetry = isNative() && !!onRetryFree;
  const retryRef = useRef<HTMLButtonElement>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryClick = useCallback(async () => {
    if (!canAffordRetry || isRetrying) return;

    // Trigger spend animation
    if (onSpendStart && retryRef.current) {
      const rect = retryRef.current.getBoundingClientRect();
      onSpendStart(
        { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        retryCost,
      );
    }

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [canAffordRetry, isRetrying, onRetry, onSpendStart, retryCost]);

  return (
    <div className="space-y-2">
      {/* Screenshot share hint */}
      <div className="text-center">
        <span className="text-[11px] text-neo-white/60 font-medium">
          {t('wordHunt.results.screenshotHint')}
        </span>
      </div>

      {/* Failed players: Retry is primary, Share is secondary */}
      {!solved ? (
        <div className="max-w-btn mx-auto space-y-2">
          {useAdRetry ? (
            // Native (Android/iOS): rewarded-ad gated retry — no coin spend.
            <WatchAdRetryButton onRetryFree={onRetryFree as () => void | Promise<void>} t={t} />
          ) : (
            <>
              {/* Inline coin balance row */}
              <div className="flex justify-end">
                <CoinBalanceBadge
                  balance={currentCoins}
                  size="sm"
                  canAfford={canAffordRetry}
                />
              </div>
              <Button
                ref={retryRef}
                onClick={handleRetryClick}
                disabled={!canAffordRetry || isRetrying}
                className={cn(
                  "w-full py-3.5 text-lg font-black uppercase border-3 rounded-neo transition-[transform,translate,scale,rotate,box-shadow,background-color,border-color,color,opacity]",
                  canAffordRetry && !isRetrying
                    ? "bg-neo-orange text-neo-black border-neo-black shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5"
                    : "bg-neo-navy text-neo-white/40 border-neo-black cursor-not-allowed shadow-hard"
                )}
              >
                {isRetrying ? (
                  <Loader2 className="me-2 w-5 h-5 animate-spin" />
                ) : (
                  <RotateCcw className="me-2 w-5 h-5" />
                )}
                {isRetrying ? t('common.loading') : t('wordHunt.results.retry')}
                <span className="ms-2 text-sm opacity-70">({retryCost}🪙)</span>
              </Button>
              {!canAffordRetry && (
                <p className="text-xs text-center text-neo-red font-bold">
                  {t('wordHunt.results.earnMoreHint')}
                </p>
              )}
            </>
          )}
          <Button
            onClick={onShare}
            variant="ghost"
            className="w-full py-2 text-sm font-medium uppercase text-neo-white/70 hover:text-neo-white border-2 border-neo-white/25 rounded-neo"
          >
            <Share2 className="me-1.5 w-4 h-4" />
            {t('wordHunt.results.share')}
          </Button>
        </div>
      ) : (
        /* Winners: Challenge Friends CTA (falls back to native share) */
        <Button
          onClick={onChallengeShare ?? onShare}
          className="w-full sm:max-w-btn sm:mx-auto py-3.5 text-lg font-black uppercase bg-linear-to-r from-neo-lime via-neo-lime to-neo-pink text-neo-black border-3 border-neo-black rounded-neo shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 transition-[transform,translate,scale,rotate,box-shadow,background-color,border-color,color,opacity]"
        >
          <Share2 className="me-2 w-5 h-5" />
          {t('wordHunt.results.challengeFriends')}
        </Button>
      )}
    </div>
  );
};

export default ShareSection;
