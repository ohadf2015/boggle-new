'use client';

import { useState, useEffect, useCallback } from 'react';
import nextDynamic from 'next/dynamic';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { EducationHeader } from '@/components/education/EducationHeader';
import { PlanComparisonMatrix } from '@/components/teacher/PlanComparisonMatrix';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { Check, X, ShieldCheck, BellRing, Lock, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

const AuthModal = nextDynamic(() => import('@/components/auth/AuthModal'), { ssr: false });

// A guest who hits the 401 checkout wall proves intent to buy before the wall ever
// shows up — they already clicked "Upgrade Now". Losing that click to a second manual
// click after they finish signing in is the wall this flag removes: it survives a full
// page reload (localStorage, not React state) so it also covers a magic-link or
// email-confirmation click, which authenticates in a fresh navigation, not inside the
// modal. Timestamped and capped at 15 minutes so a teacher who abandons the auth flow
// and logs in hours/days later for an unrelated reason never gets an unsolicited
// redirect to Polar checkout the next time they happen to land on this page.
const RESUME_CHECKOUT_KEY = 'lc_resume_checkout_after_auth';
const RESUME_CHECKOUT_TTL_MS = 15 * 60 * 1000;

function markResumeCheckoutIntent() {
  try {
    localStorage.setItem(RESUME_CHECKOUT_KEY, String(Date.now()));
  } catch {
    // localStorage unavailable (private mode, etc.) — the teacher just clicks twice.
  }
}

function clearResumeCheckoutIntent() {
  try {
    localStorage.removeItem(RESUME_CHECKOUT_KEY);
  } catch {
    // no-op
  }
}

function consumeResumeCheckoutIntent(): boolean {
  try {
    const raw = localStorage.getItem(RESUME_CHECKOUT_KEY);
    if (!raw) return false;
    localStorage.removeItem(RESUME_CHECKOUT_KEY);
    const setAt = Number(raw);
    return Number.isFinite(setAt) && Date.now() - setAt < RESUME_CHECKOUT_TTL_MS;
  } catch {
    return false;
  }
}

export default function UpgradePricingPageClient() {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const { user, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
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

  const handleUpgrade = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/subscription/checkout', {
        method: 'POST',
      });

      if (!response.ok) {
        // 401 means the user is not authenticated. Show the auth modal instead of a generic error.
        if (response.status === 401) {
          toast.error(t('teacher.subscription.signInRequired'));
          markResumeCheckoutIntent();
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
      setIsLoading(false);
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
    setShowAuthModal(false);
    handleUpgrade();
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
    // These three are the real free tier — the same three the landing page's free card lists,
    // both sourced from getTierConfig('free'). They are deliberately generous: word lists,
    // duels and no-ads are what get a teacher to a first lesson, and a teacher who never runs
    // a lesson never buys anything.
    //
    // The `education.landing.pro.*` namespace is borrowed rather than duplicated here. These
    // are the same five sentences about the same two tiers, already translated into six
    // locales; a parallel `teacher.subscription.*` copy would be one more place to drift.
    { label: t('education.landing.pro.customLists'), included: true },
    { label: t('education.landing.pro.duels'), included: true },
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
    <div
      className={cn('flex flex-col min-h-screen bg-neo-navy', isRTL && 'rtl')}
    >
      <EducationHeader showBackButton />

      <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-12 sm:py-16">
        {/* Header — outcome first, product name as eyebrow. Kahoot's bar is
            "Achieve awesome classroom results with Kahoot!+" then a "Best for"
            use-case under each plan. A checkout-command H1 ("Upgrade to…") lost
            that comparison before the teacher ever reached the price. */}
        <div className="text-center mb-10 sm:mb-14">
          <p
            data-testid="upgrade-value-eyebrow"
            className="text-sm font-black uppercase tracking-widest text-neo-cyan mb-3"
          >
            {t('teacher.subscription.proPlanName')}
          </p>
          <h1
            className="text-4xl md:text-5xl font-neo-display font-black text-neo-white mb-3"
            style={{ textWrap: 'balance' }}
          >
            {t('teacher.subscription.upgradePricingTitle')}
          </h1>
          <p
            data-testid="upgrade-value-prop"
            className="text-xl text-neo-lime font-black mb-4 max-w-2xl mx-auto"
            style={{ textWrap: 'balance' }}
          >
            {t('teacher.subscription.valueHeadline')}
          </p>
          <p className="text-base text-neo-white/80 font-bold max-w-xl mx-auto">
            {t('teacher.subscription.upgradePricingReassure')}
          </p>
        </div>

        {/* The thing being sold, before the price of it. This page was entirely text and
            bordered cards; a teacher deciding whether to spend their own money should see a
            class mid-game first. `priority` because it sits above the fold on the one page
            that takes payment — a lazy-loaded hero here would pop in after the CTA. */}
        <Image
          src="/images/education/pro-hero-poster.webp"
          alt={t('teacher.subscription.proHeroAlt')}
          width={960}
          height={540}
          priority
          sizes="(max-width: 768px) 100vw, 768px"
          className="mx-auto mb-10 sm:mb-14 w-full max-w-3xl rounded-neo border-neo border-black shadow-hard-lg"
        />

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
              <p className="text-4xl sm:text-5xl font-neo-display font-black text-neo-black leading-none">
                $9
                <span className="text-sm sm:text-base text-neo-black/80 font-bold ms-2">
                  {t('teacher.subscription.perMonth')}
                </span>
              </p>
              <div className="flex flex-col gap-2 mt-3">
                <p className="inline-block bg-neo-black text-neo-cyan text-xs font-black px-2.5 py-1 rounded-neo border-2 border-black w-fit">
                  {t('teacher.subscription.pricePerDay')}
                </p>
                <p className="text-xs font-bold text-neo-black/80">
                  {t('teacher.subscription.priceTaxNote')}
                </p>
              </div>
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

        {/* The same two tiers as the cards above, with the rows aligned. It sits AFTER the
            cards and the risk-reversal chips on purpose: a teacher who has already decided
            never needs it, and a teacher who has not is the one who wants to read across. */}
        <PlanComparisonMatrix />

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

        {/* District / school bulk pricing CTA */}
        <div className="border-3 border-black rounded-neo p-7 sm:p-8 shadow-hard bg-neo-lime mb-12 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="flex-1 text-center sm:text-start">
            <h2 className="text-xl font-neo-display font-black text-neo-black mb-1">
              {t('teacher.subscription.districtTitle')}
            </h2>
            <p className="text-sm font-bold text-neo-black/80 leading-snug">
              {t('teacher.subscription.districtSubtitle')}
            </p>
          </div>
          <Link
            href={`/${language}/education/for-schools`}
            onClick={() => trackGrowthEvent('iap_viewed', { product: 'district_inquiry' })}
            className="flex-shrink-0 bg-neo-black text-neo-white font-black text-sm border-2 border-black rounded-neo px-5 py-3 shadow-hard hover:-translate-y-0.5 active:translate-y-0 transition-transform motion-reduce:transition-none whitespace-nowrap"
          >
            {t('teacher.subscription.districtCta')}
          </Link>
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
          onAuthSuccess={handleUpgrade}
        />
      )}
    </div>
  );
}
