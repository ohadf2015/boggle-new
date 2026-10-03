'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { ClassPulseRow } from './ClassPulseRow';
import { ClassProgressStrip } from './ClassProgressStrip';

export interface HqClassPulseProps {
  classroomId: string;
  studentCount: number;
  assignmentCount: number | null;
  submittedCount: number | null;
  hasPro: boolean;
  /** This block owns the page's one Pro ask. */
  upsell: boolean;
  /** Opens the Pro sheet when it has something to show; otherwise the ask links to the upgrade page. */
  onUpgrade?: () => void;
  onOpenAssignments?: () => void;
  className?: string;
}

/** The class pulse hero (who needs help, hardest word, one report action) over the students/assigned/submitted line. */
export function HqClassPulse({
  classroomId,
  studentCount,
  assignmentCount,
  submittedCount,
  hasPro,
  upsell,
  onUpgrade,
  onOpenAssignments,
  className,
}: HqClassPulseProps) {
  const { t } = useLanguage();
  return (
    <section
      data-testid="hq-pulse"
      className={cn('flex flex-col gap-4 rounded-neo-lg bg-neo-navy-light/60 p-4 empty:hidden sm:p-5', className)}
    >
      <ClassPulseRow classroomId={classroomId} studentCount={studentCount} />
      <ClassProgressStrip
        bare
        classroomId={classroomId}
        studentCount={studentCount}
        assignmentCount={assignmentCount}
        submittedCount={submittedCount}
        hasPro={hasPro}
        showUpgrade={upsell}
        onUpgrade={onUpgrade}
        upgradeLabel={t('hqCalm.pulseUpsell')}
        onOpenAssignments={onOpenAssignments}
      />
    </section>
  );
}

export default HqClassPulse;
