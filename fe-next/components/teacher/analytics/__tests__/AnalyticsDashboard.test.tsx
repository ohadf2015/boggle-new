/**
 * AnalyticsDashboard Component Tests
 *
 * Tests the main analytics dashboard container that displays
 * multiple metric cards with classroom health KPIs.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import { LanguageProvider } from '@/contexts/LanguageContext';
import * as useClassroomAnalyticsModule from '@/hooks/useClassroomAnalytics';

// ============================================
// MOCKS
// ============================================

const mockRefresh = vi.fn();

const mockMetrics = {
  studentsNeedingHelp: 5,
  classAverageXp: 1250,
  activeStudentsToday: 18,
  totalStudents: 20,
  weeklyEngagement: 85,
  commonMistakes: [
    { word: 'receive', errorRate: 0.75, studentCount: 8 },
    { word: 'separate', errorRate: 0.67, studentCount: 6 },
  ],
};

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'education.analytics.title': 'Class Analytics',
        'education.analytics.subtitle': 'Track student progress and identify learning opportunities',
        'education.analytics.loading': 'Loading analytics...',
        'education.analytics.error': 'Failed to load analytics',
        'education.analytics.retry': 'Retry',
        'education.analytics.noData': 'No data yet',
        'education.analytics.assignLessons': 'Assign lessons',
        'education.analytics.studentsNeedingHelp': 'Students Needing Help',
        'education.analytics.classAverageXp': 'Class Average XP',
        'education.analytics.activeStudentsToday': 'Active Today',
        'education.analytics.commonMistakes': 'Common Mistakes',
        'education.analytics.viewStudents': 'View Students',
        'education.analytics.createReviewLesson': 'Create Review Lesson',
        'education.analytics.studentProgress': 'Student Progress',
        'education.analytics.exportReport': 'Export Report',
        'education.analytics.lessonEffectiveness': 'Lesson Effectiveness',
        'education.analytics.noStudents': 'No students yet',
      };
      let result = translations[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{${k}}`, String(v));
        }
      }
      return result;
    },
    language: 'en',
    dir: 'ltr',
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/hooks/useClassroomAnalytics');
vi.mock('@/hooks/useStudentProgressMetrics', () => ({
  useStudentProgressMetrics: () => ({
    students: [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogClose: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
}));
vi.mock('@/components/teacher/reports/StudentProgressReport', () => ({
  StudentProgressReport: () => null,
}));
vi.mock('../LessonEffectivenessChart', () => ({
  __esModule: true,
  default: () => null,
}));

// ============================================
// TEST HELPERS
// ============================================

const renderDashboard = (props: React.ComponentProps<typeof AnalyticsDashboard>) => {
  return render(
    <LanguageProvider>
      <AnalyticsDashboard {...props} />
    </LanguageProvider>
  );
};

// ============================================
// LOADING STATE TESTS
// ============================================

describe('AnalyticsDashboard - Loading State', () => {
  beforeEach(() => {
    vi.spyOn(useClassroomAnalyticsModule, 'useClassroomAnalytics').mockReturnValue({
      metrics: null,
      isLoading: true,
      error: null,
      refresh: mockRefresh,
    });
  });

  it('renders loading skeleton when loading', () => {
    renderDashboard({ classroomId: 'class-123' });

    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });
});

// ============================================
// ERROR STATE TESTS
// ============================================

describe('AnalyticsDashboard - Error State', () => {
  beforeEach(() => {
    vi.spyOn(useClassroomAnalyticsModule, 'useClassroomAnalytics').mockReturnValue({
      metrics: null,
      isLoading: false,
      error: new Error('Failed to fetch analytics'),
      refresh: mockRefresh,
    });
  });

  it('renders error message when error occurs', () => {
    renderDashboard({ classroomId: 'class-123' });

    expect(screen.getByText('Failed to load analytics')).toBeInTheDocument();
  });

  it('renders retry button on error', () => {
    renderDashboard({ classroomId: 'class-123' });

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('calls refresh when retry button clicked', async () => {
    mockRefresh.mockClear();

    renderDashboard({ classroomId: 'class-123' });

    const retryButton = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });
  });
});

// ============================================
// SUCCESS STATE TESTS
// ============================================

describe('AnalyticsDashboard - Success State', () => {
  beforeEach(() => {
    vi.spyOn(useClassroomAnalyticsModule, 'useClassroomAnalytics').mockReturnValue({
      metrics: mockMetrics,
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
  });

  it('renders dashboard title', () => {
    renderDashboard({ classroomId: 'class-123' });

    expect(screen.getByText('Class Analytics')).toBeInTheDocument();
  });

  it('renders dashboard subtitle', () => {
    renderDashboard({ classroomId: 'class-123' });

    expect(
      screen.getByText('Track student progress and identify learning opportunities')
    ).toBeInTheDocument();
  });

  it('renders 4 metric cards when data loaded', () => {
    renderDashboard({ classroomId: 'class-123' });

    // Students Needing Help
    expect(screen.getByText('Students Needing Help')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    // Class Average XP
    expect(screen.getByText('Class Average XP')).toBeInTheDocument();
    expect(screen.getByText('1,250')).toBeInTheDocument();

    // Active Students
    expect(screen.getByText('Active Today')).toBeInTheDocument();
    expect(screen.getByText('18/20')).toBeInTheDocument();

    // Common Mistakes
    expect(screen.getByText('Common Mistakes')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders correct values from metrics', () => {
    renderDashboard({ classroomId: 'class-123' });

    // Verify each metric value
    expect(screen.getByText('5')).toBeInTheDocument(); // Students needing help
    expect(screen.getByText('1,250')).toBeInTheDocument(); // Class average XP
    expect(screen.getByText('18/20')).toBeInTheDocument(); // Active students
    expect(screen.getByText('2')).toBeInTheDocument(); // Common mistakes count
  });
});

// ============================================
// ACTIONABLE CALLBACK TESTS
// ============================================

describe('AnalyticsDashboard - Actionable Callbacks', () => {
  beforeEach(() => {
    vi.spyOn(useClassroomAnalyticsModule, 'useClassroomAnalytics').mockReturnValue({
      metrics: mockMetrics,
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
  });

  it('calls onViewStudents when View Students button clicked', async () => {
    const handleViewStudents = vi.fn();

    renderDashboard({
      classroomId: 'class-123',
      onViewStudents: handleViewStudents,
    });

    const viewButton = screen.getByRole('button', { name: /view students/i });
    fireEvent.click(viewButton);

    await waitFor(() => {
      expect(handleViewStudents).toHaveBeenCalledTimes(1);
      expect(handleViewStudents).toHaveBeenCalledWith('struggling');
    });
  });

  it('calls onCreateReviewLesson with words array when Create Review clicked', async () => {
    const handleCreateReview = vi.fn();

    renderDashboard({
      classroomId: 'class-123',
      onCreateReviewLesson: handleCreateReview,
    });

    const createButton = screen.getByRole('button', { name: /create review/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(handleCreateReview).toHaveBeenCalledTimes(1);
      expect(handleCreateReview).toHaveBeenCalledWith(['receive', 'separate']);
    });
  });

  it('renders View Students and Export Report buttons even when callbacks not provided', () => {
    renderDashboard({ classroomId: 'class-123' });

    const buttons = screen.queryAllByRole('button');
    // View Students + Export Report are always rendered
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('AnalyticsDashboard - Edge Cases', () => {
  it('handles zero students needing help', () => {
    vi.spyOn(useClassroomAnalyticsModule, 'useClassroomAnalytics').mockReturnValue({
      metrics: { ...mockMetrics, studentsNeedingHelp: 0 },
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });

    renderDashboard({ classroomId: 'class-123' });

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('handles empty common mistakes array', () => {
    vi.spyOn(useClassroomAnalyticsModule, 'useClassroomAnalytics').mockReturnValue({
      metrics: { ...mockMetrics, commonMistakes: [] },
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });

    renderDashboard({ classroomId: 'class-123' });

    // Should show 0 mistakes in Common Mistakes card
    expect(screen.getByText('Common Mistakes')).toBeInTheDocument();
    expect(screen.getByTestId('metric-common-mistakes')).toBeInTheDocument();
  });
});
