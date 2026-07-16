'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationHeader } from '@/components/education/EducationHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, X, ShieldCheck, BellRing, Lock, Sparkles } from 'lucide-react';
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

  // Free tier is deliberately framed as a starting point: the two caps a
  // growing teacher hits first are shown as explicit "missing" rows (loss framing).
  const freeFeatures = [
    { label: t('teacher.subscription.free2Classes'), included: true },
    { label: t('teacher.subscription.free30Students'), included: true },
    { label: t('teacher.subscription.basicWordTracking'), included: true },
    { label: t('teacher.subscription.dailyProgressReports'), included: true },
    { label: t('teacher.subscription.unlimitedClasses'), included: false },
    { label: t('teacher.subscription.unlimitedStudents'), included: false },
  ];

  // Pro leads with the two things Free can't do — the reason to switch first.
  const proFeatures = [
    t('teacher.subscription.unlimitedClasses'),
    t('teacher.subscription.unlimitedStudents'),
    t('teacher.subscription.basicWordTracking'),
    t('teacher.subscription.dailyProgressReports'),
  ];

  const trustChips = [
    { icon: ShieldCheck, label: t('teacher.subscription.trustCancel') },
    { icon: Lock, label: t('teacher.subscription.trustDataSafe') },
    { icon: BellRing, label: t('teacher.subscription.trustReminder') },
  ];

  return (
    <div
      className={cn('flex flex-col min-h-screen bg-neo-navy', isRTL && 'rtl')}
    >
      <EducationHeader showBackButton />

      <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14">
          <h1
            className="text-4xl md:text-5xl font-neo-display font-black text-neo-white mb-4"
            style={{ textWrap: 'balance' }}
          >
            {t('teacher.subscription.upgradePricingTitle')}
          </h1>
          <p className="text-xl text-neo-cyan font-bold mb-3">
            {t('teacher.subscription.upgradePricingSubtitle')}
          </p>
          <p className="text-base text-neo-white/80 font-bold max-w-xl mx-auto">
            {t('teacher.subscription.upgradePricingReassure')}
          </p>
        </div>

        {/* Pricing Cards — Pro leads on mobile, sits right on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start mb-8">
          {/* Free Card */}
          <div
            className={cn(
              'order-2 md:order-1',
              'border-3 border-black rounded-neo p-7 sm:p-8 shadow-hard bg-neo-cream',
              'flex flex-col'
            )}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-neo-display font-black text-neo-black mb-1">
                {t('teacher.subscription.freePlanName')}
              </h2>
              <p className="text-neo-black/70 font-bold text-sm">
                {t('teacher.subscription.freeForever')}
              </p>
            </div>

            <div className="mb-7 pb-7 border-b-3 border-black">
              <p className="text-4xl font-neo-display font-black text-neo-black">
                $0
                <span className="text-base text-neo-black/70 font-bold ms-2">
                  {t('teacher.subscription.perMonth')}
                </span>
              </p>
            </div>

            <div className="space-y-3 flex-1 mb-6">
              {freeFeatures.map((feature) => (
                <div key={feature.label} className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-5 h-5 rounded border-2 border-black flex items-center justify-center flex-shrink-0 mt-0.5',
                      feature.included ? 'bg-neo-lime' : 'bg-neo-black/10'
                    )}
                  >
                    {feature.included ? (
                      <Check className="w-4 h-4 text-black" strokeWidth={3} />
                    ) : (
                      <X className="w-4 h-4 text-neo-black/50" strokeWidth={3} />
                    )}
                  </div>
                  <span
                    className={cn(
                      'font-bold',
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

            <p className="text-sm font-bold text-neo-black/70 mb-4 leading-snug">
              {t('teacher.subscription.freeStartNote')}
            </p>

            <Button
              disabled
              className="w-full bg-neo-black/40 text-white font-black border-2 border-black cursor-not-allowed"
            >
              {t('teacher.subscription.currentPlan')}
            </Button>
          </div>

          {/* Pro Card */}
          <div
            className={cn(
              'order-1 md:order-2',
              'border-3 border-black rounded-neo p-7 sm:p-8 shadow-hard-lg',
              'bg-neo-cyan md:scale-105 md:z-10 flex flex-col relative'
            )}
          >
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-neo-pink px-4 py-1 border-2 border-black rounded-neo animate-neo-pop">
              <span className="font-neo-display font-black text-black text-sm inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" strokeWidth={3} />
                {t('teacher.subscription.popular')}
              </span>
            </div>

            <div className="mb-6 mt-2">
              <h2 className="text-2xl font-neo-display font-black text-neo-black mb-1">
                {t('teacher.subscription.proPlanName')}
              </h2>
              <p className="text-neo-black/80 font-bold text-sm">
                {t('teacher.subscription.unlimitedAccess')}
              </p>
            </div>

            <div className="mb-7 pb-7 border-b-3 border-black">
              <p className="text-5xl font-neo-display font-black text-neo-black leading-none">
                $9
                <span className="text-base text-neo-black/80 font-bold ms-2">
                  {t('teacher.subscription.perMonth')}
                </span>
              </p>
              <p className="inline-block mt-3 bg-neo-black text-neo-cyan text-xs font-black px-2.5 py-1 rounded-neo border-2 border-black">
                {t('teacher.subscription.pricePerDay')}
              </p>
            </div>

            <div className="mb-4">
              <p className="text-xs font-black uppercase tracking-wide text-neo-black/70 mb-3">
                {t('teacher.subscription.everythingInFree')}
              </p>
              <div className="space-y-3">
                {proFeatures.map((label) => (
                  <div key={label} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded bg-neo-black border-2 border-black flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-neo-cyan" strokeWidth={3} />
                    </div>
                    <span className="font-bold text-neo-black">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1" />

            <Button
              onClick={handleUpgrade}
              disabled={isLoading}
              className="w-full bg-neo-black text-white font-black text-base border-2 border-black shadow-hard hover:-translate-y-0.5 active:translate-y-0 transition-transform motion-reduce:transition-none"
            >
              {isLoading
                ? t('common.loading')
                : t('teacher.subscription.upgradeNow')}
            </Button>
            <p className="text-center text-xs font-bold text-neo-black/80 mt-3">
              {t('teacher.subscription.proCtaSubtext')}
            </p>
          </div>
        </div>

        {/* Trust / risk-reversal row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-14">
          {trustChips.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2.5 bg-neo-navy-light border-2 border-black rounded-neo px-4 py-3 shadow-hard-sm"
            >
              <Icon
                className="w-5 h-5 text-neo-lime flex-shrink-0"
                strokeWidth={2.5}
              />
              <span className="text-sm font-bold text-neo-white leading-snug">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="bg-neo-navy-light border-3 border-black rounded-neo p-7 sm:p-8 mb-12 shadow-hard">
          <h2 className="text-2xl font-neo-display font-black text-neo-white mb-6">
            {t('teacher.subscription.faqTitle')}
          </h2>

          <div className="space-y-6">
            {[
              {
                q: 'teacher.subscription.faqCancel',
                a: 'teacher.subscription.faqCancelAnswer',
              },
              {
                q: 'teacher.subscription.faqAutoRenew',
                a: 'teacher.subscription.faqAutoRenewAnswer',
              },
              {
                q: 'teacher.subscription.faqDataLoss',
                a: 'teacher.subscription.faqDataLossAnswer',
              },
            ].map(({ q, a }) => (
              <div key={q}>
                <h3 className="text-lg font-bold text-neo-cyan mb-2">{t(q)}</h3>
                <p className="text-neo-white/90 font-bold leading-relaxed">
                  {t(a)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Legal Links */}
        <div className="text-center border-t border-neo-cream/20 pt-8">
          <p className="text-neo-white/70 font-bold text-sm mb-4">
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
