'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import nextDynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { ShieldCheck, Lock, Smile, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { EducationHeader } from '@/components/education/EducationHeader';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { cn } from '@/lib/utils';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import {
  markResumeCheckoutIntent,
  clearResumeCheckoutIntent,
  consumeResumeCheckoutIntent,
  consumeResumeTrialFlag,
} from '@/lib/teacher/resumeCheckout';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { polarTrialUx } from '@/lib/education/polarTrial';
import { trackTrialCtaTap, trackTrialCtaView } from '@/lib/education/proFunnelTelemetry';
import { upgradeViewer, showTrialOffer } from '@/lib/education/pro/upgradeViewer';
import { resumeDecision } from '@/lib/education/pro/resumeDecision';
import { readAskSchoolParams, type UpgradeTab } from '@/lib/education/pro/askSchool';
import { PlanComparisonMatrix } from '@/components/teacher/PlanComparisonMatrix';
import { UpgradePlanCards } from '@/components/teacher/pro/UpgradePlanCards';
import { AskSchoolPanel } from '@/components/teacher/pro/AskSchoolPanel';
import { SchoolPlanSection } from '@/components/teacher/pro/SchoolPlanSection';
import { ProPreviewStrip } from '@/components/teacher/pro/ProPreviewStrip';
import { UpgradeFaq } from '@/components/teacher/pro/UpgradeFaq';
import { ParentReportPack } from '@/components/teacher/pro/ParentReportPack';

const AuthModal = nextDynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

