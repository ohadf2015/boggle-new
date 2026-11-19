'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { showDay0FirstClassBridge } from '@/lib/education/day0FirstClassBridge';
import { trackFirstRoundGuideClicked, trackFirstRoundGuideShown } from '@/lib/education/firstRoundGuideTelemetry';
import { captureTeacherOnboardingCompleted, captureTeacherOnboardingOpened } from '@/lib/education/teacherOnboardingGate';
import { trackTeacherOnboardingStep } from '@/lib/education/telemetry';

interface Day0StartArgs {
  language: string;
  teacherId?: string | null;
  classroomId: string;
}

/**
 * A day-0 teacher used to get a second "Start the class" card under the ready screen.
 * The screen's own Start now carries that step, so its view and tap still count as day0_bridge.
 */
export function useDay0Start({ language, teacherId, classroomId }: Day0StartArgs): { bridge: boolean; onStart: () => void } {
  const { hasPro, loading, known, accessTrialExpires } = useTeacherPro();
  const { latestRequest } = useTeacherAccess();
  const [nowMs] = useState(() => Date.now());
  const approvedAt = latestRequest?.status === 'approved' ? latestRequest.created_at : null;
  const bridge = !loading && known && !hasPro && showDay0FirstClassBridge(accessTrialExpires, nowMs, approvedAt);

  useEffect(() => {
    if (!bridge) return;
    trackFirstRoundGuideShown({ surface: 'class_ready', locale: language, step: 'day0_bridge', ...(teacherId ? { teacherId } : {}), classroomId });
    if (!teacherId) return;
    captureTeacherOnboardingOpened({ teacherId, classroomId, step: 'day0_bridge', surface: 'class_ready', locale: language });
    trackTeacherOnboardingStep({ step: 'start_live_class', action: 'view', teacherId, classroomId });
  }, [bridge, language, teacherId, classroomId]);

  const onStart = useCallback(() => {
    if (!bridge) return;
    trackFirstRoundGuideClicked({ surface: 'class_ready', locale: language, step: 'day0_bridge', ...(teacherId ? { teacherId } : {}), classroomId });
    if (!teacherId) return;
    captureTeacherOnboardingCompleted({ teacherId, classroomId, step: 'day0_bridge', surface: 'class_ready', locale: language });
    trackTeacherOnboardingStep({ step: 'start_live_class', action: 'cta', teacherId, classroomId });
  }, [bridge, language, teacherId, classroomId]);

  return { bridge, onStart };
}
