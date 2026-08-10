'use client';
import { useState, useEffect, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { useSocialCapabilities } from '@/hooks/useSocialCapabilities';
import { shouldSuppressAdsForTier } from '@/lib/families/adPolicy';
import { useConsumerPro } from '@/hooks/useConsumerPro';
import { useAuth } from '@/contexts/AuthContext';

interface RemoveAdsProbeProps {
  isDarkMode: boolean;
}

export function RemoveAdsProbe({ isDarkMode }: RemoveAdsProbeProps) {
  const { t } = useLanguage();
  const { tier } = useSocialCapabilities();
  const { hasConsumerPro, isLoading: proLoading } = useConsumerPro();
  const { isAuthenticated } = useAuth();
  // Families: never surface purchase offers (or their telemetry) to a known child.
  const suppressed = shouldSuppressAdsForTier(tier);
  const [tapped, setTapped] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    if (suppressed) return;
    trackGrowthEvent('iap_viewed', { surface: 'settings' });
  }, [suppressed]);

  // Hide the component if user already has Consumer Pro.
  if (suppressed || hasConsumerPro) return null;

  function handleTap() {
    if (tapped || checkoutLoading) return;
    setTapped(true);
    trackGrowthEvent('iap_tapped', { surface: 'settings', intent: 'remove_ads' });
  }

  const handlePurchase = useCallback(async () => {
    if (!isAuthenticated) {
      setCheckoutError(t('settings.removeAds.signInRequired'));
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: 'consumer_pro' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' }));
        throw new Error(err.error || 'Checkout unavailable');
      }
      const { url } = await res.json();
      // Redirect to Lemon Squeezy checkout
      window.location.href = url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setCheckoutError(msg);
      setCheckoutLoading(false);
    }
  }, [isAuthenticated, t]);

  return (
    <>{(tapped || checkoutError) ? (
      <div className={cn(
        'flex items-center justify-between p-4 rounded-neo border-3 border-neo-purple mt-2',
        isDarkMode ? 'bg-neo-navy-light' : 'bg-white shadow-hard'
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center border-2 border-neo-black bg-neo-purple">
            <Sparkles className="w-5 h-5 text-neo-white" />
          </div>
          <div>
            <p className={cn('font-bold', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {t('settings.removeAds.title')}
            </p>
            {checkoutError ? (
              <p className="text-xs text-neo-red">{checkoutError}</p>
            ) : (
              <p className={cn('text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
                {t('settings.removeAds.price')}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handlePurchase}
          disabled={checkoutLoading}
          aria-label={t('settings.removeAds.purchaseButton')}
          className={cn(
            'shrink-0 rounded-neo border-2 border-neo-purple px-3 py-1.5 text-xs font-bold',
            'text-neo-purple transition-all hover:bg-neo-purple/10 active:scale-95',
            checkoutLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {checkoutLoading ? '...' : t('settings.removeAds.purchaseButton')}
        </button>
      </div>
    ) : (
      <div className={cn(
        'flex items-center justify-between p-4 rounded-neo border-3 border-neo-purple mt-2',
        isDarkMode ? 'bg-neo-navy-light' : 'bg-white shadow-hard'
      )}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center border-2 border-neo-black bg-neo-purple">
            <Sparkles className="w-5 h-5 text-neo-white" />
          </div>
          <div>
            <p className={cn('font-bold', isDarkMode ? 'text-white' : 'text-neo-black')}>
              {t('settings.removeAds.title')}
            </p>
            <p className={cn('text-xs', isDarkMode ? 'text-gray-400' : 'text-gray-600')}>
              {t('settings.removeAds.body')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleTap}
          aria-label={t('settings.removeAds.button')}
          className={cn(
            'shrink-0 rounded-neo border-2 border-neo-purple px-3 py-1.5 text-xs font-bold',
            'text-neo-purple transition-all hover:bg-neo-purple/10 active:scale-95'
          )}
        >
          {t('settings.removeAds.button')}
        </button>
      </div>
    )}</>
  );
}