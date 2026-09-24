/**
 * Student hub = the Academy Map (components/student/academy).
 *
 * One screen, no scroll: HUD, the student's lessons as islands on a floating
 * world map, ONE giant button (live game first — when the teacher's game is
 * running nothing else matters), a daily chest, and a dock with lessons,
 * class standings, awards and profile one tap away.
 *
 * This file keeps only the guard: who may be here, the profile wait and its
 * deadline. The old stacked zones (Play/Learn/Progress) scrolled 2100px on a
 * phone; their data sources are rewired into the map, not dropped.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import posthog from '@/lib/analytics/lazyPosthog';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useStudentClassroom } from '@/hooks/useStudentClassroom';
import { EducationHeader } from '@/components/education/EducationHeader';
import { EducationShell } from '@/components/education/shell/EducationShell';
import { PageLoader } from '@/components/ui/PageLoader';
import { AcademyHub } from '@/components/student/academy/AcademyHub';
import { resolveStudentDisplayName } from '@/lib/education/studentDisplayName';
import { signOut } from '@/lib/supabase';

/**
 * How long to wait for the profile before admitting it is not coming. Generous
 * on purpose: `waitForProfile` in the guest join path gives up at 3s, and a slow
 * network should not throw an error card at a student who is merely waiting.
 */
const PROFILE_DEADLINE_MS = 10_000;

export default function StudentPageClient() {
  const { user, loading, profile } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [profileStalled, setProfileStalled] = useState(false);
  const { classroomId, classroom, level, isLoading: classroomLoading } = useStudentClassroom();

  useEffect(() => {
    if (loading) return;
    // Truly logged out → home. A signed-in student whose profile is still
    // resolving (e.g. a freshly minted guest/anonymous session) must NOT be
    // bounced — wait for the profile before deciding (avoids the same redirect
    // race as the teacher-access admin guard).
    if (!user) {
      // Not the main app home — a no-session visitor on the student hub
      // belongs at the auth-free student entry, not the marketing homepage
      // (education homepage-bounce audit).
      router.push(`/${language}/student/join`);
      return;
    }
    if (!profile) return;
    const isTeacherOrAdmin =
      profile?.user_role === 'teacher' ||
      profile?.user_role === 'admin' ||
      profile?.is_admin === true;
    if (isTeacherOrAdmin) { router.push(`/${language}/teacher`); return; }
    setProfileStalled(false);
    setIsChecking(false);
  }, [user, profile, loading, router, language]);

  // Instrumentation gap: the play/learn zones only render once classroomId
  // resolves, so we had zero visibility into how many students land here
  // with none. Fires once per settled classroom state.
  useEffect(() => {
    if (isChecking || loading) return;
    if (!classroomId) posthog.capture('student_no_classroom_prompt_viewed');
  }, [isChecking, loading, classroomId]);

  // The wait above is correct but it had no floor. A profile read that fails any
  // way other than PGRST116 never resolves and never logs, and the guest join
  // path reaches this exact state by design (`waitForProfile` gives up after 3s
  // and joins anyway). Without a deadline that student sits on a spinner with no
  // copy, no retry and no way forward — a class-4 silent failure wearing a
  // loading animation. Past the deadline they get a sentence and a button.
  useEffect(() => {
    if (loading || !user || profile) return;
    const timer = setTimeout(() => setProfileStalled(true), PROFILE_DEADLINE_MS);
    return () => clearTimeout(timer);
  }, [loading, user, profile]);

  // Every branch goes through the shell — the stalled and loading states are
  // the ones a student is most likely to see first, and a page that scrolls
  // for a second and then stops is a jolt on a phone.
  if (profileStalled && isChecking) {
    return (
      <EducationShell header={<EducationHeader />} contentClassName="flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-neo border-3 border-black bg-neo-lime p-6 text-neo-black shadow-hard">
          <h1 className="mb-2 font-neo-display text-xl font-black">
            {t('student.profileStalled.title')}
          </h1>
          <p className="mb-5 font-neo-body text-neo-black/80">
            {t('student.profileStalled.body')}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-[44px] w-full rounded-neo border-3 border-black bg-neo-black px-6 py-3 font-neo-display font-black text-neo-lime shadow-hard-sm transition-all hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px]"
          >
            {t('student.profileStalled.retry')}
          </button>
        </div>
      </EducationShell>
    );
  }

  if (isChecking || loading) {
    return (
      <EducationShell header={<EducationHeader />} contentClassName="flex items-center justify-center">
        <PageLoader size="lg" text={t('common.loading')} />
      </EducationShell>
    );
  }

  if (!user) return null;

  const studentName = resolveStudentDisplayName(profile, user, t('student.dashboard.defaultName'));
  const profileFields = (profile ?? {}) as { total_xp?: number | null; avatar_config?: unknown };

  // Dark-only game surface: the Academy owns the whole viewport (no shell
  // scroll region, no header) so nothing on it can scroll.
  return (
    <AcademyHub
      userId={user.id}
      studentName={studentName}
      classroomId={classroomId ?? null}
      classroomName={classroom?.name ?? null}
      level={level}
      avatarConfig={(profileFields.avatar_config ?? null) as never}
      profileXp={Number(profileFields.total_xp) || 0}
      isGuest={!!user.is_anonymous}
      classroomLoading={!!classroomLoading}
      onSignOut={async () => {
        // Shared-device escape: sign the device-bound guest out so the next
        // student is not mistaken for this one.
        await signOut();
        router.push(`/${language}/student/join`);
      }}
    />
  );
}
