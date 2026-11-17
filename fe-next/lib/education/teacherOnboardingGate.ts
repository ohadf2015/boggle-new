/**
 * Teacher-onboarding gate events.
 *
 * `trackTeacherOnboardingStep` (edu_teacher_onboarding_step, flow=checklist)
 * had no production call site, so PostHog showed 0. The HQ card and the day-0
 * class-ready bridge are the gates that actually mount. They fire these two
 * names, with teacher_id and classroom_id, so the funnel can be measured.
 *
 * Client-only. Never throws.
 */
import { safeCapture } from './telemetryCore';

export const TEACHER_ONBOARDING_GATE_EVENTS = {
  opened: 'teacher_onboarding_opened',
  completed: 'teacher_onboarding_completed',
} as const;

export type TeacherOnboardingGateSurface = 'home' | 'class_ready';

export interface TeacherOnboardingGateProps {
  teacherId: string;
  /** Null on the no-class home card. Omitted from the event rather than sent empty. */
  classroomId?: string | null;
  step: string;
  surface: TeacherOnboardingGateSurface;
  locale: string;
}

const OPENED_KEY_PREFIX = 'lexi_edu_teacher_onboarding_gate_open_';
const COMPLETED_KEY_PREFIX = 'lexi_edu_teacher_onboarding_gate_done_';

function payload(props: TeacherOnboardingGateProps): Record<string, unknown> {
  return {
    teacher_id: props.teacherId,
    ...(props.classroomId ? { classroom_id: props.classroomId } : {}),
    step: props.step,
    surface: props.surface,
    locale: props.locale,
  };
}

function storageGet(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string): void {
  try {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, String(Date.now()));
  } catch {
    /* best effort */
  }
}

function completedKey(teacherId: string): string {
  return `${COMPLETED_KEY_PREFIX}${teacherId}`;
}

function openedKey(teacherId: string): string {
  return `${OPENED_KEY_PREFIX}${teacherId}`;
}

/** Gate is on screen. Fires every call — the mount effect dedupes per step. */
export function captureTeacherOnboardingOpened(props: TeacherOnboardingGateProps): void {
  safeCapture(TEACHER_ONBOARDING_GATE_EVENTS.opened, payload(props));
  storageSet(openedKey(props.teacherId));
}

/**
 * Gate's ask is done. Once per teacher id so a reload does not look like a
 * second conversion. Returns whether this call emitted.
 */
export function captureTeacherOnboardingCompleted(props: TeacherOnboardingGateProps): boolean {
  if (storageGet(completedKey(props.teacherId))) return false;
  safeCapture(TEACHER_ONBOARDING_GATE_EVENTS.completed, payload(props));
  storageSet(completedKey(props.teacherId));
  return true;
}

/**
 * Dashboard completion observed after this browser has seen the gate.
 * Skips teachers who were already done before instrumentation, so shipping
 * this does not backfill a completion for every returning teacher.
 */
export function captureTeacherOnboardingCompletedIfOpened(props: TeacherOnboardingGateProps): boolean {
  if (!storageGet(openedKey(props.teacherId))) return false;
  return captureTeacherOnboardingCompleted(props);
}
