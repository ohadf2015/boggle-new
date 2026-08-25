'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface ClassLimitUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCount: number;
  limit: number | null;
}

export default function ClassLimitUpsellModal({
  isOpen,
  onClose,
  currentCount,
  limit,
}: ClassLimitUpsellModalProps) {
  const { t, language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const isRTL = language === 'he';

  // Track the upgrade surface when modal opens
  useEffect(() => {
    if (isOpen) {
      trackGrowthEvent('iap_viewed', {
        source: 'class_limit',
        currentCount,
        limit,
      });
    }
  }, [isOpen, currentCount, limit]);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
      });

      if (!response.ok) {
        toast.error(t('teacher.subscription.checkoutError'));
        return;
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      toast.error(t('teacher.subscription.checkoutError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-neo-black/80 z-50" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-md bg-neo-cream border-3 border-black shadow-hard-lg z-50',
            'rounded-neo overflow-hidden'
          )}
        >
          <div className="bg-neo-cyan px-6 py-4 border-b-3 border-black flex items-center justify-between">
            <Dialog.Title className="text-2xl font-neo-display font-black text-black">
              {t('teacher.subscription.classLimitTitle')}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="text-black hover:bg-black/10 p-1 rounded transition-colors"
                aria-label={t('common.close')}
              >
                <X className="w-5 h-5" />
              </button>
            </Dialog.Close>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-neo-pink/20 border-2 border-black rounded-neo p-4">
              <div className="flex items-center gap-3 mb-2">
                <Zap className="w-5 h-5 text-black flex-shrink-0" />
                <p className="font-bold text-black">
                  {t('teacher.subscription.classLimitMessage', {
                    current: currentCount,
                    limit: limit || 2,
                  })}
                </p>
              </div>
              <p className="text-sm text-black/70 font-bold leading-relaxed">
                {t('teacher.subscription.upgradeProDescription')}
              </p>
            </div>

            <div className="bg-neo-lime/20 border-2 border-black rounded-neo p-4">
              <h3 className="font-neo-display font-black text-black mb-2 text-lg">
                {t('teacher.subscription.proFeatures')}
              </h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2 font-bold text-black">
                  <span className="w-1 h-1 bg-black rounded-full" />
                  {t('teacher.subscription.unlimitedClasses')}
                </li>
                <li className="flex items-center gap-2 font-bold text-black">
                  <span className="w-1 h-1 bg-black rounded-full" />
                  {t('teacher.subscription.unlimitedStudents')}
                </li>
              </ul>
            </div>

            <div className="border-2 border-black rounded-neo p-4 bg-white">
              <p className="text-sm font-bold text-black/70">
                {t('teacher.subscription.priceUSD')}
              </p>
              <p className="text-3xl font-neo-display font-black text-neo-cyan">
                $9{' '}
                <span className="text-lg text-black/60 font-bold">
                  {t('teacher.subscription.perMonth')}
                </span>
              </p>
              <p className="text-xs font-bold text-black/50 mt-2">
                {t('teacher.subscription.autoRenew')}
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleUpgrade}
                disabled={isLoading}
                className="flex-1 bg-neo-cyan text-black font-black border-2 border-black shadow-hard hover:-translate-y-0.5 transition-all"
              >
                {isLoading ? t('common.loading') : t('teacher.subscription.upgradeNow')}
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1 border-2 border-black bg-neo-cream text-black font-black shadow-hard hover:-translate-y-0.5 transition-all"
              >
                {t('common.cancel')}
              </Button>
            </div>

            <div className="border-t-2 border-black/10 pt-4 text-center">
              <p className="text-xs font-bold text-black/60">
                {t('education.landing.districtCta.title')} {t('education.landing.districtCta.body')}
              </p>
              <Link
                href={`/${language}/education/for-schools`}
                onClick={() =>
                  trackGrowthEvent('landing_cta_clicked', {
                    cta: 'district_upsell',
                    source: 'class_limit_modal',
                  })
                }
                className="mt-1 inline-block text-sm font-black text-neo-purple underline underline-offset-2 hover:text-black"
              >
                {t('education.landing.districtCta.button')}
              </Link>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
