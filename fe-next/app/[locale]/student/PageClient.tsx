/**
 * Student hub.
 *
 * A class of thirty lands here. In order, the page answers:
 *
 *   1. Is my class playing RIGHT NOW?  → the live banner, first, above everything.
 *   2. What did my teacher give me?    → the lesson words.
 *   3. Anything else                   → below that.
 *
 * It previously answered none of them first. The top of the page was a permanently mounted
 * gradient "welcome" card — `isNewJoin` was hardcoded `true`, so it never went away — whose
 * only button routed to `/daily`, OUT of the classroom. Under it came a Play zone of three
 * equal-weight cards, then an XP/streak/rank hero, and only seventh, below all of it, the
 * teacher's actual lesson. The live-game banner was buried inside the Play zone, so the one
 * thing that is urgent was two scrolls down.
 *
 * The zones themselves are unchanged components; what changed is what leads.
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
import { ClassroomGameBanner } from '@/components/student/ClassroomGameBanner';
import { resolveStudentDisplayName } from '@/lib/education/studentDisplayName';
import { signOut } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { UserPlus, User, Award, UserX } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

/**
 * How long to wait for the profile before admitting it is not coming. Generous
 * on purpose: `waitForProfile` in the guest join path gives up at 3s, and a slow
 * network should not throw an error card at a student who is merely waiting.
 */
const PROFILE_DEADLINE_MS = 10_000;

const NAV_LINK =
  'flex min-h-[44px] items-center gap-1.5 px-3 py-2 rounded-neo border border-neo-white/20 ' +
  'bg-white/10 text-neo-white font-bold text-xs hover:bg-white/20 transition-colors';

export default function StudentPageClient() {
  const { user, loading, profile } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const isRTL = language === 'he';
  const [isChecking, setIsChecking] = useState(true);
  const [profileStalled, setProfileStalled] = useState(false);
  const { classroomId, classroom } = useStudentClassroom();

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
    setProfileStalled(false);
    setIsChecking(false);
  }, [user, profile, loading, router, language]);

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

  if (profileStalled && isChecking) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy px-4">
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
      </div>
    );
  }

  if (isChecking || loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  if (!user) return null;

  const studentName = resolveStudentDisplayName(profile, user, t('student.dashboard.defaultName'));

  return (
    <div className={cn('flex-1 flex flex-col bg-neo-navy w-full overflow-x-hidden', isRTL && 'rtl')}>
      <EducationHeader />

      <div className="w-full max-w-5xl mx-auto px-4 py-4 sm:px-6 flex-1 space-y-6">
        {/*
          One header line, and it names the CLASS. "Student Dashboard" told a student nothing
          they did not already know; their teacher's class name tells them they are in the
          right place — the same question the join screen's preview card answers.
        */}
        <m.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="text-sm font-neo-body text-neo-white/70">
              {t('student.dashboard.greeting', { name: studentName })}
            </p>
            <h1 className="text-2xl sm:text-3xl font-neo-display font-black text-neo-white text-balance truncate">
              {classroom?.name ?? t('student.dashboard.title')}
            </h1>
          </div>

          <nav className="flex gap-2 shrink-0" aria-label={t('student.nav.profile')}>
            <Link href={`/${language}/student/profile`} className={NAV_LINK}>
              <User className="w-3.5 h-3.5" />
              {t('student.nav.profile')}
            </Link>
            <Link href={`/${language}/student/achievements`} className={NAV_LINK}>
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
                className={cn(NAV_LINK, 'hover:bg-neo-pink hover:text-neo-black')}
              >
                <UserX className="w-3.5 h-3.5" />
                {t('student.notYou')}
              </button>
            )}
          </nav>
        </m.header>

        {/*
          1. LIVE NOW. Hoisted out of the Play zone: when the teacher has a game running,
          nothing else on this page matters, and it must not sit below three other cards.
          The banner renders its own quiet "listening" state when no game is active.
        */}
        {classroomId && (
          <ClassroomGameBanner
            classroomId={classroomId}
            userId={user.id}
            username={studentName}
          />
        )}

        {/* No class yet — the only thing worth showing. */}
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
            {/* Decorative only. */}
            <Image
              src="/images/education/no-class-yet.webp"
              alt=""
              aria-hidden="true"
              width={360}
              height={202}
              className="mb-4 w-full max-w-xs h-auto select-none"
            />
            <Link
              href={`/${language}/student/join`}
              className="inline-block px-6 py-3 bg-neo-black text-neo-lime font-neo-display font-bold rounded-neo border-3 border-black shadow-hard-sm hover:shadow-hard-pressed active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              {t('student.joinClassroom')}
            </Link>
          </m.div>
        )}

        {/* 2. What the teacher gave them: lessons, and the words due for review. */}
        <StudentHubLearnZone userId={user.id} classroomId={classroomId ?? undefined} />

        {/* 3. Ways to play. */}
        {classroomId && (
          <StudentHubPlayZone
            classroomId={classroomId}
            userId={user.id}
            username={studentName}
          />
        )}

        {/* 4. Their standing. Last: it is a reward for work already done, not a next action. */}
        {classroomId && (
          <StudentHubProgressZone classroomId={classroomId} userId={user.id} />
        )}
      </div>
    </div>
  );
}
