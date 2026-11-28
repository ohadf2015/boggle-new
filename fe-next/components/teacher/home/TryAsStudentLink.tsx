'use client';

import Link from 'next/link';
import { MonitorSmartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePress } from '@/components/motion/usePress';
import { HERO_SECONDARY } from './homeStyles';

type T = (key: string) => string;

/** The student app for one class; its top bar starts a live round with bots, so this is the one "try it" entry. */
export function TryAsStudentLink({ classroomId, language, t }: { classroomId: string; language: string; t: T }) {
  const press = usePress<HTMLAnchorElement>({}, false);
  return (
    <Link
      {...press}
      href={`/${language}/teacher/classroom/${classroomId}/student-view`}
      data-testid="try-as-student"
      className={cn(HERO_SECONDARY, 'inline-flex items-center justify-center gap-2')}
    >
      <MonitorSmartphone className="size-5" strokeWidth={2.75} aria-hidden="true" />
      {t('eduShell.home.practice.cta')}
    </Link>
  );
}
