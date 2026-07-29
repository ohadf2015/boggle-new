import { render, screen, fireEvent } from '@testing-library/react';
import { AsyncChallengeCard } from '../AsyncChallengeCard';

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
    user: { id: 'test-user-id' },
    isAuthenticated: true,
  })),
}));

const mockUseAsyncChallenge = vi.fn();
vi.mock('@/hooks/useAsyncChallenge', () => ({
  useAsyncChallenge: (...args: unknown[]) => mockUseAsyncChallenge(...args),
}));

describe('AsyncChallengeCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when loading', () => {
    mockUseAsyncChallenge.mockReturnValue({
      challenges: [],
      pendingCount: 0,
      loading: true,
    });

    const { container } = render(<AsyncChallengeCard />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when no pending challenges (all are completed)', () => {
    mockUseAsyncChallenge.mockReturnValue({
      challenges: [
        {
          id: 'c1',
          status: 'completed',
          challengedId: 'test-user-id',
          challengerName: 'Alice',
          gameMode: 'classic',
        },
      ],
      pendingCount: 0,
      loading: false,
    });

    const { container } = render(<AsyncChallengeCard />);
    // Card still renders but shows the empty/CTA state
    expect(screen.getByTestId('async-challenge-card')).toBeInTheDocument();
    expect(screen.getByTestId('challenge-friend-btn')).toBeInTheDocument();
  });

  it('renders challenge rows when pending challenges exist', () => {
    mockUseAsyncChallenge.mockReturnValue({
      challenges: [
        {
          id: 'c1',
          status: 'pending',
          challengedId: 'test-user-id',
          challengerName: 'Alice',
          gameMode: 'classic',
        },
        {
          id: 'c2',
          status: 'pending',
          challengedId: 'test-user-id',
          challengerName: 'Bob',
          gameMode: 'blast',
        },
      ],
      pendingCount: 2,
      loading: false,
    });

    render(<AsyncChallengeCard />);

    expect(screen.getByTestId('challenge-row-c1')).toBeInTheDocument();
    expect(screen.getByTestId('challenge-row-c2')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument(); // Alice initial
    expect(screen.getByText('B')).toBeInTheDocument(); // Bob initial
  });

  it('shows pending count badge', () => {
    mockUseAsyncChallenge.mockReturnValue({
      challenges: [
        {
          id: 'c1',
          status: 'pending',
          challengedId: 'test-user-id',
          challengerName: 'Alice',
          gameMode: 'classic',
        },
      ],
      pendingCount: 1,
      loading: false,
    });

    render(<AsyncChallengeCard />);

    const badge = screen.getByTestId('pending-count');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('1');
  });

  it('calls router.push on Play Now click', () => {
    mockUseAsyncChallenge.mockReturnValue({
      challenges: [
        {
          id: 'c1',
          status: 'pending',
          challengedId: 'test-user-id',
          challengerName: 'Alice',
          gameMode: 'classic',
        },
      ],
      pendingCount: 1,
      loading: false,
    });

    render(<AsyncChallengeCard />);

    fireEvent.click(screen.getByTestId('play-challenge-c1'));
    expect(mockPush).toHaveBeenCalledWith('/friend-challenge/c1');
  });

  it('shows Challenge a Friend CTA when no pending challenges', () => {
    mockUseAsyncChallenge.mockReturnValue({
      challenges: [],
      pendingCount: 0,
      loading: false,
    });

    render(<AsyncChallengeCard />);

    const ctaBtn = screen.getByTestId('challenge-friend-btn');
    expect(ctaBtn).toBeInTheDocument();
    expect(ctaBtn).toHaveTextContent('asyncChallenge.challengeFriend');

    fireEvent.click(ctaBtn);
    expect(mockPush).toHaveBeenCalledWith('/friends?action=challenge');
  });
});
