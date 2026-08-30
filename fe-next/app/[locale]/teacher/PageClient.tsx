'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import { DistrictUpsellBanner } from '@/components/teacher/DistrictUpsellBanner';
import { TrialUrgencyBanner } from '@/components/education/TrialUrgencyBanner';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { trackGrowthEvent } from '@/utils/growthTracking';

// Access is settled by <TeacherGate> above: it owns the loading state and the
// redirect for anyone without teacher access. This component previously
// hand-rolled the same gate with a *different* loading predicate — two gates,
// two redirects, and a teacher could satisfy one while the other bounced them.
function TeacherDashboardInner() {
  const { t, language } = useLanguage();
  const { isAdmin } = useAuth();
  const { trial } = useTeacherAccess();

  useEffect(() => {
    if (!isAdmin) {
      trackGrowthEvent('iap_viewed', { product: 'teacher_pro', source: 'dashboard_banner', event_type: 'impression' });
    }
  }, [isAdmin]);

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
