'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { SchoolLeadForm } from '@/components/education/SchoolLeadForm';
import { trackGrowthEvent } from '@/utils/growthTracking';

export function LandingSchoolLead() {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <section id="school-quote" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="grid gap-6 rounded-neo-xl border-3 border-neo-black bg-neo-purple p-5 text-neo-black shadow-hard-lg sm:p-8 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-neo-pill border-2 border-neo-black bg-neo-cream px-2.5 py-0.5 font-neo-display text-xs font-black uppercase tracking-wider">
            <Building2 className="size-3.5" aria-hidden="true" />
            {t('eg2Land.school.eyebrow')}
          </span>
          <h2 className="mt-3 text-balance font-neo-display text-2xl font-black leading-tight sm:text-3xl">
            {t('eg2Land.school.title')}
          </h2>
          <p className="mt-3 max-w-[52ch] text-base font-semibold text-neo-black/80">{t('eg2Land.school.body')}</p>
          <ul className="mt-4 space-y-1.5 text-sm font-bold">
            {(['b1', 'b2', 'b3'] as const).map((k) => (
              <li key={k} className="flex items-start gap-2">
                <span aria-hidden className="mt-0.5 inline-block size-3 shrink-0 rotate-45 border-2 border-neo-black bg-neo-lime" />
                <span>{t(`eg2Land.school.${k}`)}</span>
              </li>
            ))}
          </ul>
          <Link
            href={`/${language}/education/for-schools`}
            data-testid="landing-school-plans-link"
            className="mt-5 inline-flex min-h-11 items-center gap-1 text-sm font-black underline decoration-2 underline-offset-4"
          >
            {t('eg2Land.school.plansLink')}
            <DirectionalIcon icon={ArrowRight} className="size-4" />
          </Link>
        </div>

        <div className={`rounded-neo border-3 border-neo-cream/40 bg-neo-navy-light p-5 text-neo-white shadow-hard ${open ? '' : 'self-center'}`}>
          {open ? (
            <SchoolLeadForm plan="school" surface="education_landing" />
          ) : (
            <div className="flex flex-col gap-4">
              <p className="font-neo-display text-lg font-black">{t('eg2Land.school.formTeaser')}</p>
              <p className="text-sm text-neo-white/75">{t('eg2Land.school.formNote')}</p>
              <button
                type="button"
                data-testid="landing-school-quote-open"
                onClick={() => {
                  trackGrowthEvent('landing_cta_clicked', { cta: 'education_school_quote' });
                  setOpen(true);
                }}
                className="min-h-12 w-full rounded-neo border-3 border-neo-black bg-neo-lime px-5 font-neo-display text-base font-black uppercase text-neo-navy shadow-hard transition-transform duration-100 hover:-translate-y-0.5 active:translate-y-0.5 motion-reduce:transition-none"
              >
                {t('eg2Land.school.cta')}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default LandingSchoolLead;
