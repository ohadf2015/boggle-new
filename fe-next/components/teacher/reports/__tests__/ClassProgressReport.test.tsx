/**
 * ClassProgressReport Component Tests
 *
 * Tests for the class progress report view component
 * that displays class-wide metrics and allows PDF export.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassProgressReport } from '../ClassProgressReport';
import { getClassReportData, ClassReportData } from '@/lib/supabase/analytics';

// Mock data fetching
vi.mock('@/lib/supabase/analytics', () => ({
  getClassReportData: vi.fn(),
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
        'teacher.reports.classReport': 'Class Progress Report',
        'teacher.reports.metrics.totalStudents': 'Total Students',
        'teacher.reports.metrics.activeStudents': 'Active Students',
        'teacher.reports.metrics.classAverageAccuracy': 'Class Average Accuracy',
        'teacher.reports.metrics.completionRate': 'Completion Rate',
        'teacher.reports.metrics.participationRate': 'Participation Rate',
        'teacher.reports.sections.summary': 'Summary',
        'teacher.reports.sections.topPerformers': 'Top Performers',
        'teacher.reports.sections.needsAttention': 'Students Needing Attention',
        'teacher.reports.sections.studentRankings': 'Student Rankings',
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

const mockClassData: ClassReportData = {
  classroomId: 'classroom-456',
  classroomName: 'English 101',
  teacherName: 'Ms. Smith',
  dateRange: null,
  metrics: {
    totalStudents: 25,
    activeStudents: 20,
    classAverageAccuracy: 78,
    classAverageWordsLearned: 30,
    completionRate: 80,
    participationRate: 85,
  },
  topPerformers: [
    { studentId: 's1', studentName: 'Alice', accuracy: 95, wordsLearned: 45 },
    { studentId: 's2', studentName: 'Bob', accuracy: 92, wordsLearned: 42 },
    { studentId: 's3', studentName: 'Charlie', accuracy: 90, wordsLearned: 40 },
  ],
  studentsNeedingAttention: [
    { studentId: 's4', studentName: 'David', accuracy: 45, lastActive: '2024-01-10', issue: 'Low accuracy' },
    { studentId: 's5', studentName: 'Eve', accuracy: 50, lastActive: null, issue: 'Inactive for 7+ days' },
  ],
  studentRankings: [
    { rank: 1, studentId: 's1', studentName: 'Alice', score: 95, accuracy: 95, wordsLearned: 45 },
    { rank: 2, studentId: 's2', studentName: 'Bob', score: 92, accuracy: 92, wordsLearned: 42 },
    { rank: 3, studentId: 's3', studentName: 'Charlie', score: 90, accuracy: 90, wordsLearned: 40 },
  ],
};

describe('ClassProgressReport', () => {
  const mockGetClassReportData = getClassReportData as jest.MockedFunction<
    typeof getClassReportData
  >;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClassReportData.mockResolvedValue({
      data: mockClassData,
      error: null,
    });
  });

  describe('Loading State', () => {
    it('displays loading state initially', () => {
      mockGetClassReportData.mockReturnValue(new Promise(() => {})); // Never resolves

      render(<ClassProgressReport classroomId="classroom-456" />);

      expect(screen.getByText('Loading report...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('displays error message when data fetching fails', async () => {
      mockGetClassReportData.mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch data' },
      });

      render(<ClassProgressReport classroomId="classroom-456" />);

      await waitFor(() => {
        expect(screen.getByText('Error loading report')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('displays no data message when report is empty', async () => {
      mockGetClassReportData.mockResolvedValue({
        data: null,
        error: null,
      });

      render(<ClassProgressReport classroomId="classroom-456" />);

      await waitFor(() => {
        expect(screen.getByText('No data available')).toBeInTheDocument();
      });
    });
  });

  describe('Success State', () => {
    it('displays classroom name and teacher', async () => {
      render(<ClassProgressReport classroomId="classroom-456" />);

      await waitFor(() => {
        expect(screen.getByText('English 101')).toBeInTheDocument();
        expect(screen.getByText(/Ms\. Smith/)).toBeInTheDocument();
      });
    });

    it('displays total students metric', async () => {
      render(<ClassProgressReport classroomId="classroom-456" />);

      await waitFor(() => {
        expect(screen.getByText('Total Students')).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument();
      });
    });

    it('displays active students metric', async () => {
      render(<ClassProgressReport classroomId="classroom-456" />);

      await waitFor(() => {
        expect(screen.getByText('Active Students')).toBeInTheDocument();
        expect(screen.getByText('20')).toBeInTheDocument();
      });
    });

    it('displays class average accuracy metric', async () => {
      render(<ClassProgressReport classroomId="classroom-456" />);

      await waitFor(() => {
        expect(screen.getByText('Class Average Accuracy')).toBeInTheDocument();
        expect(screen.getByText('78%')).toBeInTheDocument();
      });
    });

    it('displays completion rate metric', async () => {
      render(<ClassProgressReport classroomId="classroom-456" />);

      await waitFor(() => {
        expect(screen.getByText('Completion Rate')).toBeInTheDocument();
        expect(screen.getByText('80%')).toBeInTheDocument();
      });
    });

    it('displays top performers section', async () => {
      render(<ClassProgressReport classroomId="classroom-456" />);

      await waitFor(() => {
        expect(screen.getByText('Top Performers')).toBeInTheDocument();
        // Names appear multiple times (top performers AND rankings table)
        expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Bob').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Charlie').length).toBeGreaterThan(0);
      });
    });

    it('displays students needing attention section', async () => {
      render(<ClassProgressReport classroomId="classroom-456" />);

      await waitFor(() => {
        expect(screen.getByText('Students Needing Attention')).toBeInTheDocument();
        expect(screen.getByText('David')).toBeInTheDocument();
        expect(screen.getByText('Eve')).toBeInTheDocument();
      });
    });

    it('displays student rankings table', async () => {
      render(<ClassProgressReport classroomId="classroom-456" />);

      await waitFor(() => {
        expect(screen.getByText('Student Rankings')).toBeInTheDocument();
        // Check rankings appear
        const rankCells = screen.getAllByText(/^[1-3]$/);
        expect(rankCells.length).toBeGreaterThan(0);
      });
    });
  });

  describe('PDF Export', () => {
    it('displays export PDF button', async () => {
      render(<ClassProgressReport classroomId="classroom-456" />);

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

      const mockClick = vi.fn();
      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
        style: {},
        tagName: 'A',
      };

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
        render(<ClassProgressReport classroomId="classroom-456" />);

        await waitFor(() => {
          expect(screen.getByText('English 101')).toBeInTheDocument();
        });

        const exportButton = screen.getByRole('button', { name: /export pdf/i });
        await user.click(exportButton);

        await waitFor(() => {
          expect(mockCreateObjectURL).toHaveBeenCalled();
        });
      } finally {
        createElementSpy.mockRestore();
        appendChildSpy.mockRestore();
        removeChildSpy.mockRestore();
      }
    });
  });

  describe('Props', () => {
    it('calls getClassReportData with correct parameters', async () => {
      render(<ClassProgressReport classroomId="classroom-456" />);

      await waitFor(() => {
        expect(mockGetClassReportData).toHaveBeenCalledWith(
          'classroom-456',
          undefined
        );
      });
    });

    it('passes date range to getClassReportData', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      render(<ClassProgressReport classroomId="classroom-456" dateRange={dateRange} />);

      await waitFor(() => {
        expect(mockGetClassReportData).toHaveBeenCalledWith(
          'classroom-456',
          dateRange
        );
      });
    });

    it('calls onStudentClick when student name is clicked', async () => {
      const user = userEvent.setup();
      const onStudentClick = vi.fn();

      render(
        <ClassProgressReport
          classroomId="classroom-456"
          onStudentClick={onStudentClick}
        />
      );

      await waitFor(() => {
        // Alice appears multiple times (top performers and rankings)
        expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
      });

      // Click on first Alice button (from top performers)
      const aliceButtons = screen.getAllByRole('button', { name: /alice/i });
      await user.click(aliceButtons[0]);

      expect(onStudentClick).toHaveBeenCalledWith('s1');
    });
  });

  describe('Accessibility', () => {
    it('has accessible heading structure', async () => {
      render(<ClassProgressReport classroomId="classroom-456" />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /class progress report/i })
        ).toBeInTheDocument();
      });
    });

    it('export button has accessible name', async () => {
      render(<ClassProgressReport classroomId="classroom-456" />);

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /export pdf/i });
        expect(button).toBeInTheDocument();
      });
    });

    it('student buttons are accessible', async () => {
      render(
        <ClassProgressReport
          classroomId="classroom-456"
          onStudentClick={() => {}}
        />
      );

      await waitFor(() => {
        // Alice buttons appear in multiple sections (top performers and rankings)
        const aliceButtons = screen.getAllByRole('button', { name: /alice/i });
        expect(aliceButtons.length).toBeGreaterThan(0);
      });
    });
  });
});
