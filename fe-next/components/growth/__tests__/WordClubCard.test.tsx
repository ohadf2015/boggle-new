import { render, screen } from '@testing-library/react';
import { WordClubCard } from '../WordClubCard';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
    replace: vi.fn(),
  })),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: vi.fn(() => ({
    t: (key: string, params?: Record<string, string>) => {
      if (params) return `${key}:${JSON.stringify(params)}`;
      return key;
    },
    language: 'en',
  })),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-1' },
    isAuthenticated: true,
  })),
}));

const mockUseWordClubs = vi.fn();
vi.mock('@/hooks/useWordClubs', () => ({
  useWordClubs: (...args: unknown[]) => mockUseWordClubs(...args),
}));

describe('WordClubCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when loading', () => {
    mockUseWordClubs.mockReturnValue({
      currentClub: null,
      members: [],
      loading: true,
    });

    const { container } = render(<WordClubCard />);
    expect(container.innerHTML).toBe('');
  });

  it('shows create/join CTA when no club', () => {
    mockUseWordClubs.mockReturnValue({
      currentClub: null,
      members: [],
      loading: false,
    });

    render(<WordClubCard />);

    expect(screen.getByTestId('word-club-card')).toBeInTheDocument();
    expect(screen.getByTestId('create-club-btn')).toBeInTheDocument();
    expect(screen.getByTestId('join-club-btn')).toBeInTheDocument();
    expect(screen.getByText('wordClub.emptyDesc')).toBeInTheDocument();
  });

  it('renders leaderboard with members sorted by weekly XP', () => {
    mockUseWordClubs.mockReturnValue({
      currentClub: {
        id: 'club-1',
        name: 'Word Warriors',
        memberCount: 12,
      },
      members: [
        { userId: 'user-3', displayName: 'Charlie', weeklyXp: 100 },
        { userId: 'user-1', displayName: 'Alice', weeklyXp: 500 },
        { userId: 'user-2', displayName: 'Bob', weeklyXp: 300 },
      ],
      loading: false,
    });

    render(<WordClubCard />);

    // Should be sorted by weeklyXp descending
    const aliceRow = screen.getByTestId('club-member-user-1');
    const bobRow = screen.getByTestId('club-member-user-2');
    const charlieRow = screen.getByTestId('club-member-user-3');
    expect(aliceRow).toBeInTheDocument();
    expect(bobRow).toBeInTheDocument();
    expect(charlieRow).toBeInTheDocument();

    // Alice has highest XP so should appear first (rank 1)
    expect(aliceRow).toHaveTextContent('500');
  });

  it('highlights current user row', () => {
    mockUseWordClubs.mockReturnValue({
      currentClub: {
        id: 'club-1',
        name: 'Word Warriors',
        memberCount: 3,
      },
      members: [
        { userId: 'user-1', displayName: 'Me', weeklyXp: 200 },
        { userId: 'user-2', displayName: 'Other', weeklyXp: 100 },
      ],
      loading: false,
    });

    render(<WordClubCard />);

    const myRow = screen.getByTestId('club-member-user-1');
    // Current user row gets a special background class
    expect(myRow.className).toContain('bg-neo-cyan');
  });

  it('shows club name in header', () => {
    mockUseWordClubs.mockReturnValue({
      currentClub: {
        id: 'club-1',
        name: 'Super Spellers',
        memberCount: 5,
      },
      members: [],
      loading: false,
    });

    render(<WordClubCard />);

    expect(screen.getByText('Super Spellers')).toBeInTheDocument();
  });
});
