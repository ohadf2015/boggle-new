/**
 * Tests for UGCFeaturedStrip component
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { UGCFeaturedStrip } from '../UGCFeaturedStrip';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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

vi.mock('@/utils/share', () => ({
  shareBoard: vi.fn(),
}));

const mockBoards = [
  {
    board_code: 'B1',
    title: 'Board One',
    difficulty: 'EASY',
    grid: [['A', 'B'], ['C', 'D']],
    grid_size: 2,
    play_count: 10,
    rating_sum: 40,
    rating_count: 10,
    featured: true,
    creator_display_name: 'Creator1',
    creator_avatar: null,
  },
  {
    board_code: 'B2',
    title: 'Board Two',
    difficulty: 'HARD',
    grid: [['E', 'F'], ['G', 'H']],
    grid_size: 2,
    play_count: 5,
    rating_sum: 0,
    rating_count: 0,
    featured: false,
    creator_display_name: 'Creator2',
    creator_avatar: null,
  },
];

describe('UGCFeaturedStrip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no boards are fetched', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ boards: [] }),
    });

    const { container } = render(<UGCFeaturedStrip />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders boards when fetch succeeds', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ boards: mockBoards }),
    });

    render(<UGCFeaturedStrip />);
    await waitFor(() => {
      expect(screen.getByText('Board One')).toBeInTheDocument();
      expect(screen.getByText('Board Two')).toBeInTheDocument();
    });
  });

  it('shows section title', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ boards: mockBoards }),
    });

    render(<UGCFeaturedStrip titleKey="ugc.strip.title" />);
    await waitFor(() => {
      expect(screen.getByText('ugc.strip.title')).toBeInTheDocument();
    });
  });

  it('shows view all link by default', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ boards: mockBoards }),
    });

    render(<UGCFeaturedStrip />);
    await waitFor(() => {
      expect(screen.getByText('ugc.strip.viewAll')).toBeInTheDocument();
    });
  });

  it('hides view all link when showViewAll is false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ boards: mockBoards }),
    });

    render(<UGCFeaturedStrip showViewAll={false} />);
    await waitFor(() => {
      expect(screen.getByText('Board One')).toBeInTheDocument();
    });
    expect(screen.queryByText('ugc.strip.viewAll')).not.toBeInTheDocument();
  });

  it('shows create CTA when showCreateCTA is true', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ boards: mockBoards }),
    });

    render(<UGCFeaturedStrip showCreateCTA />);
    await waitFor(() => {
      expect(screen.getByText('ugc.strip.createOwn')).toBeInTheDocument();
    });
  });

  it('renders compact variant as vertical chips', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ boards: mockBoards }),
    });

    render(<UGCFeaturedStrip variant="compact" />);
    await waitFor(() => {
      // Compact cards render as buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('respects minToShow — hides when fewer boards than minimum', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ boards: [mockBoards[0]] }),
    });

    const { container } = render(<UGCFeaturedStrip minToShow={3} />);
    await waitFor(() => {
      // Should fetch and get 1 board but minToShow=3, so hidden
      expect(container.querySelector('section')).toBeNull();
    });
  });

  it('fetches with correct sort parameter', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ boards: [] }),
    });

    render(<UGCFeaturedStrip sort="popular" limit={5} />);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sort=popular')
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=5')
      );
    });
  });

  it('handles fetch failure gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { container } = render(<UGCFeaturedStrip />);
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });
});
