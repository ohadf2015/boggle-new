'use client';

import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useState, useEffect, useRef } from 'react';
import nextDynamic from 'next/dynamic';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, Lock, Smile, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { cn } from '@/lib/utils';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { polarTrialUx } from '@/lib/education/polarTrial';
import { trackTrialCtaView } from '@/lib/education/proFunnelTelemetry';
import { MAX_PLAYERS_PER_ROOM } from '@/shared/constants/gameConstants';
import { useUpgradeCheckout } from '@/hooks/useUpgradeCheckout';
import { upgradeViewer, showTrialOffer } from '@/lib/education/pro/upgradeViewer';
import { readAskSchoolParams, type UpgradeTab } from '@/lib/education/pro/askSchool';
import { PlanComparisonMatrix } from '@/components/teacher/PlanComparisonMatrix';
import { UpgradePlanCards } from '@/components/teacher/pro/UpgradePlanCards';
import { AskSchoolPanel } from '@/components/teacher/pro/AskSchoolPanel';
import { SchoolPlanSection } from '@/components/teacher/pro/SchoolPlanSection';
import { ProPreviewStrip } from '@/components/teacher/pro/ProPreviewStrip';
import { TeacherProofLine } from '@/components/teacher/pro/TeacherProofLine';
import { UpgradeFaq } from '@/components/teacher/pro/UpgradeFaq';
import { ParentReportPack } from '@/components/teacher/pro/ParentReportPack';
import { ProPlanPanel, PlanCardsSkeleton } from '@/components/teacher/pro/ProPlanPanel';

const AuthModal = nextDynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

/** `hasSession`: the server saw a Supabase auth cookie, so first paint waits for the plan instead of pitching a trial. */
export default function UpgradePricingPageClient({ hasSession = false }: { hasSession?: boolean } = {}) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { user, profile, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const { tab: linkTab, requester } = readAskSchoolParams(new URLSearchParams(searchParams?.toString() ?? ''));
  const [tab, setTab] = useState<UpgradeTab>(linkTab);
  const [askOpen, setAskOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const { hasPro, loading: proLoading, status, source, trialUsed, known, portalUrl, refresh, trialExpires, periodEnd } = useTeacherPro();

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

  // Count a trial view only once the viewer is resolved: while loading the trial is shown to
  // everyone (server render included), and Pro / trial-used accounts would inflate the count.
  useEffect(() => {
    if (!showTrial || viewer === 'loading') return;
    try {
      trackTrialCtaView({ source: 'upgrade_page' });
    } catch {
      /* analytics must never block the till */
    }
  }, [showTrial, viewer]);

  const { pending, handleUpgrade, showAuthModal, setShowAuthModal } = useUpgradeCheckout({
    t, language, user, authLoading, proLoading, known, hasPro, offerTrial,
  });
  // Signed in and waiting on the entitlement: a skeleton, not a trial offer that flips away.
  const resolvingPlan = viewer === 'loading' && (Boolean(user) || hasSession);

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

  const legalFooter = (
    <div
      data-testid="upgrade-footer"
      className="hidden lg:block shrink-0 border-t border-neo-cream/20 mt-8 pt-3 pb-3 px-4 text-center"
    >
      <p className="text-neo-white/70 font-bold text-xs mb-1.5">{t('teacher.subscription.legalNote')}</p>
      <div className="flex flex-wrap justify-center gap-3">{legalLinks}</div>
    </div>
  );

  return (
    <EducationShell
      data-testid="education-shell"
      contentClassName={cn('w-full px-4 lg:px-6', isRTL && 'rtl')}
      className="bg-neo-navy"
    >
      <div className="mx-auto max-w-6xl pb-8 pt-4 lg:pt-6">
        {resolvingPlan ? (
          <PlanCardsSkeleton />
        ) : viewer === 'pro' ? (
          <>
            <h1 className="mb-4 font-neo-display text-2xl font-black text-neo-white md:text-3xl">{t('eg2Pro.tools.plansTitle')}</h1>
            <ProPlanPanel
              status={status}
              source={source}
              trialExpires={trialExpires}
              periodEnd={periodEnd}
              portalUrl={portalUrl}
              included={proFeatures}
            />
            <section data-testid="pro-tools" className="mt-8">
              <h2 className="mb-3 font-neo-display text-xl font-black text-neo-white md:text-2xl">{t('eg2Pro.tools.title')}</h2>
              <ParentReportPack />
            </section>
            <UpgradeFaq />
          </>
        ) : (
          <>
            <div ref={tabsRef} className="mb-4 flex flex-col gap-3 scroll-mt-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p data-testid="upgrade-value-eyebrow" className="text-xs font-black uppercase tracking-widest text-neo-cyan">
                  {t('teacher.subscription.proPlanName')}
                </p>
                <h1 className="font-neo-display text-2xl font-black text-neo-white md:text-3xl" style={{ textWrap: 'balance' }}>
                  {t('teacher.subscription.upgradePricingTitle')}
                </h1>
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
                        {t('eg2Pro.plans.askSchool')} <DirectionalIcon icon={ArrowRight} className="h-3.5 w-3.5" />
                      </button>
                    )
                  }
                />
                <p className="mt-3 text-center text-xs font-bold text-neo-white/70">
                  {t('eduPlans.cards.liveCapNote', { players: MAX_PLAYERS_PER_ROOM })}
                </p>
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
                <TeacherProofLine />
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
          </>
        )}
        {legalFooter}
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
