'use client';

import { TeacherProTrialEndedBanner } from '@/components/teacher/TeacherProTrialEndedBanner';
import { TrialUrgencyBanner } from '@/components/education/TrialUrgencyBanner';
import { useTeacherTrialRecap } from '@/hooks/useTeacherTrialRecap';

// Wrappers so the 30-day activity read only runs while an expiry banner is on screen.
export function TrialEndedBannerWithRecap(props: React.ComponentProps<typeof TeacherProTrialEndedBanner>) {
  return <TeacherProTrialEndedBanner {...props} recap={useTeacherTrialRecap()} />;
}

export function TrialUrgencyBannerWithRecap(props: React.ComponentProps<typeof TrialUrgencyBanner>) {
  return <TrialUrgencyBanner {...props} recap={useTeacherTrialRecap()} />;
}
