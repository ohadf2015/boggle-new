'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { useExperiment } from '@/hooks/useExperiment';

/**
 * Teachers whose access has ALREADY resolved as granted, by user id.
 *
 * Module scope, not a `useRef`, and that is the whole point. A ref belongs to
 * one INSTANCE of `TeacherGate`, so any remount of the gate — a segment error
 * boundary recovering, a parent re-keying, a route-group remount — reset the
 * sticky-once fact to false. The next `isLoading` blip after that took the
 * full-page loader again and tore the entire dashboard down: the exact failure
 * the ref existed to prevent, one remount later.
 *
 * Keyed by user id, and cleared on sign-out, because an unkeyed flag would hand
 * the next person on a shared classroom laptop a gate that has already decided
 * to let them through. A revoked teacher still redirects: that arrives with
 * `isLoading` false, which never consults this set.
 */
const grantedTeacherIds = new Set<string>();

/**
 * The last user id we actually saw, so a remount that lands while auth is
 * mid-refresh can still recognise who this is.
 *
 * `useAuth().user` is null both when nobody is signed in AND for the window
 * before a re-initialising AuthProvider has a session again. Those two look
 * identical at a single render, and treating the second as a sign-out would
 * wipe the grant and take the loader — the exact teardown this file exists to
 * prevent, and reachable under precisely the churn that produced the original
 * report. Only a SETTLED signed-out state (`!isLoading && !userId`) ends a
 * grant; a null under `isLoading` falls back to this.
 *
 * A mutable container rather than a reassigned `let`, for the same reason the
 * grants are a Set: `react-hooks/globals` forbids reassigning a module binding
 * during render. Neither can be `useState`/`useRef` — the entire point is that
 * they outlive the component instance.
 */
const lastKnownUser: { id: string | null } = { id: null };

/** Test-only: the module-scoped grant outlives a single test's render tree. */
export function __resetTeacherGrantsForTests(): void {
  grantedTeacherIds.clear();
  lastKnownUser.id = null;
}

/**
 * The single role gate for every /teacher surface.
 *
 * It owns BOTH the wait and the redirect: rendering `null` while auth resolves
 * left the teacher staring at a blank navy page (the dashboard's own loader
 * never mounts — it lives below this gate), which is indistinguishable from a
 * page that failed to load. Show the loader here instead, and let the children
 * assume access is already settled.
 */
export function TeacherGate({ children }: { children: React.ReactNode }) {
  const { hasAccess, isLoading } = useTeacherAccess();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const { variant: redirectVariant, trackExposure: trackRedirectExposure } = useExperiment(
    'exp-teacher-gate-redirect-clarity-v1',
  );

  useEffect(() => {
    if (!isLoading && !hasAccess && pathname) {
      const locale = pathname.split('/')[1] || 'en';
      const from = encodeURIComponent(pathname);
      router.replace(`/${locale}/education/access?from=${from}`);
    }
  }, [hasAccess, isLoading, pathname, router]);

  useEffect(() => {
    if (!isLoading && !hasAccess && redirectVariant === 'redirect-status') {
      trackRedirectExposure();
    }
  }, [isLoading, hasAccess, redirectVariant, trackRedirectExposure]);

  // The loader is right for the FIRST resolve and wrong for every one after it.
  // `isLoading` is not one-shot — it is `authLoading || reqLoading ||
  // profileLoading`, and both `reqLoading` (the access-request refetch) and
  // `profileLoading` (a user with no profile yet, e.g. mid TOKEN_REFRESHED) go
  // true again long after the teacher is working. Returning the loader then
  // UNMOUNTS everything below: the dashboard's `activeTab`, any open modal, and
  // `ClassroomGameLobby`'s lesson selection. Observed live — the dashboard
  // snapped back to Play and closed the assign-lesson modal with no signal at
  // all, and it took several retries racing the reset to assign a lesson.
  //
  // So the loader is sticky-once. Genuine loss of access is unaffected: that
  // arrives with `isLoading` false and still falls through to the branch below.
  // A SETTLED signed-out state ends every grant. Doing this during render
  // rather than in an effect matters: the effect would run a paint too late,
  // and that paint is where a stale grant would show the signed-out screen a
  // dashboard. `isLoading` is the guard that keeps a mid-refresh null from
  // being mistaken for a sign-out.
  if (!isLoading && !userId) {
    grantedTeacherIds.clear();
    lastKnownUser.id = null;
  }
  if (userId) lastKnownUser.id = userId;
  if (!isLoading && hasAccess && userId) grantedTeacherIds.add(userId);

  // Who is this, as best we can tell right now. Falls back only while loading.
  const effectiveUserId = userId ?? (isLoading ? lastKnownUser.id : null);
  const wasGranted = !!effectiveUserId && grantedTeacherIds.has(effectiveUserId);

  if (isLoading && !wasGranted) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center min-h-screen">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }
  if (isLoading && wasGranted) {
    return <>{children}</>;
  }
  if (!hasAccess) {
    if (redirectVariant === 'redirect-status') {
      return (
        <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center min-h-screen">
          <PageLoader size="lg" text={t('common.loading')} />
        </div>
      );
    }
    return null;
  }
  return <>{children}</>;
}
