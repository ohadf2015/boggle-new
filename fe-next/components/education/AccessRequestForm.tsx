'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m, useReducedMotion, type Variants } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { useStartTeacherProTrial } from '@/hooks/useStartTeacherProTrial';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useCheckoutBlockedInApp } from '@/hooks/useCheckoutBlockedInApp';
import { resolveProOffer } from '@/lib/education/pro/proOfferCopy';
import { classCreatedTrialCopy, trialCopyBase, TRIAL_COPY_RTL } from '@/lib/education/pro/trialCtaCopy';
import { reportProCtaClick, reportProOfferImpression } from '@/lib/education/reportProCtaClick';
import { useUpsellImpression } from '@/lib/education/useUpsellImpression';
import type { TeacherAccessSubmission, TeacherAccessRole, TeacherLocale } from '@/lib/education/types';

/** Fun emoji per role — turns a boring dropdown into a tap-to-pick card grid. */
const ROLE_OPTIONS: { value: TeacherAccessRole; emoji: string }[] = [
  { value: 'teacher', emoji: '🍎' },
  { value: 'tutor', emoji: '📚' },
  { value: 'admin', emoji: '🏫' },
  { value: 'parent', emoji: '🏡' },
  { value: 'researcher', emoji: '🔬' },
  { value: 'other', emoji: '✨' },
];

const USE_CASE_EXAMPLE_KEYS = ['use_case_ex1', 'use_case_ex2', 'use_case_ex3'] as const;

const FIELD_CLASS =
  'mt-1 w-full rounded-neo border-neo border-neo-cream/40 bg-neo-navy text-neo-white placeholder-neo-white/40 p-3 ' +
  'transition duration-150 outline-none ' +
  'focus:border-neo-lime focus:shadow-hard focus:-translate-y-0.5';
const LABEL_CLASS = 'block text-sm font-semibold text-neo-white font-neo-display';

/**
 * Teacher-access request form.
 *
 * The gate ({@link AccessRequestGate}) only renders this for a signed-up,
 * email-verified account, so we ALREADY know the applicant's name and email
 * from signup — we never ask for them again. The server derives name, email,
 * and country from the account itself; this form collects only the two things
 * signup doesn't capture: who they are (role) and how they'll use LexiClash.
 */
