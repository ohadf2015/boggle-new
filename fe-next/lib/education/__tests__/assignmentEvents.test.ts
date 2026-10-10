import { describe, it, expect, vi, beforeEach } from 'vitest';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...args: unknown[]) => captureMock(...args) },
}));

const serverCapture = vi.fn();
vi.mock('@/lib/posthog', () => ({
  getPostHogServer: () => ({ capture: serverCapture }),
}));

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import {
  ASSIGNMENT_CREATED,
  ASSIGNMENT_COMPLETED,
  assignmentCreatedProperties,
  assignmentCompletedProperties,
  trackAssignmentCreated,
  captureAssignmentCompletedServer,
} from '../assignmentEvents';

describe('assignment funnel events', () => {
  beforeEach(() => {
    captureMock.mockClear();
    serverCapture.mockClear();
  });

  it('emits assignment_created with classroom, kind and due date', () => {
    trackAssignmentCreated({
      classroom_id: 'cls-1',
      assignment_id: 'a-1',
      kind: 'word_count',
      due_date: '2026-10-17',
      word_count_target: 12,
    });
    expect(captureMock).toHaveBeenCalledWith(
      ASSIGNMENT_CREATED,
      assignmentCreatedProperties({
        classroom_id: 'cls-1',
        assignment_id: 'a-1',
        kind: 'word_count',
        due_date: '2026-10-17',
        word_count_target: 12,
      }),
    );
    expect(captureMock.mock.calls[0][0]).toBe('assignment_created');
  });

  it('server completion stamps $host so HQ progress queries can see it', () => {
    captureAssignmentCompletedServer({
      classroom_id: 'cls-1',
      assignment_id: 'a-1',
      student_id: 'stu-1',
      kind: 'word_list',
    });
    expect(serverCapture).toHaveBeenCalledTimes(1);
    const payload = serverCapture.mock.calls[0][0];
    expect(payload.event).toBe(ASSIGNMENT_COMPLETED);
    expect(payload.event).toBe('assignment_completed');
    expect(payload.distinctId).toBe('stu-1');
    expect(payload.properties).toEqual({
      ...assignmentCompletedProperties({
        classroom_id: 'cls-1',
        assignment_id: 'a-1',
        student_id: 'stu-1',
        kind: 'word_list',
      }),
      $host: expect.any(String),
    });
  });
});
