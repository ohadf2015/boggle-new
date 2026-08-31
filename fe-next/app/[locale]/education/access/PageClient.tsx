'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Zap, Gift, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AccessRedirectNotice } from '@/components/education/AccessRedirectNotice';
import { AccessRequestGate } from '@/components/education/AccessRequestGate';
import { DistrictUpsellStrip } from '@/components/education/DistrictUpsellStrip';
import { TrialUrgencyBanner } from '@/components/education/TrialUrgencyBanner';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { useGsapReveal } from '@/lib/animation/useGsapReveal';

const TRUST = [
  { key: 'trust_instant', Icon: Zap, chip: 'bg-neo-lime' },
  { key: 'trust_free', Icon: Gift, chip: 'bg-neo-cyan' },
  { key: 'trust_nologins', Icon: ShieldCheck, chip: 'bg-neo-pink' },
] as const;

export function PageClient() {
  const { t, language } = useLanguage();
  const { status, latestRequest, hasAccess, trial, isLoading } = useTeacherAccess();
  // TeacherGate encodes the page it blocked as `?from=`. Reading it back is what
  // turns a silent teleport into an explanation — see AccessRedirectNotice.
  const redirectedFrom = useSearchParams()?.get('from') ?? null;

  // The sign-up pitch (hero art, trust row, wide layout) belongs to the
  // pre-application state ONLY. An approved / pending / declined teacher gets a
  // compact header and their status — never a re-pitch of access they already
  // asked for. `hasAccess` is checked separately from `status`: a teacher granted
  // access directly has no access_requests row, so status stays 'none' while
  // hasAccess is true — that pair must show the approved card, not the pitch.
  const showPitch = !isLoading && status === 'none' && !hasAccess;

  // Steps + escape hatch reveal on scroll. The hero itself is NOT animated:
  // an opacity-0 start on the h1 flashes on mobile Chromium above the fold.
  const belowRef = useGsapReveal<HTMLDivElement>({
    selector: '[data-access-reveal]',
    y: 20,
    stagger: 0.1,
    duration: 0.5,
    ease: 'power3.out',
  });

  const statusCard = (
    <>
      {isLoading && (
        <div aria-hidden="true" className="h-44 animate-pulse rounded-neo bg-neo-navy-light" />
      )}

      {!isLoading && (hasAccess || status === 'approved') && (
        <div className="rounded-neo border-neo-thick border-black bg-neo-lime p-6 text-neo-navy shadow-hard-lg">
          <h2 className="font-neo-display text-2xl font-black tracking-[-0.02em]">
            {t('education.access.already_approved_title')}
          </h2>
          {trial && (
            <div className="mt-4">
              <TrialUrgencyBanner trial={trial} href={`/${language}/teacher`} />
            </div>
          )}
          <Link
            href={`/${language}/teacher`}
            className="mt-4 inline-block rounded-neo border-neo border-black bg-neo-navy px-5 py-3 font-neo-display font-bold text-neo-white shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0 active:shadow-hard-pressed"
          >
            {t('education.access.go_to_teacher')}
          </Link>
        </div>
      )}

      {!isLoading && status === 'pending' && (
        <div className="rounded-neo border-neo-thick border-black bg-neo-cyan p-6 text-neo-navy shadow-hard-lg">
          <h2 className="font-neo-display text-2xl font-black tracking-[-0.02em]">
            {t('education.access.pending_title')}
          </h2>
          <p className="mt-2 text-neo-navy/90">{t('education.access.pending_body')}</p>
          {latestRequest?.created_at && (
            <p className="mt-2 text-sm font-semibold text-neo-navy/70">
              {t('education.access.submitted_on')}:{' '}
              {new Date(latestRequest.created_at).toLocaleString(language)}
            </p>
          )}
        </div>
      )}

      {!isLoading && status === 'declined' && (
        <div className="rounded-neo border-neo-thick border-black bg-neo-pink p-6 text-neo-white shadow-hard-lg">
          <h2 className="font-neo-display text-2xl font-black tracking-[-0.02em]">
            {t('education.access.declined_title')}
          </h2>
          {latestRequest?.admin_note && (
            <p className="mt-3 rounded-neo border border-black/30 bg-neo-navy/50 p-3 text-sm">
              {latestRequest.admin_note}
            </p>
          )}
          <p className="mt-3 text-sm">{t('education.access.declined_reapply')}</p>
        </div>
      )}

      {showPitch && (
        <div className="rounded-neo border-neo-thick border-black bg-neo-navy-light p-6 shadow-hard-lg sm:p-7">
          <AccessRequestGate />
        </div>
      )}

      {!isLoading &&
        status !== 'pending' &&
        status !== 'declined' &&
        status !== 'approved' &&
        status !== 'none' && (
          <div className="rounded-neo border-neo-thick border-black bg-neo-purple p-6 text-neo-white shadow-hard-lg">
            <h2 className="font-neo-display text-2xl font-black tracking-[-0.02em]">
              {t('education.access.status_unknown_title')}
            </h2>
            <p className="mt-2">{t('education.access.status_unknown_body')}</p>
            <Link
              href={`/${language}/teacher`}
              className="mt-4 inline-block rounded-neo border-neo border-black bg-neo-navy px-5 py-3 font-neo-display font-bold text-neo-white shadow-hard transition-all hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0 active:shadow-hard-pressed"
            >
              {t('education.access.go_to_teacher')}
            </Link>
          </div>
        )}
    </>
  );

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
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
            <h1 className="text-balance font-neo-display text-[clamp(2.125rem,6vw,3.5rem)] font-black leading-[1.05] tracking-[-0.035em]">
              {t('education.access.h1')}
            </h1>
            <p className="mt-4 max-w-[62ch] text-lg leading-relaxed text-neo-white/85">
              {t('education.access.lede')}
            </p>

            {/* Only for someone who still has to apply — an approved teacher who
                happens to carry a `from` needs their status, not this. */}
            {showPitch && (
              <div className="mt-6 max-w-[62ch]">
                <AccessRedirectNotice from={redirectedFrom} />
              </div>
            )}

            {showPitch && (
              <ul className="mt-6 flex flex-col gap-3">
                {TRUST.map(({ key, Icon, chip }) => (
                  <li key={key} className="flex items-center gap-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-neo border-neo border-black ${chip} text-neo-navy shadow-hard-sm`}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden="true" />
                    </span>
                    <span className="font-semibold text-neo-white">
                      {t(`education.access.${key}`)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-8">{statusCard}</div>
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
                className="w-full rounded-neo-xl border-neo-thick border-black shadow-hard-lg"
              />
            </div>
          )}
        </div>

        {/* Full section width so the ribbon's left edge lines up with the h1 —
            a narrower centred block reads as misaligned against the hero. */}
        <div ref={belowRef} className="mt-16">
          <ol
            data-access-reveal
            className="grid divide-y-2 divide-black overflow-hidden rounded-neo border-neo-thick border-black bg-neo-navy-light sm:grid-cols-3 sm:divide-x-2 sm:divide-y-0"
          >
            {(['step1', 'step2', 'step3'] as const).map((k, i) => (
              <li key={k} className="p-5">
                <span className="font-neo-display text-sm font-black text-neo-lime">
                  {i + 1}
                </span>
                <h2 className="mt-1 font-neo-display text-base font-bold text-neo-white">
                  {t(`education.access.next.${k}_title`)}
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-neo-white/70">
                  {t(`education.access.next.${k}_body`)}
                </p>
              </li>
            ))}
          </ol>

          <div
            data-access-reveal
            className="mt-10 flex flex-col gap-3 border-t-2 border-neo-white/15 pt-8 sm:flex-row sm:items-baseline sm:justify-between"
          >
            <p className="text-sm text-neo-white/70">
              <span className="font-bold text-neo-white">
                {t('education.access.regular_game_title')}
              </span>{' '}
              {t('education.access.regular_game_body')}
            </p>
            {/* White, not mode-coded: neo-pink (4.2:1) and neo-purple (3.2:1) on
                navy both fail AA at this size, and colour here would compete with
                the one CTA this page exists for. */}
            <div className="flex shrink-0 flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
              {(
                [
                  ['multiplayer', 'try_mp', 'decoration-neo-pink'],
                  ['blast', 'try_blast', 'decoration-neo-cyan'],
                  ['daily', 'try_daily', 'decoration-neo-purple'],
                ] as const
              ).map(([route, key, accent]) => (
                <Link
                  key={route}
                  href={`/${language}/${route}`}
                  className={`text-neo-white underline decoration-2 underline-offset-4 transition-colors ${accent} hover:text-neo-lime hover:decoration-neo-lime`}
                >
                  {t(`education.access.${key}`)}
                </Link>
              ))}
            </div>
          </div>

          <DistrictUpsellStrip hideTeacherCta />
        </div>
      </section>
    </main>
  );
}
