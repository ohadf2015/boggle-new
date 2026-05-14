import { vi, type Mock, } from 'vitest';
/**
 * Teacher Curriculum PageClient Tests
 *
 * Tests for the curriculum page that shows curriculum-aligned word lists.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CurriculumPageClient from '../PageClient';

// Mock the CurriculumWordListBrowser component
vi.mock('@/components/teacher/curriculum/CurriculumWordListBrowser', () => ({
  CurriculumWordListBrowser: ({
    teacherId,
    classroomId,
    onImportSuccess,
  }: {
    teacherId?: string;
    classroomId?: string;
    onImportSuccess?: (lesson: unknown) => void;
  }) => (
    <div
      data-testid="curriculum-word-list-browser"
      data-teacher-id={teacherId}
      data-classroom-id={classroomId}
    >
      Curriculum Word List Browser Mock
    </div>
  ),
}));

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'teacher.curriculum.title': 'Curriculum Word Lists',
        'teacher.curriculum.description': 'Pre-built word lists aligned with Israeli educational standards',
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock useAuth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'teacher-123', email: 'teacher@example.com' },
    isAuthenticated: true,
    loading: false,
  }),
}));

// Mock useSearchParams
const mockSearchParams = new URLSearchParams();
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => '/en/teacher/curriculum',
}));

vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => ({ hasAccess: true, status: 'approved', latestRequest: null, isLoading: false }),
}));

describe('CurriculumPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete('classroomId');
  });

  describe('Page Rendering', () => {
    it('renders the curriculum word list browser', () => {
      render(<CurriculumPageClient />);

      expect(screen.getByTestId('curriculum-word-list-browser')).toBeInTheDocument();
    });

    it('passes teacher ID to the browser component', () => {
      render(<CurriculumPageClient />);

      expect(screen.getByTestId('curriculum-word-list-browser')).toHaveAttribute(
        'data-teacher-id',
        'teacher-123'
      );
    });
  });

  describe('Classroom Context', () => {
    it('passes classroomId from URL to browser component', () => {
      mockSearchParams.set('classroomId', 'classroom-456');

      render(<CurriculumPageClient />);

      expect(screen.getByTestId('curriculum-word-list-browser')).toHaveAttribute(
        'data-classroom-id',
        'classroom-456'
      );
    });

    it('handles missing classroomId gracefully', () => {
      render(<CurriculumPageClient />);

      // Should render without error
      expect(screen.getByTestId('curriculum-word-list-browser')).toBeInTheDocument();
    });
  });

  describe('Page Container', () => {
    it('renders with appropriate styling', () => {
      const { container } = render(<CurriculumPageClient />);

      // Check for neo-brutalist styling
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('min-h-screen');
      expect(wrapper).toHaveClass('bg-neo-navy');
    });
  });

  describe('Accessibility', () => {
    it('renders a main content area', () => {
      render(<CurriculumPageClient />);

      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });
});
