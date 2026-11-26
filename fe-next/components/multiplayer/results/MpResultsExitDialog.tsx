'use client';

import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { StudentExitDialog } from '@/components/student/live/StudentExitDialog';
import type { resultsExitCopy } from '@/lib/multiplayer/resultsExitCopy';
import type { MpResultsController } from './useMpResultsController';

/** Leaving results: a classroom student gets the class-aware dialog, everyone else the shared confirm. */
export function MpResultsExitDialog({ c, classroomStudent, copy }: { c: MpResultsController; classroomStudent: boolean; copy: ReturnType<typeof resultsExitCopy> }) {
  const { t } = c;
  return classroomStudent ? (
    <StudentExitDialog open={c.showExitConfirm} onOpenChange={c.setShowExitConfirm} onConfirm={c.confirmExitRoom} t={t} analyticsId="exit_room_confirm" />
  ) : (
    <ConfirmationDialog
      open={c.showExitConfirm}
      onOpenChange={c.setShowExitConfirm}
      title={t(copy.titleKey)}
      description={t(copy.bodyKey)}
      confirmText={t('common.confirm')}
      cancelText={t('common.cancel')}
      onConfirm={c.confirmExitRoom}
      variant="default"
      analyticsId="exit_room_confirm"
    />
  );
}
