/**
 * Teacher Profile Page
 *
 * One panel: who you are, your plan, and how to get your school to pay.
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
import { ProfilePlanRow } from './ProfilePlanRow';
import { cn } from '@/lib/utils';
import { useTeacherReveal } from '@/components/teacher/motion/useTeacherReveal';
import { ArrowRight, BookOpen, School, Users } from 'lucide-react';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { NB_BLOCK, NB_ICON_TILE, NB_LINK, NB_PANEL, NB_STICKER } from '@/components/teacher/nb/nbStyles';
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
    <div ref={revealRef} data-testid="teacher-profile-page" className="mx-auto w-full max-w-3xl">
      <section data-tm className={NB_PANEL}>
        <div className="flex items-center gap-4 p-5 sm:gap-5 sm:p-6">
          <Avatar customAvatar={profile?.avatar_config ?? null} userId={user?.id} size="xl" className="shrink-0" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h1 data-testid="teacher-display-name" className="break-words font-neo-display text-2xl font-black leading-tight text-neo-cream sm:text-3xl">
                {displayName}
              </h1>
              <span className={cn(NB_STICKER, NB_BLOCK.cyan)}>{t('teacher.profile.teacherBadge')}</span>
            </div>
            {user.email ? (
              <p data-testid="teacher-email" className="mt-1 break-all font-neo-body text-sm font-bold text-neo-cream/80">{user.email}</p>
            ) : null}
            <dl className="mt-2.5 flex flex-wrap gap-2 font-neo-body text-sm font-bold text-neo-cream/85">
              {[
                { id: 'classroom-count', icon: BookOpen, tone: 'text-neo-cyan', label: t('teacher.profile.classrooms'), value: classrooms.length },
                { id: 'total-student-count', icon: Users, tone: 'text-neo-lime', label: t('teacher.profile.totalStudents'), value: totalStudents },
              ].map(({ id, icon: Icon, tone, label, value }) => (
                <div key={id} className="flex items-center gap-1.5 rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-2.5 py-1">
                  <Icon aria-hidden="true" className={cn('size-4 shrink-0', tone)} />
                  <dt>{label}</dt>
                  <dd data-testid={id} className="font-neo-display font-black tabular-nums text-neo-cream">
                    {classroomsLoading ? '–' : value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <ProfilePlanRow usage={usage} />

        <div data-testid="contact-admin-section" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t-2 border-neo-cream/15 px-5 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className={cn(NB_ICON_TILE, NB_BLOCK.purple)}>
              <School className="size-5" />
            </span>
            <h2 className="font-neo-display text-base font-bold text-neo-cream">{t('teacher.profile.schoolTitle')}</h2>
          </div>
          <Link
            href={`/${language}/education/for-schools`}
            onClick={() => trackForSchoolsClick('teacher_profile')}
            className={cn(NB_LINK, '-ms-2 sm:ms-0')}
          >
            {t('teacher.profile.schoolCta')}
            <DirectionalIcon icon={ArrowRight} className="size-4" />
          </Link>
        </div>
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
