'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProInsightOffer } from '@/components/teacher/pro/ProInsightLink';
import { PRO_BANNER_CTA, ProBanner, ProShine } from '../pro/ProBanner';

type T = (key: string, params?: Record<string, string | number>) => string;

interface HomeClassInsightCardProps {
  classroomId: string;
  className: string;
  language: string;
  t: T;
}

/** Home's one Pro entry for a free teacher: the free weekly insight of their free class, where Pro sells the rest. */
export function HomeClassInsightCard({ classroomId, className, language, t }: HomeClassInsightCardProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const onClick = useProInsightOffer(ref, 'home_class_insight', language, true);
  return (
    <ProBanner
      testId="home-class-insight"
      proLabel={t('eduShell.nav.pro')}
      title={t('teacher.weekInsight.homeTitle', { name: `\u2068${className}\u2069` })}
      body={t('teacher.weekInsight.homeBody')}
    >
      <Link
        ref={ref}
        href={`/${language}/teacher/classroom/${classroomId}/analytics`}
        data-testid="home-class-insight-cta"
        onClick={onClick}
        className={cn(PRO_BANNER_CTA, 'mt-3 w-full whitespace-normal px-3 text-sm leading-tight')}
      >
        <ProShine />
        <span className="relative">{t('teacher.weekInsight.homeCta')}</span>
        <ChevronRight className="relative size-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
      </Link>
    </ProBanner>
  );
}
