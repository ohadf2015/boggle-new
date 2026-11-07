'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { sectionHome } from '@/lib/navigation/sectionHome';
import { EduMascot } from '@/components/education/EduMascot';

function backLabelKey(target: string): string {
  if (/\/teacher$/.test(target)) return 'eduShell.error.backToClasses';
  if (/\/join$/.test(target)) return 'eduShell.error.enterCode';
  if (/\/student$/.test(target)) return 'eduShell.error.backToClass';
  return 'education.header.educationHome';
}

/** 404 inside a classroom section: one way back, to that section's hub, never the game home. */
export function EduNotFound() {
  const { t, language } = useLanguage();
  const pathname = usePathname();
  const target = sectionHome({ pathname: pathname || `/${language}/education`, locale: language });

  return (
    <div
      data-testid="edu-not-found"
      className="flex h-dvh w-full flex-1 items-center justify-center overflow-y-auto bg-neo-navy px-4 py-8"
    >
      <div className="w-full max-w-sm rounded-neo-lg border-[3px] border-neo-cream bg-neo-navy-light p-6 text-center shadow-hard-lg">
        <EduMascot moment="error" size={112} className="mx-auto mb-3 size-28" />
        <h1 className="mb-2 font-neo-display text-2xl font-black text-neo-cream">{t('eduShell.notFound.title')}</h1>
        <p className="mb-6 font-neo-body text-base font-semibold text-neo-cream/85">{t('eduShell.notFound.body')}</p>
        <Link
          href={target}
          className="flex min-h-[56px] w-full items-center justify-center rounded-neo border-[3px] border-neo-black bg-neo-lime px-4 font-neo-display text-lg font-black text-neo-black shadow-hard transition-[translate,box-shadow] duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy-light"
        >
          {t(backLabelKey(target))}
        </Link>
      </div>
    </div>
  );
}

export default EduNotFound;
