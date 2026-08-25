'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { gsap } from 'gsap';
import { useLanguage } from '@/contexts/LanguageContext';
import { AccessRequestGate } from '@/components/education/AccessRequestGate';
import { DistrictUpsellStrip } from '@/components/education/DistrictUpsellStrip';
import { TrialUrgencyBanner } from '@/components/education/TrialUrgencyBanner';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { useGsapReveal } from '@/lib/animation/useGsapReveal';
import { isReducedMotionPreferred } from '@/utils/accessibility';

export function PageClient() {
  const { t, language } = useLanguage();
  const { status, latestRequest, hasAccess, trial, isLoading } = useTeacherAccess();

  // Hero (h1 + lede): GSAP timeline on mount.
  const heroRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = heroRef.current;
    if (!root) return;
    const items = root.querySelectorAll<HTMLElement>('[data-access-hero]');
    if (items.length === 0) return;

    if (isReducedMotionPreferred()) {
      gsap.set(items, { opacity: 1, y: 0 });
      return;
    }

    const tl = gsap.timeline();
    tl.set(items, { opacity: 0, y: 18 });
    tl.to(items, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: 'power3.out',
      stagger: 0.1,
    });
    return () => {
      tl.kill();
    };
  }, []);

  // Status card (approved / pending / declined / form): pop-in when it mounts.
  const statusRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = statusRef.current;
    if (!el) return;
    if (isReducedMotionPreferred()) {
      gsap.set(el, { opacity: 1, y: 0, scale: 1 });
      return;
    }
    gsap.fromTo(
      el,
      { opacity: 0, y: 16, scale: 0.97 },
      { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'back.out(1.7)', delay: 0.35 },
    );
  }, [hasAccess, status]);

  // Step cards: staggered scroll reveal.
  const stepsRef = useGsapReveal<HTMLDivElement>({
    selector: '[data-access-step]',
    y: 22,
    stagger: 0.12,
    duration: 0.55,
    ease: 'power3.out',
  });

  // Try-a-regular-game block: heading + chips slide in together.
  const tryRef = useGsapReveal<HTMLDivElement>({
    selector: '[data-access-try]',
    y: 18,
    scale: 0.95,
    stagger: 0.07,
    duration: 0.5,
    ease: 'back.out(1.4)',
  });

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <section className="mx-auto max-w-2xl px-4 py-12">
        <div ref={heroRef}>
          <h1
            data-access-hero
            className="text-4xl font-extrabold leading-tight font-neo-display"
          >
            {t('education.access.h1')}
          </h1>
          <p data-access-hero className="mt-3 text-lg text-neo-white">
            {t('education.access.lede')}
          </p>
        </div>

        {isLoading && (
          <div
            ref={statusRef}
            aria-hidden="true"
            className="mt-6 h-40 animate-pulse rounded-neo bg-neo-navy/40"
          />
        )}

        {!isLoading && (hasAccess || status === 'approved') && (
          <div
            ref={statusRef}
            className="mt-6 rounded-neo border-neo bg-neo-lime p-6 text-neo-navy shadow-hard"
          >
            <h2 className="text-xl font-bold font-neo-display">{t('education.access.already_approved_title')}</h2>
            {trial && (
              <div className="mt-4">
                <TrialUrgencyBanner trial={trial} href={`/${language}/teacher`} />
              </div>
            )}
            <Link
              href={`/${language}/teacher`}
              className="mt-3 inline-block rounded-neo bg-neo-navy px-4 py-2 font-bold text-neo-white border-neo shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed transition-all"
            >
              {t('education.access.go_to_teacher')}
            </Link>
          </div>
        )}

        {!isLoading && status === 'pending' && (
          <div
            ref={statusRef}
            className="mt-6 rounded-neo border-neo bg-neo-cyan p-6 text-neo-navy shadow-hard"
          >
            <h2 className="text-xl font-bold font-neo-display">{t('education.access.pending_title')}</h2>
            <p className="mt-2">{t('education.access.pending_body')}</p>
            {latestRequest?.created_at && (
              <p className="mt-1 text-sm text-neo-navy/70">
                {t('education.access.submitted_on')}: {new Date(latestRequest.created_at).toLocaleString(language)}
              </p>
            )}
          </div>
        )}

        {!isLoading && status === 'declined' && (
          <div
            ref={statusRef}
            className="mt-6 rounded-neo border-neo bg-neo-pink p-6 text-neo-white shadow-hard"
          >
            <h2 className="text-xl font-bold font-neo-display">{t('education.access.declined_title')}</h2>
            {latestRequest?.admin_note && (
              <div className="mt-3 rounded bg-neo-navy/40 p-3 border border-neo-white/20">
                <p className="text-sm text-neo-white">{latestRequest.admin_note}</p>
              </div>
            )}
            <p className="mt-3 text-sm text-neo-white">{t('education.access.declined_reapply')}</p>
          </div>
        )}

        {!isLoading && status === 'none' && (
          <div
            ref={statusRef}
            className="mt-6 rounded-neo border-neo-thick bg-neo-navy-light p-6 text-neo-white shadow-hard-lg"
          >
            <AccessRequestGate />
          </div>
        )}

        {!isLoading && status !== 'pending' && status !== 'declined' && status !== 'approved' && status !== 'none' && (
          <div
            ref={statusRef}
            className="mt-6 rounded-neo border-neo bg-neo-purple p-6 text-neo-white shadow-hard"
          >
            <h2 className="text-xl font-bold font-neo-display">{t('education.access.status_unknown_title')}</h2>
            <p className="mt-2 text-neo-white">{t('education.access.status_unknown_body')}</p>
            <Link
              href={`/${language}/teacher`}
              className="mt-4 inline-block rounded-neo bg-neo-navy px-4 py-2 font-bold text-neo-white border-neo shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed transition-all"
            >
              {t('education.access.go_to_teacher')}
            </Link>
          </div>
        )}

        <div ref={stepsRef} className="mt-10 grid gap-4 md:grid-cols-3">
          {(['step1', 'step2', 'step3'] as const).map((k, i) => (
            <div
              key={k}
              data-access-step
              className="rounded-neo border-neo p-4 bg-neo-navy-light transition-transform hover:-translate-y-1"
            >
              <div className="text-3xl font-extrabold text-neo-lime font-neo-display">{i + 1}</div>
              <h3 className="mt-2 font-bold text-neo-white font-neo-display">{t(`education.access.next.${k}_title`)}</h3>
              <p className="mt-1 text-sm text-neo-white">{t(`education.access.next.${k}_body`)}</p>
            </div>
          ))}
        </div>

        <div
          ref={tryRef}
          className="mt-12 rounded-neo border-neo p-6 bg-neo-navy-light"
        >
          <h2
            data-access-try
            className="text-2xl font-bold font-neo-display text-neo-white"
          >
            {t('education.access.regular_game_title')}
          </h2>
          <p data-access-try className="mt-2 text-neo-white">
            {t('education.access.regular_game_body')}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link
              data-access-try
              href={`/${language}/multiplayer`}
              className="rounded-neo bg-neo-pink px-4 py-3 text-center font-bold text-neo-white border-neo shadow-hard hover:shadow-hard-sm active:shadow-hard-pressed transition-all"
            >
              {t('education.access.try_mp')}
            </Link>
            <Link
              data-access-try
              href={`/${language}/blast`}
              className="rounded-neo bg-neo-cyan px-4 py-3 text-center font-bold text-neo-navy border-neo shadow-hard hover:shadow-hard-sm active:shadow-hard-pressed transition-all"
            >
              {t('education.access.try_blast')}
            </Link>
            <Link
              data-access-try
              href={`/${language}/daily`}
              className="rounded-neo bg-neo-purple px-4 py-3 text-center font-bold text-neo-white border-neo shadow-hard hover:shadow-hard-sm active:shadow-hard-pressed transition-all"
            >
              {t('education.access.try_daily')}
            </Link>
          </div>
        </div>

        <DistrictUpsellStrip hideTeacherCta />
      </section>
    </main>
  );
}
