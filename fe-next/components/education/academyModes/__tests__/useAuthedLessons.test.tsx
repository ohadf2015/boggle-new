import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { mode } = vi.hoisted(() => ({
  mode: { active: false, pending: false, lessons: null as unknown[] | null, error: false, retry: vi.fn() },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'T' }, loading: false, isAuthenticated: true }) }));
vi.mock('@/hooks/useTeacherStudentModeLessons', () => ({ useTeacherStudentModeLessons: () => mode }));

import { useAuthedLessons } from '../useAuthedLessons';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset().mockResolvedValue({ ok: true, json: async () => ({ lessons: [{ id: 'mine' }] }) });
  vi.stubGlobal('fetch', fetchMock);
  Object.assign(mode, { active: false, pending: false, lessons: null, error: false });
});

describe('useAuthedLessons', () => {
  it('Given a student, Then it reads their practisable lessons', async () => {
    const { result } = renderHook(() => useAuthedLessons());
    await waitFor(() => expect(result.current.lessons).toEqual([{ id: 'mine' }]));
  });

  it('Given a teacher in student mode, Then Missed Words and Word Workshop get the class’s lessons', () => {
    Object.assign(mode, { active: true, lessons: [{ lessonId: 'l1', status: 'assigned', classroomId: 'c1', lesson: { id: 'l1', name: 'Class', language: 'en', words: [{ word: 'orbit' }] } }] });
    const { result } = renderHook(() => useAuthedLessons());
    expect(result.current.lessons?.map((l) => l.id)).toEqual(['l1']);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Given student mode is still deciding, Then lessons stay unknown rather than the empty student list', async () => {
    Object.assign(mode, { pending: true });
    const { result } = renderHook(() => useAuthedLessons());
    expect(result.current.lessons).toBeNull();
  });

  it('Given the student-mode class read failed, Then it reports an error and retry re-reads the class', () => {
    Object.assign(mode, { active: true, error: true });
    const { result } = renderHook(() => useAuthedLessons());
    expect(result.current.error).toBe(true);
    result.current.retry();
    expect(mode.retry).toHaveBeenCalled();
  });
});
