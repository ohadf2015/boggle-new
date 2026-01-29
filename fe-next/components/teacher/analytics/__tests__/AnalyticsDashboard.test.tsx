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

const mockRefresh = jest.fn();

const mockMetrics = {
  studentsNeedingHelp: 5,
  classAverageXp: 1250,
  activeStudentsToday: 18,
  totalStudents: 20,
  weeklyEngagement: 85,
  commonMistakes: [
    { word: 'receive', errorRate: 0.75, attempts: 8 },
    { word: 'separate', errorRate: 0.67, attempts: 6 },
  ],
};

jest.mock('@/hooks/useClassroomAnalytics');

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
    jest.spyOn(useClassroomAnalyticsModule, 'useClassroomAnalytics').mockReturnValue({
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
    jest.spyOn(useClassroomAnalyticsModule, 'useClassroomAnalytics').mockReturnValue({
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
    jest.spyOn(useClassroomAnalyticsModule, 'useClassroomAnalytics').mockReturnValue({
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
    jest.spyOn(useClassroomAnalyticsModule, 'useClassroomAnalytics').mockReturnValue({
      metrics: mockMetrics,
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });
  });

  it('calls onViewStudents when View Students button clicked', async () => {
    const handleViewStudents = jest.fn();

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
    const handleCreateReview = jest.fn();

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

  it('does not render actionable buttons when callbacks not provided', () => {
    renderDashboard({ classroomId: 'class-123' });

    const buttons = screen.queryAllByRole('button');
    expect(buttons).toHaveLength(0);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('AnalyticsDashboard - Edge Cases', () => {
  it('handles zero students needing help', () => {
    jest.spyOn(useClassroomAnalyticsModule, 'useClassroomAnalytics').mockReturnValue({
      metrics: { ...mockMetrics, studentsNeedingHelp: 0 },
      isLoading: false,
      error: null,
      refresh: mockRefresh,
    });

    renderDashboard({ classroomId: 'class-123' });

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('handles empty common mistakes array', () => {
    jest.spyOn(useClassroomAnalyticsModule, 'useClassroomAnalytics').mockReturnValue({
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
