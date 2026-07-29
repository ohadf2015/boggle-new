import { render, screen } from '@testing-library/react';
import ActivityFeed from './ActivityFeed';
import { useClassroomActivity } from '@/hooks/useClassroomActivity';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

// Mock dependencies
vi.mock('@/hooks/useClassroomActivity');
vi.mock('@/contexts/LanguageContext');
vi.mock('@/contexts/AuthContext');

// Mock Framer Motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
}));

describe('ActivityFeed', () => {
  const mockUseLanguage = {
    t: (key: string) => key,
    language: 'en',
  };

  const mockUseAuth = {
    user: { id: 'user-1' },
    isAuthenticated: true,
    loading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useLanguage as jest.Mock).mockReturnValue(mockUseLanguage);
    (useAuth as jest.Mock).mockReturnValue(mockUseAuth);
  });

  it('renders loading skeleton when isLoading', () => {
    (useClassroomActivity as jest.Mock).mockReturnValue({
      activities: [],
      isLoading: true,
      error: null,
    });

    render(<ActivityFeed classroomId="classroom-123" userId="user-1" />);

    // Should have pulsing skeleton rows
    const skeletons = screen.getAllByTestId('activity-skeleton-row');
    expect(skeletons).toHaveLength(3);
  });

  it('renders empty state when no activities', () => {
    (useClassroomActivity as jest.Mock).mockReturnValue({
      activities: [],
      isLoading: false,
      error: null,
    });

    render(<ActivityFeed classroomId="classroom-123" userId="user-1" />);

    expect(screen.getByText('student.dashboard.activity.noActivity')).toBeInTheDocument();
  });

  it('renders activity items with correct icons', () => {
    const now = new Date();
    const activities = [
      {
        id: 'act-1',
        type: 'duel_completed' as const,
        actorId: 'student-1',
        actorName: 'Alice',
        actorAvatar: '🎮',
        timestamp: now,
        metadata: {},
      },
      {
        id: 'act-2',
        type: 'achievement_unlocked' as const,
        actorId: 'student-2',
        actorName: 'Bob',
        actorAvatar: '🎯',
        timestamp: new Date(now.getTime() - 60 * 60 * 1000),
        metadata: { achievementKey: 'word_master' },
      },
    ];

    (useClassroomActivity as jest.Mock).mockReturnValue({
      activities,
      isLoading: false,
      error: null,
    });

    render(<ActivityFeed classroomId="classroom-123" userId="user-1" />);

    // Should render both activities
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    // Trophy icon for duel (via test-id or aria-label)
    expect(screen.getByTestId('activity-icon-duel_completed')).toBeInTheDocument();

    // Award icon for achievement
    expect(screen.getByTestId('activity-icon-achievement_unlocked')).toBeInTheDocument();
  });

  it('highlights current user activities', () => {
    const now = new Date();
    const activities = [
      {
        id: 'act-1',
        type: 'duel_completed' as const,
        actorId: 'user-1', // Current user
        actorName: 'You',
        actorAvatar: '🎮',
        timestamp: now,
        metadata: {},
      },
      {
        id: 'act-2',
        type: 'achievement_unlocked' as const,
        actorId: 'student-2', // Other user
        actorName: 'Bob',
        actorAvatar: '🎯',
        timestamp: new Date(now.getTime() - 60 * 60 * 1000),
        metadata: {},
      },
    ];

    (useClassroomActivity as jest.Mock).mockReturnValue({
      activities,
      isLoading: false,
      error: null,
    });

    const { container } = render(<ActivityFeed classroomId="classroom-123" userId="user-1" />);

    // First activity (current user) should have highlight class
    const activityItems = container.querySelectorAll('[data-testid^="activity-item-"]');
    expect(activityItems[0]).toHaveClass('border-neo-cyan');

    // Second activity (other user) should NOT have highlight class
    expect(activityItems[1]).not.toHaveClass('border-neo-cyan');
  });

  it('renders with RTL layout when language is Hebrew', () => {
    (useLanguage as jest.Mock).mockReturnValue({
      t: (key: string) => key,
      language: 'he',
    });

    (useClassroomActivity as jest.Mock).mockReturnValue({
      activities: [],
      isLoading: false,
      error: null,
    });

    const { container } = render(<ActivityFeed classroomId="classroom-123" userId="user-1" />);

    // Container should have rtl class
    expect(container.firstChild).toHaveClass('rtl');
  });
});
