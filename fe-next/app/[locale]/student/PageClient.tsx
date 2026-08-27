/**
 * Student Dashboard — 3-Zone Hub Layout
 *
 * Zone 1: Play (Play with Class + Quick Duel)
 * Zone 2: Progress (XP, rank, streak, milestones)
 * Zone 3: Learn (review, WOTD, challenges, lessons, leaderboard)
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentClassroom } from '@/hooks/useStudentClassroom';
import { EducationHeader } from '@/components/education/EducationHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { StudentHubPlayZone } from '@/components/student/StudentHubPlayZone';
import { StudentHubProgressZone } from '@/components/student/StudentHubProgressZone';
import { StudentHubLearnZone } from '@/components/student/StudentHubLearnZone';
import { StudentWelcomeSurface } from '@/components/student/StudentWelcomeSurface';
import { resolveStudentDisplayName } from '@/lib/education/studentDisplayName';
import { signOut } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { UserPlus, User, Award, UserX } from 'lucide-react';
import Link from 'next/link';

export default function StudentPageClient() {
  const { user, loading, profile } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const [isChecking, setIsChecking] = useState(true);
  const { classroomId } = useStudentClassroom();

  useEffect(() => {
    if (loading) return;
    // Truly logged out → home. A signed-in student whose profile is still
    // resolving (e.g. a freshly minted guest/anonymous session) must NOT be
    // bounced — wait for the profile before deciding (avoids the same redirect
    // race as the teacher-access admin guard).
    if (!user) { router.push(`/${language}`); return; }
    if (!profile) return;
    const isTeacherOrAdmin =
      profile?.user_role === 'teacher' ||
      profile?.user_role === 'admin' ||
      profile?.is_admin === true;
    if (isTeacherOrAdmin) { router.push(`/${language}/teacher`); return; }
    setIsChecking(false);
  }, [user, profile, loading, router, language]);

  if (isChecking || loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden', isRTL && 'rtl')}>
      <EducationHeader />

      <div className="w-full max-w-5xl mx-auto px-4 py-4 sm:px-6 flex-1 space-y-6">
        {/* Page title + inline nav */}
        <m.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">🎓</span>
            <h1 className="text-3xl font-neo-display font-black text-neo-white text-balance">
              {t('student.dashboard.title')}
            </h1>
          </div>
          <p className="text-neo-white font-neo-body text-pretty ps-1 mb-3">
            {t('student.dashboard.subtitle')}
          </p>

          {/* Compact inline nav */}
          <div className="flex gap-2 ps-1">
            <Link
              href={`/${language}/student/profile`}
              className="flex min-h-[44px] items-center gap-1.5 px-4 py-2.5 bg-white/10 border border-neo-white/20 rounded-neo text-neo-white font-bold text-xs hover:bg-white/20 transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              {t('student.nav.profile')}
            </Link>
            <Link
              href={`/${language}/student/achievements`}
              className="flex min-h-[44px] items-center gap-1.5 px-4 py-2.5 bg-white/10 border border-neo-white/20 rounded-neo text-neo-white font-bold text-xs hover:bg-white/20 transition-colors"
            >
              <Award className="w-3.5 h-3.5" />
              {t('student.nav.achievements')}
            </Link>
            {/* Shared-device escape for guest (anonymous) students: sign out the
                device-bound session so the next student is not mistaken for this
                one. Only shown to account-less guests. */}
            {user?.is_anonymous && (
              <button
                onClick={async () => {
                  await signOut();
                  router.push(`/${language}/student/join`);
                }}
                className="flex min-h-[44px] items-center gap-1.5 px-4 py-2.5 bg-white/10 border border-neo-white/20 rounded-neo text-neo-white font-bold text-xs hover:bg-neo-pink hover:text-neo-black transition-colors"
              >
                <UserX className="w-3.5 h-3.5" />
                {t('student.notYou')}
              </button>
            )}
          </div>
        </m.div>

        {/* Join Classroom CTA (when no classroom) */}
        {!classroomId && (
          <m.div
            className="bg-neo-lime text-neo-black border-3 border-black rounded-neo shadow-hard p-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <div className="flex items-center gap-3 mb-3">
              <UserPlus className="w-8 h-8 text-neo-black" />
              <h2 className="text-xl font-neo-display font-black">
                {t('student.joinClassroom')}
              </h2>
            </div>
            <p className="font-neo-body text-neo-black/70 mb-4">
              {t('student.joinClassroomDescription')}
            </p>
            <Link
              href={`/${language}/student/join`}
              className="inline-block px-6 py-3 bg-neo-black text-neo-lime font-neo-display font-bold rounded-neo border-3 border-black shadow-hard-sm hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              {t('student.joinClassroom')}
            </Link>
          </m.div>
        )}

        {/* Welcome Surface (on first classroom join) */}
        {classroomId && (
          <StudentWelcomeSurface
            classroomId={classroomId}
            userId={user.id}
            isNewJoin={true}
          />
        )}

        {/* ZONE 1: Play */}
        {classroomId && (
          <StudentHubPlayZone
            classroomId={classroomId}
            userId={user.id}
            username={resolveStudentDisplayName(profile, user, t('student.dashboard.defaultName'))}
          />
        )}

        {/* ZONE 2: Progress */}
        {classroomId && (
          <StudentHubProgressZone classroomId={classroomId} userId={user.id} />
        )}

        {/* ZONE 3: Learn */}
        <StudentHubLearnZone userId={user.id} classroomId={classroomId ?? undefined} />
      </div>
    </div>
  );
}
