'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import { TrialEndedBannerWithRecap, TrialUrgencyBannerWithRecap } from '@/components/teacher/TrialRecapBanners';
import { TeacherProTrialExpiringBanner } from '@/components/teacher/TeacherProTrialExpiringBanner';
import { TeacherProTrialLifecycleBanner } from '@/components/teacher/TeacherProTrialLifecycleBanner';
import { TeacherTrialReminderBanner } from '@/components/education/TeacherTrialReminderBanner';
import { PendingCheckoutBanner } from '@/components/teacher/PendingCheckoutBanner';
import { PaymentFailedBanner } from '@/components/teacher/PaymentFailedBanner';
import { TeacherProUsagePromptCard } from '@/components/teacher/TeacherProUsagePromptCard';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherProMilestone } from '@/hooks/useTeacherProMilestone';
import { useTeacherTrialExpiring } from '@/hooks/useTeacherTrialExpiring';
import { useTeacherTrialEnded } from '@/hooks/useTeacherTrialEnded';
import { useTeacherTrialOffer } from '@/hooks/useTeacherTrialOffer';
import { useTeacherUsagePrompt } from '@/hooks/useTeacherUsagePrompt';
import { useRecentGameSettings } from '@/hooks/useRecentGameSettings';
import { pickHomeAsk, pickTeacherBanner } from '@/lib/education/teacherBannerPriority';
import { polarTrialUx, polarTrialDaysLeft, isPolarTrialDay10Expiring } from '@/lib/education/polarTrial';
import { isTrialUpgradeNudgeWindow, isTrialReminderWindow } from '@/lib/education/trial';
import { useTrialUpgradeNudge } from '@/lib/education/useTrialUpgradeNudge';
import { useTrialReminderBanner } from '@/lib/education/useTrialReminderBanner';
import { trackGrowthEvent } from '@/utils/growthTracking';
import {
  captureTeacherOnboardingViewedOnce,
  teacherFunnelPlan,
} from '@/lib/education/teacherOnboardingFunnel';
import { captureTeacherActivationOnboardingOnce } from '@/lib/education/teacherActivationFunnel';