export function AccessRequestForm({
  knownName,
  knownEmail,
}: { knownName?: string; knownEmail?: string } = {}) {
  const { t, language } = useLanguage();
  const { refreshProfile } = useAuth();
  const router = useRouter();
  const pro = useTeacherPro();
  const blockedInApp = useCheckoutBlockedInApp();
  // Same decision as the class-ready card (lib/education/pro/proOfferCopy): keep Pro after the
  // free access trial this very request just started, 14-day trial if unknown, $9/mo once ended.
  const proOffer = resolveProOffer(language, pro, classCreatedTrialCopy(language));
  const polarTrial = useStartTeacherProTrial(t, language, 'access_success', { trial: proOffer.checkoutTrial });
  const shouldReduceMotion = useReducedMotion();
  const [role, setRole] = useState<TeacherAccessRole | null>(null);
  const [useCase, setUseCase] = useState('');
  const [school, setSchool] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // Synchronous in-flight guard. `submitting` (which disables the button)
  // only takes effect on the NEXT render — two submits fired in the same
  // tick (e.g. Enter key + click) would both read the pre-update `canSubmit`
  // and both fire. The ref flips immediately, so the second call always bails.
  const inFlight = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paidDay0, setPaidDay0] = useState(false);
  // The request row committed but instant approval is still finishing
  // server-side (202 approvalPending). Distinct from success: no /teacher
  // redirect — the account isn't promoted yet, so pushing would bounce.
  const [approvalPending, setApprovalPending] = useState(false);
  // The entitlement read from before the request is stale (no access trial yet). The offer
  // waits for one fresh read after approval so "keep Pro" carries the right end date.
  const [offerReady, setOfferReady] = useState(false);
  const offerRef = useRef<HTMLDivElement>(null);
  const showOffer = !blockedInApp && !pro.hasPro && offerReady && !pro.loading;

  // Access is granted on POST. Do not auto-redirect: the 1.2s success beat
  // ate the Polar trial CTA (0 trial_cta_tap / 13 access requests in 14d).
  // HQ is one explicit tap; Polar 14-day trial is the other.
  const goToTeacherHq = async () => {
    try { await refreshProfile(); } catch { /* role gate re-reads on /teacher */ }
    router.push(paidDay0 ? `/${language}/teacher/class-ready` : `/${language}/teacher`);
  };

  const firstName = (knownName ?? '').trim().split(/\s+/)[0] || '';
  const roleOk = role !== null;
  const useCaseOk = useCase.trim().length >= 10;
  const remaining = Math.max(0, 10 - useCase.trim().length);
  const completed = [roleOk, useCaseOk];
  const canSubmit = roleOk && useCaseOk && !submitting;

  // Entrance distance collapses to 0 under reduced-motion (compositor-only: opacity + y).
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: shouldReduceMotion ? 0 : 0.06 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !role || inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setSubmitting(true);
    let leaving = false;
    try {
      const res = await fetch('/api/education/access-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          role,
          locale: language as TeacherLocale,
          use_case: useCase,
          school_or_org: school || undefined,
        } satisfies TeacherAccessSubmission),
      });
      try {
        trackGrowthEvent('edu_access_request_submitted', { ok: res.ok, status: res.status });
      } catch {
        /* telemetry must never break access request */
      }
      if (!res.ok) {
        setError(res.status === 429 ? t('education.access.rate_limited') : t('education.access.submit_error'));
        return;
      }
      const json = await res.json().catch(() => null);
      if (json?.approvalPending) {
        setApprovalPending(true);
        return;
      }
      // Paid campaign teachers leave inside the signup minute if the next
      // screen is a Polar offer. Land them on the day-0 class, not the upsell.
      if (json?.paidDay0) {
        leaving = true;
        setPaidDay0(true);
        try { await refreshProfile(); } catch { /* role gate re-reads on class-ready */ }
        router.push(`/${language}/teacher/class-ready`);
        return;
      }
      setSuccess(true);
      void pro.refresh().catch(() => {}).finally(() => setOfferReady(true));
    } catch {
      setError(t('education.access.submit_error'));
    } finally {
      inFlight.current = false;
      if (!leaving) setSubmitting(false);
    }
  };

  const offerRefSnapshot = useRef({ locale: language, cta: proOffer.cta, offer: proOffer.offer });
  offerRefSnapshot.current = { locale: language, cta: proOffer.cta, offer: proOffer.offer };
  const offerRenderedRef = useRef(false);
  useEffect(() => {
    if (!success || !showOffer || offerRenderedRef.current) return;
    offerRenderedRef.current = true;
    reportProOfferImpression({ placement: 'access_success', stage: 'rendered', ...offerRefSnapshot.current });
  }, [success, showOffer]);
  // Browser impression (consent-gated) + the cookie-free server twin once half of the button is on screen.
  useUpsellImpression(
    offerRef,
    success && showOffer ? { cta: proOffer.cta, placement: 'access_success' } : null,
    { locale: language },
    () => reportProOfferImpression({ placement: 'access_success', stage: 'viewed', ...offerRefSnapshot.current }),
  );

  if (approvalPending) {
    return (
      <m.div
        role="status"
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        className="rounded-neo border-neo-thick bg-neo-cyan p-6 text-center text-neo-navy shadow-hard"
      >
        <span className="mb-3 block text-5xl" aria-hidden="true">📬</span>
        <h3 className="text-2xl font-bold font-neo-display">{t('education.access.approval_pending_title')}</h3>
        <p className="mt-2 text-neo-navy/85">{t('education.access.approval_pending_body')}</p>
        <p className="mt-3 text-sm text-neo-navy/75">{t('education.access.approval_pending_retry')}</p>
        <button
          type="button"
          onClick={() => setApprovalPending(false)}
          className="mt-4 rounded-neo border-neo border-neo-cream/40 bg-neo-navy px-4 py-2 text-sm font-bold text-neo-white font-neo-display shadow-hard-sm transition hover:-translate-y-0.5 hover:shadow-hard active:shadow-hard-pressed"
        >
          {t('education.access.approval_pending_back')}
        </button>
      </m.div>
    );
  }

  if (success) {
    return (
      <m.div
        role="status"
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
        className="rounded-neo border-neo-thick bg-neo-lime p-6 text-center text-neo-navy shadow-hard"
      >
        <svg viewBox="0 0 52 52" className="mx-auto mb-3 h-14 w-14" aria-hidden="true">
          <m.circle
            cx="26" cy="26" r="24" fill="none" stroke="currentColor" strokeWidth="3"
            initial={shouldReduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
          <m.path
            d="M14 27l8 8 16-16" fill="none" stroke="currentColor" strokeWidth="4"
            strokeLinecap="round" strokeLinejoin="round"
            initial={shouldReduceMotion ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: shouldReduceMotion ? 0 : 0.35 }}
          />
        </svg>
        <h3 className="text-2xl font-bold font-neo-display">{t('education.access.success_title')}</h3>
        <p className="mt-2 text-neo-navy/85">{t('education.access.success_body')}</p>
        <div className="mt-4 flex flex-col gap-3">
          {/* The main offer: Teacher Pro, in the same words as the class-ready card.
              Waits for one fresh entitlement read; keeps its height meanwhile. */}
          {!blockedInApp && !pro.hasPro ? (
            <div ref={offerRef} data-testid="access-success-offer" className="min-h-[5.5rem]" dir={TRIAL_COPY_RTL.has(trialCopyBase(language)) ? 'rtl' : undefined}>
              {showOffer ? (
                <>
                  <button
                    type="button"
                    data-testid="access-success-trial"
                    data-offer={proOffer.offer}
                    disabled={polarTrial.pending}
                    onClick={() => {
                      try {
                        reportProCtaClick({ placement: 'access_success', locale: language, cta: proOffer.cta });
                      } catch {
                        /* analytics must never block */
                      }
                      void polarTrial.start();
                    }}
                    className="min-h-14 w-full rounded-neo border-neo-thick border-neo-navy bg-neo-navy px-4 py-3 font-neo-display text-base font-black text-neo-white shadow-hard-lg transition-[box-shadow,transform] duration-100 hover:-translate-y-0.5 hover:shadow-hard-xl active:translate-y-0.5 active:shadow-hard-pressed focus:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-cyan disabled:opacity-50"
                  >
                    {polarTrial.pending ? t('common.loading') : proOffer.label}
                  </button>
                  <p data-testid="access-success-offer-note" className="mt-1.5 text-center text-xs font-bold text-neo-navy/75">{proOffer.note}</p>
                </>
              ) : (
                <div aria-hidden="true" className="h-14 w-full animate-pulse rounded-neo bg-neo-navy/15" />
              )}
            </div>
          ) : null}
          <button
            type="button"
            data-testid="access-success-hq"
            onClick={() => void goToTeacherHq()}
            className={
              !blockedInApp && !pro.hasPro
                ? 'w-full rounded-neo border-neo border-neo-navy/40 px-4 py-2 text-sm font-bold text-neo-navy font-neo-display hover:bg-neo-navy/10'
                : 'w-full rounded-neo border-neo border-neo-navy bg-neo-lime px-4 py-3 font-bold text-neo-navy font-neo-display shadow-hard-sm hover:shadow-hard'
            }
          >
            {t(paidDay0 ? 'education.access.class_ready_cta' : 'education.access.go_to_teacher', paidDay0 ? 'Your class is ready' : undefined)}
          </button>
        </div>
      </m.div>
    );
  }

  return (
    <m.form
      onSubmit={handleSubmit}
      className="space-y-5"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Friendly greeting — signals we already have their details from signup. */}
      <m.div variants={item}>
        <h2 className="text-2xl font-bold font-neo-display text-neo-white">
          {firstName
            ? t('education.access.greeting', { name: firstName })
            : t('education.access.greeting_noname')}
        </h2>
        <p className="mt-1 text-neo-white/80">{t('education.access.greeting_sub')}</p>
        {knownEmail && (
          <div
            data-testid="applying-as"
            className="mt-3 inline-flex items-center gap-2 rounded-neo border-neo border-neo-cream/40 bg-neo-navy px-3 py-1.5 text-sm text-neo-white/80 shadow-hard-sm"
          >
            <span aria-hidden="true">📇</span>
            <span className="font-semibold text-neo-white/60">{t('education.access.applying_as')}</span>
            <span className="font-semibold text-neo-white">
              {knownName ? `${knownName} · ` : ''}{knownEmail}
            </span>
          </div>
        )}
      </m.div>

      {/* Decorative completeness meter — 2 steps (pick a role, tell us why). */}
      <m.div variants={item} data-testid="access-form-progress" aria-hidden="true" className="flex gap-2">
        {completed.map((done, i) => (
          <m.span
            key={i}
            data-progress-tile
            data-filled={done ? 'true' : 'false'}
            animate={{ scale: done && !shouldReduceMotion ? [1, 1.25, 1] : 1 }}
            transition={{ duration: 0.25 }}
            className={`h-2 flex-1 rounded-neo border-neo transition-colors duration-200 ${
              done ? 'border-neo-black bg-neo-lime' : 'border-neo-cream/40 bg-neo-navy'
            }`}
          />
        ))}
      </m.div>

      {/* Role — tap-to-pick emoji cards instead of a dropdown. */}
      <m.fieldset variants={item} className="space-y-2">
        <legend className={LABEL_CLASS}>{t('education.access.role_q')}</legend>
        <div role="radiogroup" aria-label={t('education.access.role_q')} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ROLE_OPTIONS.map(({ value, emoji }) => {
            const selected = role === value;
            return (
              <m.button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setRole(value)}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                className={`flex items-center gap-2 rounded-neo border-neo p-3 text-start font-semibold font-neo-display shadow-hard-sm transition ${
                  selected
                    ? 'border-neo-black bg-neo-lime text-neo-navy -translate-y-0.5 shadow-hard'
                    : 'border-neo-cream/40 bg-neo-navy text-neo-white hover:-translate-y-0.5 hover:shadow-hard'
                }`}
              >
                <span className="text-xl" aria-hidden="true">{emoji}</span>
                <span className="text-sm">{t(`education.access.role_${value}`)}</span>
              </m.button>
            );
          })}
        </div>
      </m.fieldset>

      {/* Use case — the one thing only they can tell us. */}
      <m.div variants={item}>
        <label htmlFor="tar-use_case" className={LABEL_CLASS}>{t('education.access.use_case_q')}</label>
        <p className="mt-0.5 text-sm text-neo-white/70">{t('education.access.use_case_hint')}</p>
        <textarea id="tar-use_case" required minLength={10} maxLength={800} rows={4}
          placeholder={t('education.access.use_case_placeholder')}
          value={useCase} onChange={(e) => setUseCase(e.target.value)}
          className={`${FIELD_CLASS} mt-2`} />
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className={`text-xs ${useCaseOk ? 'text-neo-lime' : 'text-neo-white/70'}`}>
            {useCaseOk ? t('education.access.use_case_ready') : t('education.access.use_case_remaining', { count: remaining })}
          </p>
          <p className="text-xs text-neo-white/50">{useCase.length}/800</p>
        </div>
        {/* Quick-fill sparks — one tap drops in a starting sentence. */}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-neo-white/60">{t('education.access.use_case_spark')}</span>
          {USE_CASE_EXAMPLE_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setUseCase(t(`education.access.${k}`))}
              className="rounded-neo border-neo border-neo-cream/40 bg-neo-navy px-2 py-1 text-xs text-neo-white shadow-hard-sm transition hover:-translate-y-0.5 hover:bg-neo-cyan hover:text-neo-navy"
            >
              {t(`education.access.${k}`)}
            </button>
          ))}
        </div>
      </m.div>

      {/* School / org — optional; not captured at signup. */}
      <m.div variants={item}>
        <label htmlFor="tar-school" className={LABEL_CLASS}>{t('education.access.school_q')}</label>
        <input id="tar-school" value={school} onChange={(e) => setSchool(e.target.value)}
          placeholder={t('education.access.school_placeholder')}
          className={FIELD_CLASS} />
      </m.div>

      {error && <p role="alert" aria-live="polite" className="text-neo-red font-semibold">{error}</p>}
      <m.button type="submit" disabled={!canSubmit} variants={item}
        whileHover={canSubmit && !shouldReduceMotion ? { y: -2 } : undefined}
        whileTap={canSubmit && !shouldReduceMotion ? { y: 1 } : undefined}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className="w-full rounded-neo border-neo-thick bg-neo-lime px-4 py-3 font-bold text-neo-navy font-neo-display shadow-hard hover:shadow-hard-sm active:shadow-hard-pressed disabled:opacity-50 disabled:cursor-not-allowed">
        {submitting ? t('education.access.submitting') : t('education.access.submit')}
      </m.button>
    </m.form>
  );
}
