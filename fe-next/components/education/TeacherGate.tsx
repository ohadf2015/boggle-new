'use client';
import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { useExperiment } from '@/hooks/useExperiment';

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
  /** Has access ever settled as granted? Once true, a later loading blip is a
   *  blip, not a reason to tear the teacher's screen down. */
  const grantedRef = useRef(false);
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
  if (!isLoading && hasAccess) grantedRef.current = true;
  if (isLoading && !grantedRef.current) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center min-h-screen">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
  }
  if (isLoading && grantedRef.current) {
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
