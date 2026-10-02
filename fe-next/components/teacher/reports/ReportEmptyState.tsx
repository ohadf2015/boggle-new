'use client';

import Link from 'next/link';
import { ClipboardList, Rocket } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { teacherAssignHref } from '@/hooks/useTeacherDashboardDeepLink';
import { cn } from '@/lib/utils';

const PRESS =
  'transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-none motion-reduce:transition-none';

export function ReportEmptyState({ classroomId }: { classroomId: string }) {
  const { t, language } = useLanguage();
  return (
    <div className="rounded-neo border-2 border-dashed border-neo-cream/30 p-5 text-center">
      <p className="font-neo-display text-lg font-bold text-neo-white text-balance">{t('eg2Rep.report.empty.title')}</p>
      <p className="mx-auto mt-1 max-w-md text-sm font-bold text-neo-cream/80 text-pretty">{t('eduPro.mastery.empty')}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link
          href={`/${language}/teacher?classroomId=${classroomId}`}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-black bg-neo-lime px-4 font-neo-display text-sm font-black uppercase text-neo-black shadow-hard',
            PRESS,
          )}
        >
          <Rocket className="size-4" aria-hidden="true" />
          {t('eg2Rep.report.empty.live')}
        </Link>
        <Link
          href={teacherAssignHref(language, classroomId)}
          className={cn(
            'inline-flex min-h-11 items-center gap-2 rounded-neo border-2 border-neo-cyan bg-neo-navy px-4 font-neo-display text-sm font-black uppercase text-neo-cyan shadow-hard',
            PRESS,
          )}
        >
          <ClipboardList className="size-4" aria-hidden="true" />
          {t('eg2Rep.report.empty.assign')}
        </Link>
      </div>
    </div>
  );
}
