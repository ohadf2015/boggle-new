'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Gift, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AccessRedirectNotice } from '@/components/education/AccessRedirectNotice';
import { AccessRequestGate } from '@/components/education/AccessRequestGate';
import { DistrictUpsellStrip } from '@/components/education/DistrictUpsellStrip';
import { AccessApprovedCard } from './AccessApprovedCard';
import { AccessPendingCard } from './AccessPendingCard';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useGsapReveal } from '@/lib/animation/useGsapReveal';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { accessReturnPath } from '@/lib/education/accessReturnPath';
import { LandingHeader } from '@/components/education/landing/LandingHeader';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { PageLoader } from '@/components/ui/PageLoader';
import { accessHandoffHref, type AccessApproval } from '@/components/education/AccessRequestHandoff';

const TRUST = [
  { key: 'education.access.trust_free', Icon: Gift, chip: 'bg-neo-cyan' },
  { key: 'education.access.trust_nologins', Icon: ShieldCheck, chip: 'bg-neo-pink' },
] as const;

const STEPS = [
  { title: 'education.access.next.step1_title', body: 'education.access.next.step1_body' },
  { title: 'education.access.next.step3_title', body: 'education.access.next.step3_body' },
] as const;

export function PageClient() {
  const { t, language } = useLanguage();
  const { status, latestRequest, hasAccess, trial, isLoading, error: lookupError, retry } = useTeacherAccess();
  // A Pro teacher keeps the trial deadline Pro replaced — never show her the
  // trial upsell, and show nothing until the entitlement has answered.
  const { hasPro, loading: proLoading } = useTeacherPro();
  // TeacherGate encodes the page it blocked as `?from=`. Reading it back is what
  // turns a silent teleport into an explanation — see AccessRedirectNotice.
  const redirectedFrom = useSearchParams()?.get('from') ?? null;
  const router = useRouter();

  // Same predicate TeacherGate admits on, so the two can never bounce each other.
  // Only a TeacherGate bounce (`?from=`) auto-continues: a teacher bounced while
  // auth was settling, or who signed in here, returns to where they were headed.
  // Without one, an approved teacher is sent on from the approved card (see AccessApprovedCard).
  const returnTo = accessReturnPath(redirectedFrom);
  // A teacher approved on this visit: this page alone navigates, once the profile re-read lands,
  // and the "already approved" card never gets a frame in between.
  const [approval, setApproval] = useState<AccessApproval | null>(null);
  const handedOff = useRef(false);
  useEffect(() => {
    if (!approval || handedOff.current) return;
    handedOff.current = true;
    const href = accessHandoffHref(language, approval, returnTo);
    void approval.ready.then(() => router.replace(href));
  }, [approval, language, returnTo, router]);
  useEffect(() => {
    if (returnTo && !approval && !isLoading && hasAccess) router.replace(returnTo);
  }, [returnTo, approval, isLoading, hasAccess, router]);

  // Guardrail for exp-teacher-gate-redirect-clarity-v1: confirms the
  // TeacherGate → /education/access redirect actually lands, regardless of
  // which variant the gate showed while the hop was in flight.
  useEffect(() => {
    if (redirectedFrom) {
      trackGrowthEvent('education_access_redirect_landed', { from: redirectedFrom });
    }
    // Fires once per arrival — `redirectedFrom` is read from the URL that mounted us.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The sign-up pitch (hero art, trust row, wide layout) belongs to the
  // pre-application state ONLY. An approved / pending / declined teacher gets a
  // compact header and their status — never a re-pitch of access they already
  // asked for. `hasAccess` is checked separately from `status`: a teacher granted
  // access directly has no access_requests row, so status stays 'none' while
  // hasAccess is true — that pair must show the approved card, not the pitch.
  //
  // Keep pitch chrome up while auth/access is still loading (`status` stays
  // `'none'`). Field CLS 0.30 on this route was the short loading column
  // swapping into the wide hero+gate layout. The gate itself still waits.
  const handingOff = approval !== null;
  // A teacher who already has access is sent on whatever the request lookup says.
  const failed = !handingOff && !hasAccess && Boolean(lookupError);
  const showPitch = handingOff || (!failed && status === 'none' && !hasAccess);
  const approved = !handingOff && !failed && !isLoading && hasAccess;
  const settledWithoutRole = !handingOff && !failed && !isLoading && !hasAccess;

  // Steps + escape hatch reveal on scroll. The hero itself is NOT animated:
  // an opacity-0 start on the h1 flashes on mobile Chromium above the fold.
  const belowRef = useGsapReveal<HTMLDivElement>({
    selector: '[data-access-reveal]',
    y: 20,
    stagger: 0.1,
    duration: 0.5,
    ease: 'power3.out',
  });

  const statusCard = handingOff ? (
    <div
      role="status"
      className="flex min-h-[220px] items-center justify-center rounded-neo border-neo-thick border-neo-cream/40 bg-neo-navy p-6 shadow-hard-lg sm:min-h-[260px]"
    >
      <PageLoader size="md" text={t('education.access.class_ready_creating')} />
    </div>
  ) : failed ? (
    <div data-testid="access-load-error" role="alert" className="rounded-neo border-neo-thick border-neo-black bg-neo-purple p-6 text-neo-white shadow-hard-lg">
      <h2 className="font-neo-display text-2xl font-black tracking-[-0.02em]">{t('education.access.load_error_title')}</h2>
      <p className="mt-2">{t('education.access.load_error_body')}</p>
      <button
        type="button"
        onClick={retry}
        className="mt-4 inline-flex min-h-11 items-center rounded-neo border-neo border-neo-cream/40 bg-neo-navy px-5 py-3 font-neo-display font-bold text-neo-white shadow-hard transition hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0 active:shadow-hard-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
      >
        {t('education.access.load_error_retry')}
      </button>
    </div>
  ) : (
    <>
      {isLoading && (
        <div
          data-testid="access-gate-skeleton"
          aria-hidden="true"
          className="min-h-[220px] animate-pulse rounded-neo border-neo-thick border-neo-cream/40 bg-neo-navy-light p-6 sm:min-h-[260px]"
        />
      )}

      {settledWithoutRole && status === 'pending' && <AccessPendingCard request={latestRequest} onApproved={setApproval} />}
      {settledWithoutRole && status === 'approved' && <AccessPendingCard mode="review" request={latestRequest} onApproved={setApproval} />}

      {!isLoading && status === 'declined' && (
        <div className="rounded-neo border-neo-thick border-neo-black bg-neo-pink p-6 text-neo-white shadow-hard-lg">
          <h2 className="font-neo-display text-2xl font-black tracking-[-0.02em]">
            {t('education.access.declined_title')}
          </h2>
          {latestRequest?.admin_note && (
            <p className="mt-3 rounded-neo border border-neo-cream/60 bg-neo-navy/50 p-3 text-sm">
              {latestRequest.admin_note}
            </p>
          )}
          <p className="mt-3 text-sm">{t('education.access.declined_contact')}</p>
        </div>
      )}

      {!isLoading && showPitch && (
        <div className="rounded-neo border-neo-thick border-neo-cream/40 bg-neo-navy-light p-6 shadow-hard-lg sm:p-7">
          <AccessRequestGate onApproved={setApproval} />
        </div>
      )}

      {!isLoading &&
        status !== 'pending' &&
        status !== 'declined' &&
        status !== 'approved' &&
        status !== 'none' && (
          <div className="rounded-neo border-neo-thick border-neo-black bg-neo-purple p-6 text-neo-white shadow-hard-lg">
            <h2 className="font-neo-display text-2xl font-black tracking-[-0.02em]">
              {t('education.access.status_unknown_title')}
            </h2>
            <p className="mt-2">{t('education.access.status_unknown_body')}</p>
            <Link
              href={`/${language}/teacher`}
              className="mt-4 inline-block rounded-neo border-neo border-neo-cream/40 bg-neo-navy px-5 py-3 font-neo-display font-bold text-neo-white shadow-hard transition hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0 active:shadow-hard-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
            >
              {t('education.access.go_to_teacher')}
            </Link>
          </div>
        )}
    </>
  );

  // An approved teacher gets her next step only: no re-pitch, no steps, no upsell strip.
  if (approved) {
    return (
      <EducationShell header={<LandingHeader showStart={false} />} contentClassName="flex flex-col">
        <main className="flex flex-1 flex-col text-neo-white">
          <section className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 pb-10 pt-16">
            <AccessApprovedCard trial={trial} showTrial={!hasPro && !proLoading} autoContinue={!returnTo} />
          </section>
        </main>
      </EducationShell>
    );
  }

  return (
    <EducationShell header={<LandingHeader showStart={false} />}>
      <main className="text-neo-white">
        <section
          className={`mx-auto px-4 py-10 sm:py-14 ${showPitch ? 'max-w-6xl' : 'max-w-2xl'}`}
        >
          <div
            className={
              showPitch
                ? 'grid items-start gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14'
                : ''
            }
          >
            <div>
              <h1 className="text-balance font-neo-poster text-[clamp(1.75rem,5vw,2.9rem)] font-extrabold leading-[1.08] tracking-[-0.015em] [overflow-wrap:anywhere]">
                {t('education.access.h1')}
              </h1>
              <p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-neo-white/85">
                {t('teacher.classroom.wizard.subtitle')}
              </p>

              {/* The action (sign up, or sign in in one tap) sits right under the lede — on a phone the trust list used to push it below the fold. */}
              <div className="mt-6">{statusCard}</div>

              {/* Only for someone who still has to apply — an approved teacher who
                  happens to carry a `from` needs their status, not this. */}
              {showPitch && !handingOff && (
                <div className="mt-6 max-w-[62ch]">
                  <AccessRedirectNotice from={redirectedFrom} />
                </div>
              )}

              {showPitch && (
                <ul className="mt-6 flex flex-col gap-3">
                  {TRUST.map(({ key, Icon, chip }) => (
                    <li key={key} className="flex items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-neo border-neo border-neo-black ${chip} text-neo-navy shadow-hard-sm`}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />
                      </span>
                      <span className="font-semibold text-neo-white">
                        {t(key)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

            </div>

            {/* Support art, not the message: on a phone the CTA comes first and the
                illustration follows it. On lg it sits beside the pitch. No
                `priority` — on phones (the primary device) it is below the CTA, so
                a high-priority preload would compete with the h1 for LCP. */}
            {showPitch && (
              <div className="mx-auto w-full max-w-sm lg:mt-2 lg:max-w-none">
                <Image
                  src="/images/education-access-hero.webp"
                  alt={t('education.access.hero_alt')}
                  width={918}
                  height={880}
                  sizes="(min-width: 1024px) 34rem, (min-width: 640px) 24rem, 100vw"
                  className="w-full rounded-neo-xl border-neo-thick border-neo-black shadow-hard-lg"
                />
              </div>
            )}
          </div>

          {/* Full section width so the ribbon's left edge lines up with the h1 —
              a narrower centred block reads as misaligned against the hero. */}
          <div ref={belowRef} className="mt-16">
            <ol
              data-access-reveal
              className="grid divide-y-2 divide-neo-cream/30 overflow-hidden rounded-neo border-neo-thick border-neo-cream/40 bg-neo-navy-light sm:grid-cols-2 sm:divide-x-2 sm:rtl:divide-x-reverse sm:divide-y-0"
            >
              {STEPS.map(({ title, body }, i) => (
                <li key={title} className="p-5">
                  <span className="font-neo-display text-sm font-black text-neo-lime">
                    {i + 1}
                  </span>
                  <h2 className="mt-1 font-neo-display text-base font-bold text-neo-white">
                    {t(title)}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-neo-white/70">
                    {t(body)}
                  </p>
                </li>
              ))}
            </ol>

            <DistrictUpsellStrip hideTeacherCta />
          </div>
        </section>
      </main>
    </EducationShell>
  );
}
