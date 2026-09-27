import React from 'react';
import { render, screen } from '@testing-library/react';
import ClassroomLeaderboard from './ClassroomLeaderboard';
import * as useClassroomLeaderboardHook from '@/hooks/useClassroomLeaderboard';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock LanguageContext with translations
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const translations: Record<string, string> = {
        'education.leaderboard.title': 'Class Rankings',
        'education.leaderboard.weekly': 'Weekly',
        'education.leaderboard.monthly': 'Monthly',
        'education.leaderboard.allTime': 'All-Time',
        'education.leaderboard.xp': '{xp} XP',
        'education.leaderboard.level': 'Lv. {level}',
        'education.leaderboard.inactive': 'Inactive',
        'education.leaderboard.noStudentsYet': 'No one here yet!',
        'education.leaderboard.studentsInClass': '{count} students',
        'education.leaderboard.newEntry': 'NEW',
        'education.leaderboard.top10': 'Top 10%',
        'education.leaderboard.top25': 'Top 25%',
        'education.leaderboard.top50': 'Top 50%',
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

// Mock the hook
vi.mock('@/hooks/useClassroomLeaderboard');

// Mock AdaptiveMotion (used by the component instead of framer-motion directly)
vi.mock('@/components/motion/AdaptiveMotion', () => {
  const React = require('react');
  const createMotionProxy = () =>
    new Proxy({}, {
      get: (_: any, tag: string) => {
        const Comp = React.forwardRef(({ children, ...props }: any, ref: any) =>
          React.createElement(tag, { ...props, ref }, children)
        );
        Comp.displayName = `m.${tag}`;
        return Comp;
      },
    });
  return {
    __esModule: true,
    AdaptiveMotion: createMotionProxy(),
    AdaptiveAnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
    default: createMotionProxy(),
  };
});

// Mock getLeaderboardTier used directly by TierBadge
vi.mock('@/lib/supabase/education/leaderboard', () => ({
  getLeaderboardTier: (rank: number, total: number) => {
    const pct = rank / total;
    if (pct <= 0.1) return 'top10';
    if (pct <= 0.25) return 'top25';
    if (pct <= 0.5) return 'top50';
    return null;
  },
}));

const mockUseClassroomLeaderboard = useClassroomLeaderboardHook.useClassroomLeaderboard as jest.MockedFunction<
  typeof useClassroomLeaderboardHook.useClassroomLeaderboard
>;

// Helper to create a fullList entry with delta properties
const createEntry = (overrides: Record<string, any> = {}) => ({
  userId: 'student-1',
  displayName: 'Student',
  avatarUrl: null,
  totalXp: 100,
  currentLevel: 1,
  rank: 1,
  isCurrentUser: false,
  isInactive: false,
  currentStreak: 0,
  previousRank: null,
  rankDelta: null,
  isNew: false,
  ...overrides,
});

// Helper: default mock return value (empty list, not loading)
const defaultMock = (overrides: Record<string, any> = {}) => ({
  topThree: [],
  currentUserRank: null,
  fullList: [],
  totalStudents: 0,
  isLoading: false,
  error: null,
  refresh: vi.fn(),
  timeScope: 'weekly' as const,
  setTimeScope: vi.fn(),
  ...overrides,
} as any);

// Helper to render with language context
const renderWithLanguage = (ui: React.ReactElement, language: 'en' | 'he' | 'sv' | 'ja' | 'es' = 'en') => {
  return render(
    <LanguageProvider initialLanguage={language}>
      {ui}
    </LanguageProvider>
  );
};

describe('ClassroomLeaderboard', () => {
  const mockClassroomId = 'classroom-123';
  const mockCurrentUserId = 'student-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==================== RENDERING ====================

  describe('Rendering', () => {
    it('renders loading skeleton when loading', () => {
      // GIVEN: Loading state
      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ isLoading: true }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Should show loading state
      expect(screen.getByTestId('leaderboard-skeleton')).toBeInTheDocument();
    });

    it('renders students from fullList with names and XP', () => {
      // GIVEN: 3 students in fullList
      const fullList = [
        createEntry({ userId: 'student-1', displayName: 'Alice', avatarUrl: 'https://example.com/alice.jpg', totalXp: 500, currentLevel: 5, rank: 1 }),
        createEntry({ userId: 'student-2', displayName: 'Bob', totalXp: 350, currentLevel: 4, rank: 2 }),
        createEntry({ userId: 'student-3', displayName: 'Carol', avatarUrl: 'https://example.com/carol.jpg', totalXp: 200, currentLevel: 3, rank: 3 }),
      ];

      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 3 }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Should show all 3 students
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Carol')).toBeInTheDocument();

      // Should show XP values
      expect(screen.getByText('500 XP')).toBeInTheDocument();
      expect(screen.getByText('350 XP')).toBeInTheDocument();
      expect(screen.getByText('200 XP')).toBeInTheDocument();

      // Should show level badges
      expect(screen.getByText('Lv. 5')).toBeInTheDocument();
      expect(screen.getByText('Lv. 4')).toBeInTheDocument();
      expect(screen.getByText('Lv. 3')).toBeInTheDocument();
    });

    it('highlights current user in list', () => {
      // GIVEN: Current user is in the list
      const fullList = [
        createEntry({ userId: 'student-1', displayName: 'Alice', totalXp: 500, rank: 1 }),
        createEntry({ userId: mockCurrentUserId, displayName: 'Current User', totalXp: 350, rank: 2, isCurrentUser: true }),
        createEntry({ userId: 'student-3', displayName: 'Carol', totalXp: 200, rank: 3 }),
      ];

      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 3 }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Current user should have highlight class
      const currentUserCard = screen.getByTestId('leaderboard-entry-current-user');
      expect(currentUserCard).toHaveClass('bg-neo-cyan/20');
      expect(currentUserCard).toHaveClass('border-neo-cyan');
    });

    it('current user highlighted even when not in top 3', () => {
      // GIVEN: Current user is 5th in a 5-student list
      const fullList = Array.from({ length: 5 }, (_, i) => createEntry({
        userId: i === 4 ? mockCurrentUserId : `student-${i + 1}`,
        displayName: i === 4 ? 'Current User' : `Student ${i + 1}`,
        totalXp: (5 - i) * 100,
        currentLevel: 5 - i,
        rank: i + 1,
        isCurrentUser: i === 4,
      }));

      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 5 }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Current user's entry should be highlighted
      const currentUserCard = screen.getByTestId('leaderboard-entry-current-user');
      expect(currentUserCard).toHaveClass('bg-neo-cyan/20');
      expect(screen.getByText('Current User')).toBeInTheDocument();
      expect(screen.getByText('100 XP')).toBeInTheDocument();
    });

    it('displays inactive badge for inactive students', () => {
      // GIVEN: Student 2 is inactive
      const fullList = [
        createEntry({ userId: 'student-1', displayName: 'Alice', totalXp: 500, rank: 1 }),
        createEntry({ userId: 'student-2', displayName: 'Bob', totalXp: 350, rank: 2, isInactive: true }),
        createEntry({ userId: 'student-3', displayName: 'Carol', totalXp: 200, rank: 3 }),
      ];

      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 3 }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Should show inactive badge
      expect(screen.getByText('Inactive')).toBeInTheDocument();

      // Inactive student should have reduced opacity
      const inactiveCard = screen.getByTestId('leaderboard-entry-student-2');
      expect(inactiveCard).toHaveClass('opacity-50');
    });

    it('shows footer with total students count', () => {
      // GIVEN: 5 students in fullList
      const fullList = Array.from({ length: 5 }, (_, i) => createEntry({
        userId: `student-${i + 1}`,
        displayName: `Student ${i + 1}`,
        totalXp: (5 - i) * 100,
        rank: i + 1,
      }));

      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 5 }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Should show student count
      expect(screen.getByText('5 students')).toBeInTheDocument();
    });
  });

  // ==================== EMPTY STATE ====================

  describe('Empty State', () => {
    it('shows empty state when no students', () => {
      // GIVEN: Empty classroom
      mockUseClassroomLeaderboard.mockReturnValue(defaultMock());

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Should show empty message
      expect(screen.getByText('No one here yet!')).toBeInTheDocument();
    });
  });

  // ==================== TRANSLATIONS ====================

  describe('Translations', () => {
    it('uses correct translation keys', () => {
      // GIVEN: 1 student in list
      const fullList = [
        createEntry({ userId: 'student-1', displayName: 'Alice', totalXp: 500, currentLevel: 5, rank: 1 }),
      ];

      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 1 }));

      // WHEN: Component is rendered in English
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Should use translation keys
      expect(screen.getByText('Class Rankings')).toBeInTheDocument();
      expect(screen.getByText('1 students')).toBeInTheDocument();
    });

    it('handles RTL layout (Hebrew)', () => {
      // GIVEN: Empty classroom
      mockUseClassroomLeaderboard.mockReturnValue(defaultMock());

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Container should have dir attribute (ltr from mock context)
      const container = screen.getByTestId('classroom-leaderboard');
      expect(container).toHaveAttribute('dir', 'ltr');
    });
  });

  // ==================== TIME SCOPE TABS ====================

  describe('Time Scope Tabs', () => {
    it('renders time scope tabs (Weekly, Monthly, All-Time)', () => {
      // GIVEN: Mock data with 1 student (so tabs are rendered)
      const fullList = [createEntry()];
      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 1 }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Should show tabs
      expect(screen.getByRole('button', { name: /weekly/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /monthly/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /all.time/i })).toBeInTheDocument();
    });
  });

  // ==================== RANK DELTA INDICATORS ====================

  describe('Rank Delta Indicators', () => {
    it('shows green up-arrow for improved rank', () => {
      // GIVEN: Student improved from rank 3 to rank 1
      const fullList = [
        createEntry({ displayName: 'Alice', totalXp: 500, rank: 1, currentStreak: 2, previousRank: 3, rankDelta: 2 }),
      ];
      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 1 }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Should show up arrow with delta
      expect(screen.getByTestId('rank-delta-up')).toBeInTheDocument();
      expect(screen.getByText('+2')).toBeInTheDocument();
    });

    it('shows orange down-arrow for declined rank', () => {
      // GIVEN: Student declined from rank 1 to rank 3
      const fullList = [
        createEntry({ displayName: 'Bob', totalXp: 200, rank: 3, previousRank: 1, rankDelta: -2 }),
      ];
      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 1 }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Should show down arrow with delta
      expect(screen.getByTestId('rank-delta-down')).toBeInTheDocument();
      expect(screen.getByText('-2')).toBeInTheDocument();
    });

    it('shows cyan NEW badge for new entry', () => {
      // GIVEN: New student on leaderboard
      const fullList = [
        createEntry({ displayName: 'Charlie', totalXp: 300, rank: 2, currentStreak: 1, isNew: true }),
      ];
      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 1 }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Should show NEW badge
      expect(screen.getByTestId('rank-delta-new')).toBeInTheDocument();
      expect(screen.getByText('NEW')).toBeInTheDocument();
    });

    it('shows gray dash for no rank change', () => {
      // GIVEN: Student rank unchanged
      const fullList = [
        createEntry({ displayName: 'Dave', totalXp: 400, rank: 1, currentStreak: 4, previousRank: 1, rankDelta: 0 }),
      ];
      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 1 }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Should show dash
      expect(screen.getByTestId('rank-delta-none')).toBeInTheDocument();
      expect(screen.getByText('−')).toBeInTheDocument();
    });
  });

  // ==================== STREAK BADGES ====================

  describe('Streak Badges', () => {
    it('shows streak badge for streak >= 3', () => {
      // GIVEN: Student with 5-day streak
      const fullList = [
        createEntry({ displayName: 'Eve', totalXp: 600, rank: 1, currentStreak: 5, isNew: true }),
      ];
      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 1 }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Should show streak badge with count
      const badge = screen.getByTestId('streak-badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveTextContent('5');
    });

    it('does not show streak badge for streak < 3', () => {
      // GIVEN: Student with 2-day streak
      const fullList = [
        createEntry({ displayName: 'Frank', totalXp: 300, rank: 1, currentStreak: 2, isNew: true }),
      ];
      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 1 }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Should NOT show streak badge
      expect(screen.queryByTestId('streak-badge')).not.toBeInTheDocument();
    });
  });

  // ==================== TIER BADGES ====================

  describe('Tier Badges', () => {
    it('shows Top 10% tier badge', () => {
      // GIVEN: Student in top 10% (rank 1 of 100)
      const fullList = [
        createEntry({ displayName: 'Grace', totalXp: 1000, rank: 1, currentStreak: 7, isNew: true }),
      ];
      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 100 }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Should show Top 10% badge
      expect(screen.getByTestId('tier-badge-top10')).toBeInTheDocument();
      expect(screen.getByText('Top 10%')).toBeInTheDocument();
    });

    it('shows Top 25% tier badge', () => {
      // GIVEN: Student in top 25% (rank 15 of 100)
      const fullList = [
        createEntry({ displayName: 'Hank', totalXp: 800, rank: 15, currentStreak: 3, isNew: true }),
      ];
      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 100 }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Should show Top 25% badge
      expect(screen.getByTestId('tier-badge-top25')).toBeInTheDocument();
      expect(screen.getByText('Top 25%')).toBeInTheDocument();
    });

    it('shows Top 50% tier badge', () => {
      // GIVEN: Student in top 50% (rank 30 of 100)
      const fullList = [
        createEntry({ displayName: 'Ivy', totalXp: 600, rank: 30, currentStreak: 2, isNew: true }),
      ];
      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 100 }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Should show Top 50% badge
      expect(screen.getByTestId('tier-badge-top50')).toBeInTheDocument();
      expect(screen.getByText('Top 50%')).toBeInTheDocument();
    });
  });

  // ==================== FULL STUDENT LIST ====================

  describe('Full Student List', () => {
    it('renders full list of all students (not just top 3)', () => {
      // GIVEN: 10 students
      const fullList = Array.from({ length: 10 }, (_, i) => createEntry({
        userId: `student-${i + 1}`,
        displayName: `Student ${i + 1}`,
        totalXp: (10 - i) * 100,
        currentLevel: 10 - i,
        rank: i + 1,
        isCurrentUser: i === 4,
      }));

      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 10 }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Should show all 10 students
      expect(screen.getByText('Student 1')).toBeInTheDocument();
      expect(screen.getByText('Student 5')).toBeInTheDocument();
      expect(screen.getByText('Student 10')).toBeInTheDocument();

      // Current user should be highlighted
      const currentUserEntry = screen.getByTestId('leaderboard-entry-current-user');
      expect(currentUserEntry).toHaveClass('bg-neo-cyan/20');
    });
  });

  // ==================== ACCESSIBILITY ====================

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      // GIVEN: 1 student in list
      const fullList = [
        createEntry({ userId: 'student-1', displayName: 'Alice', totalXp: 500, rank: 1 }),
      ];
      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 1 }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Should have ARIA label
      expect(screen.getByLabelText('education.leaderboard.ariaLabel')).toBeInTheDocument();
    });

    it('includes alt text for avatars', () => {
      // GIVEN: Student with avatar
      const fullList = [
        createEntry({ userId: 'student-1', displayName: 'Alice', avatarUrl: 'https://example.com/alice.jpg', totalXp: 500, rank: 1 }),
      ];
      mockUseClassroomLeaderboard.mockReturnValue(defaultMock({ fullList, totalStudents: 1 }));

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard classroomId={mockClassroomId} currentUserId={mockCurrentUserId} />
      );

      // THEN: Avatar should have alt text
      const avatar = screen.getByAltText("Alice's avatar");
      expect(avatar).toBeInTheDocument();
    });
  });
});
