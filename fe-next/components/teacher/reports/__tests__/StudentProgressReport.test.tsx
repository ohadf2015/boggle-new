/**
 * StudentProgressReport Component Tests
 *
 * Tests for the student progress report view component
 * that displays individual student metrics and allows PDF export.
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StudentProgressReport } from '../StudentProgressReport';
import { getStudentReportData, StudentReportData } from '@/lib/supabase/analytics';

// Mock data fetching
vi.mock('@/lib/supabase/analytics', () => ({
  getStudentReportData: vi.fn(),
}));

// Mock react-pdf/renderer
vi.mock('@react-pdf/renderer', () => ({
  pdf: vi.fn(() => ({
    toBlob: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'application/pdf' })),
  })),
  Document: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pdf-document">{children}</div>
  ),
  Page: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pdf-page">{children}</div>
  ),
  View: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pdf-view">{children}</div>
  ),
  Text: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="pdf-text">{children}</span>
  ),
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
  },
}));

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'teacher.reports.title': 'Progress Report',
        'teacher.reports.studentReport': 'Student Progress Report',
        'teacher.reports.metrics.wordsLearned': 'Words Learned',
        'teacher.reports.metrics.accuracy': 'Accuracy',
        'teacher.reports.metrics.practiceTime': 'Practice Time',
        'teacher.reports.metrics.currentStreak': 'Current Streak',
        'teacher.reports.metrics.longestStreak': 'Longest Streak',
        'teacher.reports.metrics.sessionsCompleted': 'Sessions Completed',
        'teacher.reports.metrics.averageScore': 'Average Score',
        'teacher.reports.metrics.masteryLevel': 'Mastery Level',
        'teacher.reports.sections.summary': 'Summary',
        'teacher.reports.sections.wordMastery': 'Word Mastery',
        'teacher.reports.sections.practiceHistory': 'Practice History',
        'teacher.reports.sections.recommendations': 'Recommendations',
        'teacher.reports.export.pdf': 'Export PDF',
        'teacher.reports.export.downloading': 'Downloading...',
        'teacher.reports.loading': 'Loading report...',
        'teacher.reports.error': 'Error loading report',
        'teacher.reports.noData': 'No data available',
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock URL.createObjectURL
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
const mockRevokeObjectURL = vi.fn();
global.URL.createObjectURL = mockCreateObjectURL;
global.URL.revokeObjectURL = mockRevokeObjectURL;

const mockStudentData: StudentReportData = {
  studentId: 'student-123',
  studentName: 'John Doe',
  avatarUrl: 'https://example.com/avatar.png',
  classroomName: 'English 101',
  dateRange: null,
  metrics: {
    wordsLearned: 25,
    totalWords: 50,
    accuracy: 85,
    practiceTimeMinutes: 120,
    currentStreak: 7,
    longestStreak: 14,
    sessionsCompleted: 15,
    averageScore: 85,
    masteryLevel: 'proficient',
  },
  wordMastery: [
    { word: 'apple', mastered: true, accuracy: 100, attempts: 5, lastPracticed: '2024-01-14' },
    { word: 'banana', mastered: true, accuracy: 90, attempts: 8, lastPracticed: '2024-01-13' },
    { word: 'cherry', mastered: false, accuracy: 60, attempts: 3, lastPracticed: '2024-01-12' },
  ],
  practiceHistory: [
    { date: '2024-01-15', sessionsCount: 2, wordsReviewed: 15, accuracy: 85 },
    { date: '2024-01-14', sessionsCount: 1, wordsReviewed: 10, accuracy: 90 },
  ],
  recommendations: [
    'Focus on words with lower accuracy',
    'Practice more frequently for better retention',
  ],
};

describe('StudentProgressReport', () => {
  const mockGetStudentReportData = getStudentReportData as jest.MockedFunction<
    typeof getStudentReportData
  >;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStudentReportData.mockResolvedValue({
      data: mockStudentData,
      error: null,
    });
  });

  describe('Loading State', () => {
    it('displays loading state initially', () => {
      mockGetStudentReportData.mockReturnValue(new Promise(() => {})); // Never resolves

      render(
        <StudentProgressReport studentId="student-123" classroomId="classroom-456" />
      );

      expect(screen.getByText('Loading report...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error message when data fetching fails', async () => {
      mockGetStudentReportData.mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch data' },
      });

      render(
        <StudentProgressReport studentId="student-123" classroomId="classroom-456" />
      );

      await waitFor(() => {
        expect(screen.getByText('Error loading report')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('displays no data message when report is empty', async () => {
      mockGetStudentReportData.mockResolvedValue({
        data: null,
        error: null,
      });

      render(
        <StudentProgressReport studentId="student-123" classroomId="classroom-456" />
      );

      await waitFor(() => {
        expect(screen.getByText('No data available')).toBeInTheDocument();
      });
    });
  });

  describe('Success State', () => {
    it('displays student name and classroom', async () => {
      render(
        <StudentProgressReport studentId="student-123" classroomId="classroom-456" />
      );

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('English 101')).toBeInTheDocument();
      });
    });

    it('displays words learned metric', async () => {
      render(
        <StudentProgressReport studentId="student-123" classroomId="classroom-456" />
      );

      await waitFor(() => {
        expect(screen.getByText('Words Learned')).toBeInTheDocument();
        expect(screen.getByText('25 / 50')).toBeInTheDocument();
      });
    });

    it('displays accuracy metric', async () => {
      render(
        <StudentProgressReport studentId="student-123" classroomId="classroom-456" />
      );

      await waitFor(() => {
        // "Accuracy" appears in both metric card and table header
        const accuracyLabels = screen.getAllByText('Accuracy');
        expect(accuracyLabels.length).toBeGreaterThan(0);
        // 85% appears multiple times (accuracy metric and word mastery table)
        const accuracyValues = screen.getAllByText(/85%?/);
        expect(accuracyValues.length).toBeGreaterThan(0);
      });
    });

    it('displays practice time metric', async () => {
      render(
        <StudentProgressReport studentId="student-123" classroomId="classroom-456" />
      );

      await waitFor(() => {
        expect(screen.getByText('Practice Time')).toBeInTheDocument();
        expect(screen.getByText('2h 0m')).toBeInTheDocument();
      });
    });

    it('displays current streak metric', async () => {
      render(
        <StudentProgressReport studentId="student-123" classroomId="classroom-456" />
      );

      await waitFor(() => {
        expect(screen.getByText('Current Streak')).toBeInTheDocument();
        expect(screen.getByText(/7\s*days/i)).toBeInTheDocument();
      });
    });

    it('displays word mastery section', async () => {
      render(
        <StudentProgressReport studentId="student-123" classroomId="classroom-456" />
      );

      await waitFor(() => {
        expect(screen.getByText('Word Mastery')).toBeInTheDocument();
        expect(screen.getByText('apple')).toBeInTheDocument();
        expect(screen.getByText('banana')).toBeInTheDocument();
        expect(screen.getByText('cherry')).toBeInTheDocument();
      });
    });

    it('displays recommendations section', async () => {
      render(
        <StudentProgressReport studentId="student-123" classroomId="classroom-456" />
      );

      await waitFor(() => {
        expect(screen.getByText('Recommendations')).toBeInTheDocument();
        expect(
          screen.getByText('Focus on words with lower accuracy')
        ).toBeInTheDocument();
      });
    });
  });

  describe('PDF Export', () => {
    it('displays export PDF button', async () => {
      render(
        <StudentProgressReport studentId="student-123" classroomId="classroom-456" />
      );

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /export pdf/i })
        ).toBeInTheDocument();
      });
    });

    it('triggers PDF download when export button is clicked', async () => {
      const user = userEvent.setup();

      // Store original implementations
      const originalCreateElement = document.createElement.bind(document);
      const originalAppendChild = document.body.appendChild.bind(document.body);
      const originalRemoveChild = document.body.removeChild.bind(document.body);

      // Create a mock anchor element
      const mockClick = vi.fn();
      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
        style: {},
        tagName: 'A',
      };

      // Only mock createElement for 'a' tags
      const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'a') {
          return mockAnchor as unknown as HTMLElement;
        }
        return originalCreateElement(tagName);
      });

      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
        if (node === (mockAnchor as unknown as Node)) {
          return mockAnchor as unknown as HTMLElement;
        }
        return originalAppendChild(node);
      });

      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((node) => {
        if (node === (mockAnchor as unknown as Node)) {
          return mockAnchor as unknown as HTMLElement;
        }
        return originalRemoveChild(node);
      });

      try {
        render(
          <StudentProgressReport studentId="student-123" classroomId="classroom-456" />
        );

        await waitFor(() => {
          expect(screen.getByText('John Doe')).toBeInTheDocument();
        });

        const exportButton = screen.getByRole('button', { name: /export pdf/i });
        await user.click(exportButton);

        // Wait for download to be triggered
        await waitFor(() => {
          expect(mockCreateObjectURL).toHaveBeenCalled();
        });
      } finally {
        // Restore original implementations
        createElementSpy.mockRestore();
        appendChildSpy.mockRestore();
        removeChildSpy.mockRestore();
      }
    });
  });

  describe('Props', () => {
    it('calls getStudentReportData with correct parameters', async () => {
      render(
        <StudentProgressReport
          studentId="student-123"
          classroomId="classroom-456"
          lessonId="lesson-789"
        />
      );

      await waitFor(() => {
        expect(mockGetStudentReportData).toHaveBeenCalledWith(
          'student-123',
          'classroom-456',
          'lesson-789',
          undefined
        );
      });
    });

    it('passes date range to getStudentReportData', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      render(
        <StudentProgressReport
          studentId="student-123"
          classroomId="classroom-456"
          dateRange={dateRange}
        />
      );

      await waitFor(() => {
        expect(mockGetStudentReportData).toHaveBeenCalledWith(
          'student-123',
          'classroom-456',
          undefined,
          dateRange
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible heading structure', async () => {
      render(
        <StudentProgressReport studentId="student-123" classroomId="classroom-456" />
      );

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /student progress report/i })
        ).toBeInTheDocument();
      });
    });

    it('export button has accessible name', async () => {
      render(
        <StudentProgressReport studentId="student-123" classroomId="classroom-456" />
      );

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /export pdf/i });
        expect(button).toBeInTheDocument();
      });
    });
  });
});