// Access is settled by <TeacherGate> above: it owns the loading state and the
// redirect for anyone without teacher access. This component previously
// hand-rolled the same gate with a *different* loading predicate — two gates,
// two redirects, and a teacher could satisfy one while the other bounced them.
function TeacherDashboardInner() {
  const { language } = useLanguage();
  const { user, isAdmin } = useAuth();
  const { trial } = useTeacherAccess();
  const { hasPro, loading: proLoading, status, source, trialUsed, trialExpires, periodEnd, pendingCheckout, portalUrl } = useTeacherPro();
  const polarTrial = polarTrialUx({
    hasPro,
    status: status ?? 'active',
    source,
    trialUsed: trialUsed === true,
  });
  const { hasRecentConfig } = useRecentGameSettings();
  const {
    hasMilestone,
    loading: milestoneLoading,
    dismissed,
    dismiss,
  } = useTeacherProMilestone();
  const { dismissed: trialOfferDismissed, dismiss: dismissTrialOffer } = useTeacherTrialOffer();
  const { dismissed: trialExpiringDismissed, dismiss: dismissTrialExpiring } = useTeacherTrialExpiring();
  const { dismissed: trialEndedDismissed, dismiss: dismissTrialEnded } = useTeacherTrialEnded();
  const {
    reason: usageReason,
    count: usageCount,
    loading: usageLoading,
    dismissed: usageDismissed,
    dismiss: dismissUsagePrompt,
  } = useTeacherUsagePrompt();
  const { dismissed: trialNudgeDismissed, dismiss: dismissTrialNudge } =
    useTrialUpgradeNudge(trial);
  const { dismissed: trialReminderDismissed, dismiss: dismissTrialReminder } =
    useTrialReminderBanner(trial);

  // At most one banner above the dashboard. This page used to stack a trial
  // countdown, a district-pricing upsell and a Pro strip before the thing the
  // teacher opened it for. District pricing keeps its home on the classroom-game
  // launcher, which already links to "LexiClash for schools". A Pro teacher
  // (paid or gifted) gets no upsell at all.
  // The Pro strip waits for a classroom engagement milestone (3 students or
  // 5 completed games/assignments) instead of firing on first live game.
  // The trial banner is the 7-day upgrade nudge (or the expired renewal card),
  // not a 14-day activation countdown — Polar checkout is the CTA. Brand-new
  // teachers still wait for a first live game before the countdown, but an
  // expired trial always gets the renewal card.
  // When trial daysLeft <= 3, the urgent reminder banner displays above the dashboard
  // with a direct Polar trial checkout CTA.
  const trialReminderOpen = isTrialReminderWindow(trial) && !trialReminderDismissed;
  const trialNudgeOpen = isTrialUpgradeNudgeWindow(trial) && !trialNudgeDismissed;
  const picked = pickTeacherBanner({
    hasTrial: trialNudgeOpen || !!trial?.isExpired,
    trialReminderOpen,
    isAdmin,
    hasPro,
    proLoading,
    hasMilestone,
    milestoneLoading,
    proAskDismissed: dismissed,
    // Expired Polar Pro trial replaces the access banner and the milestone
    // ask. A live Polar trial is hasPro + the lifecycle banner (days left
    // and a Keep-Pro CTA that POSTs /api/subscription/checkout). The header chip stays.
    polarTrialExpired: polarTrial.showReactivation && !trialEndedDismissed,
    polarTrialing: polarTrial.showLifecycleBanner,
    polarOfferTrial: polarTrial.offerTrial,
    offerTrialDismissed: trialOfferDismissed,
    pendingCheckout: pendingCheckout === true,
    paymentFailed: status === 'past_due' && source === 'polar',
  });
  const banner =
    picked === 'trial' && !hasRecentConfig && !trial?.isExpired ? null : picked;

  // One ask per screen. The usage card waits for a REAL limit hit (10+ students
  // in a class, or 3+ assignments in one); Home drops any rail ask while its
  // onboarding guide or an account banner is up.
  const trialNudgeAsk = banner === 'trial' && trialNudgeOpen && !trial?.isExpired;
  const homeAsk = pickHomeAsk({
    account:
      banner === 'paymentFailed' ||
      banner === 'pendingCheckout' ||
      banner === 'reactivate' ||
      banner === 'trialing' ||
      banner === 'trialReminder' ||
      (banner === 'trial' && !!trial?.isExpired),
    onboarding: false,
    trial: banner === 'offerTrial' || trialNudgeAsk,
    usage: !hasPro && !proLoading && !usageLoading && usageReason !== null && !usageDismissed,
    pro: banner === 'pro',
  });
  const showUsagePrompt = homeAsk === 'usage';

  // First-view funnel step. Waits for the entitlement read so the plan stamped
  // on the event is the real one, then fires at most once per browser. The
  // activation funnel's onboarding step fires alongside it, once per teacher id.
  useEffect(() => {
    if (proLoading) return;
    const funnelProps = {
      locale: language,
      plan: teacherFunnelPlan({ hasPro, status, loading: proLoading }),
    };
    captureTeacherOnboardingViewedOnce(funnelProps);
    captureTeacherActivationOnboardingOnce(user?.id, funnelProps);
  }, [proLoading, hasPro, status, language, user?.id]);

  useEffect(() => {
    if (banner === 'reactivate' || banner === 'trialing' || banner === 'pendingCheckout' || banner === 'paymentFailed') {
      trackGrowthEvent('iap_viewed', {
        product: 'teacher_pro',
        source:
          banner === 'paymentFailed'
            ? 'dashboard_payment_failed'
            : banner === 'pendingCheckout'
            ? 'dashboard_pending_checkout'
            : banner === 'reactivate'
              ? 'dashboard_trial_ended'
              : 'dashboard_trial_lifecycle',
        event_type: 'impression',
      });
    }
  }, [banner]);
  // The rail card's impression fires when Home actually renders it, not when it is picked.
  const onProOfferShown = useCallback(() => {
    trackGrowthEvent('iap_viewed', {
      product: 'teacher_pro',
      source: banner === 'offerTrial' ? 'dashboard_trial_offer' : 'dashboard_banner',
      event_type: 'impression',
    });
  }, [banner]);

  // Handed to the dashboard, never rendered beside it: a sibling of an `h-dvh`
  // root grows the page past the viewport and the document starts scrolling
  // again — for precisely the teachers who have a banner to see.
  // Capture once — react-hooks/purity treats Date.now() during render as impure.
  const [nowMs] = useState(() => Date.now());
  const trialDaysLeft = polarTrialDaysLeft(trialExpires ?? periodEnd, nowMs);
  const isTrialExpiring = isPolarTrialDay10Expiring(trialDaysLeft);

  // Free-teacher Pro asks are Home's ONE rail card; the milestone card waits for real engagement.
  const proOffer =
    homeAsk === 'trial' && banner === 'offerTrial'
      ? { kind: 'trial' as const, onDismiss: dismissTrialOffer, tracked: true, onShown: onProOfferShown }
      : homeAsk === 'trial' && trialNudgeAsk
        ? { kind: 'upgrade' as const, onDismiss: dismissTrialNudge, tracked: false }
        : homeAsk === 'pro'
          ? { kind: 'upgrade' as const, onDismiss: dismiss, tracked: true, onShown: onProOfferShown }
          : null;

  return (
    <TeacherDashboard
      pinBanner={
        (banner === 'trialing' && (!isTrialExpiring || !trialExpiringDismissed)) ||
        banner === 'reactivate' ||
        banner === 'trialReminder'
      }
      proOffer={proOffer}
      alert={banner === 'paymentFailed' ? <PaymentFailedBanner portalUrl={portalUrl} stillPro={hasPro} /> : undefined}
      banner={
        banner === 'pendingCheckout' ? (
          <PendingCheckoutBanner />
        ) : banner === 'trialReminder' ? (
          <TeacherTrialReminderBanner trial={trial} onDismiss={dismissTrialReminder} />
        ) : banner === 'trial' && trial?.isExpired ? (
          // An expired access trial is account state: the renewal card, never dismissible.
          <TrialUrgencyBannerWithRecap trial={trial} href={`/${language}${TEACHER_PRO_CHECKOUT_PATH}`} />
        ) : banner === 'reactivate' ? (
          <TrialEndedBannerWithRecap onDismiss={dismissTrialEnded} />
        ) : banner === 'trialing' ? (
          isTrialExpiring ? (
            !trialExpiringDismissed ? (
              <TeacherProTrialExpiringBanner
                trialExpires={trialExpires ?? periodEnd}
                onDismiss={dismissTrialExpiring}
              />
            ) : undefined
          ) : (
            <TeacherProTrialLifecycleBanner trialExpires={trialExpires ?? periodEnd} />
          )
        ) : undefined
      }
      usagePrompt={
        showUsagePrompt && usageReason ? (
          <TeacherProUsagePromptCard
            reason={usageReason}
            count={usageCount}
            onDismiss={dismissUsagePrompt}
          />
        ) : undefined
      }
    />
  );
}

import { TEACHER_PRO_CHECKOUT_PATH } from '@/components/education/TeacherProCheckoutCta';
import { useLanguage } from '@/contexts/LanguageContext';
import { TeacherGate } from '@/components/education/TeacherGate';

export default function TeacherPage() {
  return <TeacherGate><TeacherDashboardInner /></TeacherGate>;
}
