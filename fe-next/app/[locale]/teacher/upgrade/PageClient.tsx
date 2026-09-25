'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import nextDynamic from 'next/dynamic';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { EducationHeader } from '@/components/education/EducationHeader';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { Button } from '@/components/ui/button';
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
import { ShieldCheck, BellRing, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { PricingCards } from '@/components/teacher/PricingCards';

const AuthModal = nextDynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

export default function UpgradePricingPageClient() {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { user, loading: authLoading } = useAuth();
  const [pending, setPending] = useState<null | 'trial' | 'paid'>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const pendingTrial = useRef(false);
  const { hasPro, loading: proLoading, status, source, trialUsed, known } = useTeacherPro();
  // Hide the trial until status has actually loaded. A failed read stays on the
  // paid CTA — offering a free trial we could not check is a second trial.
  const offerTrial = known === true && !proLoading && polarTrialUx({
    hasPro,
    status: status ?? 'active',
    source,
    trialUsed: trialUsed === true,
  }).offerTrial;
  // ponytail: no client-side checkout flag. There used to be one
  // (`NEXT_PUBLIC_CHECKOUT_ENABLED === 'true'`) and it shipped the only revenue button in the
  // product as `disabled` in production while the server was ready to sell — `NEXT_PUBLIC_*` is
  // inlined at BUILD time, so the bundle held a frozen copy of a value the API re-reads on every
  // request. Two readers of one value, and the stale one won the render.
  //
  // /api/subscription/checkout already refuses with 503 when the till is shut, and that gate sits
  // BEFORE its auth check, so nobody can reach Polar past it. One gate, server-side, always fresh.
  // A 503 is surfaced below instead of being pre-empted here.

  // Mark this page as a conversion surface to suppress modals that would block the CTA.
  // This runtime signal is read by PWAInstallPrompt and ComebackBonusWrapper before
  // they render, preventing them from creating overlays on a payment page.
  // See: Route blocklists don't converge — use the runtime signal lesson.
  useEffect(() => {
    document.body.classList.add('conversion-surface');
    return () => {
      document.body.classList.remove('conversion-surface');
    };
  }, []);

  useEffect(() => {
    trackGrowthEvent('iap_viewed', { product: 'teacher_pro' });
  }, []);

  const handleUpgrade = useCallback(async (trial: boolean) => {
    pendingTrial.current = trial;
    setPending(trial ? 'trial' : 'paid');
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
        ...(trial
          ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trial: true }) }
          : {}),
      });

      if (!response.ok) {
        // 401 means the user is not authenticated. Show the auth modal instead of a generic error.
        if (response.status === 401) {
          toast.error(t('teacher.subscription.signInRequired'));
          markResumeCheckoutIntent({ trial });
          setShowAuthModal(true);
          return;
        }
        // 503 is the server's own "till is shut" refusal. Retrying cannot fix it, so the generic
        // "please try again" would loop the teacher forever.
        if (response.status === 503) {
          toast.error(t('teacher.subscription.checkoutUnavailable'));
          return;
        }
        toast.error(t('teacher.subscription.checkoutError'));
        return;
      }

      clearResumeCheckoutIntent();
      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      toast.error(t('teacher.subscription.checkoutError'));
    } finally {
      setPending(null);
    }
  }, [t]);

  // Resumes checkout once the teacher is authenticated and a resume flag is pending.
  // This is the mechanism of record — it survives BOTH ways auth can leave this
  // component: a magic-link / email-confirmation click (navigates to /auth/callback,
  // which redirects back to this exact page via its `next` param, remounting it with
  // a fresh session) and the plain window.location.reload() that
  // useAuthInitialization fires on every guest -> authenticated sign-in on this page
  // (see the AuthModal usage below). AuthModal's onAuthSuccess is only a fast-path
  // attempt for when no reload intervenes; this effect is what actually guarantees
  // the resume.
  useEffect(() => {
    if (authLoading || !user) return;
    if (!consumeResumeCheckoutIntent()) return;
    const trial = consumeResumeTrialFlag();
    pendingTrial.current = trial;
    setShowAuthModal(false);
    handleUpgrade(trial);
  }, [user, authLoading, handleUpgrade]);

  // Free tier is deliberately framed as a starting point: the two caps a
  // growing teacher hits first are shown as explicit "missing" rows (loss framing).
  // The two caps are INTERPOLATED from the tier config, never retyped. They used to be
  // baked into the copy as "2"/"30" in six locales, so tightening the paywall would have
  // advertised one limit while enforcing another — on the only page in the portfolio that
  // can take money. Change the numbers in lib/lemonsqueezy.ts and every locale follows.
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
    // These two are genuinely free. Custom lists (19 created in prod, per usage data)
    // and ad-free play work today. Duels is a dead feature (0 student_duels rows ever),
    // so we don't advertise it as part of any tier.
    //
    // The `education.landing.pro.*` namespace is already translated into six locales.
    { label: t('education.landing.pro.customLists'), included: true },
    { label: t('education.landing.pro.noAds'), included: true },
    { label: t('teacher.subscription.unlimitedClasses'), included: false },
    { label: t('teacher.subscription.unlimitedStudents'), included: false },
    // The one crossed-out FEATURE, and the reason the $9 is legible at all. Until 2026-08-25
    // this column instead promised "Basic word tracking" and "Daily progress reports" as free
    // — while the Pro column beside it sold reporting, and while ProGate refuses analytics in
    // the product. The page sold the same thing on both sides of its own table, then the
    // dashboard upsold what the pricing page had already given away.
    { label: t('education.landing.pro.analytics'), included: false },
  ];

  // Pro leads with outcome-driven value propositions, not just features.
  // These are reordered from feature-speak to outcome-speak: what a teacher can *do*,
  // not what they *get*. The first two are the pain points Free can't address.
  const proFeatures = [
    t('teacher.subscription.featureOutcome1'), // Unlimited classes without cap worry
    t('teacher.subscription.featureOutcome2'), // Add students without waiting/headaches
    t('teacher.subscription.featureOutcome3'), // Real-time progress tracking
    t('teacher.subscription.featureOutcome4'), // Compare strategies across all your classes
  ];

  // ponytail: no per-student anchor here on purpose. Dividing the Pro price by the
  // FREE tier's student cap quotes the worst per-student rate Pro can have — Pro is
  // unlimited, so a real class of 30 is $0.30 and a hundred is $0.09. It anchored
  // against the sale. "About $0.30 a day" below is true, simpler, and already the
  // strongest framing on the card; a second anchor only competed with it.

  const trustChips = [
    { icon: ShieldCheck, label: t('teacher.subscription.trustCancel') },
    { icon: Lock, label: t('teacher.subscription.trustDataSafe') },
    { icon: BellRing, label: t('teacher.subscription.trustReminder') },
  ];

  return (
    <EducationShell
      data-testid="education-shell"
      header={<EducationHeader showBackButton />}
      contentClassName={cn('w-full px-4 lg:px-6', isRTL && 'rtl')}
      footer={
        <div
          data-testid="upgrade-footer"
          className="shrink-0 border-t border-neo-cream/20 pt-3 pb-3 px-4 text-center"
        >
          <p className="text-neo-white/70 font-bold text-xs mb-1.5">
            {t('teacher.subscription.legalNote')}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href={`/${language}/legal/terms`}
              className="text-neo-cyan hover:text-neo-lime font-bold text-xs underline transition-colors"
            >
              {t('legal.termsOfService')}
            </Link>
            <Link
              href={`/${language}/legal/refund`}
              className="text-neo-cyan hover:text-neo-lime font-bold text-xs underline transition-colors"
            >
              {t('legal.refundPolicy')}
            </Link>
            <Link
              href={`/${language}/legal/privacy`}
              className="text-neo-cyan hover:text-neo-lime font-bold text-xs underline transition-colors"
            >
              {t('legal.privacyPolicy')}
            </Link>
          </div>
        </div>
      }
      className="bg-neo-navy"
    >
      {/* Two-column layout at lg: hero/image on left, pricing/CTA on right.
          Stacks to single column on smaller screens. */}
      <div className="max-w-7xl mx-auto">
        {/* Compact header — eyebrow + h1 only. Value prop and reassure fold into pricing column. */}
        <div className="text-center mb-2 lg:mb-3">
          <p
            data-testid="upgrade-value-eyebrow"
            className="text-xs font-black uppercase tracking-widest text-neo-cyan mb-1"
          >
            {t('teacher.subscription.proPlanName')}
          </p>
          <h1
            className="text-2xl md:text-3xl font-neo-display font-black text-neo-white"
            style={{ textWrap: 'balance' }}
          >
            {t('teacher.subscription.upgradePricingTitle')}
          </h1>
        </div>

        {/* Two-column layout: image left, pricing cards + metadata right */}
        <div
          data-testid="upgrade-hero-section"
          className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6 items-stretch mb-3"
        >
          {/* Hero image — capped by height on lg to preserve vertical budget. The trial
              and $9 CTAs live in the Pro card, so this stays decorative and shrinks
              first when the pricing column is taller. */}
          <div className="flex justify-center order-2 lg:order-1">
            <Image
              src="/images/education/pro-hero-poster.webp"
              alt={t('teacher.subscription.proHeroAlt')}
              width={960}
              height={540}
              priority
              sizes="(max-width: 1024px) 100vw, (max-width: 1920px) 50vw, 960px"
              className="w-full max-w-sm h-auto max-h-40 lg:max-h-full rounded-neo border-neo border-black shadow-hard-lg object-cover"
            />
          </div>

          {/* Pricing cards + reassurance text — right side on lg */}
          <div className="order-1 lg:order-2 flex flex-col gap-2">
            {/* Value prop + reassurance fit above pricing cards. mb-4 (not the flex gap
                alone) is load-bearing: the "Most Popular" badge is absolutely positioned
                above the Pro card's top edge (-top-3, plus the card's own md:scale-105),
                so this block needs real clearance or the badge overlaps the reassure
                line's last wrapped words. */}
            <div className="mb-4">
              <p
                data-testid="upgrade-value-prop"
                className="text-sm lg:text-base text-neo-lime font-black mb-1"
                style={{ textWrap: 'balance' }}
              >
                {t('teacher.subscription.valueHeadline')}
              </p>
              <p className="text-xs text-neo-white/80 font-bold leading-snug">
                {t('teacher.subscription.upgradePricingReassure')}
              </p>
            </div>

            {/* Trial is the low-friction action. $9/mo stays the paid checkout. */}
            <PricingCards
              freeFeatures={freeFeatures}
              proFeatures={proFeatures}
              isLoading={pending !== null}
              pending={pending}
              showTrial={offerTrial}
              onTrialClick={() => { void handleUpgrade(true); }}
              onUpgradeClick={() => { void handleUpgrade(false); }}
            />
          </div>
        </div>

        {/* Trust / risk-reversal row — compact single row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
          {trustChips.map(({ icon: Icon, label }) => (
            <div
              key={label}
              data-testid="trust-chip"
              className="flex items-center justify-center lg:justify-start gap-2 bg-neo-navy-light border-2 border-neo-cream/40 rounded-neo px-2.5 py-1 text-center lg:text-start"
            >
              <Icon
                className="w-3.5 h-3.5 text-neo-lime flex-shrink-0"
                strokeWidth={2.5}
              />
              <span className="text-xs font-bold text-neo-white leading-snug">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* District / school pricing — a plain text link, deliberately NOT a bordered
            card. The trial and $9 buttons live in the Pro card; a CTA-shaped box
            here would compete with them. */}
        <p className="text-center text-xs font-bold text-neo-white/60 mb-1.5">
          {t('teacher.subscription.districtTitle')}{' '}
          <Link
            href={`/${language}/education/for-schools`}
            onClick={() => trackGrowthEvent('iap_viewed', { product: 'district_inquiry' })}
            className="text-neo-cyan hover:text-neo-lime underline"
          >
            {t('teacher.subscription.districtCta')}
          </Link>
        </p>

        {/* FAQ Section — behind a disclosure (collapsed by default) — compact */}
        <details className="mb-0">
          <summary className="cursor-pointer bg-neo-navy-light border-2 border-neo-cream/40 rounded-neo p-2 hover:bg-neo-navy transition-colors">
            <h2 className="text-sm lg:text-base font-neo-display font-black text-neo-white inline-flex items-center gap-2">
              {t('teacher.subscription.faqTitle')}
              <span className="text-xs text-neo-lime font-bold">▼</span>
            </h2>
          </summary>

          <div className="bg-neo-navy-light border-2 border-t-0 border-neo-cream/40 rounded-b-neo p-4 shadow-hard">
            <div className="space-y-3">
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
                  <h3 className="text-sm font-bold text-neo-cyan mb-1">{t(q)}</h3>
                  <p className="text-xs text-neo-white/90 font-bold leading-relaxed">
                    {t(a)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </details>
      </div>

      {/* Auth modal for unauthenticated checkout attempts (401). onAuthSuccess is a
          fast-path retry for the paths that authenticate inside the modal (OAuth,
          password, OTP) instead of leaving the teacher to press "Upgrade Now" a second
          time. It is NOT the only path: a genuine guest -> authenticated sign-in on
          this page also fires useAuthInitialization's one-shot window.location.reload()
          (contexts/auth/hooks/useAuthInitialization.ts), which can race and cancel
          this fetch. That's fine — the resume effect above survives the reload (the
          flag lives in localStorage, not React state) and finishes the job once the
          page comes back with a session. Cancelling the modal deliberately does NOT
          clear the flag: it only clears once checkout actually succeeds, so a reload
          mid-flow can't strand the teacher short one click. The 15-minute TTL bounds
          the cost of that choice. */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode="signin"
          onAuthSuccess={() => { void handleUpgrade(pendingTrial.current); }}
        />
      )}
    </EducationShell>
  );
}
