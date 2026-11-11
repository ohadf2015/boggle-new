'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Presentation } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { classroomLivePath } from '@/lib/education/classroomLivePath';
import { safeCapture } from '@/lib/education/telemetryCore';
import { EDU_EVENTS } from '@/lib/analytics/eduEvents';

interface TeacherOwnClassPanelProps {
  classroomId: string;
  liveGameCode: string | null;
}

const ACTION =
  'flex min-h-14 w-full items-center justify-center rounded-neo border-3 border-neo-black px-4 py-3 text-center font-neo-display text-lg font-black uppercase leading-tight text-neo-navy [overflow-wrap:anywhere] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-neo-cyan transition-transform duration-100 motion-safe:active:translate-x-0.5 motion-safe:active:translate-y-0.5';

export function teacherClassHref(locale: string, classroomId: string): string {
  return `/${locale}/teacher/classroom/${encodeURIComponent(classroomId)}`;
}

/** The teacher typed their own class code: they came to run the class, so show them how. */
export function TeacherOwnClassPanel({ classroomId, liveGameCode }: TeacherOwnClassPanelProps) {
  const { t, language } = useLanguage();
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const live = !!liveGameCode;
  const primaryHref = live
    ? classroomLivePath(language, liveGameCode, { host: true })
    : teacherHostHref(language, { classroomId });
  const onPrimary = () =>
    safeCapture(EDU_EVENTS.teacherOwnClassAction, {
      classroom_id: classroomId,
      action: live ? 'open_board' : 'start_game',
      has_live_room: live,
    });

  return (
    <section data-testid="join-own-class-panel" aria-labelledby="join-own-class-title" className="flex flex-col gap-5">
      <Presentation aria-hidden="true" className="size-10 text-neo-lime" strokeWidth={2.5} />
      <div>
        <h1
          id="join-own-class-title"
          ref={headingRef}
          tabIndex={-1}
          className="font-neo-display text-3xl font-black uppercase leading-[0.95] tracking-tight text-neo-white outline-none! [overflow-wrap:anywhere] sm:text-4xl"
        >
          {t('education.student.join.ownClass.title')}
        </h1>
        <p className="mt-3 font-neo-body text-base font-bold text-neo-cream lg:text-lg">
          {t(live ? 'education.student.join.ownClass.liveHint' : 'education.student.join.ownClass.hint')}
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Link href={primaryHref} data-testid="own-class-primary" onClick={onPrimary} className={cn(ACTION, 'bg-neo-lime shadow-hard')}>
          {t(live ? 'education.student.join.ownClass.openBoard' : 'education.student.join.ownClass.startGame')}
        </Link>
        <Link href={teacherClassHref(language, classroomId)} data-testid="own-class-secondary" className={cn(ACTION, 'min-h-12 bg-neo-cream shadow-hard-sm')}>
          {t('education.student.join.ownClass.openClass')}
        </Link>
      </div>
    </section>
  );
}

export default TeacherOwnClassPanel;
