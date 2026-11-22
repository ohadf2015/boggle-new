'use client';

import { useState, useSyncExternalStore, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, Copy, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { useStudentClassroom } from '@/hooks/useStudentClassroom';
import { useScrollReveal } from '@/lib/animation/useScrollReveal';
import { teacherHostHref } from '@/lib/education/teacherHostHref';
import { hasSupabaseSession } from '@/utils/onboardingStorage';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';

type T = (key: string, params?: Record<string, string | number>) => string;
export type Variant = 'loading' | 'pitch' | 'teacher' | 'teacher-simple' | 'student';
interface Props { lang: string; t: T }

const noopSubscribe = () => () => {};
const PRESS = 'shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0';
// Desktop: actions sit in their own column at the card's end, beside the copy.
const ACTIONS = 'mt-3 lg:col-start-2 lg:row-start-1 lg:row-end-4 lg:mt-0';
const PRIMARY = cn(
  'inline-flex max-w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-[3px] border-black bg-neo-navy px-3 py-2.5 lg:gap-2 font-neo-display text-base leading-tight font-bold text-neo-lime lg:px-6 lg:py-3 lg:text-lg',
  PRESS
);

/** The homepage's classroom card: a teacher's own class, a student's class, or the teacher pitch for everyone else. */
export function ClassroomStrip({ lang, t }: Props) {
  const { isAuthenticated, isTeacher, isAdmin, profile } = useAuth();
  // false on the server and during hydration, so both renders agree (skeleton); the real value lands right after.
  const noStoredSession = useSyncExternalStore(noopSubscribe, () => !hasSupabaseSession(), () => false);

  if (isAuthenticated && profile && (isTeacher || isAdmin)) return <TeacherCard lang={lang} t={t} />;
  if (isAuthenticated && profile) return <StudentCard lang={lang} t={t} />;
  // A stored session (or a profile still on its way) may be a teacher: hold the frame, never flash the pitch.
  return <Frame variant={!isAuthenticated && noStoredSession ? 'pitch' : 'loading'} lang={lang} t={t} />;
}

function TeacherCard({ lang, t }: Props) {
  const { classrooms, isLoading } = useClassrooms();
  if (isLoading) return <Frame variant="loading" lang={lang} t={t} />;
  // Ordered newest-created first.
  const newest = classrooms[0];
  if (!newest) return <Frame variant="teacher-simple" lang={lang} t={t} />;
  return <TeacherClassView lang={lang} t={t} classroom={newest} />;
}

export function TeacherClassView({ lang, t, classroom: newest }: Props & { classroom: { id: string; name: string; join_code: string; member_count: number } }) {
  return (
    <Frame variant="teacher" lang={lang} t={t} mascot="edu-gameStart">
      <p className="mt-0.5 truncate font-neo-display text-xl font-bold leading-tight lg:text-3xl">{newest.name}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-neo-cream px-2 py-1 text-sm font-bold">
          <Users className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />
          {t('homeFresh.sections.classrooms.studentsCount', { count: newest.member_count })}
        </span>
        <CopyCode code={newest.join_code} t={t} />
      </div>
      <div className={cn(ACTIONS, 'flex flex-wrap items-center gap-x-4 gap-y-2')}>
        <Link
          href={teacherHostHref(lang, { classroomId: newest.id })}
          onClick={() => trackLandingCtaClick('home_my_class_start', { role: 'teacher' })}
          className={PRIMARY}
        >
          {t('homeFresh.sections.classrooms.startGame')}
          <ArrowRight className="h-5 w-5 shrink-0 rtl:-scale-x-100" strokeWidth={3} aria-hidden="true" />
        </Link>
        <OpenLink href={`/${lang}/teacher`} role="teacher">{t('homeFresh.sections.classrooms.openClassroom')}</OpenLink>
      </div>
    </Frame>
  );
}

function StudentCard({ lang, t }: Props) {
  const { classroomId, classroom, isLoading } = useStudentClassroom();
  if (isLoading) return <Frame variant="loading" lang={lang} t={t} />;
  if (!classroomId) return <Frame variant="pitch" lang={lang} t={t} />;
  return <StudentClassView lang={lang} t={t} name={classroom?.name ?? null} />;
}

export function StudentClassView({ lang, t, name }: Props & { name: string | null }) {
  return (
    <Frame variant="student" lang={lang} t={t} mascot="edu-scanJoin">
      {name ? <p className="mt-0.5 truncate font-neo-display text-xl font-bold leading-tight lg:text-3xl">{name}</p> : null}
      <Link
        href={`/${lang}/student`}
        onClick={() => trackLandingCtaClick('home_my_class_open', { role: 'student' })}
        className={cn(PRIMARY, ACTIONS)}
      >
        {t('homeFresh.sections.classrooms.openMyClass')}
        <ArrowRight className="h-5 w-5 shrink-0 rtl:-scale-x-100" strokeWidth={3} aria-hidden="true" />
      </Link>
    </Frame>
  );
}

const TITLES: Record<Variant, string> = {
  loading: '',
  pitch: 'homeFresh.sections.classrooms.title',
  teacher: 'homeFresh.sections.classrooms.myTitle',
  'teacher-simple': 'homeFresh.sections.classrooms.myTitle',
  student: 'homeFresh.sections.classrooms.studentTitle',
};

/** One frame for every variant, so the resolved card swaps content in place instead of shifting the page. */
export function Frame({ variant, lang, t, mascot = 'edu-firstClass', children }: Props & { variant: Variant; mascot?: string; children?: ReactNode }) {
  const [ref, visible] = useScrollReveal<HTMLDivElement>();
  const loading = variant === 'loading';
  return (
    <section
      aria-labelledby={loading ? undefined : 'hp-class-title'}
      aria-busy={loading || undefined}
      data-testid="hp-classroom"
      data-variant={variant}
      className="mx-auto flex min-h-[220px] w-full flex-col max-w-md px-4 lg:min-h-[248px] lg:max-w-[1600px] lg:px-14"
    >
      <div
        ref={ref}
        className={cn(
          'flex flex-1 items-center gap-3 rounded-3xl border-[3px] border-black bg-neo-lime p-4 text-black shadow-hard-lg lg:gap-10 lg:px-10 lg:py-8',
          'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:translate-y-0 motion-reduce:transition-none',
          visible ? 'translate-y-0' : 'translate-y-6'
        )}
      >
        {loading ? (
          <span aria-hidden="true" className="h-16 w-16 shrink-0 rounded-2xl bg-black/10 lg:h-40 lg:w-40" />
        ) : (
          <Image src={`/mascot/edu/${mascot}-512.webp`} alt="" width={512} height={512} className={cn('h-16 w-16 shrink-0 -rotate-3 lg:block lg:h-40 lg:w-40', variant === 'teacher' && 'hidden')} />
        )}
        <div className="min-w-0 flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-x-10">
          {loading ? (
            <div aria-hidden="true" className="flex flex-col gap-2.5">
              <span className="h-6 w-3/4 rounded-lg bg-black/10" />
              <span className="h-11 w-1/2 rounded-xl bg-black/10" />
            </div>
          ) : (
            <>
              <h2
                id="hp-class-title"
                className={cn(
                  'font-neo-display font-bold',
                  variant === 'pitch' ? 'text-lg leading-tight lg:text-4xl lg:leading-tight' : 'text-sm leading-tight tracking-wide uppercase lg:text-base'
                )}
              >
                {t(TITLES[variant])}
              </h2>
              {children}
              {variant === 'pitch' ? (
                <>
                  <p className="mt-1 hidden text-lg font-medium lg:block">{t('homeFresh.sections.classrooms.line')}</p>
                  <Link href={`/${lang}/education`} className={cn(PRIMARY, ACTIONS)}>
                    {t('homeFresh.sections.classrooms.cta')}
                    <ArrowRight className="h-5 w-5 shrink-0 rtl:-scale-x-100" strokeWidth={3} aria-hidden="true" />
                  </Link>
                </>
              ) : null}
              {variant === 'teacher-simple' ? (
                <>
                  <p className="mt-1 text-sm font-medium lg:text-lg">{t('homeFresh.sections.classrooms.simpleLine')}</p>
                  <Link
                    href={`/${lang}/teacher`}
                    onClick={() => trackLandingCtaClick('home_my_class_open', { role: 'teacher' })}
                    className={cn(PRIMARY, ACTIONS)}
                  >
                    {t('homeFresh.sections.classrooms.openClassroom')}
                    <ArrowRight className="h-5 w-5 shrink-0 rtl:-scale-x-100" strokeWidth={3} aria-hidden="true" />
                  </Link>
                </>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function OpenLink({ href, role, children }: { href: string; role: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      onClick={() => trackLandingCtaClick('home_my_class_open', { role })}
      className="font-neo-display text-base font-bold underline decoration-[3px] underline-offset-4 lg:text-lg"
    >
      {children}
    </Link>
  );
}

function CopyCode({ code, t }: { code: string; t: T }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(code).then(() => setCopied(true), () => {});
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={t('homeFresh.sections.classrooms.copyCode')}
      className={cn('inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-neo-navy px-2 py-1 text-sm font-bold text-neo-cream', PRESS)}
    >
      <span dir="ltr" className="font-mono tracking-widest">{code}</span>
      <span aria-live="polite" className="inline-flex items-center gap-1 text-neo-lime">
        {copied ? (
          <>
            <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
            {t('homeFresh.sections.classrooms.copied')}
          </>
        ) : (
          <Copy className="h-4 w-4" strokeWidth={2.75} aria-hidden="true" />
        )}
      </span>
    </button>
  );
}
