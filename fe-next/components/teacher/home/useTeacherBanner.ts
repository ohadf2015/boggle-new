'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherTrialExpiring } from '@/hooks/useTeacherTrialExpiring';
import { useTeacherTrialEnded } from '@/hooks/useTeacherTrialEnded';
import { useTrialReminderBanner } from '@/lib/education/useTrialReminderBanner';
import { isPolarTrialDay10Expiring, polarTrialDaysLeft } from '@/lib/education/polarTrial';
import { isTrialReminderWindow } from '@/lib/education/trial';
import { selectTeacherBanner } from './teacherBannerSelect';

/** Every input the Home billing banner depends on, read once, decided by one pure function. */
export function useTeacherBanner() {
  const { isAdmin } = useAuth();
  const access = useTeacherAccess();
  const pro = useTeacherPro();
  const expiring = useTeacherTrialExpiring();
  const ended = useTeacherTrialEnded();
  const reminder = useTrialReminderBanner(access.trial);
  const [nowMs] = useState(() => Date.now());
  const trialExpires = pro.trialExpires ?? pro.periodEnd;

  const selection = selectTeacherBanner({
    proLoading: pro.loading,
    proKnown: pro.known,
    hasPro: pro.hasPro,
    status: pro.status ?? 'active',
    source: pro.source,
    trialUsed: pro.trialUsed === true,
    pendingCheckout: pro.pendingCheckout === true,
    isAdmin: isAdmin === true,
    accessLoading: access.isLoading === true,
    accessTrialExpired: access.trial?.isExpired === true,
    trialReminderOpen: isTrialReminderWindow(access.trial) && !reminder.dismissed,
    trialEndedDismissed: ended.dismissed,
    polarTrialExpiring: isPolarTrialDay10Expiring(polarTrialDaysLeft(trialExpires, nowMs)),
    trialExpiringDismissed: expiring.dismissed,
  });

  return {
    selection,
    trial: access.trial,
    trialExpires,
    portalUrl: pro.portalUrl,
    hasPro: pro.hasPro,
    dismissReminder: reminder.dismiss,
    dismissEnded: ended.dismiss,
    dismissExpiring: expiring.dismiss,
  };
}
