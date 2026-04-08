/**
 * CreatorLeaderboard — TDD tests (RED phase first)
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';


const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

// Mock dependencies before importing component
vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  },
  AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'ugc.creator.leaderboard.title': 'Top Creators',
        'ugc.creator.leaderboard.spotlight': 'Creator of the Month',
        'ugc.creator.leaderboard.boards': 'Boards',
        'ugc.creator.leaderboard.plays': 'Plays',
        'ugc.creator.leaderboard.rating': 'Rating',
        'ugc.creator.leaderboard.empty': 'No creators yet',
        'ugc.creator.leaderboard.rank': 'Rank',
        'ugc.creator.leaderboard.creator': 'Creator',
        'common.loading': 'Loading...',
      };
      return map[key] ?? key;
    },
    language: 'en',
  }),
}));

vi.mock('@/components/Avatar', () => {
  const AvatarMock = ({ size }: { size?: string }) => (
    <div data-testid="avatar" data-size={size} />
  );
  AvatarMock.displayName = 'Avatar';
  return { default: AvatarMock };
});

// Mock fetch
const mockFetch = vi.fn();

const MOCK_CREATORS = [
  {
    creator_id: 'user-1',
    display_name: 'WordWizard',

    avatar_config: null,
    boards_created: 12,
    total_plays: 3400,
    avg_rating: 4.8,
  },
  {
    creator_id: 'user-2',
    display_name: 'PuzzlePro',

    avatar_config: null,
    boards_created: 7,
    total_plays: 1200,
    avg_rating: 4.2,
  },
  {
    creator_id: 'user-3',
    display_name: 'GridGuru',

    avatar_config: null,
    boards_created: 5,
    total_plays: 800,
    avg_rating: 3.9,
  },
];

// Import AFTER mocks
import CreatorLeaderboard from '../CreatorLeaderboard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('CreatorLeaderboard', () => {
  beforeEach(() => {
    global.fetch = mockFetch;
    vi.clearAllMocks();
  });

  it('renders Top Creators heading', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ creators: MOCK_CREATORS }),
    });

    render(<CreatorLeaderboard />, { wrapper: createWrapper() });

    expect(screen.getByText('Top Creators')).toBeInTheDocument();
  });

  it('shows loading skeleton initially', () => {
    // Never resolves during this test
    mockFetch.mockReturnValueOnce(new Promise(() => {}));

    const { container } = render(<CreatorLeaderboard />, { wrapper: createWrapper() });

    // Loading state renders skeleton pulse divs instead of text
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders creator rows with rank, name, boards, plays, rating', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ creators: MOCK_CREATORS }),
    });

    render(<CreatorLeaderboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      // WordWizard appears in spotlight + table row
      expect(screen.getAllByText('WordWizard').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('PuzzlePro')).toBeInTheDocument();
    expect(screen.getByText('GridGuru')).toBeInTheDocument();

    // Rank indicators — top 3 use emoji medals (👑 appears in spotlight + row)
    expect(screen.getAllByText('👑').length).toBeGreaterThan(0);
    expect(screen.getByText('🥈')).toBeInTheDocument();
    expect(screen.getByText('🥉')).toBeInTheDocument();

    // Stats — values may appear in spotlight + table rows
    expect(screen.getAllByText('3,400').length).toBeGreaterThan(0); // total_plays formatted
    expect(screen.getAllByText('12').length).toBeGreaterThan(0);    // boards_created
    expect(screen.getAllByText('4.8').length).toBeGreaterThan(0);   // avg_rating
  });

  it('shows Creator of the Month spotlight for #1', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ creators: MOCK_CREATORS }),
    });

    render(<CreatorLeaderboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Creator of the Month')).toBeInTheDocument();
    });

    // Spotlight should show the #1 creator's name
    const spotlightSection = screen.getByTestId('creator-spotlight');
    expect(spotlightSection).toHaveTextContent('WordWizard');
  });

  it('handles empty state', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ creators: [] }),
    });

    render(<CreatorLeaderboard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No creators yet')).toBeInTheDocument();
    });
  });
});
