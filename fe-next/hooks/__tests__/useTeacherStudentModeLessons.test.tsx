import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const { auth, getClassroomAssignments } = vi.hoisted(() => ({
  auth: { loading: false, user: { id: 'T' } as { id: string } | null, profile: { user_role: 'teacher' } as Record<string, unknown> | null },
  getClassroomAssignments: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/lib/supabase/education', () => ({ getClassroomAssignments }));

import { useTeacherStudentModeLessons } from '../useTeacherStudentModeLessons';
import { startTeacherStudentMode } from '@/lib/education/teacherStudentMode';

const assignment = { id: 'a1', classroom_id: 'c1', lesson_id: 'l1', created_at: '2026-11-20T00:00:00Z', due_date: null, vocabulary_lessons: { id: 'l1', name: 'Space', language: 'en', words: [] } };

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
  auth.loading = false;
  auth.user = { id: 'T' };
  auth.profile = { user_role: 'teacher' };
  getClassroomAssignments.mockResolvedValue({ data: [assignment], error: null });
});

describe('useTeacherStudentModeLessons', () => {
  it('Given a teacher in student mode, Then the student pages get that class’s lessons', async () => {
    startTeacherStudentMode('c1');
    const { result } = renderHook(() => useTeacherStudentModeLessons());
    await waitFor(() => expect(result.current.lessons?.map((l) => l.lessonId)).toEqual(['l1']));
    expect(result.current).toMatchObject({ active: true, pending: false, error: false });
    expect(getClassroomAssignments).toHaveBeenCalledWith('c1');
  });

  it('Given a student (no student-mode flag), Then nothing is fetched and the page keeps its own lessons', async () => {
    auth.profile = { user_role: 'student' };
    const { result } = renderHook(() => useTeacherStudentModeLessons());
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current).toMatchObject({ active: false, lessons: null });
    expect(getClassroomAssignments).not.toHaveBeenCalled();
  });

  it('Given the flag is set but the profile has not landed, Then it stays pending instead of showing the empty student list first', () => {
    startTeacherStudentMode('c1');
    auth.profile = null;
    const { result } = renderHook(() => useTeacherStudentModeLessons());
    expect(result.current.pending).toBe(true);
    expect(getClassroomAssignments).not.toHaveBeenCalled();
  });

  it('Given a non-teacher with a leftover flag, Then student mode is off', async () => {
    startTeacherStudentMode('c1');
    auth.profile = { user_role: 'student' };
    const { result } = renderHook(() => useTeacherStudentModeLessons());
    await waitFor(() => expect(result.current.pending).toBe(false));
    expect(result.current.active).toBe(false);
  });

  it('Given the class read fails, Then it reports an error, not an empty class', async () => {
    startTeacherStudentMode('c1');
    getClassroomAssignments.mockResolvedValue({ data: [], error: { message: 'boom' } });
    const { result } = renderHook(() => useTeacherStudentModeLessons());
    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current).toMatchObject({ active: true, pending: false, lessons: null });
  });
});
