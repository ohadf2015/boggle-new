'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { educationPageLabel } from '@/lib/seo/educationPageLinks';

type Variant = 'esl' | 'teachers';

/**
 * Tasteful teacher/ESL rail for high-traffic game landings.
 * Copy lives in t() so all six catalogues stay in lockstep.
 */
export function EducationIntentCta({ locale, variant }: { locale: string; variant: Variant }) {
  const { t } = useLanguage();
  const hub = `/${locale}/education`;
  const esl = `/${locale}/education/esl-word-games`;
  const vocab = `/${locale}/education/vocabulary-games-classroom`;
  const elementary = `/${locale}/education/english-games-elementary`;

  if (variant === 'esl') {
    return (
      <section className="mb-12 rounded-neo border-3 border-neo-yellow/60 bg-edu-surface p-5 shadow-hard sm:p-6">
        <h2 className="font-neo-display text-xl font-black uppercase text-edu-yellow-ink sm:text-2xl">
          {t('education.intentCta.forTeachers')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-edu-ink/80 sm:text-base">
          {t('education.intentCta.eslBody')}
        </p>
        <Link
          href={esl}
          className="mt-4 inline-block font-bold text-edu-yellow-ink underline underline-offset-2 hover:text-edu-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-black"
        >
          {t('education.intentCta.eslLink')}
        </Link>
      </section>
    );
  }

  return (
    <section className="mb-12 rounded-neo border-3 border-neo-cyan/60 bg-edu-surface p-5 shadow-hard sm:p-6">
      <h2 className="font-neo-display text-xl font-black uppercase text-edu-cyan-ink sm:text-2xl">
        {t('education.intentCta.forTeachers')}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-edu-ink/80 sm:text-base">
        {t('education.intentCta.teachersBody')}
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-4">
        <Link href={hub} className="font-bold text-edu-cyan-ink underline underline-offset-2 hover:text-edu-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-black">
          {t('education.intentCta.hubLink')}
        </Link>
        <Link
          href={elementary}
          className="font-bold text-edu-lime-ink underline underline-offset-2 hover:text-edu-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-black"
        >
          {t('education.intentCta.elementaryLink')}
        </Link>
        <Link
          href={esl}
          className="font-bold text-edu-yellow-ink underline underline-offset-2 hover:text-edu-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-black"
        >
          {t('education.intentCta.eslLink')}
        </Link>
        <Link
          href={vocab}
          className="font-bold text-edu-pink-ink underline underline-offset-2 hover:text-edu-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-black"
        >
          {educationPageLabel('vocabulary-games-classroom', locale)}
        </Link>
      </div>
    </section>
  );
}
