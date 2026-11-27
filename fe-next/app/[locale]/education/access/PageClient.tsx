'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Gift, KeyRound, ShieldCheck } from 'lucide-react';
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
import { MascotRig } from '@/components/motion/MascotRig';
import { accessHandoffHref, type AccessApproval } from '@/components/education/AccessRequestHandoff';

const TRUST = [
  { key: 'education.access.trust_free', Icon: Gift, chip: 'bg-neo-cyan' },
  { key: 'education.access.trust_nologins', Icon: ShieldCheck, chip: 'bg-neo-pink' },
  { key: 'teacher.classroom.wizard.subtitle', Icon: KeyRound, chip: 'bg-neo-lime' },
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

  // The hero itself is NOT faded in: an opacity-0 start on the h1 flashes on mobile Chromium above the fold.
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
      className="flex min-h-[220px] items-center justify-center rounded-neo border-neo-thick border-edu-line bg-edu-page p-6 shadow-hard-lg sm:min-h-[260px]"
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
        className="mt-4 inline-flex min-h-11 items-center rounded-neo border-neo border-edu-line bg-edu-page px-5 py-3 font-neo-display font-bold text-edu-ink shadow-hard transition hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0 active:shadow-hard-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
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
          className="min-h-[220px] animate-pulse rounded-neo border-neo-thick border-edu-line bg-edu-surface p-6 sm:min-h-[260px]"
        />
      )}

      {settledWithoutRole && status === 'pending' && <AccessPendingCard request={latestRequest} onApproved={setApproval} />}
      {settledWithoutRole && status === 'approved' && <AccessPendingCard mode="review" request={latestRequest} onApproved={setApproval} />}

      {!isLoading && status === 'declined' && (
        <div className="rounded-neo border-neo-thick border-neo-black bg-neo-pink p-6 text-edu-ink shadow-hard-lg">
          <h2 className="font-neo-display text-2xl font-black tracking-[-0.02em]">
            {t('education.access.declined_title')}
          </h2>
          {latestRequest?.admin_note && (
            <p className="mt-3 rounded-neo border border-edu-line bg-edu-surface/50 p-3 text-sm">
              {latestRequest.admin_note}
            </p>
          )}
          <p className="mt-3 text-sm">{t('education.access.declined_contact')}</p>
        </div>
      )}

      {!isLoading && showPitch && <AccessRequestGate onApproved={setApproval} />}

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
              className="mt-4 inline-block rounded-neo border-neo border-edu-line bg-edu-surface px-5 py-3 font-neo-display font-bold text-edu-ink shadow-hard transition hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0 active:shadow-hard-pressed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan"
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
        <main className="flex flex-1 flex-col text-edu-ink">
          <section className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 pb-10 pt-16">
            <AccessApprovedCard trial={trial} showTrial={!hasPro && !proLoading} autoContinue={!returnTo} />
          </section>
        </main>
      </EducationShell>
    );
  }

  return (
    <EducationShell header={<LandingHeader showStart={false} />}>
      <main className="text-edu-ink">
        <section className={`mx-auto px-4 py-5 sm:py-12 ${showPitch ? 'max-w-md pt-[4svh] sm:pt-[8svh]' : 'max-w-2xl'}`}>
          {/* Only for someone who still has to apply — an approved teacher who
              happens to carry a `from` needs their status, not this. */}
          {showPitch && !handingOff && <AccessRedirectNotice from={redirectedFrom} />}

          {/* No `priority`: the h1 is the LCP; the mascot is a fixed box, so it never shifts it. */}
          {showPitch && (
            <div aria-hidden="true" dir="ltr" data-testid="access-art" className="relative isolate flex items-center justify-center gap-3 py-3 sm:gap-5">
              <span className="edu-tile size-14 -rotate-12 bg-neo-pink text-3xl sm:size-16 sm:text-4xl">A</span>
              <MascotRig state="hop">
                <Image
                  src="/mascot/teacher/teacher-hero.webp"
                  alt=""
                  width={1024}
                  height={1024}
                  sizes="176px"
                  data-testid="access-mascot"
                  className="h-[136px] w-[136px] drop-shadow-[0_4px_0_black] sm:h-[176px] sm:w-[176px]"
                />
              </MascotRig>
              <span className="edu-tile size-14 rotate-12 bg-neo-cyan text-3xl sm:size-16 sm:text-4xl">B</span>
            </div>
          )}

          <h1
            className={`text-balance font-neo-poster text-[clamp(1.75rem,5vw,2.9rem)] font-extrabold leading-[1.08] tracking-[-0.015em] [overflow-wrap:anywhere] ${showPitch ? 'mt-4 text-center sm:text-[2.5rem]' : ''}`}
          >
            {t('education.access.h1')}
          </h1>
          {!showPitch && (
            <p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-edu-ink/85 max-sm:hidden">{t('teacher.classroom.wizard.subtitle')}</p>
          )}

          <div className="mt-5 sm:mt-7">{statusCard}</div>
        </section>

        <section className={`mx-auto px-4 pb-14 ${showPitch ? 'max-w-md' : 'max-w-2xl'}`}>
          {showPitch && (
            <ul className="flex flex-col gap-4">
              {TRUST.map(({ key, Icon, chip }) => (
                <li key={key} className="flex items-center gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-neo-black ${chip} text-neo-navy shadow-[0_3px_0_0] shadow-neo-black`}>
                    <Icon className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  <span className="font-semibold text-edu-ink">{t(key)}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Steps + escape hatch reveal on scroll. */}
          <div ref={belowRef} className="mt-12">
            <ol
              data-access-reveal
              className="grid divide-y-2 divide-edu-line/15 overflow-hidden rounded-3xl border-2 border-edu-line bg-edu-surface/60"
            >
              {STEPS.map(({ title, body }, i) => (
                <li key={title} className="p-5">
                  <span className="font-neo-display text-sm font-black text-edu-lime-ink">
                    {i + 1}
                  </span>
                  <h2 className="mt-1 font-neo-display text-base font-bold text-edu-ink">
                    {t(title)}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-edu-ink/70">
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
