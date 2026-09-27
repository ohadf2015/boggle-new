/**
 * AnalyticsDashboard - Integration Tests
 *
 * Tests the enhanced analytics dashboard with:
 * 1. StudentProgressTable wired below metric cards
 * 2. Student detail dialog on row click
 * 3. Export Class Report button
 * 4. LessonEffectivenessChart section
 * 5. Struggling student filter from metric card action
 */

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AnalyticsDashboard } from '../AnalyticsDashboard';
import * as useClassroomAnalyticsModule from '@/hooks/useClassroomAnalytics';
import * as useStudentProgressMetricsModule from '@/hooks/useStudentProgressMetrics';

// ============================================
// MOCKS
// ============================================

const mockRefresh = vi.fn();
const mockStudentRefresh = vi.fn();

vi.mock('@/hooks/useClassroomAnalytics');
vi.mock('@/hooks/useStudentProgressMetrics');

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
        'education.analytics.assignLessons': 'Assign lessons to see analytics',
        'education.analytics.studentsNeedingHelp': 'Students Needing Help',
        'education.analytics.classAverageXp': 'Class Average XP',
        'education.analytics.activeStudentsToday': 'Active Today',
        'education.analytics.commonMistakes': 'Common Mistakes',
        'education.analytics.viewStudents': 'View Students',
        'education.analytics.createReviewLesson': 'Create Review Lesson',
        'education.analytics.studentProgress': 'Student Progress',
        'education.analytics.exportReport': 'Export Report',
        'education.analytics.lessonEffectiveness': 'Lesson Effectiveness',
        'education.analytics.studentDetail': 'Student Detail',
        'education.analytics.student': 'Student',
        'education.analytics.level': 'Level',
        'education.analytics.mastery': 'Mastery',
        'education.analytics.accuracy': 'Accuracy',
        'education.analytics.streak': 'Streak',
        'education.analytics.lastActive': 'Last Active',
        'education.analytics.struggling': 'struggling',
        'education.analytics.noStudents': 'No students yet',
        'education.analytics.inviteStudents': 'Invite students to start tracking',
        'education.analytics.today': 'Today',
        'education.analytics.yesterday': 'Yesterday',
        'education.analytics.daysAgo': `${params?.count ?? ''} days ago`,
      };
      return translations[key] || key;
    },
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/components/ui/PageLoader', () => ({
  PageLoader: ({ text }: { text?: string }) => (
    <div data-testid="page-loader">{text || 'Loading...'}</div>
  ),
}));

// Mock StudentProgressReport (heavy component — not under test here)
vi.mock('@/components/teacher/reports/StudentProgressReport', () => ({
  StudentProgressReport: ({ studentId }: { studentId: string }) => (
    <div data-testid="student-progress-report">Report for {studentId}</div>
  ),
}));

// Mock LessonEffectivenessChart (lazy-loaded with recharts)
vi.mock('../LessonEffectivenessChart', () => ({
  __esModule: true,
  default: ({ classroomId }: { classroomId: string }) => (
    <div data-testid="lesson-effectiveness-chart">Chart for {classroomId}</div>
  ),
}));

// Mock Dialog from Radix (render as simple divs for testing)
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogClose: ({ children }: { children: React.ReactNode }) => (
    <button>{children}</button>
  ),
}));

// ============================================
// TEST DATA
// ============================================

const mockMetrics = {
  studentsNeedingHelp: 2,
  classAverageXp: 800,
  activeStudentsToday: 5,
  totalStudents: 10,
  weeklyEngagement: 70,
  commonMistakes: [
    { word: 'receive', errorRate: 0.75, studentCount: 4 },
  ],
};

