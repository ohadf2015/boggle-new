'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import { TeacherProAskBanner } from '@/components/teacher/TeacherProAskBanner';
import { TrialUrgencyBanner } from '@/components/education/TrialUrgencyBanner';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { pickTeacherBanner } from '@/lib/education/teacherBannerPriority';
import { trackGrowthEvent } from '@/utils/growthTracking';

// Access is settled by <TeacherGate> above: it owns the loading state and the
// redirect for anyone without teacher access. This component previously
// hand-rolled the same gate with a *different* loading predicate — two gates,
// two redirects, and a teacher could satisfy one while the other bounced them.
function TeacherDashboardInner() {
  const { language } = useLanguage();
  const { isAdmin } = useAuth();
  const { trial } = useTeacherAccess();
  const { hasPro, loading: proLoading } = useTeacherPro();

  // At most one banner above the dashboard. This page used to stack a trial
  // countdown, a district-pricing upsell and a Pro strip before the thing the
  // teacher opened it for. District pricing keeps its home on the classroom-game
  // launcher, which already links to "LexiClash for schools". A Pro teacher
  // (paid or gifted) gets no upsell at all.
  const banner = pickTeacherBanner({ hasTrial: !!trial, isAdmin, hasPro, proLoading });

  useEffect(() => {
    if (banner === 'pro') {
      trackGrowthEvent('iap_viewed', { product: 'teacher_pro', source: 'dashboard_banner', event_type: 'impression' });
    }
  }, [banner]);

  return (
    <>
      {banner === 'trial' && trial && (
        <div className="bg-neo-navy px-4 pt-4">
          <div className="mx-auto max-w-5xl">
            <TrialUrgencyBanner trial={trial} href={`/${language}/teacher`} />
          </div>
        </div>
      )}
      {banner === 'pro' && <TeacherProAskBanner />}
      <TeacherDashboard />
    </>
  );
}

import { TeacherGate } from '@/components/education/TeacherGate';

export default function TeacherPage() {
  return <TeacherGate><TeacherDashboardInner /></TeacherGate>;
}
