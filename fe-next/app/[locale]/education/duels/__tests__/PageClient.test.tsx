/**
 * DuelsPageClient Tests
 * Tests for the duels hub page component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import DuelsPageClientInner from '../PageClient';

// Mock dependencies
const mockGetStudentClassroom = vi.fn();
const mockGetLessons = vi.fn();
const mockGetClassroomStudents = vi.fn();
const mockPush = vi.fn();

vi.mock('@/lib/supabase/education', () => ({
  getStudentClassroom: (...args: unknown[]) => mockGetStudentClassroom(...args),
  getLessons: (...args: unknown[]) => mockGetLessons(...args),
  getClassroomStudents: (...args: unknown[]) => mockGetClassroomStudents(...args),
}));

// Default mock implementations
mockGetClassroomStudents.mockResolvedValue({ data: [], error: null });

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'student-1', email: 'test@example.com' },
    isAuthenticated: true,
    loading: false,
  }),
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

  it('should show empty state when getLessons rejects', async () => {
    mockGetStudentClassroom.mockResolvedValueOnce({
      data: { id: 'classroom-1', name: 'Class A' },
      error: null,
    });
    mockGetLessons.mockRejectedValueOnce(new Error('Network error'));

    render(<DuelsPageClientInner />);

    // Wait for the rejection to settle
    await waitFor(() => {
      // The spinner should disappear after the error
      expect(screen.queryByText('education.duels.findingClassmates')).not.toBeInTheDocument();

      // The empty state should appear instead
      expect(screen.getByText('education.duels.joinClassroomToDuel')).toBeInTheDocument();
    });
  });
});
