'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import { TeacherGate } from '@/components/education/TeacherGate';
import { TEACHER_PRO_CHECKOUT_PATH } from '@/components/education/TeacherProCheckoutCta';
import { TrialEndedBannerWithRecap, TrialUrgencyBannerWithRecap } from '@/components/teacher/TrialRecapBanners';
import { TeacherProTrialExpiringBanner } from '@/components/teacher/TeacherProTrialExpiringBanner';
import { TeacherProTrialLifecycleBanner } from '@/components/teacher/TeacherProTrialLifecycleBanner';
import { TeacherTrialReminderBanner } from '@/components/education/TeacherTrialReminderBanner';
import { PendingCheckoutBanner } from '@/components/teacher/PendingCheckoutBanner';
import { PaymentFailedBanner } from '@/components/teacher/PaymentFailedBanner';
import { useTeacherBanner } from '@/components/teacher/home/useTeacherBanner';
import type { TeacherBillingBanner } from '@/components/teacher/home/teacherBannerSelect';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { trackGrowthEvent } from '@/utils/growthTracking';
import { captureTeacherOnboardingViewedOnce, teacherFunnelPlan } from '@/lib/education/teacherOnboardingFunnel';
import { captureTeacherActivationOnboardingOnce } from '@/lib/education/teacherActivationFunnel';

const IMPRESSION_SOURCE: Partial<Record<TeacherBillingBanner, string>> = {
  paymentFailed: 'dashboard_payment_failed',
  pendingCheckout: 'dashboard_pending_checkout',
  reactivate: 'dashboard_trial_ended',
  trialing: 'dashboard_trial_lifecycle',
  trialExpiring: 'dashboard_trial_lifecycle',
};

// Access is settled by <TeacherGate> above: it owns the loading state and the redirect.
function TeacherDashboardInner() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { hasPro, loading: proLoading, status } = useTeacherPro();
  const b = useTeacherBanner();
  const banner = b.selection.kind === 'show' ? b.selection.banner : null;

  useEffect(() => {
    if (proLoading) return;
    const funnelProps = { locale: language, plan: teacherFunnelPlan({ hasPro, status, loading: proLoading }) };
    captureTeacherOnboardingViewedOnce(funnelProps);
    captureTeacherActivationOnboardingOnce(user?.id, funnelProps);
  }, [proLoading, hasPro, status, language, user?.id]);

  useEffect(() => {
    const source = banner ? IMPRESSION_SOURCE[banner] : undefined;
    if (source) trackGrowthEvent('iap_viewed', { product: 'teacher_pro', source, event_type: 'impression' });
  }, [banner]);

  return (
    <TeacherDashboard
      alert={banner === 'paymentFailed' ? <PaymentFailedBanner portalUrl={b.portalUrl} stillPro={b.hasPro} /> : undefined}
      banner={
        banner === 'pendingCheckout' ? (
          <PendingCheckoutBanner />
        ) : banner === 'trialReminder' ? (
          <TeacherTrialReminderBanner trial={b.trial} onDismiss={b.dismissReminder} />
        ) : banner === 'trialExpired' ? (
          <TrialUrgencyBannerWithRecap trial={b.trial} href={`/${language}${TEACHER_PRO_CHECKOUT_PATH}`} />
        ) : banner === 'reactivate' ? (
          <TrialEndedBannerWithRecap onDismiss={b.dismissEnded} />
        ) : banner === 'trialExpiring' ? (
          <TeacherProTrialExpiringBanner trialExpires={b.trialExpires} onDismiss={b.dismissExpiring} />
        ) : banner === 'trialing' ? (
          <TeacherProTrialLifecycleBanner trialExpires={b.trialExpires} />
        ) : undefined
      }
    />
  );
}

export default function TeacherPage() {
  return <TeacherGate><TeacherDashboardInner /></TeacherGate>;
}
