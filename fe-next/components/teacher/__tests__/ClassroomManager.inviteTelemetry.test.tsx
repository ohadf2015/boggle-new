import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/utils/confettiUtils', () => ({ fireConfetti: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
// Faithful to the real t(key, fallback?, params?): it returns the copy and interpolates
// {{var}}/{var} at every return point. A key-only mock would make the title assertion below
// vacuous — it would pass on a component that never inserted the classroom name at all.
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    // Both call shapes are used in this codebase: t(key, fallback, params) and t(key, params).
    // Returning the params object as the string would render "[object Object]" and break the
    // whole component, so branch on the second argument's type.
    t: (
      k: string,
      second?: string | Record<string, string>,
      third?: Record<string, string>,
    ) => {
      const fallback = typeof second === 'string' ? second : undefined;
      const params = typeof second === 'object' && second !== null ? second : third;
      let out = fallback ?? k;
      for (const [key, value] of Object.entries(params ?? {})) {
        out = out.split(`{{${key}}}`).join(String(value)).split(`{${key}}`).join(String(value));
      }
      return out;
    },
    language: 'en',
  }),
}));
vi.mock('@/components/teacher/ClassroomStudentList', () => ({
  default: () => <div data-testid="classroom-student-list" />,
}));

const classroomsState: { classrooms: Array<Record<string, unknown>> } = { classrooms: [] };

vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: classroomsState.classrooms,
    isLoading: false,
    createClassroom: vi.fn(),
    updateClassroom: vi.fn(),
    deleteClassroom: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/components/teacher/hq/ClassroomCardActivity', () => ({
  ClassroomCardActivity: () => <div data-testid="card-activity" />,
}));

const telemetry = vi.hoisted(() => ({ copied: vi.fn(), shared: vi.fn() }));
vi.mock('@/lib/education/telemetry', async (orig) => ({
  ...(await orig<typeof import('@/lib/education/telemetry')>()),
  trackEduJoinCodeCopied: (...a: unknown[]) => telemetry.copied(...a),
  trackEduJoinCodeShared: (...a: unknown[]) => telemetry.shared(...a),
}));
const shareWithFallback = vi.fn();
vi.mock('@/utils/shareWithFallback', () => ({ shareWithFallback: (...a: unknown[]) => shareWithFallback(...a) }));

vi.mock('@/components/teacher/classroom/ClassAvatarStack', () => ({
  ClassAvatarStack: () => null,
}));

import ClassroomManager from '../ClassroomManager';

const CLASSROOM = {
  id: 'c1',
  name: "Mrs O'Brien's 4B",
  language: 'en',
  teacher_id: 't1',
  join_code: 'ABC123',
  created_at: '2026-08-27T00:00:00Z',
  member_count: 0,
};


beforeEach(() => {
  vi.clearAllMocks();
  classroomsState.classrooms = [CLASSROOM];
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
});

describe('ClassroomManager invite telemetry', () => {
  it('When the card copies the code, Then edu_join_code_copied fires for that class', async () => {
    render(<ClassroomManager />);
    await userEvent.click(screen.getByTestId('copy-join-code'));
    await vi.waitFor(() => expect(telemetry.copied).toHaveBeenCalledWith({ classroomId: 'c1' }));
  });

  it('When the card shares natively or falls back to copy, Then edu_join_code_shared carries the method', async () => {
    render(<ClassroomManager />);
    shareWithFallback.mockResolvedValueOnce('shared');
    await userEvent.click(screen.getByTestId('share-join-code'));
    await vi.waitFor(() => expect(telemetry.shared).toHaveBeenLastCalledWith({ classroomId: 'c1', method: 'native' }));
    shareWithFallback.mockResolvedValueOnce('copied');
    await userEvent.click(screen.getByTestId('share-join-code'));
    await vi.waitFor(() => expect(telemetry.shared).toHaveBeenLastCalledWith({ classroomId: 'c1', method: 'copy_fallback' }));
    shareWithFallback.mockResolvedValueOnce('cancelled');
    await userEvent.click(screen.getByTestId('share-join-code'));
    expect(telemetry.shared).toHaveBeenCalledTimes(2);
  });
});
