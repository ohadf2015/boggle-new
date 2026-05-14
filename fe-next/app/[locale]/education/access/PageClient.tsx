'use client';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { AccessRequestForm } from '@/components/education/AccessRequestForm';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';

export function PageClient() {
  const { t, language } = useLanguage();
  const { status, latestRequest, hasAccess } = useTeacherAccess();

  return (
    <main className="min-h-screen bg-neo-navy text-neo-white">
      <section className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-4xl font-extrabold leading-tight font-neo-display">{t('education.access.h1')}</h1>
        <p className="mt-3 text-lg text-neo-white/80">{t('education.access.lede')}</p>

        {hasAccess && (
          <div className="mt-6 rounded-neo border-neo bg-neo-lime p-6 text-neo-navy shadow-hard">
            <h2 className="text-xl font-bold font-neo-display">{t('education.access.already_approved_title')}</h2>
            <Link href={`/${language}/teacher`} className="mt-3 inline-block rounded-neo bg-neo-navy px-4 py-2 font-bold text-neo-white border-neo shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed transition-all">
              {t('education.access.go_to_teacher')}
            </Link>
          </div>
        )}

        {!hasAccess && status === 'pending' && (
          <div className="mt-6 rounded-neo border-neo bg-neo-cyan p-6 text-neo-navy shadow-hard">
            <h2 className="text-xl font-bold font-neo-display">{t('education.access.pending_title')}</h2>
            <p className="mt-2">{t('education.access.pending_body')}</p>
            {latestRequest?.created_at && (
              <p className="mt-1 text-sm text-neo-navy/70">
                {t('education.access.submitted_on')}: {new Date(latestRequest.created_at).toLocaleString(language)}
              </p>
            )}
          </div>
        )}

        {!hasAccess && status === 'declined' && (
          <div className="mt-6 rounded-neo border-neo bg-neo-pink p-6 text-neo-white shadow-hard">
            <h2 className="text-xl font-bold font-neo-display">{t('education.access.declined_title')}</h2>
            {latestRequest?.admin_note && (
              <div className="mt-3 rounded bg-neo-white/20 p-3">
                <p className="text-sm">{latestRequest.admin_note}</p>
              </div>
            )}
            <p className="mt-3 text-sm text-neo-white/80">{t('education.access.declined_reapply')}</p>
          </div>
        )}

        {!hasAccess && status !== 'pending' && status !== 'declined' && (
          <div className="mt-6 rounded-neo border-neo bg-neo-white p-6 text-neo-navy shadow-hard-lg">
            <AccessRequestForm />
          </div>
        )}

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {(['step1', 'step2', 'step3'] as const).map((k, i) => (
            <div key={k} className="rounded-neo border-neo p-4 bg-neo-navy-light">
              <div className="text-3xl font-extrabold text-neo-lime font-neo-display">{i + 1}</div>
              <h3 className="mt-2 font-bold text-neo-white font-neo-display">{t(`education.access.next.${k}_title`)}</h3>
              <p className="mt-1 text-sm text-neo-white/80">{t(`education.access.next.${k}_body`)}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-neo border-neo p-6 bg-neo-navy-light">
          <h2 className="text-2xl font-bold font-neo-display text-neo-white">{t('education.access.regular_game_title')}</h2>
          <p className="mt-2 text-neo-white/80">{t('education.access.regular_game_body')}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <Link href={`/${language}/multiplayer`} className="rounded-neo bg-neo-pink px-4 py-3 text-center font-bold text-neo-white border-neo shadow-hard hover:shadow-hard-sm active:shadow-hard-pressed transition-all">{t('education.access.try_mp')}</Link>
            <Link href={`/${language}/blast`} className="rounded-neo bg-neo-cyan px-4 py-3 text-center font-bold text-neo-navy border-neo shadow-hard hover:shadow-hard-sm active:shadow-hard-pressed transition-all">{t('education.access.try_blast')}</Link>
            <Link href={`/${language}/daily`} className="rounded-neo bg-neo-purple px-4 py-3 text-center font-bold text-neo-white border-neo shadow-hard hover:shadow-hard-sm active:shadow-hard-pressed transition-all">{t('education.access.try_daily')}</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
