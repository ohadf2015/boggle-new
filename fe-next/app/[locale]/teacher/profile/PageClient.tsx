/**
 * Teacher Profile Page
 *
 * Shows teacher name, classroom/student counts, role status, and contact admin info.
 */

'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { EducationHeader } from '@/components/education/EducationHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { NeoPanel } from '@/components/ui/panel';
import SubscriptionStatusCard from '@/components/teacher/SubscriptionStatusCard';
import { cn } from '@/lib/utils';
import { GraduationCap, Users, BookOpen, Mail, ShieldCheck } from 'lucide-react';

function TeacherProfileInner() {
  const { user, profile, loading, isAuthenticated } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const { classrooms, isLoading: classroomsLoading } = useClassrooms();

  const isTeacher = profile?.is_admin === true || profile?.user_role === 'teacher' || profile?.user_role === 'admin';

  // Total students across all classrooms
  const totalStudents = useMemo(() => {
    return classrooms.reduce((sum, c) => sum + (c.member_count ?? 0), 0);
  }, [classrooms]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !isTeacher) {
      router.push(`/${language}`);
    }
  }, [loading, isAuthenticated, isTeacher, router, language]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy">
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
    <div
      data-testid="teacher-profile-page"
      className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden', isRTL && 'rtl')}
    >
      <EducationHeader showBackButton />

      <div className="w-full max-w-3xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex-1">

        {/* Profile Header */}
        <NeoPanel tone="cream" className="mb-8 p-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-neo bg-neo-cyan border-3 border-neo-black shadow-hard-sm flex items-center justify-center shrink-0">
              <span className="text-4xl" role="img" aria-label={t('teacher.profile.avatar')}>
                {profile?.avatar_emoji || '👩‍🏫'}
              </span>
            </div>

            {/* Name + role */}
            <div>
              <h1
                data-testid="teacher-display-name"
                className="text-3xl font-neo-display font-black text-neo-black"
              >
                {displayName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="px-3 py-1 bg-neo-cyan text-neo-black font-bold text-sm rounded-neo border-2 border-neo-black uppercase">
                  {t('teacher.profile.teacherBadge')}
                </div>
              </div>
            </div>
          </div>
        </NeoPanel>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {classroomsLoading ? (
            <>
              {['a', 'b', 'c'].map((id) => (
                <NeoPanel key={`skeleton-${id}`} tone="cream" className="p-5 animate-pulse">
                  <div className="h-4 w-24 bg-neo-black/10 rounded mb-3" />
                  <div className="h-9 w-16 bg-neo-black/20 rounded" />
                </NeoPanel>
              ))}
            </>
          ) : (
            <>
              {/* Classroom count */}
              <NeoPanel tone="cream" className="p-5">
                <div className="flex items-center gap-2 mb-2 text-neo-black/60 font-bold text-sm uppercase">
                  <BookOpen className="w-4 h-4" />
                  <span>{t('teacher.profile.classrooms')}</span>
                </div>
                <div
                  data-testid="classroom-count"
                  className="text-4xl font-neo-display font-black text-neo-black"
                >
                  {classrooms.length}
                </div>
              </NeoPanel>

              {/* Student count */}
              <NeoPanel tone="cream" className="p-5">
                <div className="flex items-center gap-2 mb-2 text-neo-black/60 font-bold text-sm uppercase">
                  <Users className="w-4 h-4" />
                  <span>{t('teacher.profile.totalStudents')}</span>
                </div>
                <div
                  data-testid="total-student-count"
                  className="text-4xl font-neo-display font-black text-neo-cyan"
                >
                  {totalStudents}
                </div>
              </NeoPanel>

              {/* Role status */}
              <NeoPanel tone="cream" className="p-5">
                <div className="flex items-center gap-2 mb-2 text-neo-black/60 font-bold text-sm uppercase">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t('teacher.profile.roleStatus')}</span>
                </div>
                <div
                  data-testid="user-role-status"
                  className="text-lg font-neo-display font-black text-neo-black capitalize"
                >
                  {userRole}
                </div>
              </NeoPanel>
            </>
          )}
        </div>

        {/* Contact Admin Section - SKIPPED: neo-lime is not a standard NeoPanel tone */}
        <div
          data-testid="contact-admin-section"
          className="p-6 bg-neo-lime border-3 border-neo-black rounded-neo shadow-hard mb-8"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-neo bg-neo-black border-2 border-neo-black flex items-center justify-center shrink-0 shadow-hard-sm">
              <Mail className="w-6 h-6 text-neo-lime" />
            </div>
            <div>
              <h2 className="text-xl font-neo-display font-black text-neo-black mb-1">
                {t('teacher.profile.contactAdmin')}
              </h2>
              <p className="text-neo-black/70 font-bold text-sm leading-relaxed">
                {t('teacher.profile.contactAdminDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* Subscription Status Card */}
        <div className="mb-8">
          <SubscriptionStatusCard />
        </div>

        {/* Email Info */}
        {user.email && (
          <div className="p-5 bg-neo-navy-light border-3 border-neo-black rounded-neo shadow-hard">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5 text-neo-cyan shrink-0" />
              <div>
                <p className="text-neo-white text-xs font-bold uppercase mb-0.5">
                  {t('common.email')}
                </p>
                <p className="text-neo-white font-bold">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { TeacherGate } from '@/components/education/TeacherGate';

export default function TeacherProfilePage() {
  return <TeacherGate><TeacherProfileInner /></TeacherGate>;
}