const mockStudents = [
  {
    studentId: 'student-1',
    displayName: 'Alice',
    avatarUrl: null,
    totalXp: 250,
    currentLevel: 3,
    vocabularyMastery: 80,
    overallAccuracy: 85,
    wordsAttempted: 50,
    wordsMastered: 40,
    lastPracticeDate: '2026-03-22',
    isStruggling: false,
    currentStreak: 5,
  },
  {
    studentId: 'student-2',
    displayName: 'Bob',
    avatarUrl: null,
    totalXp: 100,
    currentLevel: 1,
    vocabularyMastery: 30,
    overallAccuracy: 45,
    wordsAttempted: 20,
    wordsMastered: 6,
    lastPracticeDate: '2026-03-20',
    isStruggling: true,
    currentStreak: 0,
  },
];

// ============================================
// HELPERS
// ============================================

function setupMocks(overrides?: {
  metricsLoading?: boolean;
  studentsLoading?: boolean;
  metrics?: typeof mockMetrics | null;
  students?: typeof mockStudents;
}) {
  vi.spyOn(useClassroomAnalyticsModule, 'useClassroomAnalytics').mockReturnValue({
    metrics: overrides?.metrics !== undefined ? overrides.metrics : mockMetrics,
    isLoading: overrides?.metricsLoading ?? false,
    error: null,
    refresh: mockRefresh,
  });

  vi.spyOn(useStudentProgressMetricsModule, 'useStudentProgressMetrics').mockReturnValue({
    students: overrides?.students ?? mockStudents,
    isLoading: overrides?.studentsLoading ?? false,
    error: null,
    refresh: mockStudentRefresh,
  });
}

function renderDashboard(props?: Partial<React.ComponentProps<typeof AnalyticsDashboard>>) {
  return render(
    <AnalyticsDashboard classroomId="class-123" {...props} />
  );
}

// ============================================
// TESTS
// ============================================

describe('AnalyticsDashboard - Student Progress Table Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders StudentProgressTable section below metric cards', () => {
    renderDashboard();

    // GIVEN — metrics loaded with students
    // THEN — student names appear in the table
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders Student Progress section heading', () => {
    renderDashboard();

    expect(screen.getByText('Student Progress')).toBeInTheDocument();
  });

  it('does NOT render student table when metrics are still loading', () => {
    setupMocks({ metricsLoading: true, metrics: null });
    renderDashboard();

    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
  });
});

describe('AnalyticsDashboard - Student Detail Dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('opens student detail dialog when a student row is clicked', () => {
    renderDashboard();

    // WHEN — teacher clicks on Alice's row
    fireEvent.click(screen.getByText('Alice'));

    // THEN — dialog opens with StudentProgressReport
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('student-progress-report')).toBeInTheDocument();
    expect(screen.getByText('Report for student-1')).toBeInTheDocument();
  });

  it('does not open dialog initially', () => {
    renderDashboard();

    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });
});

describe('AnalyticsDashboard - Export Report Button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders Export Report button when metrics are loaded', () => {
    renderDashboard();

    expect(screen.getByRole('button', { name: /export report/i })).toBeInTheDocument();
  });

  it('does NOT render Export Report when no metrics', () => {
    setupMocks({ metricsLoading: true, metrics: null });
    renderDashboard();

    expect(screen.queryByRole('button', { name: /export report/i })).not.toBeInTheDocument();
  });
});

describe('AnalyticsDashboard - Lesson Effectiveness Chart', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders LessonEffectivenessChart section', () => {
    renderDashboard();

    expect(screen.getByTestId('lesson-effectiveness-chart')).toBeInTheDocument();
    expect(screen.getByText('Chart for class-123')).toBeInTheDocument();
  });

  it('renders Lesson Effectiveness heading', () => {
    renderDashboard();

    expect(screen.getByText('Lesson Effectiveness')).toBeInTheDocument();
  });
});

describe('AnalyticsDashboard - Struggling Students Filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('passes onViewStudents that scrolls to student table', () => {
    // GIVEN — dashboard with View Students action
    // The metric card for "Students Needing Help" should have an actionable button
    renderDashboard();

    const helpCard = screen.getByTestId('metric-students-needing-help');
    const viewButton = within(helpCard).queryByRole('button');

    // The button should exist — the enhanced dashboard now wires onViewStudents
    expect(viewButton).toBeInTheDocument();
  });
});
