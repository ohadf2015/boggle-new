import { vi, type Mock, } from 'vitest';
/**
 * Analytics Page Client Tests
 *
 * Tests analytics page integration including:
 * - Component rendering
 * - Real-time hook integration
 * - Tab navigation
 * - Auth checks
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AnalyticsPageClient } from '../PageClient';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeClassroomProgress } from '@/hooks/useRealtimeClassroomProgress';
import { useRouter } from 'next/navigation';

// ============================================
// MOCKS
// ============================================

vi.mock('@/contexts/AuthContext');
vi.mock('@/hooks/useRealtimeClassroomProgress');
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: () => '/en/teacher/classroom/test/analytics',
}));

vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => ({ hasAccess: true, status: 'approved', latestRequest: null, isLoading: false }),
}));

// Mock all analytics components
vi.mock('@/components/teacher/analytics/AnalyticsDashboard', () => ({
  AnalyticsDashboard: ({ classroomId }: any) => (
    <div data-testid="analytics-dashboard">Dashboard for {classroomId}</div>
  ),
}));

vi.mock('@/components/teacher/analytics/StudentProgressTable', () => ({
  StudentProgressTable: ({ classroomId }: any) => (
    <div data-testid="student-progress-table">Table for {classroomId}</div>
  ),
}));

vi.mock('@/components/teacher/analytics/LessonEffectivenessChart', () => ({
  __esModule: true,
  default: ({ classroomId }: any) => (
    <div data-testid="lesson-effectiveness-chart">Chart for {classroomId}</div>
  ),
}));

vi.mock('@/components/teacher/analytics/VocabularyHeatmap', () => ({
  VocabularyHeatmap: ({ classroomId }: any) => (
    <div data-testid="vocabulary-heatmap">Heatmap for {classroomId}</div>
  ),
}));

vi.mock('@/components/teacher/analytics/LiveActivityIndicator', () => ({
  LiveActivityIndicator: ({ activeStudentsCount, connectionStatus }: any) => (
    <div data-testid="live-activity-indicator">
      {connectionStatus} - {activeStudentsCount} active
    </div>
  ),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    locale: 'en',
  }),
}));

// ============================================
// TEST SETUP
// ============================================

const mockPush = vi.fn();

const defaultRealtimeReturn = {
  isConnected: true,
  activeStudentsCount: 3,
  lastUpdate: new Date(),
  connectionStatus: 'connected' as const,
  recentActivity: [],
};

describe('AnalyticsPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (useRouter as Mock).mockReturnValue({
      push: mockPush,
    });

    (useAuth as Mock).mockReturnValue({
      user: { id: 'teacher-1', email: 'teacher@test.com' },
      loading: false,
    });

    (useRealtimeClassroomProgress as Mock).mockReturnValue(defaultRealtimeReturn);
  });

  // ============================================
  // RENDERING TESTS
  // ============================================

  it('should render analytics page with all components', () => {
    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    // Header
    expect(screen.getByText('education.analytics.title')).toBeInTheDocument();
    expect(screen.getByText('education.analytics.subtitle')).toBeInTheDocument();

    // Live indicator
    expect(screen.getByTestId('live-activity-indicator')).toBeInTheDocument();

    // Dashboard
    expect(screen.getByTestId('analytics-dashboard')).toBeInTheDocument();

    // Tab triggers
    expect(screen.getByText('education.analytics.viewStudents')).toBeInTheDocument();
    expect(screen.getByText('education.analytics.viewLessons')).toBeInTheDocument();
    expect(screen.getByText('education.analytics.viewVocabulary')).toBeInTheDocument();
  });

  it('should render back button with correct link', () => {
    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    const backButton = screen.getByText('education.analytics.backToClassroom');
    expect(backButton).toBeInTheDocument();
  });

  it('should show live activity indicator with correct props', () => {
    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    const indicator = screen.getByTestId('live-activity-indicator');
    expect(indicator).toHaveTextContent('connected - 3 active');
  });

  // ============================================
  // TAB NAVIGATION TESTS
  // ============================================

  it('should render student progress table by default', () => {
    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    expect(screen.getByTestId('student-progress-table')).toBeInTheDocument();
  });

  it('should switch to lessons tab when clicked', async () => {
    const user = userEvent.setup();
    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    const lessonsTab = screen.getByText('education.analytics.viewLessons');
    await user.click(lessonsTab);

    await waitFor(() => {
      expect(screen.getByTestId('lesson-effectiveness-chart')).toBeInTheDocument();
    });
  });

  it('should switch to vocabulary tab when clicked', async () => {
    const user = userEvent.setup();
    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    const vocabTab = screen.getByText('education.analytics.viewVocabulary');
    await user.click(vocabTab);

    await waitFor(() => {
      expect(screen.getByTestId('vocabulary-heatmap')).toBeInTheDocument();
    });
  });

  // ============================================
  // AUTH TESTS
  // ============================================

  it('should show loading state when auth loading', () => {
    (useAuth as Mock).mockReturnValue({
      user: null,
      loading: true,
    });

    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    expect(screen.getByText('common.loading')).toBeInTheDocument();
  });

  it('should redirect to signin when not authenticated', () => {
    (useAuth as Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    expect(mockPush).toHaveBeenCalledWith(
      '/en/auth/signin?redirect=/teacher/classroom/classroom-1/analytics'
    );
  });

  // ============================================
  // REALTIME INTEGRATION TESTS
  // ============================================

  it('should pass enabled true to realtime hook', () => {
    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    expect(useRealtimeClassroomProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        classroomId: 'classroom-1',
        enabled: true,
      })
    );
  });

  it('should handle activity updates from realtime hook', () => {
    const mockRealtimeReturn = {
      ...defaultRealtimeReturn,
      recentActivity: [
        {
          studentId: 'student-1',
          studentName: 'Alice',
          activity: 'lesson_completed' as const,
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
      ],
    };

    (useRealtimeClassroomProgress as Mock).mockReturnValue(mockRealtimeReturn);

    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    expect(screen.getByText(/Alice/)).toBeInTheDocument();
    expect(screen.getByText(/activityCompletedLesson/)).toBeInTheDocument();
  });

  it('should show different connection statuses', () => {
    const statuses: Array<'connecting' | 'connected' | 'disconnected' | 'error'> = [
      'connecting',
      'disconnected',
      'error',
    ];

    statuses.forEach((status) => {
      (useRealtimeClassroomProgress as Mock).mockReturnValue({
        ...defaultRealtimeReturn,
        connectionStatus: status,
      });

      const { unmount } = render(
        <AnalyticsPageClient classroomId="classroom-1" locale="en" />
      );

      const indicator = screen.getByTestId('live-activity-indicator');
      expect(indicator).toHaveTextContent(status);

      unmount();
    });
  });

  // ============================================
  // NAVIGATION HANDLER TESTS
  // ============================================

  it('should navigate back to classroom when back button clicked', async () => {
    const user = userEvent.setup();
    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    const backButton = screen.getByText('education.analytics.backToClassroom');
    await user.click(backButton);

    expect(mockPush).toHaveBeenCalledWith('/en/teacher/classroom/classroom-1');
  });

  // ============================================
  // RECENT ACTIVITY TESTS
  // ============================================

  it('should not show recent activity section when no activity', () => {
    (useRealtimeClassroomProgress as Mock).mockReturnValue({
      ...defaultRealtimeReturn,
      recentActivity: [],
    });

    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    expect(screen.queryByText('Recent Activity')).not.toBeInTheDocument();
  });

  it('should show recent activity when available', () => {
    (useRealtimeClassroomProgress as Mock).mockReturnValue({
      ...defaultRealtimeReturn,
      recentActivity: [
        {
          studentId: 'student-1',
          studentName: 'Bob',
          activity: 'xp_gained' as const,
          timestamp: new Date(),
        },
      ],
    });

    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    expect(screen.getByText('education.analytics.recentActivity')).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
    expect(screen.getByText(/activityGainedXp/)).toBeInTheDocument();
  });

  it('should limit recent activity to 5 items', () => {
    const activities = Array.from({ length: 10 }, (_, i) => ({
      studentId: `student-${i}`,
      studentName: `Student ${i}`,
      activity: 'word_attempted' as const,
      timestamp: new Date(),
    }));

    (useRealtimeClassroomProgress as Mock).mockReturnValue({
      ...defaultRealtimeReturn,
      recentActivity: activities,
    });

    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);

    // Should show max 5 activities
    const activityElements = screen.getAllByText(/activityAttemptedWord/);
    expect(activityElements.length).toBeLessThanOrEqual(5);
  });
});
