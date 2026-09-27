'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

type Variant = 'esl' | 'teachers';

/**
 * Tasteful teacher/ESL rail for high-traffic game landings.
 * Copy lives in t() so all six catalogues stay in lockstep.
 */
export function EducationIntentCta({ locale, variant }: { locale: string; variant: Variant }) {
  const { t } = useLanguage();
  const hub = `/${locale}/education`;
  const esl = `/${locale}/education/esl-word-games`;
  const elementary = `/${locale}/education/english-games-elementary`;

  if (variant === 'esl') {
    return (
      <section className="mb-12 rounded-neo border-3 border-neo-yellow/60 bg-neo-navy-light p-5 shadow-hard sm:p-6">
        <h2 className="font-neo-display text-xl font-black uppercase text-neo-yellow sm:text-2xl">
          {t('education.intentCta.forTeachers')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-neo-gray-200 sm:text-base">
          {t('education.intentCta.eslBody')}
        </p>
        <Link
          href={esl}
          className="mt-4 inline-block font-bold text-neo-yellow underline underline-offset-2 hover:text-neo-white"
        >
          {t('education.intentCta.eslLink')}
        </Link>
      </section>
    );
  }

  return (
    <section className="mb-12 rounded-neo border-3 border-neo-cyan/60 bg-neo-navy-light p-5 shadow-hard sm:p-6">
      <h2 className="font-neo-display text-xl font-black uppercase text-neo-cyan sm:text-2xl">
        {t('education.intentCta.forTeachers')}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-neo-gray-200 sm:text-base">
        {t('education.intentCta.teachersBody')}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-4">
        <Link href={hub} className="font-bold text-neo-cyan underline underline-offset-2 hover:text-neo-white">
          {t('education.intentCta.hubLink')}
        </Link>
        <Link
          href={elementary}
          className="font-bold text-neo-lime underline underline-offset-2 hover:text-neo-white"
        >
          {t('education.intentCta.elementaryLink')}
        </Link>
      </div>
    </section>
  );
}
