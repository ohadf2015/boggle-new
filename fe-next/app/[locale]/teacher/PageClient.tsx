'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import { TeacherProAskBanner } from '@/components/teacher/TeacherProAskBanner';
import { TrialUrgencyBanner } from '@/components/education/TrialUrgencyBanner';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherProMilestone } from '@/hooks/useTeacherProMilestone';
import { useRecentGameSettings } from '@/hooks/useRecentGameSettings';
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
  const { hasRecentConfig } = useRecentGameSettings();
  const {
    hasMilestone,
    loading: milestoneLoading,
    dismissed,
    dismiss,
  } = useTeacherProMilestone();

  // At most one banner above the dashboard. This page used to stack a trial
  // countdown, a district-pricing upsell and a Pro strip before the thing the
  // teacher opened it for. District pricing keeps its home on the classroom-game
  // launcher, which already links to "LexiClash for schools". A Pro teacher
  // (paid or gifted) gets no upsell at all.
  // The Pro strip waits for a classroom engagement milestone (3 students or
  // 5 completed games/assignments) instead of firing on first live game.
  // Trial urgency still waits for a first live game so a brand-new teacher
  // is not counting down a clock before they have hosted anyone.
  const picked = pickTeacherBanner({
    hasTrial: !!trial,
    isAdmin,
    hasPro,
    proLoading,
    hasMilestone,
    milestoneLoading,
    proAskDismissed: dismissed,
  });
  const banner = picked === 'trial' && !hasRecentConfig ? null : picked;

  useEffect(() => {
    if (banner === 'pro') {
      trackGrowthEvent('iap_viewed', { product: 'teacher_pro', source: 'dashboard_banner', event_type: 'impression' });
    }
  }, [banner]);

  // Handed to the dashboard, never rendered beside it: a sibling of an `h-dvh`
  // root grows the page past the viewport and the document starts scrolling
  // again — for precisely the teachers who have a banner to see.
  return (
    <TeacherDashboard
      banner={
        banner === 'trial' && trial ? (
          <TrialUrgencyBanner trial={trial} href={`/${language}/teacher`} />
        ) : banner === 'pro' ? (
          <TeacherProAskBanner onDismiss={dismiss} />
        ) : undefined
      }
    />
  );
}

import { TeacherGate } from '@/components/education/TeacherGate';

export default function TeacherPage() {
  return <TeacherGate><TeacherDashboardInner /></TeacherGate>;
}
