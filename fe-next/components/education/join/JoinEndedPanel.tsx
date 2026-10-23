'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Hourglass } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentClassroom } from '@/hooks/useStudentClassroom';
import { JoinPrimaryButton } from './JoinPrimaryButton';
import { joinClassHref } from './joinDestinations';

interface JoinEndedPanelProps {
  code: string;
  label?: string;
  /** Known when the server already enrolled them in the ended game's class. */
  classroomId?: string | null;
  onNewCode: () => void;
}

/** A dead code gets an answer and a way on, so the student stops retrying it. */
export function JoinEndedPanel({ code, label, classroomId: enrolledIn, onNewCode }: JoinEndedPanelProps) {
  const { t, language } = useLanguage();
  const { classroomId: ownClass, isLoading } = useStudentClassroom();
  const classroomId = enrolledIn || (isLoading ? null : ownClass);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section data-testid="join-ended-panel" aria-labelledby="join-ended-title" className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span
          dir="ltr"
          className="rounded-neo border-3 border-neo-cream/50 bg-neo-navy-light px-3 py-1 font-neo-display text-xl font-black tracking-[0.2em] text-neo-white/60 line-through decoration-neo-pink decoration-4"
        >
          {code}
        </span>
        <Hourglass aria-hidden="true" className="size-7 shrink-0 text-neo-pink" strokeWidth={2.75} />
      </div>
      <div>
        <h1
          id="join-ended-title"
          ref={headingRef}
          tabIndex={-1}
          className="font-neo-display text-4xl font-black uppercase leading-[0.95] tracking-tight text-neo-white outline-none! [overflow-wrap:anywhere] sm:text-5xl lg:text-6xl"
        >
          {t('education.student.gameEnded.title')}
        </h1>
        {label && <p className="mt-2 font-neo-display text-lg font-black text-neo-lime lg:text-xl">{label}</p>}
        <p className="mt-3 font-neo-body text-base font-bold text-neo-cyan lg:text-lg">{t('education.student.classroomRoomGone')}</p>
      </div>
      <div className="flex flex-col gap-3">
        <JoinPrimaryButton type="button" onClick={onNewCode}>
          {t('education.student.gameEnded.newCode')}
        </JoinPrimaryButton>
        {classroomId && (
          <Link
            href={joinClassHref(language)}
            className="flex min-h-12 w-full items-center justify-center rounded-neo border-3 border-neo-black bg-neo-cyan px-4 py-3 font-neo-display text-lg font-black uppercase text-neo-navy shadow-hard-sm focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-neo-cyan"
          >
            {t('education.student.gameEnded.toClass')}
          </Link>
        )}
      </div>
    </section>
  );
}

export default JoinEndedPanel;
