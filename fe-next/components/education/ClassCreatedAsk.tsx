'use client';

import { useEffect, useState } from 'react';
import { useTeacherPro } from '@/hooks/useTeacherPro';
import { useTeacherAccess } from '@/lib/education/useTeacherAccess';
import { showDay0FirstClassBridge } from '@/lib/education/day0FirstClassBridge';
import { trackFirstRoundGuideShown } from '@/lib/education/firstRoundGuideTelemetry';
import { captureTeacherOnboardingCompleted, captureTeacherOnboardingOpened } from '@/lib/education/teacherOnboardingGate';
import { trackTeacherOnboardingStep } from '@/lib/education/telemetry';
import { ResultsTeacherProTrialCard, CLASS_CREATED_TRIAL_PLACEMENT } from '@/components/education/results/ResultsTeacherProTrialCard';
import { FirstClassBridgeCard } from '@/components/education/FirstClassBridgeCard';

export interface ClassCreatedAskProps {
  language: string;
  href: string;
  onStart?: () => void;
  className?: string;
  /** Present once auth has settled. The gate event waits for it rather than emitting an unstitchable row. */
  teacherId?: string | null;
  classroomId?: string | null;
}

/**
 * The ask under a brand-new class. A newly approved teacher on day 0–2 gets
 * the first-class card; day 3+ and a finished access trial get the Teacher Pro
 * offer card instead. While entitlement is loading or the teacher is on Pro,
 * render nothing: the offer card would otherwise count an impression and then
 * get swapped out.
 */
export function ClassCreatedAsk({ language, href, onStart, className, teacherId, classroomId }: ClassCreatedAskProps) {
  const { hasPro, loading, known, accessTrialExpires } = useTeacherPro();
  const { latestRequest } = useTeacherAccess();
  const [nowMs] = useState(() => Date.now());
  const approvedAt = latestRequest?.status === 'approved' ? latestRequest.created_at : null;
  const bridge = !loading && known && !hasPro && showDay0FirstClassBridge(accessTrialExpires, nowMs, approvedAt);

  useEffect(() => {
    if (!bridge) return;
    trackFirstRoundGuideShown({
      surface: 'class_ready',
      locale: language,
      step: 'day0_bridge',
      ...(teacherId ? { teacherId } : {}),
      ...(classroomId ? { classroomId } : {}),
    });
    if (!teacherId) return;
    captureTeacherOnboardingOpened({
      teacherId,
      classroomId,
      step: 'day0_bridge',
      surface: 'class_ready',
      locale: language,
    });
    trackTeacherOnboardingStep({
      step: 'start_live_class',
      action: 'view',
      teacherId,
      classroomId,
    });
  }, [bridge, language, teacherId, classroomId]);

  const start = () => {
    if (teacherId) {
      captureTeacherOnboardingCompleted({
        teacherId,
        classroomId,
        step: 'day0_bridge',
        surface: 'class_ready',
        locale: language,
      });
      trackTeacherOnboardingStep({
        step: 'start_live_class',
        action: 'cta',
        teacherId,
        classroomId,
      });
    }
    onStart?.();
  };

  if (loading || hasPro) return null;
  if (bridge) {
    return <FirstClassBridgeCard language={language} href={href} onStart={start} className={className} />;
  }
  return (
    <ResultsTeacherProTrialCard
      language={language}
      placement={CLASS_CREATED_TRIAL_PLACEMENT}
      className={className}
    />
  );
}
