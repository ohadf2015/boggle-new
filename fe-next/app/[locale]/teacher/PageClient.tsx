'use client';

import { type ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import { TeacherGate } from '@/components/education/TeacherGate';
import { TeacherRouteLoading } from '@/components/teacher/routeLoading/TeacherRouteLoading';
import { TrialEndedBannerWithRecap } from '@/components/teacher/TrialRecapBanners';
import { TeacherProTrialExpiringBanner } from '@/components/teacher/TeacherProTrialExpiringBanner';
import { TeacherProTrialLifecycleBanner } from '@/components/teacher/TeacherProTrialLifecycleBanner';
import { TeacherProTrialChargeSoonBanner } from '@/components/teacher/TeacherProTrialChargeSoonBanner';
import { TeacherWinbackBanner } from '@/components/teacher/TeacherWinbackBanner';
import { TeacherTrialEndingCard } from '@/components/teacher/TeacherTrialEndingCard';
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
  chargeSoon: 'dashboard_trial_charge_soon',
  trialEnding: 'trial_ending_card',
  trialExpired: 'trial_ending_card',
  trialReminder: 'trial_ending_card',
  winback: 'dashboard_teacher_winback',
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
      alert={banner === 'paymentFailed' ? <PaymentFailedBanner portalUrl={b.portalUrl} stillPro={b.hasPro} /> : banner === 'winback' ? <TeacherWinbackBanner approved={b.approved} onDismiss={b.dismissWinback} /> : undefined}
      banner={banner ? accountBanner(banner, b) : undefined}
    />
  );
}

function accountBanner(banner: TeacherBillingBanner, b: ReturnType<typeof useTeacherBanner>): ReactNode {
  switch (banner) {
    case 'paymentFailed':
    case 'winback':
      return undefined;
    case 'pendingCheckout':
      return <PendingCheckoutBanner />;
    case 'trialEnding':
    case 'trialExpired':
    case 'trialReminder':
      return <TeacherTrialEndingCard trial={b.trial} />;
    case 'reactivate':
      return <TrialEndedBannerWithRecap onDismiss={b.dismissEnded} />;
    case 'trialExpiring':
      return <TeacherProTrialExpiringBanner trialExpires={b.trialExpires} portalUrl={b.portalUrl} onDismiss={b.dismissExpiring} />;
    case 'trialing':
      return <TeacherProTrialLifecycleBanner trialExpires={b.trialExpires} portalUrl={b.portalUrl} />;
    case 'chargeSoon':
      return <TeacherProTrialChargeSoonBanner chargeAt={b.trialExpires} portalUrl={b.portalUrl} />;
  }
}

export default function TeacherPage() {
  // The gate's wait shows the same shell-and-skeleton as the route fallback, so access resolving never swaps the chrome for a bare loader.
  return <TeacherGate loadingFallback={<TeacherRouteLoading />}><TeacherDashboardInner /></TeacherGate>;
}
