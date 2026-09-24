'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { EducationHeader } from '@/components/education/EducationHeader';
import { LaunchStageBackdrop } from '@/components/education/lobby/LaunchStageBackdrop';
import { PageLoader } from '@/components/ui/PageLoader';
import { ClassroomGameLobby } from '@/components/education/ClassroomGameLobby';
import { ClassroomGameLobbyExpress } from '@/components/education/ClassroomGameLobbyExpress';
import { ClassroomGuestDemo } from '@/components/education/ClassroomGuestDemo';
import { TeacherGate } from '@/components/education/TeacherGate';
import {
  QUICK_LAUNCH_FLOW,
  clearQuickLaunchIntent,
  readQuickLaunchIntent,
} from '@/components/teacher/dashboard/quickLaunchIntent';
import { CEFR_LEVELS, type CefrLevel } from '@/lib/education/eslCefrDemo';
import { cn } from '@/lib/utils';
import type { LiveSurfacePreviewKind } from './LiveSurfacePreview';

/**
 * DEV-ONLY: `?preview=podium|projector|waiting` renders the live classroom surfaces
 * with fabricated data (see LiveSurfacePreview). `null` in production, so the
 * lazy chunk is never referenced there.
 */
const LiveSurfacePreview =
  process.env.NODE_ENV !== 'production'
    ? dynamic(() => import('./LiveSurfacePreview'), { ssr: false })
    : null;

function previewKind(value: string | null | undefined): LiveSurfacePreviewKind | null {
  return value === 'podium' || value === 'projector' || value === 'waiting' ? value : null;
}

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
  // ?cefr=A1|A2|B1 — the ESL page demo's "Run this list with the class" CTA.
  // Validated here so a junk param falls through to the plain lobby.
  const cefrParam = searchParams?.get('cefr') || '';
  const cefrLevel = (CEFR_LEVELS as readonly string[]).includes(cefrParam)
    ? (cefrParam as CefrLevel)
    : undefined;

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

  // Only reachable inside <TeacherGate>, so the caller is always a teacher who
  // came from the dashboard's GO LIVE. `/education` is the marketing landing.
  const handleBack = useCallback(() => {
    router.push(`/${language}/teacher`);
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
    <div className={cn('relative flex h-dvh shrink-0 flex-col overflow-hidden bg-neo-navy w-full', isRTL && 'rtl')}>
      {/* The arena the class is about to play in — behind header and picker. */}
      <LaunchStageBackdrop />
      <EducationHeader showBackButton title={t('education.classroomGame.title')} />

      <main className="relative flex min-h-0 flex-1 w-full max-w-5xl mx-auto flex-col overflow-hidden px-3 py-3 sm:px-6">
        {runExpress ? (
          <ClassroomGameLobbyExpress
            intent={quickLaunchIntent}
            onOpenFullSetup={openFullSetup}
          />
        ) : (
          <ClassroomGameLobby
            initialLessonId={lessonId}
            initialFlow={flow}
            cefrLevel={cefrLevel}
            onBack={handleBack}
          />
        )}
      </main>
    </div>
  );
}

/**
 * Guests land here from NoAccountCta ("Play now — no sign-up"). TeacherGate
 * would bounce them to the access signup wall — a signup wall behind a
 * no-signup promise — so they get the class-code join instead. Signed-in
 * teachers keep the gated lobby below.
 */
export default function ClassroomGamePage() {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const preview = previewKind(searchParams?.get('preview'));

  // Fabricated data only, so it runs ahead of the auth wall (dev builds only).
  if (LiveSurfacePreview && preview) {
    return <LiveSurfacePreview kind={preview} />;
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy min-h-dvh">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <ClassroomGuestDemo />;
  }

  return (
    <TeacherGate>
      <ClassroomGameInner />
    </TeacherGate>
  );
}
