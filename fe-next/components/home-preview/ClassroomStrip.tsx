'use client';

import { useState, useSyncExternalStore, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, Copy, GraduationCap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentClassroom } from '@/hooks/useStudentClassroom';
import { useScrollReveal } from '@/lib/animation/useScrollReveal';
import { hasSupabaseSession } from '@/utils/onboardingStorage';
import { trackLandingCtaClick } from '@/utils/growthTracking';
import { cn } from '@/lib/utils';

type T = (key: string, params?: Record<string, string | number>) => string;
export type Variant = 'loading' | 'pitch' | 'student';
interface Props { lang: string; t: T }

const noopSubscribe = () => () => {};
const PRESS = 'shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed motion-reduce:active:translate-x-0 motion-reduce:active:translate-y-0';
// Desktop: actions sit in their own column at the card's end, beside the copy.
const ACTIONS = 'mt-3 lg:col-start-2 lg:row-start-1 lg:row-end-4 lg:mt-0';
const PRIMARY = cn(
  'inline-flex max-w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border-[3px] border-black bg-neo-navy px-3 py-2.5 lg:gap-2 font-neo-display text-base leading-tight font-bold text-neo-lime lg:px-6 lg:py-3 lg:text-lg',
  PRESS
);

/** The homepage's lower classroom card: a student's class, or the teacher pitch for everyone else. */
export function ClassroomStrip({ lang, t }: Props) {
  const { isAuthenticated, isTeacher, isAdmin, profile } = useAuth();
  // false on the server and during hydration, so both renders agree (skeleton); the real value lands right after.
  const noStoredSession = useSyncExternalStore(noopSubscribe, () => !hasSupabaseSession(), () => false);

  // Teachers get their class in the top bar (TeacherClassEntryCard), so nothing here.
  if (isAuthenticated && profile && (isTeacher || isAdmin)) return null;
  if (isAuthenticated && profile) return <StudentCard lang={lang} t={t} />;
  // A stored session (or a profile still on its way) may be a teacher: hold the frame, never flash the pitch.
  return <Frame variant={!isAuthenticated && noStoredSession ? 'pitch' : 'loading'} lang={lang} t={t} />;
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
  student: 'homeFresh.sections.classrooms.studentTitle',
};

/** One full-bleed band for every variant, so the resolved content swaps in place instead of shifting the page. */
export function Frame({ variant, lang, t, mascot = 'edu-firstClass', children }: Props & { variant: Variant; mascot?: string; children?: ReactNode }) {
  const [ref, visible] = useScrollReveal<HTMLDivElement>();
  const loading = variant === 'loading';
  const pitch = variant === 'pitch';
  // Transform-only reveal: the band's pieces arrive in a short stagger; reduced motion shows the final state.
  const rise = (delay: string) =>
    cn('transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none motion-reduce:translate-y-0', delay, visible ? 'translate-y-0' : 'translate-y-5');
  return (
    <section
      ref={ref}
      aria-labelledby={loading ? undefined : 'hp-class-title'}
      aria-busy={loading || undefined}
      data-testid="hp-classroom"
      data-variant={variant}
      className="relative overflow-hidden border-y-[3px] border-black bg-neo-lime text-black"
    >
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute -inset-x-16 inset-y-0 opacity-15 [background-image:repeating-linear-gradient(-45deg,black_0_2px,transparent_2px_14px)]',
          'transition-transform duration-[1200ms] ease-out motion-reduce:transition-none motion-reduce:translate-x-0',
          visible ? 'translate-x-0' : '-translate-x-12'
        )}
      />
      <div className="relative mx-auto flex min-h-[150px] w-full max-w-md items-center gap-3 px-4 py-5 lg:min-h-[248px] lg:max-w-[1600px] lg:gap-10 lg:px-14 lg:py-10">
        {loading ? (
          <span aria-hidden="true" className="h-24 w-24 shrink-0 rounded-2xl bg-black/10 lg:h-44 lg:w-44" />
        ) : (
          <Image
            src={`/mascot/edu/${mascot}-512.webp`}
            alt=""
            width={512}
            height={512}
            className={cn(
              'h-24 w-24 shrink-0 lg:h-44 lg:w-44',
              'transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] motion-reduce:transition-none motion-reduce:-rotate-3 motion-reduce:translate-y-0 motion-reduce:scale-100',
              visible ? '-rotate-3 translate-y-0 scale-100' : 'rotate-[-14deg] translate-y-6 scale-90'
            )}
          />
        )}
        <div className="min-w-0 flex-1 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-x-10">
          {loading ? (
            <div aria-hidden="true" className="flex flex-col gap-2.5">
              <span className="h-6 w-3/4 rounded-lg bg-black/10" />
              <span className="h-11 w-1/2 rounded-xl bg-black/10" />
            </div>
          ) : (
            <>
              <div className={rise('delay-100')}>
                {pitch ? (
                  <p className="inline-flex items-center gap-1.5 rounded-md border-2 border-black bg-neo-navy px-2 py-0.5 font-neo-display text-[11px] font-bold tracking-widest text-neo-lime uppercase rtl:tracking-normal lg:text-sm">
                    <GraduationCap className="h-3.5 w-3.5 lg:h-4 lg:w-4" strokeWidth={2.75} aria-hidden="true" />
                    {t('footer.forTeachers')}
                  </p>
                ) : null}
                <h2
                  id="hp-class-title"
                  className={cn(
                    'font-neo-display font-bold',
                    pitch ? 'mt-1.5 text-lg leading-tight lg:text-4xl lg:leading-tight' : 'text-sm leading-tight tracking-wide uppercase lg:text-base'
                  )}
                >
                  {t(TITLES[variant])}
                </h2>
                {pitch ? <p className="mt-1 hidden text-lg font-medium lg:block">{t('homeFresh.sections.classrooms.line')}</p> : null}
                {children}
              </div>
              {pitch ? (
                <div className={rise('delay-200')}>
                  <Link
                    href={`/${lang}/education`}
                    onClick={() => trackLandingCtaClick('home_classroom_pitch')}
                    className={cn(PRIMARY, ACTIONS, 'group/cta hover:-translate-y-0.5 transition-transform')}
                  >
                    {t('homeFresh.sections.classrooms.cta')}
                    <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover/cta:translate-x-1 rtl:-scale-x-100 rtl:group-hover/cta:-translate-x-1" strokeWidth={3} aria-hidden="true" />
                  </Link>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export function CopyCode({ code, t, compact = false }: { code: string; t: T; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(code).then(() => setCopied(true), () => {});
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={t('homeFresh.sections.classrooms.copyCode')}
      className={cn('inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-neo-navy font-bold text-neo-cream', compact ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm', PRESS)}
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
