import { describe, expect, it, vi } from 'vitest';

const safeCapture = vi.fn();
vi.mock('../telemetryCore', () => ({
  safeCapture: (...args: unknown[]) => safeCapture(...args),
}));

import { trackTeacherWinbackClicked, trackTeacherWinbackDismissed, trackTeacherWinbackShown } from '../teacherWinbackTelemetry';

describe('teacher win-back PostHog events', () => {
  beforeEach(() => safeCapture.mockReset());

  it('names the three funnel events the dashboard recall needs', () => {
    trackTeacherWinbackShown();
    trackTeacherWinbackClicked();
    trackTeacherWinbackDismissed();
    expect(safeCapture.mock.calls.map((c) => c[0])).toEqual([
      'teacher_winback_shown',
      'teacher_winback_clicked',
      'teacher_winback_dismissed',
    ]);
  });
});
