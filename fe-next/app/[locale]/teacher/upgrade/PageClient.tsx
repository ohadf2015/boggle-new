'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationHeader } from '@/components/education/EducationHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function UpgradePricingPageClient() {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const [isLoading, setIsLoading] = useState(false);

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

  const freeFeatures = [
    { label: t('teacher.subscription.free2Classes'), included: true },
    { label: t('teacher.subscription.free30Students'), included: true },
    { label: t('teacher.subscription.basicWordTracking'), included: true },
    { label: t('teacher.subscription.dailyProgressReports'), included: true },
    { label: t('teacher.subscription.unlimitedClasses'), included: false },
    { label: t('teacher.subscription.unlimitedStudents'), included: false },
  ];

  const proFeatures = [
    { label: t('teacher.subscription.free2Classes'), included: true },
    { label: t('teacher.subscription.free30Students'), included: true },
    { label: t('teacher.subscription.basicWordTracking'), included: true },
    { label: t('teacher.subscription.dailyProgressReports'), included: true },
    { label: t('teacher.subscription.unlimitedClasses'), included: true },
    { label: t('teacher.subscription.unlimitedStudents'), included: true },
  ];

  return (
    <div
      className={cn('flex flex-col min-h-screen bg-neo-navy', isRTL && 'rtl')}
    >
      <EducationHeader showBackButton />

      <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-neo-display font-black text-neo-white mb-4">
            {t('teacher.subscription.upgradePricingTitle')}
          </h1>
          <p className="text-xl text-neo-cyan font-bold">
            {t('teacher.subscription.upgradePricingSubtitle')}
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Free Card */}
          <div
            className={cn(
              'border-3 border-black rounded-neo p-8 shadow-hard bg-neo-cream',
              'flex flex-col'
            )}
          >
            <div className="mb-6">
              <h2 className="text-3xl font-neo-display font-black text-neo-black mb-2">
                {t('teacher.subscription.freePlanName')}
              </h2>
              <p className="text-neo-black/60 font-bold">
                {t('teacher.subscription.freeForever')}
              </p>
            </div>

            <div className="mb-8 pb-8 border-b-3 border-black">
              <p className="text-4xl font-neo-display font-black text-neo-black">
                $0
                <span className="text-lg text-neo-black/60 font-bold ms-2">
                  {t('teacher.subscription.perMonth')}
                </span>
              </p>
            </div>

            <div className="space-y-3 flex-1 mb-8">
              {freeFeatures.map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-start gap-3"
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded border-2 border-black flex items-center justify-center flex-shrink-0 mt-0.5',
                      feature.included ? 'bg-neo-lime' : 'bg-neo-cream'
                    )}
                  >
                    {feature.included && <Check className="w-4 h-4 text-black" />}
                  </div>
                  <span
                    className={cn(
                      'font-bold',
                      feature.included ? 'text-neo-black' : 'text-neo-black/50'
                    )}
                  >
                    {feature.label}
                  </span>
                </div>
              ))}
            </div>

            <Button
              disabled
              className="w-full bg-neo-black/50 text-white font-black border-2 border-black shadow-hard-sm cursor-not-allowed"
            >
              {t('teacher.subscription.currentPlan')}
            </Button>
          </div>

          {/* Pro Card */}
          <div
            className={cn(
              'border-3 border-black rounded-neo p-8 shadow-hard-lg',
              'bg-neo-cyan transform md:scale-105 md:z-10 flex flex-col relative'
            )}
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-neo-pink px-4 py-1 border-2 border-black rounded-neo">
              <span className="font-neo-display font-black text-black text-sm">
                {t('teacher.subscription.popular')}
              </span>
            </div>

            <div className="mb-6">
              <h2 className="text-3xl font-neo-display font-black text-neo-black mb-2">
                {t('teacher.subscription.proPlanName')}
              </h2>
              <p className="text-neo-black/60 font-bold">
                {t('teacher.subscription.unlimitedAccess')}
              </p>
            </div>

            <div className="mb-8 pb-8 border-b-3 border-black">
              <p className="text-4xl font-neo-display font-black text-neo-black">
                $9
                <span className="text-lg text-neo-black/60 font-bold ms-2">
                  {t('teacher.subscription.perMonth')}
                </span>
              </p>
              <p className="text-xs font-bold text-neo-black/50 mt-2">
                {t('teacher.subscription.autoRenew')}
              </p>
            </div>

            <div className="space-y-3 flex-1 mb-8">
              {proFeatures.map((feature) => (
                <div
                  key={feature.label}
                  className="flex items-start gap-3"
                >
                  <div className="w-5 h-5 rounded bg-neo-lime border-2 border-black flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-black" />
                  </div>
                  <span className="font-bold text-neo-black">
                    {feature.label}
                  </span>
                </div>
              ))}
            </div>

            <Button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="w-full bg-neo-black text-white font-black border-2 border-black shadow-hard hover:-translate-y-0.5 transition-all"
            >
              {isLoading ? t('common.loading') : t('teacher.subscription.upgradeNow')}
            </Button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-neo-navy-light border-3 border-black rounded-neo p-8 mb-12 shadow-hard">
          <h2 className="text-2xl font-neo-display font-black text-neo-white mb-6">
            {t('teacher.subscription.faqTitle')}
          </h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-neo-cyan mb-2">
                {t('teacher.subscription.faqCancel')}
              </h3>
              <p className="text-neo-white/80 font-bold leading-relaxed">
                {t('teacher.subscription.faqCancelAnswer')}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-neo-cyan mb-2">
                {t('teacher.subscription.faqAutoRenew')}
              </h3>
              <p className="text-neo-white/80 font-bold leading-relaxed">
                {t('teacher.subscription.faqAutoRenewAnswer')}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-neo-cyan mb-2">
                {t('teacher.subscription.faqDataLoss')}
              </h3>
              <p className="text-neo-white/80 font-bold leading-relaxed">
                {t('teacher.subscription.faqDataLossAnswer')}
              </p>
            </div>
          </div>
        </div>

        {/* Legal Links */}
        <div className="text-center border-t border-neo-cream/20 pt-8">
          <p className="text-neo-white/60 font-bold text-sm mb-4">
            {t('teacher.subscription.legalNote')}
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link
              href={`/${language}/legal/terms`}
              className="text-neo-cyan hover:text-neo-lime font-bold underline transition-colors"
            >
              {t('legal.termsOfService')}
            </Link>
            <Link
              href={`/${language}/legal/refund`}
              className="text-neo-cyan hover:text-neo-lime font-bold underline transition-colors"
            >
              {t('legal.refundPolicy')}
            </Link>
            <Link
              href={`/${language}/legal/privacy`}
              className="text-neo-cyan hover:text-neo-lime font-bold underline transition-colors"
            >
              {t('legal.privacyPolicy')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
