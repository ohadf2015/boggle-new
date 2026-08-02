import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const useAuthMock = vi.fn();
const useTeacherAccessMock = vi.fn();
const useStudentClassroomMock = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));
vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => useTeacherAccessMock(),
}));
vi.mock('@/hooks/useStudentClassroom', () => ({
  useStudentClassroom: () => useStudentClassroomMock(),
}));

import { HomeEducationCardConnected } from '../HomeEducationCardConnected';

const auth = (over: Record<string, unknown> = {}) => ({
  isAuthenticated: true,
  isTeacher: false,
  isAdmin: false,
  ...over,
});

const teacherAccess = (over: Record<string, unknown> = {}) => ({
  hasAccess: false,
  status: 'none',
  latestRequest: null,
  trial: null,
  isLoading: false,
  ...over,
});

const studentClassroom = (over: Record<string, unknown> = {}) => ({
  classroom: null,
  classroomId: null,
  isLoading: false,
  error: null,
  refresh: vi.fn(),
  ...over,
});

describe('HomeEducationCardConnected', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useTeacherAccessMock.mockReset();
    useStudentClassroomMock.mockReset();
    useTeacherAccessMock.mockReturnValue(teacherAccess());
    useStudentClassroomMock.mockReturnValue(studentClassroom());
  });

  it('renders nothing for a signed-out visitor', () => {
    useAuthMock.mockReturnValue(auth({ isAuthenticated: false }));
    const { container } = render(<HomeEducationCardConnected />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for an authed user with no classroom membership', () => {
    useAuthMock.mockReturnValue(auth());
    useStudentClassroomMock.mockReturnValue(studentClassroom());
    const { container } = render(<HomeEducationCardConnected />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing while the classroom lookup is still in flight', () => {
    useAuthMock.mockReturnValue(auth());
    useStudentClassroomMock.mockReturnValue(studentClassroom({ isLoading: true }));
    const { container } = render(<HomeEducationCardConnected />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the teacher card (with trial countdown) for a teacher', () => {
    useAuthMock.mockReturnValue(auth({ isTeacher: true }));
    useTeacherAccessMock.mockReturnValue(
      teacherAccess({
        hasAccess: true,
        trial: {
          expiresAt: new Date().toISOString(),
          msLeft: 5 * 86400000,
          daysLeft: 5,
          hoursLeft: 120,
          isExpired: false,
          isUrgent: false,
        },
      })
    );
    render(<HomeEducationCardConnected />);
    expect(screen.getByTestId('home-education-card')).toHaveAttribute('href', '/en/teacher');
    expect(screen.getByTestId('home-education-trial-count')).toHaveTextContent('5');
  });

  it('renders the teacher card for an admin even without a teacher role', () => {
    useAuthMock.mockReturnValue(auth({ isAdmin: true }));
    render(<HomeEducationCardConnected />);
    expect(screen.getByTestId('home-education-card')).toHaveAttribute('href', '/en/teacher');
  });

  it('renders the student card for a classroom member who is not a teacher', () => {
    useAuthMock.mockReturnValue(auth());
    useStudentClassroomMock.mockReturnValue(
      studentClassroom({ classroomId: 'c1', classroom: { id: 'c1', name: 'Room 12' } })
    );
    render(<HomeEducationCardConnected />);
    expect(screen.getByTestId('home-education-card')).toHaveAttribute('href', '/en/student');
    expect(screen.getByTestId('home-education-subtitle')).toHaveTextContent('Room 12');
  });
});
