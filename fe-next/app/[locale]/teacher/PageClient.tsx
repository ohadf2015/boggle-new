'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { PageLoader } from '@/components/ui/PageLoader';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import { DistrictUpsellBanner } from '@/components/teacher/DistrictUpsellBanner';
import { TrialUrgencyBanner } from '@/components/education/TrialUrgencyBanner';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { isTeacherProfile } from '@/lib/education/teacherRole';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackGrowthEvent } from '@/utils/growthTracking';

function TeacherDashboardInner() {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user, profile, isAdmin, loading: authLoading } = useAuth();
  const { trial } = useTeacherAccess();

  // Shared predicate — this gate is duplicated in the nav and useTeacherAccess,
  // and drift here silently bounces approved teachers to the homepage.
  const isTeacher = isTeacherProfile(profile);
  const isProfileLoading = !authLoading && user && !profile;

  useEffect(() => {
    if (!isAdmin && isTeacher && !authLoading && !isProfileLoading) {
      trackGrowthEvent('iap_viewed', { product: 'teacher_pro', source: 'dashboard_banner', event_type: 'impression' });
    }
  }, [isAdmin, isTeacher, authLoading, isProfileLoading]);

  // Redirect if not authenticated or not teacher
  useEffect(() => {
    if (!authLoading && !isProfileLoading && (!user || !isTeacher)) {
      router.push(`/${language}`);
    }
  }, [authLoading, isProfileLoading, user, isTeacher, router, language]);

  // Loading state
  if (authLoading || isProfileLoading) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center min-h-screen">
        <PageLoader
          size="lg"
          text={t('common.loading')}
        />
      </div>
    );
  }

  // Not authenticated or not teacher
  if (!user || !isTeacher) {
    return (
      <div className="flex-1 bg-neo-navy text-neo-white flex items-center justify-center min-h-screen">
        <div className="text-center p-8 bg-neo-cream border-3 border-black rounded-neo shadow-hard max-w-sm w-full mx-4">
          <div className="w-16 h-16 rounded-neo bg-neo-lime border-3 border-black flex items-center justify-center mx-auto mb-4 shadow-hard-sm">
            <Shield className="w-9 h-9 text-black" />
          </div>
          <h1 className="text-2xl font-neo-display font-black text-black mb-2">
            {t('teacher.accessRequired')}
          </h1>
          <p className="text-black/60 font-bold mb-6">
            {t('teacher.accessDenied')}
          </p>
          <Button
            onClick={() => router.push(`/${language}`)}
            className="bg-neo-cyan text-black font-black border-2 border-black shadow-hard hover:-translate-y-0.5 transition-all"
          >
            <ArrowLeft className="w-4 h-4 me-2 rtl:scale-x-[-1]" />
            {t('common.backToHome')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {trial && (
        <div className="bg-neo-navy px-4 pt-4">
          <div className="mx-auto max-w-5xl">
            <TrialUrgencyBanner trial={trial} href={`/${language}/teacher`} />
          </div>
        </div>
      )}
      <DistrictUpsellBanner t={t} language={language} />
      {!isAdmin && (
        <div className="bg-neo-navy border-b border-black/20 px-4 py-2">
          <div className="mx-auto max-w-5xl flex items-center justify-between">
            <span className="text-neo-white/60 text-sm font-neo-body">{t('teacher.upgradePro.body')}</span>
            <Link
              href={`/${language}/teacher/upgrade`}
              className="ms-4 font-neo-display font-black text-sm text-neo-lime underline underline-offset-2 whitespace-nowrap hover:opacity-80 transition-opacity"
              onClick={() => trackGrowthEvent('iap_viewed', { product: 'teacher_pro', source: 'dashboard_banner' })}
            >
              {t('teacher.upgradePro.cta')}
            </Link>
          </div>
        </div>
      )}
      <TeacherDashboard />
    </>
  );
}

import { TeacherGate } from '@/components/education/TeacherGate';

export default function TeacherPage() {
  return <TeacherGate><TeacherDashboardInner /></TeacherGate>;
}
