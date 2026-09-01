'use client';
import { useEffect } from 'react';
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

  if (isLoading) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center min-h-screen">
        <PageLoader size="lg" text={t('common.loading')} />
      </div>
    );
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
