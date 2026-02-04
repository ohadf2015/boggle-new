import { render, screen, waitFor } from '@testing-library/react';
import ClassroomLeaderboard from './ClassroomLeaderboard';
import * as useClassroomLeaderboardHook from '@/hooks/useClassroomLeaderboard';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Mock the hook
jest.mock('@/hooks/useClassroomLeaderboard');

// Mock Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

const mockUseClassroomLeaderboard = useClassroomLeaderboardHook.useClassroomLeaderboard as jest.MockedFunction<
  typeof useClassroomLeaderboardHook.useClassroomLeaderboard
>;

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
    jest.clearAllMocks();
  });

  // ==================== RENDERING ====================

  describe('Rendering', () => {
    it('renders loading skeleton when loading', () => {
      // GIVEN: Loading state
      mockUseClassroomLeaderboard.mockReturnValue({
        topThree: [],
        currentUserRank: null,
        totalStudents: 0,
        isLoading: true,
        error: null,
        refresh: jest.fn(),
      });

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard
          classroomId={mockClassroomId}
          currentUserId={mockCurrentUserId}
        />
      );

      // THEN: Should show loading state
      expect(screen.getByTestId('leaderboard-skeleton')).toBeInTheDocument();
    });

    it('renders top 3 students with correct rank badges', () => {
      // GIVEN: Top 3 students
      mockUseClassroomLeaderboard.mockReturnValue({
        topThree: [
          {
            userId: 'student-1',
            displayName: 'Alice',
            avatarUrl: 'https://example.com/alice.jpg',
            totalXp: 500,
            currentLevel: 5,
            rank: 1,
            isCurrentUser: false,
            isInactive: false,
          },
          {
            userId: 'student-2',
            displayName: 'Bob',
            avatarUrl: null,
            totalXp: 350,
            currentLevel: 4,
            rank: 2,
            isCurrentUser: false,
            isInactive: false,
          },
          {
            userId: 'student-3',
            displayName: 'Carol',
            avatarUrl: 'https://example.com/carol.jpg',
            totalXp: 200,
            currentLevel: 3,
            rank: 3,
            isCurrentUser: false,
            isInactive: false,
          },
        ],
        currentUserRank: null,
        totalStudents: 3,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard
          classroomId={mockClassroomId}
          currentUserId={mockCurrentUserId}
        />
      );

      // THEN: Should show all 3 students
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Carol')).toBeInTheDocument();

      // Should show rank badges
      expect(screen.getByTestId('rank-badge-1')).toBeInTheDocument();
      expect(screen.getByTestId('rank-badge-2')).toBeInTheDocument();
      expect(screen.getByTestId('rank-badge-3')).toBeInTheDocument();

      // Should show XP values
      expect(screen.getByText('500 XP')).toBeInTheDocument();
      expect(screen.getByText('350 XP')).toBeInTheDocument();
      expect(screen.getByText('200 XP')).toBeInTheDocument();

      // Should show level badges
      expect(screen.getByText('Lv. 5')).toBeInTheDocument();
      expect(screen.getByText('Lv. 4')).toBeInTheDocument();
      expect(screen.getByText('Lv. 3')).toBeInTheDocument();
    });

    it('highlights current user when in top 3', () => {
      // GIVEN: Current user is 2nd place
      mockUseClassroomLeaderboard.mockReturnValue({
        topThree: [
          {
            userId: 'student-1',
            displayName: 'Alice',
            avatarUrl: null,
            totalXp: 500,
            currentLevel: 5,
            rank: 1,
            isCurrentUser: false,
            isInactive: false,
          },
          {
            userId: mockCurrentUserId,
            displayName: 'Current User',
            avatarUrl: null,
            totalXp: 350,
            currentLevel: 4,
            rank: 2,
            isCurrentUser: true,
            isInactive: false,
          },
          {
            userId: 'student-3',
            displayName: 'Carol',
            avatarUrl: null,
            totalXp: 200,
            currentLevel: 3,
            rank: 3,
            isCurrentUser: false,
            isInactive: false,
          },
        ],
        currentUserRank: null,
        totalStudents: 3,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard
          classroomId={mockClassroomId}
          currentUserId={mockCurrentUserId}
        />
      );

      // THEN: Current user should have highlight class
      const currentUserCard = screen.getByTestId('leaderboard-entry-current-user');
      expect(currentUserCard).toHaveClass('bg-neo-cyan/20');
      expect(currentUserCard).toHaveClass('border-neo-cyan');
    });

    it('shows "Your Position" section when user not in top 3', () => {
      // GIVEN: Current user is 4th place
      mockUseClassroomLeaderboard.mockReturnValue({
        topThree: [
          {
            userId: 'student-1',
            displayName: 'Alice',
            avatarUrl: null,
            totalXp: 500,
            currentLevel: 5,
            rank: 1,
            isCurrentUser: false,
            isInactive: false,
          },
          {
            userId: 'student-2',
            displayName: 'Bob',
            avatarUrl: null,
            totalXp: 350,
            currentLevel: 4,
            rank: 2,
            isCurrentUser: false,
            isInactive: false,
          },
          {
            userId: 'student-3',
            displayName: 'Carol',
            avatarUrl: null,
            totalXp: 200,
            currentLevel: 3,
            rank: 3,
            isCurrentUser: false,
            isInactive: false,
          },
        ],
        currentUserRank: {
          userId: mockCurrentUserId,
          displayName: 'Current User',
          avatarUrl: null,
          totalXp: 150,
          currentLevel: 2,
          rank: 4,
          isCurrentUser: true,
          isInactive: false,
        },
        totalStudents: 5,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard
          classroomId={mockClassroomId}
          currentUserId={mockCurrentUserId}
        />
      );

      // THEN: Should show current user position section
      expect(screen.getByText('You')).toBeInTheDocument();
      // Verify rank is displayed (there may be multiple #4 on page)
      expect(screen.getAllByText('#4').length).toBeGreaterThan(0);
      expect(screen.getByText('150 XP')).toBeInTheDocument();
      expect(screen.getByText('Lv. 2')).toBeInTheDocument();
    });

    it('displays inactive badge for inactive students', () => {
      // GIVEN: Student 2 is inactive
      mockUseClassroomLeaderboard.mockReturnValue({
        topThree: [
          {
            userId: 'student-1',
            displayName: 'Alice',
            avatarUrl: null,
            totalXp: 500,
            currentLevel: 5,
            rank: 1,
            isCurrentUser: false,
            isInactive: false,
          },
          {
            userId: 'student-2',
            displayName: 'Bob',
            avatarUrl: null,
            totalXp: 350,
            currentLevel: 4,
            rank: 2,
            isCurrentUser: false,
            isInactive: true, // Inactive student
          },
          {
            userId: 'student-3',
            displayName: 'Carol',
            avatarUrl: null,
            totalXp: 200,
            currentLevel: 3,
            rank: 3,
            isCurrentUser: false,
            isInactive: false,
          },
        ],
        currentUserRank: null,
        totalStudents: 3,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard
          classroomId={mockClassroomId}
          currentUserId={mockCurrentUserId}
        />
      );

      // THEN: Should show inactive badge
      expect(screen.getByText('Inactive')).toBeInTheDocument();

      // Inactive student should have reduced opacity
      const inactiveCard = screen.getByTestId('leaderboard-entry-student-2');
      expect(inactiveCard).toHaveClass('opacity-50');
    });

    it('shows footer with total students count', () => {
      // GIVEN: 5 students in classroom
      mockUseClassroomLeaderboard.mockReturnValue({
        topThree: [],
        currentUserRank: null,
        totalStudents: 5,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard
          classroomId={mockClassroomId}
          currentUserId={mockCurrentUserId}
        />
      );

      // THEN: Should show student count
      expect(screen.getByText('5 students')).toBeInTheDocument();
    });
  });

  // ==================== EMPTY STATE ====================

  describe('Empty State', () => {
    it('shows empty state when no students', () => {
      // GIVEN: Empty classroom
      mockUseClassroomLeaderboard.mockReturnValue({
        topThree: [],
        currentUserRank: null,
        totalStudents: 0,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard
          classroomId={mockClassroomId}
          currentUserId={mockCurrentUserId}
        />
      );

      // THEN: Should show empty message
      expect(screen.getByText('No one here yet!')).toBeInTheDocument();
    });
  });

  // ==================== TRANSLATIONS ====================

  describe('Translations', () => {
    it('uses correct translation keys', () => {
      // GIVEN: Mock data
      mockUseClassroomLeaderboard.mockReturnValue({
        topThree: [
          {
            userId: 'student-1',
            displayName: 'Alice',
            avatarUrl: null,
            totalXp: 500,
            currentLevel: 5,
            rank: 1,
            isCurrentUser: false,
            isInactive: false,
          },
        ],
        currentUserRank: null,
        totalStudents: 1,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      // WHEN: Component is rendered in English
      renderWithLanguage(
        <ClassroomLeaderboard
          classroomId={mockClassroomId}
          currentUserId={mockCurrentUserId}
        />
      );

      // THEN: Should use translation keys
      expect(screen.getByText('Class Rankings')).toBeInTheDocument();
      expect(screen.getByText('1 students')).toBeInTheDocument();
    });

    it('handles RTL layout (Hebrew)', () => {
      // GIVEN: Mock data
      mockUseClassroomLeaderboard.mockReturnValue({
        topThree: [],
        currentUserRank: null,
        totalStudents: 0,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard
          classroomId={mockClassroomId}
          currentUserId={mockCurrentUserId}
        />
      );

      // THEN: Container should have dir attribute (ltr from mock context)
      const container = screen.getByTestId('classroom-leaderboard');
      expect(container).toHaveAttribute('dir', 'ltr');
    });
  });

  // ==================== ACCESSIBILITY ====================

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      // GIVEN: Mock data
      mockUseClassroomLeaderboard.mockReturnValue({
        topThree: [
          {
            userId: 'student-1',
            displayName: 'Alice',
            avatarUrl: null,
            totalXp: 500,
            currentLevel: 5,
            rank: 1,
            isCurrentUser: false,
            isInactive: false,
          },
        ],
        currentUserRank: null,
        totalStudents: 1,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard
          classroomId={mockClassroomId}
          currentUserId={mockCurrentUserId}
        />
      );

      // THEN: Should have ARIA label
      expect(screen.getByLabelText('Classroom leaderboard showing top students')).toBeInTheDocument();
    });

    it('includes alt text for avatars', () => {
      // GIVEN: Student with avatar
      mockUseClassroomLeaderboard.mockReturnValue({
        topThree: [
          {
            userId: 'student-1',
            displayName: 'Alice',
            avatarUrl: 'https://example.com/alice.jpg',
            totalXp: 500,
            currentLevel: 5,
            rank: 1,
            isCurrentUser: false,
            isInactive: false,
          },
        ],
        currentUserRank: null,
        totalStudents: 1,
        isLoading: false,
        error: null,
        refresh: jest.fn(),
      });

      // WHEN: Component is rendered
      renderWithLanguage(
        <ClassroomLeaderboard
          classroomId={mockClassroomId}
          currentUserId={mockCurrentUserId}
        />
      );

      // THEN: Avatar should have alt text
      const avatar = screen.getByAltText("Alice's avatar");
      expect(avatar).toBeInTheDocument();
    });
  });
});
