/**
 * TeacherDashboard - QuickStartButton Integration Tests
 *
 * Tests that TeacherDashboard correctly:
 * 1. Renders QuickStartButton when a recent config exists
 * 2. Hides QuickStartButton when no recent config exists
 * 3. Navigates to classroom-game with the right lessonId on click
 */

import { render, screen, fireEvent } from '@testing-library/react';
import TeacherDashboard from '@/components/teacher/TeacherDashboard';
import type { GameConfiguration } from '@/hooks/useRecentGameSettings';

// ── Navigation ──────────────────────────────────────────────────────────────
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// ── LanguageContext ──────────────────────────────────────────────────────────
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) =>
      ({
        'teacher.dashboard.title': 'Teacher Dashboard',
        'teacher.dashboard.subtitle': 'Manage your classroom',
        'teacher.dashboard.quickStart': 'Quick Start',
        'teacher.dashboard.repeatLastGame': 'Repeat Last Game',
        'teacher.dashboard.createLesson': 'Create Lesson',
        'teacher.dashboard.createLessonDescription': 'Build a new lesson',
        'teacher.dashboard.classrooms': 'Classrooms',
        'teacher.dashboard.lessons': 'Lessons',
        'teacher.dashboard.assignments': 'Assignments',
        'teacher.dashboard.duelActivity': 'Duel Activity',
        'teacher.dashboard.track': 'Track',
        'teacher.dashboard.build': 'Build',
        'teacher.dashboard.manage': 'Manage',
        'teacher.dashboard.live': 'Live',
        'teacher.dashboard.quickTip': 'Quick Tip',
        'teacher.dashboard.quickTipDescription': 'Start a game quickly',
        'teacher.dashboard.selectClassroom': 'Select classroom',
        'teacher.dashboard.createClassroomFirst': 'Create a classroom first',
        'education.classroomGame.startGame': 'Start Game',
        'education.classroomGame.startGameDescription': 'Launch a classroom game',
        'common.minutes': 'min',
      })[key] || key,
    language: 'en',
  }),
}));

// ── Heavy sub-components (rendered but not under test here) ─────────────────
vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));

vi.mock('@/components/education/TeacherOnboarding', () => ({
  TeacherOnboarding: () => <div data-testid="teacher-onboarding" />,
}));

vi.mock('@/components/teacher/ClassroomManager', () => ({
  default: function ClassroomManager() {
    return <div data-testid="classroom-manager" />;
  },
}));

vi.mock('@/components/teacher/LessonBuilder', () => ({
  default: function LessonBuilder() {
    return <div data-testid="lesson-builder" />;
  },
}));

vi.mock('@/components/teacher/assignments', () => ({
  AssignmentTrackingPanel: () => <div data-testid="assignment-tracking-panel" />,
  AssignmentCreator: () => <div data-testid="assignment-creator" />,
}));

vi.mock('@/components/teacher/dashboard', () => ({
  DuelMonitoringPanel: () => <div data-testid="duel-monitoring-panel" />,
}));

// ── useClassrooms (controlled per test) ────────────────────────────────────────
const mockClassroomsState = {
  classrooms: [],
};

vi.mock('@/hooks/useClassroom', () => ({
  useClassrooms: () => ({
    classrooms: mockClassroomsState.classrooms,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    createClassroom: vi.fn(),
    updateClassroom: vi.fn(),
    deleteClassroom: vi.fn(),
  }),
}));

// ── useRecentGameSettings (controlled per test) ──────────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeConfig(overrides: Partial<GameConfiguration> = {}): GameConfiguration {
  return {
    id: 'cfg-1',
    classroomId: 'cls-1',
    classroomName: 'Math Class',
    lessonIds: ['lesson-42'],
    lessonNames: ['Fractions'],
    settings: { timerMinutes: 3, boardSize: 'medium', allowLateJoin: true },
    savedAt: Date.now(),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('TeacherDashboard — QuickStartButton integration', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockGetMostRecent.mockReset();
    mockHasRecentConfig.value = false;
    // Reset classrooms for each test
    mockClassroomsState.classrooms = [];
  });

  describe('conditional rendering', () => {
    it('should NOT render QuickStartButton when no recent config exists', () => {
      // GIVEN — no saved game configuration
      mockHasRecentConfig.value = false;
      mockGetMostRecent.mockReturnValue(null);

      // WHEN
      render(<TeacherDashboard />);

      // THEN — the Quick Start heading is absent
      expect(screen.queryByText('Quick Start')).not.toBeInTheDocument();
    });

    it('should render QuickStartButton when a recent config exists AND classrooms exist', () => {
      // GIVEN — there is a saved game configuration AND at least one classroom
      // (QuickStart is now gated on classrooms.length > 0 to prevent dead-ending)
      mockHasRecentConfig.value = true;
      mockGetMostRecent.mockReturnValue(makeConfig());
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

      // WHEN
      render(<TeacherDashboard />);

      // THEN — the Quick Start button is visible
      expect(screen.getByText('Quick Start')).toBeInTheDocument();
    });

    it('should display the classroom name from the recent config', () => {
      // GIVEN
      mockHasRecentConfig.value = true;
      mockGetMostRecent.mockReturnValue(makeConfig({ classroomName: 'Science Lab' }));
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

      // WHEN
      render(<TeacherDashboard />);

      // THEN
      expect(screen.getByText('Science Lab')).toBeInTheDocument();
    });
  });

  describe('navigation on click', () => {
    it('should navigate to classroom-game with the first lessonId when clicked', () => {
      // GIVEN
      mockHasRecentConfig.value = true;
      mockGetMostRecent.mockReturnValue(makeConfig({ lessonIds: ['lesson-42'] }));
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

      render(<TeacherDashboard />);

      // WHEN — teacher clicks Quick Start
      fireEvent.click(screen.getByText('Quick Start'));

      // THEN — router navigates with the correct lesson query param
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('lessonId=lesson-42')
      );
    });

    it('should include the locale in the navigation path', () => {
      // GIVEN — language is 'en' (from mock)
      mockHasRecentConfig.value = true;
      mockGetMostRecent.mockReturnValue(makeConfig({ lessonIds: ['lesson-99'] }));
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

      render(<TeacherDashboard />);

      // WHEN
      fireEvent.click(screen.getByText('Quick Start'));

      // THEN — path includes /en/education/classroom-game
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('/en/education/classroom-game')
      );
    });

    it('should navigate with empty lessonId when config has no lesson IDs', () => {
      // GIVEN — edge case: config exists but lesson list is empty
      mockHasRecentConfig.value = true;
      mockGetMostRecent.mockReturnValue(makeConfig({ lessonIds: [] }));
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

      render(<TeacherDashboard />);

      // WHEN
      fireEvent.click(screen.getByText('Quick Start'));

      // THEN — should still navigate (gracefully with empty param)
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('lessonId=')
      );
    });
  });
});
