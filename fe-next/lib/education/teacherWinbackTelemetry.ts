/** PostHog names for the approved-never-tried Teacher Pro recall. */
import { safeCapture } from './telemetryCore';

const BASE = { product: 'teacher_pro', placement: 'dashboard_teacher_winback' };

export function trackTeacherWinbackShown(): void {
  safeCapture('teacher_winback_shown', BASE);
}

export function trackTeacherWinbackClicked(): void {
  safeCapture('teacher_winback_clicked', BASE);
}

export function trackTeacherWinbackDismissed(): void {
  safeCapture('teacher_winback_dismissed', BASE);
}
