/**
 * TeacherDashboard — Duplicate CTA Consolidation
 *
 * Measure and assert the count of create-classroom and play buttons
 * before and after consolidation.
 *
 * Counting rule: elements must be in the DOM AND visible (per toBeVisible).
 * This excludes CTAs in closed <details> elements (e.g., ClassroomManager's
 * create button in the Tools drawer when toolsOpen = false).
 *
 * A zero-classroom teacher should see only ONE create-classroom CTA.
 * A one-classroom teacher should see only ONE play/go-live button.
 *
 * After fix: assertions should pass; this test documents expected behaviour.
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';

// ── Navigation ────────────────────────────────────────────────────────────────
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/en/teacher',
  useSearchParams: () => new URLSearchParams(),
}));

// ── LanguageContext ──────────────────────────────────────────────────────────
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const base: Record<string, string> = {
        'teacher.dashboard.title': 'Teacher Dashboard',
        'teacher.dashboard.tab.play': 'Play',
        'teacher.dashboard.tab.prepare': 'Prepare',
        'teacher.dashboard.selectClassroom': 'Select classroom',
        'teacher.dashboard.tools': 'Tools',
        'teacher.playNow.title': 'Play Now',
        'teacher.playNow.subtitle': 'Go Live',
        'teacher.playNow.armedWith': 'Armed with',
        'teacher.playNow.pickSomething': 'Pick something',
        'teacher.playNow.goLive': 'Go Live',
        'teacher.playNow.noSetupNeeded': 'No setup needed',
        'teacher.playNow.changeWords': 'Change words',
        'teacher.playNow.shortcutsLabel': 'Shortcuts',
        'teacher.playNow.shortcutLastGame': 'Last game',
        'teacher.playNow.shortcutSetup': 'Setup',
        'teacher.playNow.shortcutReports': 'Reports',
        'teacher.lesson.words': 'words',
        'teacher.playNow.recommended': 'Recommended',
        'teacher.emptyClassroom.title': 'No classroom yet?',
        'teacher.emptyClassroom.body': 'Create one to get started',
        'teacher.emptyClassroom.getCode': 'Get Code',
        'teacher.classroom.defaultName': 'My Classroom',
        'teacher.classroom.success.created': 'Classroom created',
        'teacher.classroom.error.createFailed': 'Create failed',
        'teacher.classroom.codeCopied': 'Copied',
        'teacher.classroom.copyCode': 'Copy',
        'teacher.onboardingChecklist.title': 'Get started',
        'teacher.onboardingChecklist.progress': `${params?.done || 0} / ${params?.total || 4}`,
        'teacher.onboardingChecklist.createClassroom': 'Create classroom',
        'teacher.onboardingChecklist.createClassroomCta': 'Create one',
        'teacher.onboardingChecklist.createAssignment': 'Create assignment',
        'teacher.onboardingChecklist.createAssignmentCta': 'Create one',
        'teacher.onboardingChecklist.shareJoin': 'Share join link',
        'teacher.onboardingChecklist.shareJoinCta': 'Copy link',
        'teacher.onboardingChecklist.viewReport': 'View report',
        'teacher.onboardingChecklist.viewReportCta': 'View',
        'teacher.pulse.regionLabel': 'Class pulse for',
        'teacher.pulse.action.play': 'Play',
        'teacher.pulse.action.playAgain': 'Play again',
        'teacher.pulse.action.invite': 'Invite',
        'teacher.pulse.action.review': 'Review',
        'teacher.pulse.action.retry': 'Retry',
      };
      return base[key] || key;
    },
    language: 'en',
  }),
}));

// ── AuthContext ──────────────────────────────────────────────────────────────
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user1' },
    profile: { user_role: 'teacher', is_admin: false },
    isAuthenticated: true,
    loading: false,
  }),
}));

// ── Heavy sub-components (mocked) ─────────────────────────────────────────────
vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));

vi.mock('@/components/education/TeacherOnboarding', () => ({
  TeacherOnboarding: () => <div data-testid="teacher-onboarding" />,
}));

vi.mock('@/components/education/shell/EducationShell', () => ({
  EducationShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/teacher/dashboard/TeacherStatusRow', () => ({
  TeacherStatusRow: () => <div data-testid="status-row" />,
}));

vi.mock('@/components/teacher/ClassroomManager', () => ({
  default: () => <div data-testid="classroom-manager" />,
}));

vi.mock('@/components/teacher/LessonBuilder', () => ({
  default: () => <div data-testid="lesson-builder" />,
}));

vi.mock('@/components/teacher/assignments', () => ({
  AssignmentTrackingPanel: () => <div data-testid="assignment-tracking-panel" />,
  AssignmentCreator: () => <div data-testid="assignment-creator" />,
}));

vi.mock('@/components/teacher/analytics/AnalyticsDashboard', () => ({
  AnalyticsDashboard: () => <div data-testid="analytics-dashboard" />,
}));

vi.mock('@/components/teacher/analytics/LastGameInsights', () => ({
  LastGameInsights: () => <div data-testid="last-game-insights" />,
}));

vi.mock('@/components/teacher/ProGate', () => ({
  ProGate: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/teacher/ProWelcomeCelebration', () => ({
  ProWelcomeCelebration: () => <div data-testid="pro-welcome" />,
}));

vi.mock('@/components/teacher/dashboard/ClassSwitcher', () => ({
  ClassSwitcher: () => <div data-testid="class-switcher" />,
}));

vi.mock('@/components/teacher/StudentCapMeter', () => ({
  StudentCapMeter: () => <div data-testid="student-cap-meter" />,
}));

// Don't mock ClassPulseSection - let it render so we can test the suppressed
// play button behavior. Instead, mock only the underlying dependencies.
vi.mock('@/hooks/useClassPulse', () => ({
  useClassPulse: () => ({
    pulse: {
      state: 'ready',
      rosterCount: 5,
      playedCount: 3,
      gameRosterCount: 3,
      absentCount: 0,
      daysSinceLastGame: 2,
      averageAccuracyPct: 85,
      strugglingCount: 0,
      struggling: [],
      topMissedWords: [],
      nextAction: 'playAgain' as const,
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

// ── Hooks ────────────────────────────────────────────────────────────────────
vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: vi.fn(),
}));

vi.mock('@/hooks/useTeacherPro', () => ({
  useTeacherPro: () => ({
    grant: null,
    loading: false,
    hasPro: false,
    source: 'free',
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useOnboardingState', () => ({
  useTeacherOnboardingState: () => ({
    isCompleted: false,
    isSkipped: false,
  }),
}));

vi.mock('@/hooks/useTeacherDashboardDeepLink', () => ({
  useTeacherDashboardDeepLink: () => ({
    reviewWords: [],
  }),
}));

vi.mock('@/hooks/useRecentGameSettings', () => ({
  useRecentGameSettings: () => ({
    recentConfigs: [],
  }),
}));

vi.mock('@/hooks/useVocabularyLesson', () => ({
  useLessons: () => ({
    lessons: [],
    isLoading: false,
  }),
}));

// ── Telemetry ────────────────────────────────────────────────────────────────
vi.mock('@/lib/education/telemetry', () => ({
  trackEduTeacherDashboardViewed: vi.fn(),
  trackEduTeacherToolsOpened: vi.fn(),
  trackTeacherOnboardingStep: vi.fn(),
}));

// ── Helper to count visible buttons by testid ────────────────────────────────
function countVisibleByTestId(testId: string): number {
  const elements = screen.queryAllByTestId(testId);
  return elements.filter((el) => {
    const visibility = window.getComputedStyle(el).visibility;
    const display = window.getComputedStyle(el).display;
    const hidden = (el as HTMLElement).hidden;
    return visibility !== 'hidden' && display !== 'none' && !hidden;
  }).length;
}

describe('TeacherDashboard — Duplicate CTA Consolidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Zero classroom state', () => {
    it('should render exactly ONE create-classroom CTA for first-run teacher', async () => {
      const { useClassrooms } = await import('@/hooks/useClassroom');
      const mockUseClassrooms = vi.mocked(useClassrooms);
      mockUseClassrooms.mockReturnValue({
        classrooms: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
        createClassroom: vi.fn(async () => ({ success: false, error: 'test' })),
        updateClassroom: vi.fn(),
        deleteClassroom: vi.fn(),
      });

      render(<TeacherDashboard />);

      // Wait for the dashboard to load
      await waitFor(() => {
        expect(screen.queryByTestId('play-tab-first-run-card')).toBeInTheDocument();
      });

      // Count create-classroom buttons that are visible
      // PlayTabFirstRunCard has "first-run-create-class" button
      // TeacherOnboardingChecklist has "teacher-onboarding-cta-create-classroom" button
      // ClassroomManager has a create (+) button in the closed tools drawer
      const firstRunButton = screen.queryAllByTestId('first-run-create-class');
      const checklistButton = screen.queryAllByTestId('teacher-onboarding-cta-create-classroom');

      const visibleFirstRun = firstRunButton.filter((el) => el.closest('[data-testid="play-tab-first-run-card"]') && (el as HTMLElement).offsetParent !== null).length;
      const visibleChecklist = checklistButton.filter((el) => (el as HTMLElement).offsetParent !== null).length;

      const totalVisibleCreateCtAs = visibleFirstRun + visibleChecklist;

      console.log(`[BEFORE] Zero-classroom teacher visible create CTAs: ${totalVisibleCreateCtAs}`);
      console.log(`  - PlayTabFirstRunCard "first-run-create-class": ${visibleFirstRun}`);
      console.log(`  - Checklist "create_classroom" CTA: ${visibleChecklist}`);

      // After fix: should be exactly 1
      // Before fix: should be 2 (PlayTabFirstRunCard + checklist CTA)
      expect(totalVisibleCreateCtAs).toBe(1);
    });
  });

  describe('One classroom state', () => {
    it('should render exactly ONE play/go-live button for teacher with classroom', async () => {
      const { useClassrooms } = await import('@/hooks/useClassroom');
      const mockUseClassrooms = vi.mocked(useClassrooms);
      mockUseClassrooms.mockReturnValue({
        classrooms: [
          {
            id: 'class1',
            name: 'Class 1',
            join_code: 'ABC123',
            member_count: 5,
            language: 'en',
            lessons_count: 0,
          } as any,
        ],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
        createClassroom: vi.fn(),
        updateClassroom: vi.fn(),
        deleteClassroom: vi.fn(),
      });

      render(<TeacherDashboard />);

      // Wait for the dashboard to load
      await waitFor(() => {
        expect(screen.queryByTestId('play-now-go')).toBeInTheDocument();
      });

      // Count play/go-live buttons that are visible
      // PlayNowLauncher has "play-now-go" button
      // ClassPulseSection has "class-pulse-action" button (mocked to render as "Play again")
      const playNowButtons = screen.queryAllByTestId('play-now-go');
      const pulseButtons = screen.queryAllByTestId('class-pulse-action');

      const visiblePlayNow = playNowButtons.filter((el) => (el as HTMLElement).offsetParent !== null).length;
      const visiblePulse = pulseButtons.filter((el) => (el as HTMLElement).offsetParent !== null).length;

      const totalVisiblePlayButtons = visiblePlayNow + visiblePulse;

      console.log(`[BEFORE] One-classroom teacher visible play buttons: ${totalVisiblePlayButtons}`);
      console.log(`  - PlayNowLauncher "play-now-go": ${visiblePlayNow}`);
      console.log(`  - ClassPulseSection "class-pulse-action": ${visiblePulse}`);

      // After fix: should be exactly 1
      // Before fix: should be 2 (PlayNowLauncher + ClassPulseSection's play button)
      expect(totalVisiblePlayButtons).toBe(1);
    });
  });

  describe('Telemetry preservation', () => {
    it('should fire teacher_onboarding_step view event even when create CTA is suppressed', async () => {
      const { trackTeacherOnboardingStep } = await import('@/lib/education/telemetry');
      const mockTrack = vi.mocked(trackTeacherOnboardingStep);

      const { useClassrooms } = await import('@/hooks/useClassroom');
      const mockUseClassrooms = vi.mocked(useClassrooms);
      mockUseClassrooms.mockReturnValue({
        classrooms: [],
        isLoading: false,
        error: null,
        refresh: vi.fn(),
        createClassroom: vi.fn(async () => ({ success: false, error: 'test' })),
        updateClassroom: vi.fn(),
        deleteClassroom: vi.fn(),
      });

      render(<TeacherDashboard />);

      await waitFor(() => {
        expect(screen.queryByTestId('teacher-onboarding-checklist')).toBeInTheDocument();
      });

      // Verify that the onboarding checklist still fires view events
      expect(mockTrack).toHaveBeenCalledWith(
        expect.objectContaining({
          step: expect.any(String),
          action: 'view',
        })
      );
    });
  });
});
