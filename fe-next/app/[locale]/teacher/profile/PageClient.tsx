/**
 * Teacher Profile Page
 *
 * Shows teacher name, classroom/student counts, role status, and contact admin info.
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
import { ArrowRight, GraduationCap, Users, BookOpen, Mail, ShieldCheck } from 'lucide-react';

const REPORT_CARD =
  'rounded-neo-lg border-2 border-neo-cream/40 bg-neo-navy-light p-5 text-neo-white shadow-hard';

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
  const userRole = profile?.user_role || (profile?.is_admin ? 'teacher' : 'student');

  return (
    <div ref={revealRef} data-testid="teacher-profile-page" className="w-full max-w-3xl mx-auto space-y-6">
      {/* Profile Header */}
      <div data-tm className={cn(REPORT_CARD, 'p-6')}>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar
            customAvatar={profile?.avatar_config ?? null}
            userId={user?.id}
            size="xl"
            className="shrink-0"
          />

          <div className="min-w-0 flex-1">
            <h1
              data-testid="teacher-display-name"
              className="text-2xl sm:text-3xl font-neo-display font-bold text-neo-white break-words"
            >
              {displayName}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <div className="px-3 py-1 bg-neo-cyan text-neo-black font-bold text-xs rounded-neo border-2 border-neo-black uppercase tracking-wide">
                {t('teacher.profile.teacherBadge')}
              </div>
              {user.email && (
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-neo-cream/70">
                  <GraduationCap className="w-4 h-4 text-neo-cyan shrink-0" aria-hidden="true" />
                  <span>{user.email}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div data-tm className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {classroomsLoading ? (
          <>
            {['a', 'b', 'c'].map((id) => (
              <div key={`skeleton-${id}`} className={cn(REPORT_CARD, 'animate-pulse')}>
                <div className="h-4 w-24 bg-neo-cream/10 rounded mb-3" />
                <div className="h-9 w-16 bg-neo-cream/20 rounded" />
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Classroom count */}
            <div className={REPORT_CARD}>
              <div className="flex items-center gap-2 mb-2 text-neo-cream/70 font-bold text-xs uppercase tracking-wide">
                <BookOpen className="w-4 h-4 text-neo-cyan shrink-0" aria-hidden="true" />
                <span>{t('teacher.profile.classrooms')}</span>
              </div>
              <div
                data-testid="classroom-count"
                className="text-3xl sm:text-4xl font-neo-display font-black text-neo-white tabular-nums"
              >
                {classrooms.length}
              </div>
            </div>

            {/* Student count */}
            <div className={REPORT_CARD}>
              <div className="flex items-center gap-2 mb-2 text-neo-cream/70 font-bold text-xs uppercase tracking-wide">
                <Users className="w-4 h-4 text-neo-lime shrink-0" aria-hidden="true" />
                <span>{t('teacher.profile.totalStudents')}</span>
              </div>
              <div
                data-testid="total-student-count"
                className="text-3xl sm:text-4xl font-neo-display font-black text-neo-white tabular-nums"
              >
                {totalStudents}
              </div>
            </div>

            {/* Role status */}
            <div className={REPORT_CARD}>
              <div className="flex items-center gap-2 mb-2 text-neo-cream/70 font-bold text-xs uppercase tracking-wide">
                <ShieldCheck className="w-4 h-4 text-neo-cyan shrink-0" aria-hidden="true" />
                <span>{t('teacher.profile.roleStatus')}</span>
              </div>
              <div
                data-testid="user-role-status"
                className="text-xl font-neo-display font-bold text-neo-white capitalize"
              >
                {userRole}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Subscription Status Card */}
      <div>
        <SubscriptionStatusCard />
      </div>

      {/* School / District Contact Admin Section */}
      <div
        data-testid="contact-admin-section"
        className="p-5 sm:p-6 bg-neo-navy-light border-2 border-neo-cyan rounded-neo-lg shadow-hard text-neo-white"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-neo bg-neo-cyan/15 border-2 border-neo-cyan flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-neo-cyan" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-lg font-neo-display font-bold text-neo-white mb-1">
                {t('teacher.profile.contactAdmin')}
              </h2>
              <p className="text-neo-cream/70 font-bold text-sm leading-relaxed">
                {t('teacher.profile.contactAdminDesc')}
              </p>
            </div>
          </div>
          <Link
            href={`/${language}/education/for-schools`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-neo border-2 border-neo-black bg-neo-cyan px-4 py-2 font-neo-display text-sm font-black uppercase text-neo-black shadow-hard-sm transition hover:-translate-y-0.5 hover:shadow-hard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-white"
          >
            <span>{t('teacher.profile.contactAdmin')}</span>
            <DirectionalIcon icon={ArrowRight} className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Account Info */}
      {user.email && (
        <div className={cn(REPORT_CARD, 'divide-y divide-neo-cream/20')}>
          <div className="flex items-center gap-3">
            <GraduationCap className="w-5 h-5 text-neo-cyan shrink-0" aria-hidden="true" />
            <div>
              <p className="text-neo-cream/70 text-xs font-bold uppercase mb-0.5">
                {t('common.email')}
              </p>
              <p className="text-neo-white font-bold">{user.email}</p>
            </div>
          </div>
        </div>
      )}
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
