'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import { TrialEndedBannerWithRecap, TrialUrgencyBannerWithRecap } from '@/components/teacher/TrialRecapBanners';
import { TeacherProTrialExpiringBanner } from '@/components/teacher/TeacherProTrialExpiringBanner';
import { TeacherProTrialLifecycleBanner } from '@/components/teacher/TeacherProTrialLifecycleBanner';
import { PendingCheckoutBanner } from '@/components/teacher/PendingCheckoutBanner';
import { TeacherProUsagePromptCard } from '@/components/teacher/TeacherProUsagePromptCard';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherProMilestone } from '@/hooks/useTeacherProMilestone';
import { useTeacherTrialExpiring } from '@/hooks/useTeacherTrialExpiring';
import { useTeacherTrialEnded } from '@/hooks/useTeacherTrialEnded';
import { useTeacherTrialOffer } from '@/hooks/useTeacherTrialOffer';
import { useTeacherUsagePrompt } from '@/hooks/useTeacherUsagePrompt';
import { useRecentGameSettings } from '@/hooks/useRecentGameSettings';
import { pickTeacherBanner } from '@/lib/education/teacherBannerPriority';
import { polarTrialUx, polarTrialDaysLeft, isPolarTrialDay10Expiring } from '@/lib/education/polarTrial';
import { isTrialUpgradeNudgeWindow } from '@/lib/education/trial';
import { useTrialUpgradeNudge } from '@/lib/education/useTrialUpgradeNudge';
import { trackGrowthEvent } from '@/utils/growthTracking';
import {
  captureTeacherOnboardingViewedOnce,
  teacherFunnelPlan,
} from '@/lib/education/teacherOnboardingFunnel';
import { captureTeacherActivationOnboardingOnce } from '@/lib/education/teacherActivationFunnel';

const DASHBOARD_PRO_DISMISS_KEY = 'lexi:proTrialCardDismissed:dashboard';
const DASHBOARD_PRO_DISMISS_MS = 14 * 24 * 60 * 60 * 1000;

/** 14-day local "Not now" for the dashboard Teacher Pro card. Starts hidden so a dismissed card never flashes. */
function useDashboardProCardDismiss(): { dismissed: boolean; dismiss: () => void } {
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      const at = Number(window.localStorage.getItem(DASHBOARD_PRO_DISMISS_KEY));
      setDismissed(Number.isFinite(at) && at > 0 && Date.now() - at < DASHBOARD_PRO_DISMISS_MS);
    } catch {
      setDismissed(false);
    }
  }, []);
  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DASHBOARD_PRO_DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode: hide for this visit only */
    }
    setDismissed(true);
  }, []);
  return { dismissed, dismiss };
}

// Access is settled by <TeacherGate> above: it owns the loading state and the
// redirect for anyone without teacher access. This component previously
// hand-rolled the same gate with a *different* loading predicate — two gates,
// two redirects, and a teacher could satisfy one while the other bounced them.
function TeacherDashboardInner() {
  const { language } = useLanguage();
  const { user, isAdmin } = useAuth();
  const { trial } = useTeacherAccess();
  const { hasPro, loading: proLoading, status, source, trialUsed, trialExpires, periodEnd, pendingCheckout } = useTeacherPro();
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
  const { dismissed: dashboardProDismissed, dismiss: dismissDashboardPro } = useDashboardProCardDismiss();

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
  const trialNudgeOpen = isTrialUpgradeNudgeWindow(trial) && !trialNudgeDismissed;
  const picked = pickTeacherBanner({
    hasTrial: trialNudgeOpen || !!trial?.isExpired,
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
  });
  const banner =
    picked === 'trial' && !hasRecentConfig && !trial?.isExpired ? null : picked;

  // The usage-triggered card sits in the dashboard rail, not the banner slot.
  // It waits for a REAL limit hit (10+ students in a class, or 3+ assignments
  // created in one) and stays down while the milestone banner is already up —
  // two Pro asks on one screen is the stacked-prompt defect the banner
  // priority picker exists to prevent. Pro teachers (paid or gifted) never
  // see it.
  const showUsagePrompt =
    !hasPro &&
    !proLoading &&
    !usageLoading &&
    usageReason !== null &&
    !usageDismissed &&
    banner !== 'pro' &&
    banner !== 'reactivate' &&
    banner !== 'offerTrial' &&
    banner !== 'pendingCheckout';

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
    if (
      banner === 'pro' ||
      banner === 'reactivate' ||
      banner === 'trialing' ||
      banner === 'offerTrial' ||
      banner === 'pendingCheckout'
    ) {
      trackGrowthEvent('iap_viewed', {
        product: 'teacher_pro',
        source:
          banner === 'pendingCheckout'
            ? 'dashboard_pending_checkout'
            : banner === 'reactivate'
              ? 'dashboard_trial_ended'
              : banner === 'trialing'
                ? 'dashboard_trial_lifecycle'
                : banner === 'offerTrial'
                  ? 'dashboard_trial_offer'
                  : 'dashboard_banner',
        event_type: 'impression',
      });
    }
  }, [banner]);

  // Handed to the dashboard, never rendered beside it: a sibling of an `h-dvh`
  // root grows the page past the viewport and the document starts scrolling
  // again — for precisely the teachers who have a banner to see.
  // Capture once — react-hooks/purity treats Date.now() during render as impure.
  const [nowMs] = useState(() => Date.now());
  const trialDaysLeft = polarTrialDaysLeft(trialExpires ?? periodEnd, nowMs);
  const isTrialExpiring = isPolarTrialDay10Expiring(trialDaysLeft);

  // Free-teacher asks collapse into Home's ONE rail card; only trial account state stays a strip.
  // Any free teacher without a picked ask still gets the card (its wording follows
  // resolveProOffer). It stays down for admins, while the milestone read is open, after
  // any earlier "Not now" on a Pro ask, and beside the pending-checkout / Polar
  // reactivation banners (those already are the ask).
  const dismissAnd = (fn: () => void) => () => {
    fn();
    dismissDashboardPro();
  };
  const pickedProOffer =
    banner === 'offerTrial'
      ? { kind: 'trial' as const, onDismiss: dismissAnd(dismissTrialOffer), tracked: true }
      : banner === 'pro'
        ? { kind: 'upgrade' as const, onDismiss: dismissAnd(dismiss), tracked: true }
        : banner === 'trial' && trialNudgeOpen && !trial?.isExpired
          ? { kind: 'upgrade' as const, onDismiss: dismissAnd(dismissTrialNudge), tracked: false }
          : null;
  const proOffer =
    pickedProOffer ??
    (!hasPro &&
    !proLoading &&
    !isAdmin &&
    !milestoneLoading &&
    !dismissed &&
    !trialOfferDismissed &&
    !dashboardProDismissed &&
    banner !== 'pendingCheckout' &&
    banner !== 'reactivate'
      ? { kind: 'upgrade' as const, onDismiss: dismissDashboardPro, tracked: false }
      : null);

  return (
    <TeacherDashboard
      pinBanner={
        (banner === 'trialing' && (!isTrialExpiring || !trialExpiringDismissed)) ||
        banner === 'reactivate'
      }
      proOffer={proOffer}
      banner={
        banner === 'pendingCheckout' ? (
          <PendingCheckoutBanner />
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
