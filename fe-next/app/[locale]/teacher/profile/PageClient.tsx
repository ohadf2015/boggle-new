/**
 * Teacher Profile Page
 *
 * Who you are (name, email, classes, students), your plan, and how to get your school to pay.
 */

'use client';

import { type ReactNode, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { PageLoader } from '@/components/ui/PageLoader';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import SubscriptionStatusCard from '@/components/teacher/SubscriptionStatusCard';
import { cn } from '@/lib/utils';
import { useTeacherReveal } from '@/components/teacher/motion/useTeacherReveal';
import { ArrowRight, BookOpen, School, Users } from 'lucide-react';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { NB_BLOCK, NB_PANEL, NB_SMALL, NB_STICKER } from '@/components/teacher/nb/nbStyles';
import { trackForSchoolsClick } from '@/components/education/ForSchoolsLink';

function TeacherProfileInner() {
  const { user, profile, loading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const { classrooms, isLoading: classroomsLoading } = useClassrooms();

  const isTeacher = profile?.is_admin === true || profile?.user_role === 'teacher' || profile?.user_role === 'admin';

  // Total students across all classrooms
  const totalStudents = useMemo(() => {
    return classrooms.reduce((sum, c) => sum + (c.member_count ?? 0), 0);
  }, [classrooms]);

  useEffect(() => {
    if (loading) return;
    // On `user`, never on `isAuthenticated` — that flag is `!!user && !!profile`
    // and the profile row is a second round-trip that lands AFTER `loading` goes
    // false. This is the student sub-page bug (see
    // app/[locale]/student/__tests__/subpageGuard.test.tsx) on the one teacher
    // surface that never got the fix.
    //
    // TeacherGate does not cover the gap, it opens it: its `isLoading` includes
    // `profileLoading = !!user && !profile`, and TeacherGate.tsx:122 keeps the
    // children MOUNTED for an already-granted teacher so the dashboard does not
    // lose its state on every token refresh. Deciding a role here during that
    // window threw a working teacher to the marketing home mid-lesson.
    if (!user) {
      // Not the main app home. TeacherGate normally intercepts a settled
      // signed-out visitor before this component mounts at all and sends
      // them to /education/access — this branch matches that destination
      // for defense-in-depth (education homepage-bounce audit).
      router.push(`/${language}/education/access`);
      return;
    }
    // Nothing else is decided here on purpose. While `profile` is in flight the
    // role is simply unknown, and the role decision itself belongs to
    // TeacherGate — it owns it with the wider `isLoading`, and it sends a
    // genuine non-teacher to /education/access rather than to the homepage.
  }, [loading, user, router, language]);

  const revealRef = useTeacherReveal<HTMLDivElement>(classroomsLoading);
  // The loading branch is inside the shell too (the shell is now above the
  // gate): a page that scrolls for the second before the profile lands, then
  // stops, is a jolt on a phone.
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  if (!user || !isTeacher) {
    return null;
  }

  const displayName = profile?.display_name || profile?.username || t('common.guest');
  const usage = !classroomsLoading ? t('eduShell.setup.capMeter', { count: classrooms.length, limit: FREE_TIER_LIMITS.classes }) : undefined;

  return (
    <div ref={revealRef} data-testid="teacher-profile-page" className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      {/* Who you are, once: name, email and your classes in one header. */}
      <section data-tm className={cn(NB_PANEL, 'flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6')}>
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Avatar customAvatar={profile?.avatar_config ?? null} userId={user?.id} size="xl" className="shrink-0" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 data-testid="teacher-display-name" className="break-words font-neo-display text-2xl font-black leading-tight text-neo-cream sm:text-3xl">
                {displayName}
              </h1>
              <span className={cn(NB_STICKER, NB_BLOCK.cyan)}>{t('teacher.profile.teacherBadge')}</span>
            </div>
            {user.email ? (
              <p data-testid="teacher-email" className="mt-1 break-all font-neo-body text-sm font-bold text-neo-cream/80">{user.email}</p>
            ) : null}
          </div>
        </div>
        <dl className="grid shrink-0 grid-cols-2 gap-2 sm:w-56">
          {[
            { id: 'classroom-count', icon: BookOpen, label: t('teacher.profile.classrooms'), value: classrooms.length },
            { id: 'total-student-count', icon: Users, label: t('teacher.profile.totalStudents'), value: totalStudents },
          ].map(({ id, icon: Icon, label, value }) => (
            <div key={id} className="rounded-neo-lg border-2 border-neo-cream/40 bg-neo-navy px-3 py-2">
              <dt className="flex items-center gap-1 font-neo-body text-xs font-bold text-neo-cream/80">
                <Icon className="size-3.5 shrink-0 text-neo-cyan" aria-hidden="true" />
                {label}
              </dt>
              <dd data-testid={id} className="font-neo-display text-3xl font-black tabular-nums text-neo-cream">
                {classroomsLoading ? <span className="inline-block h-8 w-8 animate-pulse rounded bg-neo-cream/15 motion-reduce:animate-none" /> : value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <div data-tm>
        <SubscriptionStatusCard usage={usage} />
      </div>

      {/* The one other thing a teacher comes here for: getting the school to pay. */}
      <section data-tm data-testid="contact-admin-section" className={cn(NB_PANEL, 'flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:gap-4')}>
        <span aria-hidden="true" className={cn('grid size-11 shrink-0 place-items-center rounded-neo border-[3px] shadow-hard', NB_BLOCK.purple)}>
          <School className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-neo-display text-lg font-black leading-tight text-neo-cream">{t('teacher.profile.schoolTitle')}</h2>
          <p className="mt-0.5 font-neo-body text-sm font-semibold leading-snug text-neo-cream/80">{t('teacher.profile.schoolBody')}</p>
        </div>
        <Link
          href={`/${language}/education/for-schools`}
          onClick={() => trackForSchoolsClick('teacher_profile')}
          className={cn(NB_SMALL, NB_BLOCK.cream, 'shrink-0 self-start sm:self-center')}
        >
          {t('teacher.profile.schoolCta')}
          <DirectionalIcon icon={ArrowRight} className="size-4" />
        </Link>
      </section>
    </div>
  );
}

import { TeacherGate } from '@/components/education/TeacherGate';
import Avatar from '@/components/Avatar';

/**
 * Shell above gate. `TeacherGate`'s loader and its denial are not this file's
 * markup, so a shell mounted only by the inner component would leave a teacher's
 * very first frame — and a non-teacher's only frame — scrolling the document.
 */
export default function TeacherProfilePage() {
  return (
    <ProfileShell>
      <TeacherGate>
        <TeacherProfileInner />
      </TeacherGate>
    </ProfileShell>
  );
}

function ProfileShell({ children }: { children: ReactNode }) {
  const { t, language } = useLanguage();
  return (
    <EducationShell
      className={cn(language === 'he' && 'rtl')}
      scrollRegionLabel={t('teacher.shell.profileLabel')}
      contentClassName="px-4 py-6 sm:px-6 lg:px-8"
    >
      {children}
    </EducationShell>
  );
}
