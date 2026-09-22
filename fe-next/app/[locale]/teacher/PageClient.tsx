'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import { TeacherProAskBanner } from '@/components/teacher/TeacherProAskBanner';
import { TeacherProUsagePromptCard } from '@/components/teacher/TeacherProUsagePromptCard';
import { TrialUrgencyBanner } from '@/components/education/TrialUrgencyBanner';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherProMilestone } from '@/hooks/useTeacherProMilestone';
import { useTeacherUsagePrompt } from '@/hooks/useTeacherUsagePrompt';
import { useRecentGameSettings } from '@/hooks/useRecentGameSettings';
import { pickTeacherBanner } from '@/lib/education/teacherBannerPriority';
import { isTrialUpgradeNudgeWindow } from '@/lib/education/trial';
import { useTrialUpgradeNudge } from '@/lib/education/useTrialUpgradeNudge';
import {
  TEACHER_PRO_CHECKOUT_PATH,
  teacherProUpgradeCtaLabel,
} from '@/components/education/TeacherProCheckoutCta';
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
  const {
    reason: usageReason,
    count: usageCount,
    loading: usageLoading,
    dismissed: usageDismissed,
    dismiss: dismissUsagePrompt,
  } = useTeacherUsagePrompt();
  const { dismissed: trialNudgeDismissed, dismiss: dismissTrialNudge } =
    useTrialUpgradeNudge(trial);

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
    banner !== 'pro';

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
          <TrialUrgencyBanner
            trial={trial}
            href={`/${language}${TEACHER_PRO_CHECKOUT_PATH}`}
            onDismiss={trialNudgeOpen ? dismissTrialNudge : undefined}
            ctaLabel={trialNudgeOpen ? teacherProUpgradeCtaLabel(language) : undefined}
          />
        ) : banner === 'pro' ? (
          <TeacherProAskBanner onDismiss={dismiss} />
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

import { TeacherGate } from '@/components/education/TeacherGate';

export default function TeacherPage() {
  return <TeacherGate><TeacherDashboardInner /></TeacherGate>;
}
