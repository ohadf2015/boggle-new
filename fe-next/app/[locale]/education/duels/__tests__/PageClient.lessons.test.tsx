/**
 * A student owns no lessons — `vocabulary_lessons` is keyed by teacher_id.
 * Asking for `getLessons(student.id)` therefore always returned an empty list,
 * the challenge dialog's lesson picker had nothing in it, SEND CHALLENGE stayed
 * disabled, and a student could not start a duel at all. Nothing errored: the
 * query simply matched zero rows (recurring-pitfalls Class 4).
 *
 * The lessons a duel can be played on are the ones the CLASSROOM's teacher
 * wrote, so they must be fetched with the classroom's teacher_id.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DuelsPageClientInner from '../PageClient';

const mockGetStudentClassroom = vi.fn();
const mockGetDuelLessons = vi.fn();
const mockGetClassroomStudents = vi.fn();

vi.mock('@/lib/supabase/education', () => ({
  getStudentClassroom: (...args: unknown[]) => mockGetStudentClassroom(...args),
  getClassroomStudents: (...args: unknown[]) => mockGetClassroomStudents(...args),
}));
vi.mock('@/lib/education/duelLessons', () => ({
  getDuelLessons: (...args: unknown[]) => mockGetDuelLessons(...args),
}));

// A stable object: `useAuth()` returning a fresh one each render would change
// the effect's dependency every pass and re-fetch forever.
const authState = {
  user: { id: 'student-1', email: 's1@example.com' },
  isAuthenticated: true,
  loading: false,
};
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authState,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const lobbyProps: { lessons?: { id: string; name: string }[] } = {};

vi.mock('@/components/education/duels', () => ({
  DuelLobby: (props: { lessons?: { id: string; name: string }[] }) => {
    lobbyProps.lessons = props.lessons;
    return <div data-testid="duel-lobby">{(props.lessons ?? []).length}</div>;
  },
  DuelHistory: () => <div data-testid="duel-history" />,
  DuelNotification: () => <div data-testid="duel-notification" />,
}));
vi.mock('@/components/education/duels/ClassmatesList', () => ({
  ClassmatesList: () => <div data-testid="classmates-list" />,
}));
vi.mock('@/components/navigation/TopBackLink', () => ({
  TopBackLink: () => <div data-testid="top-back-link" />,
}));
vi.mock('@/components/education/TeacherGate', () => ({
  TeacherGate: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('DuelsPageClient — the duel lesson list comes from the teacher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lobbyProps.lessons = undefined;
    mockGetStudentClassroom.mockResolvedValue({
      data: { id: 'classroom-1', teacher_id: 'teacher-9', name: 'Duel Lab' },
      error: null,
    });
    mockGetClassroomStudents.mockResolvedValue({ data: [], error: null });
    mockGetDuelLessons.mockResolvedValue([{ id: 'lesson-1', name: 'Unit 3 verbs' }]);
  });

  it('asks for the lessons RLS lets this student duel on, unfiltered', async () => {
    render(<DuelsPageClientInner />);

    await waitFor(() => expect(screen.getByTestId('duel-lobby')).toBeInTheDocument(), {
      timeout: 5000,
    });

    // No owner id in the call: a teacher-scoped or student-scoped filter both
    // return zero rows for a student (see lib/education/duelLessons.ts).
    expect(mockGetDuelLessons).toHaveBeenCalledWith();
  });

  it('hands those lessons to the lobby so a challenge can name one', async () => {
    render(<DuelsPageClientInner />);

    await waitFor(() => expect(screen.getByTestId('duel-lobby')).toHaveTextContent('1'), {
      timeout: 5000,
    });
    expect(lobbyProps.lessons).toEqual([{ id: 'lesson-1', name: 'Unit 3 verbs' }]);
  });
});
