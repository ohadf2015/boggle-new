'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function ReportsNoClasses() {
  const { t, language } = useLanguage();
  return (
    <div className="rounded-neo border-2 border-dashed border-neo-cream/30 p-8 text-center">
      <p className="text-neo-cream/80">{t('teacher.reports.noClassroomsFound')}</p>
      <Link
        href={`/${language}/teacher`}
        className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-black bg-neo-lime px-4 font-neo-display text-sm font-black uppercase text-neo-black shadow-hard transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-none motion-reduce:transition-none"
      >
        <Plus className="size-4" aria-hidden="true" />
        {t('eg2Rep.report.noClasses.cta')}
      </Link>
    </div>
  );
}
