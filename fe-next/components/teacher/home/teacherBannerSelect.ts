import { polarTrialUx } from '@/lib/education/polarTrial';
import type { SubscriptionSource } from '@/lib/education/proGrant';
import type { TeacherProStatus } from '@/hooks/useTeacherPro';

/** Account-state banners only. Pro upsells live in Home's one class-insight slot, never here. */
export type TeacherBillingBanner =
  | 'paymentFailed'
  | 'pendingCheckout'
  | 'trialReminder'
  | 'trialExpired'
  | 'reactivate'
  | 'trialing'
  | 'trialExpiring';

export type TeacherBannerSelection =
  | { kind: 'pending' }
  | { kind: 'error' }
  | { kind: 'none' }
  | { kind: 'show'; banner: TeacherBillingBanner };

export interface TeacherBannerInput {
  proLoading: boolean;
  /** False when the plan read failed or came back signed out: not the same as "free, nothing to say". */
  proKnown: boolean;
  hasPro: boolean;
  status: TeacherProStatus;
  source: SubscriptionSource;
  trialUsed: boolean;
  pendingCheckout: boolean;
  isAdmin: boolean;
  accessLoading: boolean;
  accessTrialExpired: boolean;
  trialReminderOpen: boolean;
  trialEndedDismissed: boolean;
  polarTrialExpiring: boolean;
  trialExpiringDismissed: boolean;
}

const show = (banner: TeacherBillingBanner): TeacherBannerSelection => ({ kind: 'show', banner });

export function selectTeacherBanner(s: TeacherBannerInput): TeacherBannerSelection {
  if (s.proLoading || s.accessLoading) return { kind: 'pending' };
  if (!s.proKnown) return { kind: 'error' };
  if (s.status === 'past_due' && s.source === 'polar') return show('paymentFailed');
  const polar = polarTrialUx({ hasPro: s.hasPro, status: s.status, source: s.source, trialUsed: s.trialUsed });
  if (polar.showLifecycleBanner) {
    if (!s.polarTrialExpiring) return show('trialing');
    return s.trialExpiringDismissed ? { kind: 'none' } : show('trialExpiring');
  }
  if (s.hasPro) return { kind: 'none' };
  if (s.pendingCheckout && !s.isAdmin) return show('pendingCheckout');
  if (polar.showReactivation && !s.trialEndedDismissed) return show('reactivate');
  if (s.trialReminderOpen) return show('trialReminder');
  if (s.accessTrialExpired) return show('trialExpired');
  return { kind: 'none' };
}
