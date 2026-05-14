import { vi, type Mock, } from 'vitest';
/**
 * Teacher Reports PageClient Tests
 *
 * Tests for the reports page that shows class and student progress.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportsPageClient from '../PageClient';

// Mock the report components
vi.mock('@/components/teacher/reports/StudentProgressReport', () => ({
  StudentProgressReport: ({ studentId, classroomId }: { studentId: string; classroomId: string }) => (
    <div data-testid="student-progress-report" data-student-id={studentId} data-classroom-id={classroomId}>
      Student Progress Report Mock
    </div>
  ),
}));

vi.mock('@/components/teacher/reports/ClassProgressReport', () => ({
  ClassProgressReport: ({ classroomId, onStudentClick }: { classroomId: string; onStudentClick?: (id: string) => void }) => (
    <div data-testid="class-progress-report" data-classroom-id={classroomId}>
      Class Progress Report Mock
      <button onClick={() => onStudentClick?.('student-123')}>Click Student</button>
    </div>
  ),
}));

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'teacher.reports.title': 'Progress Reports',
        'teacher.reports.classReport': 'Class Report',
        'teacher.reports.studentReport': 'Student Report',
        'teacher.reports.backToClass': 'Back to Class Report',
        'teacher.reports.selectClassroom': 'Select a Classroom',
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
    user: { id: 'user-123', email: 'teacher@example.com' },
    isAuthenticated: true,
    loading: false,
  }),
}));

// Mock useClassrooms hook
const mockClassrooms = [
  { id: 'classroom-1', name: 'English 101', created_at: '2024-01-01' },
  { id: 'classroom-2', name: 'English 102', created_at: '2024-01-02' },
];

vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: mockClassrooms,
    isLoading: false,
    error: null,
  }),
}));

// Mock useSearchParams
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  usePathname: () => '/en/teacher/reports',
}));

vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => ({ hasAccess: true, status: 'approved', latestRequest: null, isLoading: false }),
}));

describe('ReportsPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete('studentId');
    mockSearchParams.delete('classroomId');
  });

  describe('Classroom Selection', () => {
    it('displays classroom selection when no classroom is selected', () => {
      render(<ReportsPageClient />);

      expect(screen.getByText('Progress Reports')).toBeInTheDocument();
      expect(screen.getByText('Select a Classroom')).toBeInTheDocument();
    });

    it('displays list of available classrooms', () => {
      render(<ReportsPageClient />);

      expect(screen.getByText('English 101')).toBeInTheDocument();
      expect(screen.getByText('English 102')).toBeInTheDocument();
    });
  });

  describe('Class Report View', () => {
    beforeEach(() => {
      mockSearchParams.set('classroomId', 'classroom-1');
    });

    it('displays class report when classroom is selected', () => {
      render(<ReportsPageClient />);

      expect(screen.getByTestId('class-progress-report')).toBeInTheDocument();
      expect(screen.getByTestId('class-progress-report')).toHaveAttribute(
        'data-classroom-id',
        'classroom-1'
      );
    });

    it('switches to student view when student is clicked', async () => {
      const user = userEvent.setup();

      render(<ReportsPageClient />);

      const clickStudentButton = screen.getByRole('button', { name: /click student/i });
      await user.click(clickStudentButton);

      await waitFor(() => {
        expect(screen.getByTestId('student-progress-report')).toBeInTheDocument();
      });
    });
  });

  describe('Student Report View', () => {
    beforeEach(() => {
      mockSearchParams.set('classroomId', 'classroom-1');
      mockSearchParams.set('studentId', 'student-123');
    });

    it('displays student report when student is selected', () => {
      render(<ReportsPageClient />);

      expect(screen.getByTestId('student-progress-report')).toBeInTheDocument();
      expect(screen.getByTestId('student-progress-report')).toHaveAttribute(
        'data-student-id',
        'student-123'
      );
    });

    it('displays back button to return to class view', () => {
      render(<ReportsPageClient />);

      expect(screen.getByRole('button', { name: /back to class report/i })).toBeInTheDocument();
    });

    it('returns to class view when back button is clicked', async () => {
      const user = userEvent.setup();

      render(<ReportsPageClient />);

      const backButton = screen.getByRole('button', { name: /back to class report/i });
      await user.click(backButton);

      await waitFor(() => {
        expect(screen.getByTestId('class-progress-report')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible page heading', () => {
      render(<ReportsPageClient />);

      expect(
        screen.getByRole('heading', { name: /progress reports/i })
      ).toBeInTheDocument();
    });

    it('classroom buttons are accessible', () => {
      render(<ReportsPageClient />);

      const classroomButtons = screen.getAllByRole('button');
      expect(classroomButtons.length).toBeGreaterThan(0);
    });
  });
});
