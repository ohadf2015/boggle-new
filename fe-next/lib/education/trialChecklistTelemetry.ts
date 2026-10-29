/**
 * Client-side telemetry for the Teacher Pro Day-0 trial activation checklist.
 *
 * Mechanics mirror teacherActivationFunnel.ts: bare posthog.capture is
 * canonical, then trackGrowthEvent mirrors the same name + props into Growth
 * Radar's growth:* stream. Deliberately NOT in CANONICAL_DUAL_EMIT in
 * growthTracking.ts — a dual-emit would double-count. Never throws.
 *
 * CLIENT-ONLY MODULE: do not import posthog-node, backend/, or @/lib/subscriptions.
 */

import posthog from '@/lib/analytics/lazyPosthog';
import logger from '@/utils/logger';
import { trackGrowthEvent, type GrowthEvent } from '@/utils/growthTracking';
import {
  TRIAL_CHECKLIST_ALL_COMPLETED,
  TRIAL_CHECKLIST_EVENTS,
  TRIAL_CHECKLIST_SHOWN,
  TRIAL_CHECKLIST_STEP_COMPLETED,
  TRIAL_CHECKLIST_STEP_INDEX,
  TRIAL_CHECKLIST_STEP_ORDER,
  type TrialChecklistEventName,
  type TrialChecklistStepId,
} from './trialChecklistEvents';

export {
  TRIAL_CHECKLIST_ALL_COMPLETED,
  TRIAL_CHECKLIST_EVENTS,
  TRIAL_CHECKLIST_SHOWN,
  TRIAL_CHECKLIST_STEP_COMPLETED,
  TRIAL_CHECKLIST_STEP_INDEX,
  TRIAL_CHECKLIST_STEP_ORDER,
} from './trialChecklistEvents';
export type {
  TrialChecklistEventName,
  TrialChecklistStepId,
} from './trialChecklistEvents';

type Capture = (event: string, props?: Record<string, unknown>) => void;

const safeCapture: Capture = (event, props) => {
  try {
    (posthog.capture as unknown as Capture)(event, props);
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[trialChecklistTelemetry] capture failed', { event, err });
    }
  }
};

function mirrorToGrowth(event: GrowthEvent, props: Record<string, unknown>): void {
  try {
    trackGrowthEvent(event, { ...props });
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      logger.debug('[trialChecklistTelemetry] growth mirror failed', { event, err });
    }
  }
}

function captureChecklistEvent(
  event: TrialChecklistEventName,
  props: Record<string, unknown>,
): void {
  safeCapture(event, props);
  mirrorToGrowth(event, props);
}

export const TRIAL_CHECKLIST_SHOWN_KEY_PREFIX = 'lexi_edu_trial_checklist_shown_';
export const TRIAL_CHECKLIST_STEP_KEY_PREFIX = 'lexi_edu_trial_checklist_step_';
export const TRIAL_CHECKLIST_ALL_COMPLETED_KEY_PREFIX = 'lexi_edu_trial_checklist_completed_';

export function trialChecklistShownStorageKey(teacherId: string): string {
  return `${TRIAL_CHECKLIST_SHOWN_KEY_PREFIX}${teacherId}`;
}

export function trialChecklistStepStorageKey(
  teacherId: string,
  step: TrialChecklistStepId,
): string {
  return `${TRIAL_CHECKLIST_STEP_KEY_PREFIX}${teacherId}_${step}`;
}

export function trialChecklistAllCompletedStorageKey(teacherId: string): string {
  return `${TRIAL_CHECKLIST_ALL_COMPLETED_KEY_PREFIX}${teacherId}`;
}

export interface TrialChecklistShownProps {
  locale?: string;
  done_count: number;
}

export function captureTrialChecklistShown(props: TrialChecklistShownProps): void {
  captureChecklistEvent(TRIAL_CHECKLIST_EVENTS.shown, {
    ...(props.locale !== undefined ? { locale: props.locale } : {}),
    plan: 'trial',
    done_count: props.done_count,
  });
}

/**
 * Fire `trial_checklist_shown` at most once per teacher id when the banner is
 * visible. Blocked storage still fires once rather than zero.
 */
export function captureTrialChecklistShownOnce(
  teacherId: string | null | undefined,
  props: TrialChecklistShownProps,
): boolean {
  if (!teacherId) return false;
  const key = trialChecklistShownStorageKey(teacherId);
  try {
    if (typeof window !== 'undefined' && window.localStorage.getItem(key)) {
      return false;
    }
  } catch {
    /* storage blocked — count it */
  }
  captureTrialChecklistShown(props);
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, String(Date.now()));
    }
  } catch {
    /* best effort */
  }
  return true;
}

export interface TrialChecklistStepProps {
  locale?: string;
  /** When completed_at was already set on load, do not re-fire. */
  alreadyCompleted?: boolean;
}

export function captureTrialChecklistStepCompleted(
  step: TrialChecklistStepId,
  props: { locale?: string } = {},
): void {
  captureChecklistEvent(TRIAL_CHECKLIST_EVENTS.stepCompleted, {
    step,
    step_index: TRIAL_CHECKLIST_STEP_INDEX[step],
    ...(props.locale !== undefined ? { locale: props.locale } : {}),
    plan: 'trial',
  });
}

/**
 * Fire `trial_checklist_step_completed` at most once per (teacherId, step).
 * Does not fire if `alreadyCompleted` is true (completed_at was set on load).
 */
export function captureTrialChecklistStepCompletedOnce(
  teacherId: string | null | undefined,
  step: TrialChecklistStepId,
  props: TrialChecklistStepProps = {},
): boolean {
  if (!teacherId || props.alreadyCompleted) return false;
  const key = trialChecklistStepStorageKey(teacherId, step);
  try {
    if (typeof window !== 'undefined' && window.localStorage.getItem(key)) {
      return false;
    }
  } catch {
    /* storage blocked — count it */
  }
  captureTrialChecklistStepCompleted(step, { locale: props.locale });
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, String(Date.now()));
    }
  } catch {
    /* best effort */
  }
  return true;
}

export interface TrialChecklistAllCompletedProps {
  locale?: string;
  /** When completed_at was already set on load, do not fire again. */
  alreadyCompleted?: boolean;
}

export function captureTrialChecklistAllCompleted(
  props: { locale?: string } = {},
): void {
  captureChecklistEvent(TRIAL_CHECKLIST_EVENTS.allCompleted, {
    ...(props.locale !== undefined ? { locale: props.locale } : {}),
    plan: 'trial',
  });
}

/**
 * Fire `trial_checklist_all_completed` once when all three steps are done.
 * If `alreadyCompleted` (`completed_at` on load) is true, does not fire again.
 */
export function captureTrialChecklistAllCompletedOnce(
  teacherId: string | null | undefined,
  props: TrialChecklistAllCompletedProps = {},
): boolean {
  if (!teacherId || props.alreadyCompleted) return false;
  const key = trialChecklistAllCompletedStorageKey(teacherId);
  try {
    if (typeof window !== 'undefined' && window.localStorage.getItem(key)) {
      return false;
    }
  } catch {
    /* storage blocked — count it */
  }
  captureTrialChecklistAllCompleted({ locale: props.locale });
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, String(Date.now()));
    }
  } catch {
    /* best effort */
  }
  return true;
}
