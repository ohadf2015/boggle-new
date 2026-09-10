'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackGrowthEvent } from '@/utils/growthTracking';
import {
  EDUCATION_PACKAGES,
  type EducationLeadPlan,
  type EducationPackage,
  type EducationPackageId,
} from '@/lib/education/educationPackages';
import { SchoolLeadForm } from '@/components/education/SchoolLeadForm';

const I18N: Record<EducationPackageId, string> = {
  teacher_pro: 'teacherPro',
  classroom: 'classroom',
  school: 'school',
};

const FEATURES: Record<EducationPackageId, string[]> = {
  teacher_pro: [
    'education.packages.feature.reports',
    'education.packages.feature.homework',
    'education.packages.feature.reteach',
  ],
  classroom: [
    'education.packages.feature.wholeClass',
    'education.packages.feature.proPlus',
    'education.packages.feature.streaks',
    'education.packages.feature.priority',
  ],
  school: [
    'education.packages.feature.district',
    'education.packages.feature.proPlus',
    'education.packages.feature.priority',
  ],
};

function scrollToLead() {
  document.getElementById('lead')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function EducationPackages({
  locale,
  onPlanChange,
}: {
  locale: string;
  onPlanChange?: (plan: EducationLeadPlan) => void;
}) {
  const { t, language } = useLanguage();
  const dir = language === 'he' ? 'rtl' : 'ltr';

  useEffect(() => {
    trackGrowthEvent('education_package_viewed', { locale });
  }, [locale]);

  const handleLead = (plan: EducationLeadPlan) => {
    onPlanChange?.(plan);
    scrollToLead();
  };

  return (
    <section id="packages" dir={dir} className="mt-16 scroll-mt-20">
      <h2 className="font-neo-display text-3xl font-black sm:text-4xl">
        {t('education.packages.title')}
      </h2>
      <p className="mt-3 max-w-3xl text-neo-gray-200">{t('education.packages.subtitle')}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {EDUCATION_PACKAGES.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            locale={locale}
            t={t}
            onLead={handleLead}
          />
        ))}
      </div>
    </section>
  );
}

function PackageCard({
  pkg,
  locale,
  t,
  onLead,
}: {
  pkg: EducationPackage;
  locale: string;
  t: (k: string) => string;
  onLead: (plan: EducationLeadPlan) => void;
}) {
  const ns = I18N[pkg.id];
  const highlighted = pkg.id === 'classroom';
  return (
    <article
      className={
        highlighted
          ? 'flex flex-col rounded-neo border-4 border-neo-black bg-neo-lime p-5 text-neo-navy shadow-hard-xl'
          : 'flex flex-col rounded-neo border-4 border-neo-black bg-neo-navy-light p-5 text-neo-white shadow-hard'
      }
    >
      <h3 className="font-neo-display text-xl font-black">{t(`education.packages.${ns}.name`)}</h3>
      <p className="mt-3 font-neo-display text-4xl font-black leading-none">
        {pkg.priceUsd === null ? (
          t('education.packages.school.price')
        ) : (
          <>
            ${pkg.priceUsd}
            <span className="ms-1 text-base font-bold opacity-80">
              {t(`education.packages.${ns}.interval`)}
            </span>
          </>
        )}
      </p>
      <p className={`mt-3 text-sm ${highlighted ? 'text-neo-navy/80' : 'text-neo-gray-200'}`}>
        {t(`education.packages.${ns}.blurb`)}
      </p>
      <ul className="mt-4 flex-1 space-y-2 text-sm font-bold">
        {FEATURES[pkg.id].map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
      {pkg.cta === 'checkout' && pkg.checkoutPath ? (
        <Link
          href={`/${locale}${pkg.checkoutPath}`}
          className="mt-6 rounded-neo border-4 border-neo-black bg-neo-yellow px-4 py-3 text-center font-neo-display font-black uppercase tracking-wider text-neo-navy shadow-hard transition-all hover:-translate-y-0.5"
        >
          {t('education.packages.teacherPro.cta')}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => pkg.leadPlan && onLead(pkg.leadPlan)}
          className={
            highlighted
              ? 'mt-6 rounded-neo border-4 border-neo-black bg-neo-navy px-4 py-3 font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard'
              : 'mt-6 rounded-neo border-4 border-neo-black bg-neo-pink px-4 py-3 font-neo-display font-black uppercase tracking-wider text-neo-white shadow-hard'
          }
        >
          {t(`education.packages.${ns}.cta`)}
        </button>
      )}
    </article>
  );
}

/** Packages grid + lead form with shared plan tag (server page cannot hold this state). */
export function ForSchoolsPackages({
  locale,
  leadTitle,
  leadIntro,
}: {
  locale: string;
  leadTitle: string;
  leadIntro: string;
}) {
  const [plan, setPlan] = useState<EducationLeadPlan>('school');
  return (
    <>
      <EducationPackages locale={locale} onPlanChange={setPlan} />
      <section id="lead" className="mt-16 scroll-mt-20 grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 className="font-neo-display text-3xl font-black sm:text-4xl">{leadTitle}</h2>
          <p className="mt-3 text-neo-gray-200">{leadIntro}</p>
        </div>
        <div className="lg:col-span-7">
          <div className="rounded-neo border-4 border-neo-black bg-neo-navy-light p-6 shadow-hard-xl">
            <SchoolLeadForm plan={plan} />
          </div>
        </div>
      </section>
    </>
  );
}