export default function UpgradePricingPageClient() {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { user, profile, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const { tab: linkTab, requester } = readAskSchoolParams(new URLSearchParams(searchParams?.toString() ?? ''));
  const [tab, setTab] = useState<UpgradeTab>(linkTab);
  const [askOpen, setAskOpen] = useState(false);
  const [pending, setPending] = useState<null | 'trial' | 'paid'>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const { hasPro, loading: proLoading, status, source, trialUsed, known, portalUrl, refresh } = useTeacherPro();

  const offerTrial = known === true && !proLoading && polarTrialUx({
    hasPro,
    status: status ?? 'active',
    source,
    trialUsed: trialUsed === true,
  }).offerTrial;
  const viewer = upgradeViewer({ authLoading, signedIn: Boolean(user), proLoading, known: known === true, hasPro });
  const showTrial = showTrialOffer(viewer, offerTrial);

  // Conversion surface: PWAInstallPrompt and ComebackBonusWrapper read this and stay closed.
  useEffect(() => {
    document.body.classList.add('conversion-surface');
    return () => {
      document.body.classList.remove('conversion-surface');
    };
  }, []);

  useEffect(() => {
    trackGrowthEvent('iap_viewed', { product: 'teacher_pro' });
  }, []);

  useEffect(() => {
    if (!showTrial) return;
    try {
      trackTrialCtaView({ source: 'upgrade_page' });
    } catch {
      /* analytics must never block the till */
    }
  }, [showTrial]);

  const handleUpgrade = useCallback(async (trial: boolean) => {
    setPending(trial ? 'trial' : 'paid');
    if (trial) {
      try {
        trackTrialCtaTap({ source: 'upgrade_page' });
      } catch {
        /* analytics must never block the till */
      }
    }
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        ...(trial
          ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trial: true }) }
          : {}),
      });
      if (!response.ok) {
        if (response.status === 401) {
          toast.error(t('teacher.subscription.signInRequired'));
          markResumeCheckoutIntent({ trial });
          setShowAuthModal(true);
          return;
        }
        // 503 is the server's own "till is shut": retrying cannot fix it, so say where to go instead.
        if (response.status === 503) {
          toast.error(
            <span>
              {t('eg2Pro.upgrade.checkoutOffline')}{' '}
              <a href={`/${language}/contact`} className="font-black underline">{t('eg2Pro.upgrade.contactUs')}</a>
            </span>,
            { duration: 8000 },
          );
          return;
        }
        toast.error(t('teacher.subscription.checkoutError'));
        return;
      }
      clearResumeCheckoutIntent();
      const { url } = await response.json();
      window.location.href = url;
    } catch {
      toast.error(t('teacher.subscription.checkoutError'));
    } finally {
      setPending(null);
    }
  }, [t, language]);

  // Resume after sign-in only once the entitlement is read: the server turns an ineligible
  // trial into a paid checkout, and a Pro account must not be sent to buy Pro again.
  useEffect(() => {
    if (authLoading || !user || proLoading || known !== true) return;
    if (!consumeResumeCheckoutIntent()) return;
    const trial = consumeResumeTrialFlag();
    setShowAuthModal(false);
    const decision = resumeDecision({ trial, proLoading, known: true, hasPro, offerTrial });
    if (decision === 'checkout-trial') void handleUpgrade(true);
    else if (decision === 'checkout-paid') void handleUpgrade(false);
    else if (decision === 'trial-used') toast(t('eg2Pro.upgrade.trialUsed'));
    else if (decision === 'already-pro') toast.success(t('eg2Pro.upgrade.alreadyPro'));
  }, [user, authLoading, proLoading, known, hasPro, offerTrial, handleUpgrade, t]);

  const openSchool = () => {
    setTab('school');
    trackGrowthEvent('iap_viewed', { product: 'district_inquiry' });
    tabsRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  // The two caps are interpolated from the tier config, never retyped into copy.
  const freeFeatures = [
    {
      label: t('teacher.subscription.freeClasses', {
        count: String(FREE_TIER_LIMITS.classes),
      }),
      included: true,
    },
    {
      label: t('teacher.subscription.freeStudents', {
        count: String(FREE_TIER_LIMITS.studentsPerClass),
      }),
      included: true,
    },
    { label: t('education.landing.pro.customLists'), included: true },
    { label: t('education.landing.pro.noAds'), included: true },
    { label: t('teacher.subscription.unlimitedClasses'), included: false },
    { label: t('teacher.subscription.unlimitedStudents'), included: false },
    { label: t('education.landing.pro.analytics'), included: false },
    { label: t('eduPro.upgrade.freeMastery'), included: false },
    { label: t('eduPro.upgrade.freePractice'), included: false },
  ];

  const proFeatures = [
    t('teacher.subscription.featureOutcome1'),
    t('teacher.subscription.featureOutcome2'),
    t('teacher.subscription.featureOutcome3'),
    t('teacher.subscription.featureOutcome4'),
    // Calm mode is the pedagogic reason a department pays, not a fifth toggle.
    t('teacher.subscription.featureOutcome5'),
    t('eduPro.upgrade.featureMastery'),
    t('eduPro.upgrade.featureMissedPractice'),
    t('eg2Pro.plans.featureParentPack'),
  ];

  const legalLinks = (
    <>
      {(['terms', 'refund', 'privacy'] as const).map((page) => (
        <Link
          key={page}
          href={`/${language}/legal/${page}`}
          className="text-neo-cyan hover:text-neo-lime font-bold text-xs underline transition-colors"
        >
          {t(page === 'terms' ? 'legal.termsOfService' : page === 'refund' ? 'legal.refundPolicy' : 'legal.privacyPolicy')}
        </Link>
      ))}
    </>
  );

  const trustChips = [
    { icon: ShieldCheck, label: t('teacher.subscription.trustCancel') },
    { icon: Lock, label: t('teacher.subscription.trustDataSafe') },
    { icon: Smile, label: t('eg2Pro.upgrade.trustStudents') },
  ];

  const tabButton = (value: UpgradeTab, label: string) => (
    <button
      type="button"
      role="tab"
      id={`upgrade-tab-${value}`}
      aria-selected={tab === value}
      aria-controls={`upgrade-panel-${value}`}
      onClick={() => setTab(value)}
      className={cn(
        'min-h-11 flex-1 rounded-neo border-2 px-4 font-neo-display text-sm font-black transition-colors sm:flex-none sm:px-6',
        tab === value
          ? 'border-neo-black bg-neo-lime text-neo-black shadow-hard-sm'
          : 'border-neo-cream/40 bg-neo-navy-light text-neo-white hover:border-neo-lime',
      )}
    >
      {label}
    </button>
  );

  return (
    <EducationShell
      data-testid="education-shell"
      header={<EducationHeader showBackButton />}
      contentClassName={cn('w-full px-4 lg:px-6', isRTL && 'rtl')}
      footer={
        <div
          data-testid="upgrade-footer"
          className="hidden lg:block shrink-0 border-t border-neo-cream/20 pt-3 pb-3 px-4 text-center"
        >
          <p className="text-neo-white/70 font-bold text-xs mb-1.5">{t('teacher.subscription.legalNote')}</p>
          <div className="flex flex-wrap justify-center gap-3">{legalLinks}</div>
        </div>
      }
      className="bg-neo-navy"
    >
      <div className="mx-auto max-w-6xl pb-8">
        {viewer === 'pro' && (
          <section data-testid="pro-tools" className="mb-6">
            <p className="text-xs font-black uppercase tracking-widest text-neo-lime">{t('eg2Pro.tools.eyebrow')}</p>
            <h1 className="mb-3 font-neo-display text-2xl font-black text-neo-white md:text-3xl">{t('eg2Pro.tools.title')}</h1>
            <ParentReportPack />
          </section>
        )}

        <div ref={tabsRef} className="mb-4 flex flex-col gap-3 scroll-mt-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p data-testid="upgrade-value-eyebrow" className="text-xs font-black uppercase tracking-widest text-neo-cyan">
              {t('teacher.subscription.proPlanName')}
            </p>
            {viewer === 'pro' ? (
              <h2 className="font-neo-display text-xl font-black text-neo-white md:text-2xl">{t('eg2Pro.tools.plansTitle')}</h2>
            ) : (
              <h1 className="font-neo-display text-2xl font-black text-neo-white md:text-3xl" style={{ textWrap: 'balance' }}>
                {t('teacher.subscription.upgradePricingTitle')}
              </h1>
            )}
            <p data-testid="upgrade-value-prop" className="mt-0.5 text-sm font-bold text-neo-lime">
              {t('teacher.subscription.valueHeadline')}
            </p>
          </div>
          <div role="tablist" aria-label={t('eg2Pro.tabs.label')} className="flex gap-2">
            {tabButton('teacher', t('eg2Pro.tabs.teacher'))}
            {tabButton('school', t('eg2Pro.tabs.school'))}
          </div>
        </div>

        {tab === 'teacher' ? (
          <div id="upgrade-panel-teacher" role="tabpanel" aria-labelledby="upgrade-tab-teacher" data-testid="upgrade-hero-section">
            <UpgradePlanCards
              viewer={viewer}
              freeFeatures={freeFeatures}
              proFeatures={proFeatures}
              showTrial={showTrial}
              pending={pending}
              onTrial={() => { void handleUpgrade(true); }}
              onBuy={() => { void handleUpgrade(false); }}
              onSchool={openSchool}
              manageBillingHref={portalUrl}
              askSchool={
                askOpen ? (
                  <AskSchoolPanel
                    requesterName={String((profile as { display_name?: string } | null)?.display_name ?? '')}
                    origin={typeof window !== 'undefined' ? window.location.origin : ''}
                  />
                ) : (
                  <button
                    type="button"
                    data-testid="ask-school-toggle"
                    onClick={() => {
                      setAskOpen(true);
                      trackGrowthEvent('landing_cta_clicked', { cta: 'ask_school_open', source: 'teacher_upgrade' });
                    }}
                    className="inline-flex items-center justify-center gap-1 text-sm font-black text-neo-black underline decoration-2 underline-offset-2"
                  >
                    {t('eg2Pro.plans.askSchool')} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden />
                  </button>
                )
              }
            />
            <div data-testid="upgrade-legal-inline" className="lg:hidden mt-3 text-center">
              <p className="text-neo-white/70 font-bold text-xs mb-1">{t('teacher.subscription.legalNote')}</p>
              <div className="flex flex-wrap justify-center gap-3">{legalLinks}</div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {trustChips.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  data-testid="trust-chip"
                  className="flex items-center gap-2 rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light px-3 py-2"
                >
                  <Icon className="h-4 w-4 shrink-0 text-neo-lime" strokeWidth={2.5} aria-hidden />
                  <span className="text-xs font-bold leading-snug text-neo-white">{label}</span>
                </div>
              ))}
            </div>
            <ProPreviewStrip />
            <div className="mt-8">
              <PlanComparisonMatrix compact />
            </div>
          </div>
        ) : (
          <div id="upgrade-panel-school" role="tabpanel" aria-labelledby="upgrade-tab-school">
            <SchoolPlanSection requester={requester} />
          </div>
        )}

        <UpgradeFaq />
      </div>

      {/* onAuthSuccess re-reads the entitlement; the resume effect above then decides. */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="signin"
          onAuthSuccess={() => { void refresh(); }}
        />
      )}
    </EducationShell>
  );
}
