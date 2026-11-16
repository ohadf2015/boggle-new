'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Presentation, UserPlus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { classroomLivePath } from '@/lib/education/classroomLivePath';
import { safeCapture } from '@/lib/education/telemetryCore';
import { EDU_EVENTS } from '@/lib/analytics/eduEvents';
import { signOut } from '@/lib/supabase';
import { clearStoredProfile } from '@/utils/profileStorage';

interface TeacherOwnClassPanelProps {
  classroomId: string;
  liveGameCode: string | null;
  /** The code on this page, so a student on the teacher's device can rejoin after sign-out. */
  joinCode?: string;
}

const ACTION =
  'flex min-h-14 w-full items-center justify-center rounded-neo border-3 border-neo-black px-4 py-3 text-center font-neo-display text-lg font-black uppercase leading-tight text-neo-navy [overflow-wrap:anywhere] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-neo-cyan transition-transform duration-100 motion-safe:active:translate-x-0.5 motion-safe:active:translate-y-0.5';

export function teacherClassHref(locale: string, classroomId: string): string {
  return `/${locale}/teacher/classroom/${encodeURIComponent(classroomId)}`;
}

/** The teacher typed their own class code: they came to run the class, so show them how. */
export function TeacherOwnClassPanel({ classroomId, liveGameCode, joinCode }: TeacherOwnClassPanelProps) {
  const { t, language } = useLanguage();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [leaving, setLeaving] = useState(false);
  const [leaveFailed, setLeaveFailed] = useState(false);
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

  const joinAsStudent = async () => {
    if (leaving || !joinCode) return;
    setLeaveFailed(false);
    setLeaving(true);
    const result = await signOut().catch(() => ({ error: { message: 'failed' } }));
    if (result?.error) {
      setLeaving(false);
      setLeaveFailed(true);
      return;
    }
    clearStoredProfile();
    safeCapture(EDU_EVENTS.teacherOwnClassAction, {
      classroom_id: classroomId,
      action: 'join_as_student',
      has_live_room: live,
    });
    window.location.assign(`/${language}/join/${encodeURIComponent(joinCode)}`);
  };

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
        {joinCode ? (
          <button
            type="button"
            data-testid="own-class-join-as-student"
            onClick={() => { void joinAsStudent(); }}
            disabled={leaving}
            aria-busy={leaving || undefined}
            className={cn(ACTION, 'min-h-12 bg-neo-cyan text-neo-navy shadow-hard-sm disabled:cursor-wait disabled:opacity-60')}
          >
            <UserPlus aria-hidden="true" className="me-2 size-5" strokeWidth={2.75} />
            {leaving
              ? t('education.student.join.ownClass.joiningAsStudent', 'Signing the teacher out…')
              : t('education.student.join.ownClass.joinAsStudent', 'Join as a student on this device')}
          </button>
        ) : null}
        {joinCode ? (
          <p className="font-neo-body text-sm font-bold text-neo-cream/80">
            {t('education.student.join.ownClass.joinAsStudentHint', 'This signs the teacher out so a student can join from here.')}
          </p>
        ) : null}
        {leaveFailed ? (
          <p role="alert" className="font-neo-body text-sm font-bold text-neo-red">
            {t('education.student.join.ownClass.joinAsStudentFailed', "Couldn't sign the teacher out. Try again.")}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default TeacherOwnClassPanel;
