'use client';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackLandingCtaClick } from '@/utils/growthTracking';

export function LandingFinalCta({ setupPending = false }: { setupPending?: boolean }) {
  const { t, language } = useLanguage();
  return (
    <section className="mx-auto max-w-6xl px-4 pb-14 pt-4 sm:px-6 lg:px-8">
      <div className="rounded-neo-xl border-3 border-neo-black bg-neo-lime p-6 text-center text-neo-navy shadow-hard-xl sm:p-10">
        <h2 className="text-balance font-neo-display text-3xl font-black leading-tight sm:text-4xl">{t('eg2Land.final.title')}</h2>
        <p className="mx-auto mt-3 max-w-[52ch] text-base font-semibold text-neo-navy/80">{t('eg2Land.final.body')}</p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/${language}/education/access`}
            data-testid="landing-final-start"
            onClick={() => trackLandingCtaClick(setupPending ? 'education_final_finish_setup' : 'education_final')}
            className="inline-flex min-h-14 items-center justify-center rounded-neo bg-neo-navy px-6 py-3 text-center font-neo-display text-base sm:px-8 sm:text-lg font-black uppercase tracking-wide text-neo-cream shadow-hard transition-transform duration-100 hover:-translate-y-0.5 active:translate-y-0.5 motion-reduce:transition-none"
          >
            {t(setupPending ? 'eg2Land.hero.ctaFinishSetup' : 'eg2Land.hero.ctaPrimary')}
          </Link>
          <a
            href="#school-quote"
            className="inline-flex min-h-11 items-center font-neo-display text-base font-black underline decoration-2 underline-offset-4"
          >
            {t('eg2Land.final.schoolLink')}
          </a>
        </div>
      </div>
    </section>
  );
}

export default LandingFinalCta;
