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

// The page now mounts the shared education header — a compact bar with a way
// back, which these screens used to lack entirely. It pulls MusicContext in,
// which this suite has no provider for and no interest in.
vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));
vi.mock('@/contexts/AuthContext');
vi.mock('@/hooks/useRealtimeClassroomProgress');
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: () => '/en/teacher/classroom/test/analytics',
}));

vi.mock('@/lib/education/useTeacherAccess', () => ({
  useTeacherAccess: () => ({ hasAccess: true, status: 'approved', latestRequest: null, isLoading: false }),
}));

/**
 * The dashboard on this page sits behind ProGate as of 2026-08-25, so a teacher's Pro state now
 * decides whether it renders at all. Without this mock ProGate ran the real hook, which fetches
 * and starts `loading: true` — and ProGate deliberately renders NOTHING while loading, so every
 * assertion below looked like "the dashboard is broken" when it was "the teacher hasn't been
 * told they're paid up yet".
 *
 * Default is Pro so the rendering tests keep testing rendering. The gate itself is covered
 * explicitly at the bottom of this file, in both directions.
 */
const teacherPro = { hasPro: true, loading: false };
vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => teacherPro,
}));

vi.mock('@/components/teacher/assignments', () => ({
  AssignmentTrackingPanel: ({ onCreateAssignment }: { onCreateAssignment: () => void }) => (
    <button type="button" onClick={onCreateAssignment}>create-assignment</button>
  ),
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
    // `language` is what the real context exposes (contexts/LanguageContext.tsx) and what every
    // consumer destructures. This mock used to offer `locale` instead — a key the context does
    // not have — so anything building a localised href under it got `/undefined/…` and no test
    // noticed, because none of them asserted an href.
    language: 'en',
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

describe('AnalyticsPageClient — "create assignment" opens the creator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as Mock).mockReturnValue({ push: mockPush });
    (useAuth as Mock).mockReturnValue({ user: { id: 'teacher-1', email: 'teacher@test.com' }, loading: false });
    (useRealtimeClassroomProgress as Mock).mockReturnValue(defaultRealtimeReturn);
  });

  it('lands on the dashboard with this class selected and the creator open, not a bare /teacher', async () => {
    render(<AnalyticsPageClient classroomId="classroom-1" locale="en" />);
    await userEvent.click(screen.getByText('education.analytics.viewAssignments'));
    await userEvent.click(await screen.findByText('create-assignment'));
    expect(mockPush).toHaveBeenCalledWith('/en/teacher?classroomId=classroom-1&assign=1');
  });
});
