'use client';

import { TrialRecapLine } from '@/components/education/TrialRecapLine';
import { useTeacherTrialRecap } from '@/hooks/useTeacherTrialRecap';

// Own component so the 30-day activity read runs only while the trial strip is on screen.
export function TrialStripRecap() {
  return <TrialRecapLine recap={useTeacherTrialRecap()} className="text-xs font-bold text-neo-lime" />;
}
