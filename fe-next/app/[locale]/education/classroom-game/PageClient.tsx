'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationHeader } from '@/components/education/EducationHeader';
import { PageLoader } from '@/components/ui/PageLoader';
import { ClassroomGameLobby } from '@/components/education/ClassroomGameLobby';
import { ClassroomGameLobbyExpress } from '@/components/education/ClassroomGameLobbyExpress';
import {
  QUICK_LAUNCH_FLOW,
  clearQuickLaunchIntent,
  readQuickLaunchIntent,
} from '@/components/teacher/dashboard/quickLaunchIntent';
import { cn } from '@/lib/utils';

/**
 * ClassroomGameInner
 *
 * Education-specific multiplayer game that:
 * - Uses vocabulary from teacher's lessons (optional pre-selection via URL)
 * - Auto-populates with classroom roster
 * - Syncs progress to student records post-game
 * - Uses EducationHeader (no escape to main app)
 *
 * lessonId is optional — when omitted, the lobby lets the teacher pick lessons.
 */
function ClassroomGameInner() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRTL = language === 'he';

  const [isChecking, setIsChecking] = useState(true);

  // Optional lesson ID from URL params (pre-selects a lesson in the lobby)
  const lessonId = searchParams?.get('lessonId') || '';
  // 'repeatLast' (dashboard Repeat-last hero) prefills the whole last setup.
  const flow = searchParams?.get('flow') || '';

  // 'quickLaunch' — the dashboard's one-tap PLAY NOW. The intent is read ONCE,
  // at mount, so a reload (or a second tab, or a five-minute-old intent) falls
  // straight through to the full setup screen instead of silently re-firing a
  // room the teacher already has open.
  const [quickLaunchIntent] = useState(() =>
    (searchParams?.get('flow') || '') === QUICK_LAUNCH_FLOW ? readQuickLaunchIntent() : null
  );
  const [expressAbandoned, setExpressAbandoned] = useState(false);
  const openFullSetup = useCallback(() => {
    clearQuickLaunchIntent();
    setExpressAbandoned(true);
  }, []);
  const runExpress = !!quickLaunchIntent && !expressAbandoned;

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push(`/${language}/education`);
      return;
    }

    setIsChecking(false);
  }, [isAuthenticated, authLoading, router, language]);

  const handleBack = useCallback(() => {
    router.push(`/${language}/education`);
  }, [router, language]);

  /**
   * Lock the body while the lobby is up.
   *
   * `<body>` carries `.screen-fit` (overflow-y:auto) app-wide, and this route
   * also server-renders its SEO block and the schools CTA BELOW the client
   * tree — 768px of it — so the shell being `h-dvh` is not enough on its own:
   * the page still scrolls the lobby out from under the teacher. This is the
   * same `.screen-fit-locked` mechanism the multiplayer view uses, and it
   * leaves the crawler-facing copy in the DOM untouched.
   *
   * The cleanup is not optional: without it, BACK to /education leaves every
   * later screen unable to scroll.
   */
  const { setIsInGame } = useNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  if (isChecking || authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy min-h-dvh">
        <PageLoader
          size="lg"
          text={t('common.loading')}
        />
      </div>
    );
  }

  return (
    /* The lobby locks: the shell is exactly one viewport tall and hides its
       overflow, and the ONE region that scrolls is inside ClassroomLobbyShell.
       `<body>` carries `.screen-fit` (overflow-y:auto) app-wide, so a screen
       that must not scroll has to contain itself. */
    /* `shrink-0` is load-bearing: the app shell wraps this route in a
       `flex-1 flex flex-col min-h-0` column, and a flex child defaults to
       shrink:1 — so `h-dvh` alone collapsed the whole lobby to 160px and
       `overflow-hidden` clipped the mode picker to a two-pixel sliver. */
    <div className={cn('flex h-dvh shrink-0 flex-col overflow-hidden bg-neo-navy w-full', isRTL && 'rtl')}>
      <EducationHeader showBackButton title={t('education.classroomGame.title')} />

      <main className="flex min-h-0 flex-1 w-full max-w-5xl mx-auto flex-col overflow-hidden px-3 py-3 sm:px-6">
        {runExpress ? (
          <ClassroomGameLobbyExpress
            intent={quickLaunchIntent}
            onOpenFullSetup={openFullSetup}
          />
        ) : (
          <ClassroomGameLobby
            initialLessonId={lessonId}
            initialFlow={flow}
            onBack={handleBack}
          />
        )}
      </main>
    </div>
  );
}

import { TeacherGate } from '@/components/education/TeacherGate';

export default function ClassroomGamePage() {
  return <TeacherGate><ClassroomGameInner /></TeacherGate>;
}
