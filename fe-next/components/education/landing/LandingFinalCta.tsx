'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import m from './landingMotion.module.css';

export function LandingFinalCta({ setupPending = false }: { setupPending?: boolean }) {
  const { t, language } = useLanguage();
  return (
    <section className="mx-auto max-w-6xl px-4 pb-8 pt-2 sm:px-6 sm:pb-14 sm:pt-4 lg:px-8">
      <div className="relative mt-10 rounded-neo-xl border-3 border-neo-black bg-neo-lime p-5 pt-10 text-center text-neo-navy shadow-hard-xl sm:mt-12 sm:p-10 sm:pt-12">
        <Image
          src="/mascot/hello-nobg.webp"
          alt=""
          aria-hidden="true"
          width={160}
          height={160}
          className={`pointer-events-none absolute -top-14 start-1/2 h-auto w-20 -translate-x-1/2 select-none rtl:translate-x-1/2 sm:-top-16 sm:start-auto sm:end-10 sm:w-24 sm:translate-x-0 sm:rtl:translate-x-0 ${m.peek}`}
        />
        <h2 className="text-balance font-neo-poster text-2xl font-extrabold leading-tight tracking-[-0.01em] [overflow-wrap:anywhere] sm:text-4xl">{t('eg2Land.final.title')}</h2>
        <p className="mx-auto mt-3 max-w-[52ch] text-base font-semibold text-neo-navy/80">{t('eg2Land.final.body')}</p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/${language}/education/access`}
            data-testid="landing-final-start"
            onClick={() => trackLandingCtaClick(setupPending ? 'education_final_finish_setup' : 'education_final')}
            className="inline-flex min-h-14 items-center justify-center rounded-neo bg-neo-navy px-6 py-3 text-center font-neo-display text-base sm:px-8 sm:text-lg font-black uppercase tracking-wide text-neo-cream shadow-hard transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed motion-reduce:transition-none"
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
