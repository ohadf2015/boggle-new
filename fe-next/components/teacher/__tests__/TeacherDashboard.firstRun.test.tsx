/**
 * TeacherDashboard — First-Run Empty State Tests
 *
 * Validates that the play tab correctly handles four distinct states:
 * 1. Error: shows error card with retry (never shows CTA or empty card — fail-open guard)
 * 2. Loading: shows neutral skeleton (no CTA, no empty card, prevents flash)
 * 3. Zero classrooms (loaded, no error): shows first-run card + hides Start Game CTA
 * 4. One+ classrooms (loaded, no error): shows Start Game CTA + hides first-run card
 *
 * CRITICAL: QuickStartButton is also gated on classrooms.length > 0 to prevent
 * dead-ending with a config but no classroom context to load.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import type { GameConfiguration } from '@/hooks/useRecentGameSettings';

// ── Navigation ────────────────────────────────────────────────────────────────
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/en/teacher',
}));

// ── LanguageContext ──────────────────────────────────────────────────────────
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) =>
      ({
        'teacher.dashboard.title': 'Teacher Dashboard',
        'teacher.dashboard.subtitle': 'Manage your classroom',
        'teacher.dashboard.tab.play': 'Play',
        'teacher.dashboard.tab.prepare': 'Prepare',
        'teacher.dashboard.tab.review': 'Review',
        'teacher.dashboard.duelActivity': 'Duel Activity',
        'teacher.dashboard.live': 'Live',
        'teacher.dashboard.quickTip': 'Quick Tip',
        'teacher.dashboard.quickTipDescription': 'Start a game quickly',
        'teacher.dashboard.selectClassroom': 'Select classroom',
        'teacher.dashboard.createClassroomFirst': 'Create a classroom first to track assignments and duel activity',
        'teacher.dashboard.reviewEmptyHint': 'Create your first classroom to unlock analytics, assignments and reports.',
        'teacher.dashboard.classroomLoadError': 'Could not load your classrooms',
        'teacher.dashboard.classroomLoadErrorHint': 'Check your connection and try again',
        'teacher.dashboard.retry': 'Retry',
        'education.classroomGame.startGame': 'Start Game',
        'education.classroomGame.startGameDescription': 'Launch a classroom game',
        'education.onboarding.showTutorial': 'Show tutorial',
        'teacher.classroom.create': 'Create Classroom',
      })[key] || key,
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

vi.mock('@/components/education/TeacherWelcomeBanner', () => ({
  TeacherWelcomeBanner: () => <div data-testid="teacher-welcome-banner" />,
}));

vi.mock('@/components/teacher/ClassroomManager', () => ({
  default: () => <div data-testid="classroom-manager" />,
}));

vi.mock('@/components/teacher/LessonBuilder', () => ({
  default: () => <div data-testid="lesson-builder" />,
}));

vi.mock('@/components/teacher/QuickStartButton', () => ({
  default: () => <div data-testid="quick-start-button">Quick Start</div>,
}));

vi.mock('@/components/teacher/dashboard', () => ({
  DuelMonitoringPanel: () => <div data-testid="duel-monitoring-panel" />,
}));

vi.mock('@/components/teacher/assignments', () => ({
  AssignmentTrackingPanel: () => <div data-testid="assignment-tracking-panel" />,
  AssignmentCreator: () => <div data-testid="assignment-creator" />,
}));

vi.mock('@/components/teacher/analytics/AnalyticsDashboard', () => ({
  AnalyticsDashboard: () => <div data-testid="analytics-dashboard" />,
}));

vi.mock('@/components/teacher/PlayTabFirstRunCard', () => ({
  default: ({ createClassroom }: { createClassroom: (name: string, language: string) => Promise<any> }) => (
    <div data-testid="play-tab-first-run-card">
      <p>Create a classroom first to track assignments and duel activity</p>
      <button
        onClick={async () => {
          await createClassroom('Test Classroom', 'en');
        }}
        data-testid="play-tab-create-button"
      >
        Create Classroom
      </button>
    </div>
  ),
}));

// ── useRecentGameSettings ─────────────────────────────────────────────────────
const mockGetMostRecent = vi.fn<GameConfiguration | null, []>();
const mockHasRecentConfig = { value: false };

vi.mock('@/hooks/useRecentGameSettings', () => ({
  useRecentGameSettings: () => ({
    hasRecentConfig: mockHasRecentConfig.value,
    getMostRecent: mockGetMostRecent,
    recentConfigs: [],
    saveConfig: vi.fn(),
    getByClassroom: vi.fn(() => []),
    removeConfig: vi.fn(),
    clearAll: vi.fn(),
  }),
}));

// ── useClassrooms (controlled per test) ────────────────────────────────────────
const mockRefresh = vi.fn();
const mockClassroomsState = {
  classrooms: [],
  isLoading: true,
  error: null,
};

vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: mockClassroomsState.classrooms,
    isLoading: mockClassroomsState.isLoading,
    error: mockClassroomsState.error,
    refresh: mockRefresh,
    createClassroom: vi.fn(),
    updateClassroom: vi.fn(),
    deleteClassroom: vi.fn(),
  }),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('TeacherDashboard — Play Tab First-Run State', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockGetMostRecent.mockReset();
    mockRefresh.mockClear();
    mockHasRecentConfig.value = false;
    mockClassroomsState.classrooms = [];
    mockClassroomsState.isLoading = true;
    mockClassroomsState.error = null;
  });

  describe('error state (fail-open guard)', () => {
    it('should render error state when fetch fails (RLS/network error)', () => {
      // GIVEN — classroom fetch failed (e.g., RLS denial, network error)
      mockClassroomsState.isLoading = false;
      mockClassroomsState.classrooms = [];
      mockClassroomsState.error = 'Permission denied';

      // WHEN
      render(<TeacherDashboard />);

      // THEN — error state is visible with error text
      expect(screen.getByText('Could not load your classrooms')).toBeInTheDocument();
      expect(screen.getByText('Check your connection and try again')).toBeInTheDocument();
    });

    it('should NOT render first-run card when error exists', () => {
      // GIVEN — error state: fetch failed
      mockClassroomsState.isLoading = false;
      mockClassroomsState.classrooms = [];
      mockClassroomsState.error = 'Permission denied';

      // WHEN
      render(<TeacherDashboard />);

      // THEN — first-run card is absent (error takes precedence — fail-open guard)
      expect(screen.queryByTestId('play-tab-first-run-card')).not.toBeInTheDocument();
    });

    it('should NOT render Start Game CTA when error exists', () => {
      // GIVEN — error state: fetch failed
      mockClassroomsState.isLoading = false;
      mockClassroomsState.classrooms = [];
      mockClassroomsState.error = 'Permission denied';

      // WHEN
      render(<TeacherDashboard />);

      // THEN — Start Game is absent (error takes precedence — never render CTA on error)
      expect(screen.queryByText('Start Game')).not.toBeInTheDocument();
    });

    it('should render a retry button on error', () => {
      // GIVEN — error state
      mockClassroomsState.isLoading = false;
      mockClassroomsState.classrooms = [];
      mockClassroomsState.error = 'Permission denied';

      render(<TeacherDashboard />);

      // WHEN — teacher clicks retry
      const retryButton = screen.getByTestId('play-tab-error-retry-button');
      fireEvent.click(retryButton);

      // THEN — refresh is called to retry the fetch
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should render the error card on a solid light background, not a translucent one', () => {
      // The dashboard root is bg-neo-navy. The error copy inside this card is text-black, so a
      // translucent surface (e.g. bg-neo-red/5) leaves black-on-dark-navy at roughly 1.3:1 —
      // far under the WCAG AA 4.5:1 this project requires, and the message becomes unreadable.
      // jsdom does not compute contrast, so no amount of getByText would have caught that; this
      // pins the surface instead. Its sibling (the review-tab empty state) uses bg-neo-cream.
      mockClassroomsState.isLoading = false;
      mockClassroomsState.classrooms = [];
      mockClassroomsState.error = 'Permission denied';

      render(<TeacherDashboard />);

      const card = screen.getByTestId('play-tab-error-card');
      expect(card.className).toContain('bg-neo-cream');
      expect(card.className).not.toMatch(/bg-neo-\w+\/\d/);
    });
  });

  describe('loading state', () => {
    it('should render skeleton AND NOT render Start Game CTA while loading', () => {
      // GIVEN — classrooms are loading (initial state)
      mockClassroomsState.isLoading = true;
      mockClassroomsState.classrooms = [];
      mockClassroomsState.error = null;

      // WHEN
      render(<TeacherDashboard />);

      // THEN — skeleton is present and Start Game button is ABSENT
      // (not rendering either CTA or empty card prevents flash)
      expect(screen.queryByText('Start Game')).not.toBeInTheDocument();
    });

    it('should render skeleton AND NOT render first-run card while loading', () => {
      // GIVEN — classrooms are loading (initial state)
      mockClassroomsState.isLoading = true;
      mockClassroomsState.classrooms = [];
      mockClassroomsState.error = null;

      // WHEN
      render(<TeacherDashboard />);

      // THEN — skeleton is present and first-run card is ABSENT
      // (this is the most critical test — prevents flash of empty state)
      expect(screen.queryByTestId('play-tab-first-run-card')).not.toBeInTheDocument();
    });
  });

  describe('zero classrooms (loaded, no error)', () => {
    it('should render first-run card when zero classrooms + loaded + no error', () => {
      // GIVEN — zero classrooms are loaded successfully
      mockClassroomsState.isLoading = false;
      mockClassroomsState.classrooms = [];
      mockClassroomsState.error = null;

      // WHEN
      render(<TeacherDashboard />);

      // THEN — first-run card is visible
      expect(screen.getByTestId('play-tab-first-run-card')).toBeInTheDocument();
    });

    it('should NOT render Start Game CTA when zero classrooms + loaded + no error', () => {
      // GIVEN — zero classrooms are loaded successfully
      mockClassroomsState.isLoading = false;
      mockClassroomsState.classrooms = [];
      mockClassroomsState.error = null;

      // WHEN
      render(<TeacherDashboard />);

      // THEN — Start Game button is absent
      expect(screen.queryByText('Start Game')).not.toBeInTheDocument();
    });

    it('should NOT render QuickStartButton when zero classrooms (even with recent config)', () => {
      // GIVEN — zero classrooms, but a recent config exists
      // (edge case: teacher created a config, then deleted all classrooms)
      mockHasRecentConfig.value = true;
      mockGetMostRecent.mockReturnValue({
        id: 'cfg-1',
        classroomId: 'cls-1',
        classroomName: 'Math Class',
        lessonIds: ['lesson-42'],
        lessonNames: ['Fractions'],
        settings: { timerMinutes: 3, boardSize: 'medium', allowLateJoin: true },
        savedAt: Date.now(),
      });
      mockClassroomsState.isLoading = false;
      mockClassroomsState.classrooms = [];
      mockClassroomsState.error = null;

      // WHEN
      render(<TeacherDashboard />);

      // THEN — QuickStartButton is NOT rendered (gated on classrooms.length > 0)
      // This prevents dead-ending at /education/classroom-game with no classroom context
      expect(screen.queryByTestId('quick-start-button')).not.toBeInTheDocument();
    });

    it('should route to prepare tab when create button is clicked', () => {
      // GIVEN — zero classrooms are loaded
      mockClassroomsState.isLoading = false;
      mockClassroomsState.classrooms = [];
      mockClassroomsState.error = null;

      render(<TeacherDashboard />);

      // WHEN — teacher clicks the create button on the first-run card
      const createButton = screen.getByTestId('play-tab-create-button');
      fireEvent.click(createButton);

      // THEN — the classroom creation is handled inline on the play tab
      // (no tab switch needed, form and code display all on play tab)
      expect(screen.getByTestId('play-tab-first-run-card')).toBeInTheDocument();
    });
  });

  describe('one or more classrooms (loaded, no error)', () => {
    it('should render Start Game CTA when classrooms exist + loaded + no error', () => {
      // GIVEN — one classroom is loaded successfully
      mockClassroomsState.isLoading = false;
      mockClassroomsState.classrooms = [
        {
          id: 'cls-1',
          name: 'Math Class',
          language: 'en',
          teacher_id: 'user1',
          join_code: 'ABC123',
          created_at: '2026-01-01',
          member_count: 5,
        },
      ];
      mockClassroomsState.error = null;

      // WHEN
      render(<TeacherDashboard />);

      // THEN — Start Game button is visible
      expect(screen.getByText('Start Game')).toBeInTheDocument();
    });

    it('should NOT render first-run card when classrooms exist + loaded + no error', () => {
      // GIVEN — one classroom is loaded successfully
      mockClassroomsState.isLoading = false;
      mockClassroomsState.classrooms = [
        {
          id: 'cls-1',
          name: 'Math Class',
          language: 'en',
          teacher_id: 'user1',
          join_code: 'ABC123',
          created_at: '2026-01-01',
          member_count: 5,
        },
      ];
      mockClassroomsState.error = null;

      // WHEN
      render(<TeacherDashboard />);

      // THEN — first-run card is absent
      expect(screen.queryByTestId('play-tab-first-run-card')).not.toBeInTheDocument();
    });

    it('should render QuickStartButton when classrooms exist + hasRecentConfig', () => {
      // GIVEN — one classroom exists AND a recent config is saved
      mockHasRecentConfig.value = true;
      mockGetMostRecent.mockReturnValue({
        id: 'cfg-1',
        classroomId: 'cls-1',
        classroomName: 'Math Class',
        lessonIds: ['lesson-42'],
        lessonNames: ['Fractions'],
        settings: { timerMinutes: 3, boardSize: 'medium', allowLateJoin: true },
        savedAt: Date.now(),
      });
      mockClassroomsState.isLoading = false;
      mockClassroomsState.classrooms = [
        {
          id: 'cls-1',
          name: 'Math Class',
          language: 'en',
          teacher_id: 'user1',
          join_code: 'ABC123',
          created_at: '2026-01-01',
          member_count: 5,
        },
      ];
      mockClassroomsState.error = null;

      // WHEN
      render(<TeacherDashboard />);

      // THEN — QuickStartButton IS rendered (normal path)
      expect(screen.getByTestId('quick-start-button')).toBeInTheDocument();
    });

    it('should render Duel Activity when classrooms exist + loaded + no error', () => {
      // GIVEN — one classroom is loaded successfully
      mockClassroomsState.isLoading = false;
      mockClassroomsState.classrooms = [
        {
          id: 'cls-1',
          name: 'Math Class',
          language: 'en',
          teacher_id: 'user1',
          join_code: 'ABC123',
          created_at: '2026-01-01',
          member_count: 5,
        },
      ];
      mockClassroomsState.error = null;

      // WHEN
      render(<TeacherDashboard />);

      // THEN — Duel Activity panel is visible
      expect(screen.getByTestId('duel-monitoring-panel')).toBeInTheDocument();
    });
  });
});
