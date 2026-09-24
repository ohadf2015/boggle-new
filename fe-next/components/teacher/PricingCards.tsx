'use client';

import { Button } from '@/components/ui/button';
import { Check, X, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { trackEduProUpgradeClicked } from '@/lib/education/proFunnelTelemetry';

interface PricingCardsProps {
  freeFeatures: Array<{ label: string; included: boolean }>;
  proFeatures: string[];
  isLoading: boolean;
  onUpgradeClick: () => void;
}

export function PricingCards({
  freeFeatures,
  proFeatures,
  isLoading,
  onUpgradeClick,
}: PricingCardsProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  return (
    <div
      data-testid="pricing-cards"
      className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start mb-4"
    >
      {/* Free Card */}
      <div
        className={cn(
          'order-2 md:order-1',
          'border-3 border-black rounded-neo p-4 sm:p-5 shadow-hard bg-neo-cream',
          'flex flex-col'
        )}
      >
        <div className="mb-2">
          <h2 className="text-lg font-neo-display font-black text-neo-black mb-0.5">
            {t('teacher.subscription.freePlanName')}
          </h2>
          <p className="text-neo-black/70 font-bold text-xs">
            {t('teacher.subscription.freeForever')}
          </p>
        </div>

        <div className="mb-3 pb-3 border-b-2 border-black">
          <p className="text-2xl font-neo-display font-black text-neo-black">
            $0
            <span className="text-sm text-neo-black/70 font-bold ms-2">
              {t('teacher.subscription.perMonth')}
            </span>
          </p>
        </div>

        <div className="space-y-1.5 flex-1 mb-3">
          {freeFeatures.map((feature) => (
            <div key={feature.label} className="flex items-start gap-2">
              <div
                className={cn(
                  'w-4 h-4 rounded border-2 border-black flex items-center justify-center flex-shrink-0 mt-0.5',
                  feature.included ? 'bg-neo-lime' : 'bg-neo-black/10'
                )}
              >
                {feature.included ? (
                  <Check className="w-3 h-3 text-black" strokeWidth={3} />
                ) : (
                  <X className="w-3 h-3 text-neo-black/50" strokeWidth={3} />
                )}
              </div>
              <span
                className={cn(
                  'font-bold text-sm leading-snug',
                  feature.included
                    ? 'text-neo-black'
                    : 'text-neo-black/50 line-through decoration-2'
                )}
              >
                {feature.label}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs font-bold text-neo-black/70 mb-2 leading-snug">
          {t('teacher.subscription.freeStartNote')}
        </p>

        <Button
          disabled
          className="w-full bg-neo-cream text-neo-black/70 font-black border-2 border-black cursor-not-allowed"
        >
          {t('teacher.subscription.currentPlan')}
        </Button>
      </div>

      {/* Pro Card */}
      <div
        className={cn(
          'order-1 md:order-2',
          'border-3 border-black rounded-neo p-4 sm:p-5 shadow-hard-lg',
          'bg-neo-cyan md:scale-105 md:z-10 flex flex-col relative'
        )}
      >
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neo-pink px-3 py-0.5 border-2 border-black rounded-neo animate-neo-pop">
          <span className="font-neo-display font-black text-black text-xs inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" strokeWidth={3} />
            {t('teacher.subscription.popular')}
          </span>
        </div>

        <div className="mb-2 mt-2">
          <h2 className="text-lg font-neo-display font-black text-neo-black mb-0.5">
            {t('teacher.subscription.proPlanName')}
          </h2>
          <p className="text-neo-black/80 font-bold text-xs">
            {t('teacher.subscription.unlimitedAccess')}
          </p>
        </div>

        <div className="mb-3 pb-3 border-b-2 border-black">
          <p className="text-2xl sm:text-3xl font-neo-display font-black text-neo-black leading-none">
            $9
            <span className="text-xs sm:text-sm text-neo-black/80 font-bold ms-2">
              {t('teacher.subscription.perMonth')}
            </span>
          </p>
          <div className="flex flex-row flex-wrap items-center gap-2 mt-2">
            <p className="inline-block bg-neo-black text-neo-cyan text-xs font-black px-2 py-0.5 rounded-neo border-2 border-black w-fit">
              {t('teacher.subscription.pricePerDay')}
            </p>
            <p className="text-xs font-bold text-neo-black/80">
              {t('teacher.subscription.priceTaxNote')}
            </p>
          </div>
        </div>

        <div className="mb-2">
          <p className="text-xs font-black uppercase tracking-wide text-neo-black/70 mb-1.5">
            {t('teacher.subscription.everythingInFree')}
          </p>
          <div className="space-y-1.5">
            {proFeatures.map((label) => (
              <div key={label} className="flex items-start gap-2">
                <div className="w-4 h-4 rounded bg-neo-black border-2 border-black flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-neo-cyan" strokeWidth={3} />
                </div>
                <span className="font-bold text-sm leading-snug text-neo-black">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1" />

        <Button
          onClick={() => {
            // Funnel step 1 — analytics only, and never in checkout's way.
            try {
              trackEduProUpgradeClicked({ source: 'pricing_page' });
            } catch {
              /* ignore */
            }
            onUpgradeClick();
          }}
          disabled={isLoading}
          className="w-full bg-neo-black text-white font-black text-base border-2 border-black shadow-hard hover:-translate-y-0.5 active:translate-y-0 transition-transform motion-reduce:transition-none"
        >
          {isLoading
            ? t('common.loading')
            : t('teacher.subscription.upgradeNow')}
        </Button>
        <p className="text-center text-xs font-bold text-neo-black/80 mt-1.5">
          {t('teacher.subscription.proCtaSubtext')}
        </p>
      </div>
    </div>
  );
}
