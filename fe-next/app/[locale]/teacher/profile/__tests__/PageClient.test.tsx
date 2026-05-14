import { vi, type MockedFunction, type MockedClass, type Mock } from 'vitest';
/**
 * Tests for Teacher Profile PageClient
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TeacherProfilePageClient from '../PageClient';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassrooms } from '@/hooks/useClassroom';
import { useRouter } from 'next/navigation';

vi.mock('@/contexts/AuthContext');
vi.mock('@/contexts/LanguageContext');
vi.mock('@/hooks/useClassroom');
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: () => '/en/teacher/profile',
}));

vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => ({ hasAccess: true, status: 'approved', latestRequest: null, isLoading: false }),
}));
vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: ({ showBackButton }: { showBackButton?: boolean }) => (
    <div data-testid="education-header" data-show-back={String(showBackButton)}>
      EducationHeader
    </div>
  ),
}));

const mockUseAuth = useAuth as MockedFunction<typeof useAuth>;
const mockUseLanguage = useLanguage as MockedFunction<typeof useLanguage>;
const mockUseClassrooms = useClassrooms as MockedFunction<typeof useClassrooms>;
const mockUseRouter = useRouter as MockedFunction<typeof useRouter>;

const mockPush = vi.fn();

describe('TeacherProfilePageClient', () => {
  const mockTeacherProfile = {
    id: 'teacher-1',
    username: 'teacher_jane',
    display_name: 'Jane Smith',
    avatar_emoji: '👩‍🏫',
    is_admin: true,
    user_role: 'teacher' as const,
  };

  const mockClassrooms = [
    { id: 'cls-1', name: 'English Advanced', member_count: 12 },
    { id: 'cls-2', name: 'English Beginners', member_count: 8 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseRouter.mockReturnValue({ push: mockPush } as any);

    mockUseLanguage.mockReturnValue({
      t: (key: string) => key,
      language: 'en',
      setLanguage: vi.fn(),
      dir: 'ltr',
      currentFlag: '🇺🇸',
    } as any);

    mockUseAuth.mockReturnValue({
      user: { id: 'teacher-1', email: 'jane@school.com' } as any,
      isAuthenticated: true,
      profile: mockTeacherProfile as any,
      loading: false,
      isTeacher: true,
      isAdmin: true,
      login: vi.fn(),
      logout: vi.fn(),
      updateProfile: vi.fn(),
    } as any);

    mockUseClassrooms.mockReturnValue({
      classrooms: mockClassrooms as any,
      isLoading: false,
      error: null,
      createClassroom: vi.fn(),
      updateClassroom: vi.fn(),
      deleteClassroom: vi.fn(),
      refresh: vi.fn(),
    } as any);
  });

  test('renders without crashing', () => {
    render(<TeacherProfilePageClient />);
    expect(screen.getByTestId('teacher-profile-page')).toBeInTheDocument();
  });

  test('uses EducationHeader with showBackButton', () => {
    render(<TeacherProfilePageClient />);
    const header = screen.getByTestId('education-header');
    expect(header).toBeInTheDocument();
    expect(header).toHaveAttribute('data-show-back', 'true');
  });

  test('shows teacher display name', () => {
    render(<TeacherProfilePageClient />);
    expect(screen.getByTestId('teacher-display-name')).toHaveTextContent('Jane Smith');
  });

  test('shows classroom count', () => {
    render(<TeacherProfilePageClient />);
    expect(screen.getByTestId('classroom-count')).toBeInTheDocument();
  });

  test('shows total student count across all classrooms', () => {
    render(<TeacherProfilePageClient />);
    // 12 + 8 = 20 total students
    expect(screen.getByTestId('total-student-count')).toBeInTheDocument();
  });

  test('shows contact admin section', () => {
    render(<TeacherProfilePageClient />);
    expect(screen.getByTestId('contact-admin-section')).toBeInTheDocument();
  });

  test('shows user role status', () => {
    render(<TeacherProfilePageClient />);
    expect(screen.getByTestId('user-role-status')).toBeInTheDocument();
  });

  test('redirects to home when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      profile: null,
      loading: false,
      isTeacher: false,
      isAdmin: false,
    } as any);

    render(<TeacherProfilePageClient />);
    expect(mockPush).toHaveBeenCalledWith('/en');
  });

  test('shows loading state while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      profile: null,
      loading: true,
      isTeacher: false,
      isAdmin: false,
    } as any);

    render(<TeacherProfilePageClient />);
    expect(screen.queryByTestId('teacher-profile-page')).not.toBeInTheDocument();
  });
});
