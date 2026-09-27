/**
 * DuelsPageClient Tests
 * Tests for the duels hub page component
 */

import React from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DuelsPageClientInner from '../PageClient';

// Mock dependencies
const mockGetStudentClassroom = vi.fn();
const mockGetLessons = vi.fn();
const mockGetClassroomStudents = vi.fn();
const mockPush = vi.fn();

const mockAuthState: {
  user: { id: string; email: string } | null;
  isAuthenticated: boolean;
  loading: boolean;
} = {
  user: { id: 'student-1', email: 'test@example.com' },
  isAuthenticated: true,
  loading: false,
};

vi.mock('@/lib/supabase/education', () => ({
  getStudentClassroom: (...args: unknown[]) => mockGetStudentClassroom(...args),
  getClassroomStudents: (...args: unknown[]) => mockGetClassroomStudents(...args),
}));
vi.mock('@/lib/education/duelLessons', () => ({
  getDuelLessons: (...args: unknown[]) => mockGetLessons(...args),
}));

// Default mock implementations
mockGetClassroomStudents.mockResolvedValue({ data: [], error: null });

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock child components to avoid rendering complexity
vi.mock('@/components/education/duels', () => ({
  DuelLobby: () => <div data-testid="duel-lobby" />,
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

describe('DuelsPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks leaves *Once queues intact: a `mockReturnValueOnce(new
    // Promise(() => {}))` left unconsumed by one test would hang the next one
    // on a promise that never settles, which looks exactly like a hung render.
    mockGetStudentClassroom.mockReset();
    mockGetLessons.mockReset();
    mockGetClassroomStudents.mockReset();
    mockGetClassroomStudents.mockResolvedValue({ data: [], error: null });
    mockAuthState.user = { id: 'student-1', email: 'test@example.com' };
    mockAuthState.isAuthenticated = true;
    mockAuthState.loading = false;
  });

  it('should show loading spinner while loading data', () => {
    mockGetStudentClassroom.mockReturnValueOnce(
      new Promise(() => {}) // Never resolves
    );
    mockGetLessons.mockReturnValueOnce(new Promise(() => {}));

    render(<DuelsPageClientInner />);

    expect(screen.getByText('education.duels.findingClassmates')).toBeInTheDocument();
  });

  it('should show empty state when classroom is not found', async () => {
    mockGetStudentClassroom.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    mockGetLessons.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    render(<DuelsPageClientInner />);

    await waitFor(() => {
      expect(screen.getByText('education.duels.joinClassroomToDuel')).toBeInTheDocument();
    });
  });

  it('should show empty state when getStudentClassroom rejects (defect fix test)', async () => {
    // RED: Before fix, this will hang with loading spinner. After fix, it should show empty state.
    mockGetStudentClassroom.mockRejectedValueOnce(new Error('Network error'));
    mockGetLessons.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    render(<DuelsPageClientInner />);

    // Wait for the rejection to settle
    await waitFor(() => {
      // The spinner should disappear after the error
      expect(screen.queryByText('education.duels.findingClassmates')).not.toBeInTheDocument();

      // The empty state should appear instead
      expect(screen.getByText('education.duels.joinClassroomToDuel')).toBeInTheDocument();
    });
  });

  // A failing lesson fetch does not mean the student has no classroom. Showing
  // "join a classroom to duel" there was a lie that hid the pending challenges
  // and the duel history the student can still use.
  it('keeps the lobby when only the lesson fetch fails', async () => {
    mockGetStudentClassroom.mockResolvedValue({
      data: { id: 'classroom-1', teacher_id: 'teacher-9', name: 'Class A' },
      error: null,
    });
    mockGetLessons.mockRejectedValue(new Error('Network error'));

    render(<DuelsPageClientInner />);

    await waitFor(() => expect(screen.getByTestId('duel-lobby')).toBeInTheDocument(), {
      timeout: 5000,
    });
    expect(screen.queryByText('education.duels.findingClassmates')).not.toBeInTheDocument();
    expect(screen.queryByText('education.duels.joinClassroomToDuel')).not.toBeInTheDocument();
  });

  it('guest/no-user stays on duels with join empty state and does not redirect to /education', () => {
    mockAuthState.user = null;
    mockAuthState.isAuthenticated = false;

    render(<DuelsPageClientInner />);

    expect(screen.getByText('education.duels.joinClassroomToDuel')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockGetStudentClassroom).not.toHaveBeenCalled();
    expect(mockGetLessons).not.toHaveBeenCalled();

    const educationRedirects = mockPush.mock.calls.filter(
      ([url]) => typeof url === 'string' && /\/education(\/|$)/.test(url) && !url.includes('/education/duels')
    );
    expect(educationRedirects).toHaveLength(0);
  });

  it('does not wrap the student lobby in a teacher-only gate', () => {
    const src = readFileSync(path.join(__dirname, '../PageClient.tsx'), 'utf8');
    expect(src).not.toMatch(/TeacherGate/);
    expect(src).not.toMatch(/router\.push\(`\/\$\{language\}\/education`\)/);
  });
});
