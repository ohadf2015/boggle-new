/**
 * Client telemetry for the trial first-session checklist.
 *
 * Bare posthog.capture is canonical. trackGrowthEvent mirrors the same name
 * into Growth Radar. Not in CANONICAL_DUAL_EMIT — a dual-emit would
 * double-count. Never throws.
 *
 * CLIENT-ONLY. Do not import posthog-node, backend/, or subscriptions.
 */

import posthog from '@/lib/analytics/lazyPosthog';
import logger from '@/utils/logger';
import { trackGrowthEvent, type GrowthEvent } from '@/utils/growthTracking';
import {
  TEACHER_ACTIVATION_STEP_COMPLETED,
  TRIAL_FIRST_SESSION_STEP_INDEX,
  type TrialFirstSessionStepId,
} from './trialFirstSessionChecklist';

export const TEACHER_ACTIVATION_STEP_COMPLETED_KEY_PREFIX = 'lexi_edu_teacher_activation_step_';
export const TEACHER_ACTIVATION_STEP_ABANDONED_KEY_PREFIX = 'lexi_edu_teacher_activation_step_abandoned_';

type Capture = (event: string, props?: Record<string, unknown>) => void;

const safeCapture: Capture = (event, props) => {
  try {
    (posthog.capture as unknown as Capture)(event, props);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[trialFirstSession] capture failed', { event, err });
    }
  }
};

function mirrorToGrowth(event: GrowthEvent, props: Record<string, unknown>): void {
  try {
    trackGrowthEvent(event, { ...props });
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[trialFirstSession] growth mirror failed', { event, err });
    }
  }
}

export interface TeacherActivationStepProps {
  step: TrialFirstSessionStepId;
  outcome: 'completed' | 'abandoned';
  locale?: string;
}

export function teacherActivationStepProps(
  props: TeacherActivationStepProps,
): Record<string, unknown> {
  return {
    step: props.step,
    step_index: TRIAL_FIRST_SESSION_STEP_INDEX[props.step],
    outcome: props.outcome,
    plan: 'trial',
    ...(props.locale !== undefined ? { locale: props.locale } : {}),
  };
}

/** Fire teacher_activation_step_completed. Completion and abandonment share the name. */
export function captureTeacherActivationStep(props: TeacherActivationStepProps): void {
  const payload = teacherActivationStepProps(props);
  safeCapture(TEACHER_ACTIVATION_STEP_COMPLETED, payload);
  mirrorToGrowth(TEACHER_ACTIVATION_STEP_COMPLETED, payload);
}

function storageGet(store: Storage, key: string): string | null {
  return store.getItem(key);
}

/**
 * Once per teacher id. A blocked store still fires — a rare double beats a
 * silent zero. No teacher id, nothing fires.
 */
export function captureTeacherActivationStepCompletedOnce(
  teacherId: string | null | undefined,
  step: TrialFirstSessionStepId,
  props: { locale?: string },
): boolean {
  if (!teacherId) return false;
  const key = `${TEACHER_ACTIVATION_STEP_COMPLETED_KEY_PREFIX}${teacherId}_${step}`;
  try {
    if (typeof window !== 'undefined' && storageGet(window.localStorage, key)) return false;
  } catch {
    /* storage blocked — count it */
  }
  captureTeacherActivationStep({ step, outcome: 'completed', locale: props.locale });
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, String(Date.now()));
  } catch {
    /* best effort */
  }
  return true;
}

/** Once per teacher+step per browser session. A later visit can abandon again. */
export function captureTeacherActivationStepAbandonedOnce(
  teacherId: string | null | undefined,
  step: TrialFirstSessionStepId,
  props: { locale?: string },
): boolean {
  if (!teacherId) return false;
  const key = `${TEACHER_ACTIVATION_STEP_ABANDONED_KEY_PREFIX}${teacherId}_${step}`;
  try {
    if (typeof window !== 'undefined' && storageGet(window.sessionStorage, key)) return false;
  } catch {
    /* storage blocked — count it */
  }
  captureTeacherActivationStep({ step, outcome: 'abandoned', locale: props.locale });
  try {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(key, String(Date.now()));
  } catch {
    /* best effort */
  }
  return true;
}
