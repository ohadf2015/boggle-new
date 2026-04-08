/**
 * Tests for BoardGallery component
 * TDD: RED phase
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BoardGallery from '../BoardGallery';

vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <div {...props}>{children}</div>,
  },
  AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    language: 'en',
  }),
}));

vi.mock('@/components/Avatar', () => {
  const MockAvatar = () => <div data-testid="avatar" />;
  MockAvatar.displayName = 'Avatar';
  return { default: MockAvatar };
});

vi.mock('../BoardCard', () => {
  const MockBoardCard = ({ board, onPlay }: { board: { board_code: string; title: string }; onPlay?: (code: string) => void }) => (
    <div data-testid={`board-card-${board.board_code}`}>
      <span>{board.title}</span>
      <button onClick={() => onPlay?.(board.board_code)}>ugc.gallery.play</button>
    </div>
  );
  MockBoardCard.displayName = 'BoardCard';
  return { default: MockBoardCard };
});

const mockBoards = [
  {
    board_code: 'AAA1',
    title: 'Board One',
    difficulty: 'EASY' as const,
    grid: [['A', 'B'], ['C', 'D']],
    grid_size: 2,
    play_count: 10,
    rating_sum: 20,
    rating_count: 5,
    featured: true,
    creator_display_name: 'Alice',
    creator_avatar: null,

  },
  {
    board_code: 'BBB2',
    title: 'Board Two',
    difficulty: 'HARD' as const,
    grid: [['X', 'Y'], ['Z', 'W']],
    grid_size: 2,
    play_count: 99,
    rating_sum: 45,
    rating_count: 9,
    featured: false,
    creator_display_name: 'Bob',
    creator_avatar: null,

  },
];

// Mock fetch
const mockFetch = vi.fn();

function buildFetchResponse(boards: typeof mockBoards, total = boards.length) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ boards, total, page: 1, hasMore: false }),
  } as Response);
}

describe('BoardGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReturnValue(buildFetchResponse(mockBoards));
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders sort and filter toolbar', async () => {
    render(<BoardGallery />);
    // Gallery no longer renders its own hero title (parent page owns it)
    // It should render the sort tabs and difficulty filters
    expect(screen.getByText('ugc.gallery.sort.featured')).toBeInTheDocument();
    expect(screen.getByText('ugc.difficulty.easy')).toBeInTheDocument();
  });

  it('renders sort tabs: Featured, Popular, Newest, Top Rated', async () => {
    render(<BoardGallery />);
    expect(screen.getByText('ugc.gallery.sort.featured')).toBeInTheDocument();
    expect(screen.getByText('ugc.gallery.sort.popular')).toBeInTheDocument();
    expect(screen.getByText('ugc.gallery.sort.newest')).toBeInTheDocument();
    expect(screen.getByText('ugc.gallery.sort.topRated')).toBeInTheDocument();
  });

  it('renders difficulty filter chips', async () => {
    render(<BoardGallery />);
    expect(screen.getByText('ugc.difficulty.easy')).toBeInTheDocument();
    expect(screen.getByText('ugc.difficulty.medium')).toBeInTheDocument();
    expect(screen.getByText('ugc.difficulty.hard')).toBeInTheDocument();
  });

  it('renders board cards after data loads', async () => {
    render(<BoardGallery />);
    await waitFor(() => {
      expect(screen.getByTestId('board-card-AAA1')).toBeInTheDocument();
      expect(screen.getByTestId('board-card-BBB2')).toBeInTheDocument();
    });
  });

  it('calls fetch with featured sort by default', async () => {
    render(<BoardGallery />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sort=featured'),
        expect.anything()
      );
    });
  });

  it('re-fetches when sort tab changes', async () => {
    render(<BoardGallery />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    mockFetch.mockReturnValue(buildFetchResponse([]));
    fireEvent.click(screen.getByText('ugc.gallery.sort.popular'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('sort=popular'),
        expect.anything()
      );
    });
  });

  it('re-fetches when difficulty filter is toggled', async () => {
    render(<BoardGallery />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    mockFetch.mockReturnValue(buildFetchResponse([]));
    fireEvent.click(screen.getByText('ugc.difficulty.easy'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('difficulty=EASY'),
        expect.anything()
      );
    });
  });

  it('shows empty state when no boards returned', async () => {
    mockFetch.mockReturnValue(buildFetchResponse([]));
    render(<BoardGallery />);
    await waitFor(() => {
      expect(screen.getByText('ugc.gallery.empty')).toBeInTheDocument();
    });
  });

  it('shows load more button when hasMore is true', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ boards: mockBoards, total: 50, page: 1, hasMore: true }),
      } as Response)
    );
    render(<BoardGallery />);
    await waitFor(() => {
      expect(screen.getByText('ugc.gallery.loadMore')).toBeInTheDocument();
    });
  });

  it('does not show load more button when hasMore is false', async () => {
    render(<BoardGallery />);
    await waitFor(() => {
      expect(screen.queryByText('ugc.gallery.loadMore')).not.toBeInTheDocument();
    });
  });

  it('fetches next page when load more is clicked', async () => {
    mockFetch.mockReturnValue(
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ boards: mockBoards, total: 50, page: 1, hasMore: true }),
      } as Response)
    );
    render(<BoardGallery />);
    await waitFor(() => expect(screen.getByText('ugc.gallery.loadMore')).toBeInTheDocument());

    mockFetch.mockReturnValue(buildFetchResponse([], 50));
    fireEvent.click(screen.getByText('ugc.gallery.loadMore'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('page=2'),
        expect.anything()
      );
    });
  });
});
