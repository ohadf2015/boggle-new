/**
 * Tests for BoardCard component (default + compact variants)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BoardCard from '../BoardCard';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    language: 'en',
  }),
}));

vi.mock('@/components/Avatar', () => {
  const MockAvatar = () => (
    <div data-testid="avatar" />
  );
  MockAvatar.displayName = 'Avatar';
  return { default: MockAvatar };
});

vi.mock('@/utils/share', () => ({
  shareBoard: vi.fn(),
}));

const defaultBoard = {
  board_code: 'ABC123',
  title: 'My Awesome Board',
  difficulty: 'MEDIUM' as const,
  grid: [
    ['A', 'B', 'C'],
    ['D', 'E', 'F'],
    ['G', 'H', 'I'],
  ],
  grid_size: 3,
  play_count: 42,
  rating_sum: 38,
  rating_count: 10,
  featured: false,
  creator_display_name: 'TestUser',
  creator_avatar: null,
};

describe('BoardCard (default variant)', () => {
  it('renders board title', () => {
    render(<BoardCard board={defaultBoard} />);
    expect(screen.getByText('My Awesome Board')).toBeInTheDocument();
  });

  it('shows creator attribution with display name', () => {
    render(<BoardCard board={defaultBoard} />);
    expect(screen.getByText(/TestUser/)).toBeInTheDocument();
  });

  it('shows creator avatar', () => {
    render(<BoardCard board={defaultBoard} />);
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });

  it('shows difficulty badge for EASY', () => {
    render(<BoardCard board={{ ...defaultBoard, difficulty: 'EASY' }} />);
    expect(screen.getByText('ugc.difficulty.easy')).toBeInTheDocument();
  });

  it('shows difficulty badge for MEDIUM', () => {
    render(<BoardCard board={defaultBoard} />);
    expect(screen.getByText('ugc.difficulty.medium')).toBeInTheDocument();
  });

  it('shows difficulty badge for HARD', () => {
    render(<BoardCard board={{ ...defaultBoard, difficulty: 'HARD' }} />);
    expect(screen.getByText('ugc.difficulty.hard')).toBeInTheDocument();
  });

  it('shows play count', () => {
    render(<BoardCard board={defaultBoard} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows average rating', () => {
    render(<BoardCard board={defaultBoard} />);
    expect(screen.getByText('3.8')).toBeInTheDocument();
  });

  it('shows Play CTA button', () => {
    render(<BoardCard board={defaultBoard} />);
    expect(screen.getByText('ugc.gallery.play')).toBeInTheDocument();
  });

  it('shows Staff Pick badge when featured is true', () => {
    render(<BoardCard board={{ ...defaultBoard, featured: true }} />);
    expect(screen.getByText('ugc.gallery.staffPick')).toBeInTheDocument();
  });

  it('does not show Staff Pick badge when featured is false', () => {
    render(<BoardCard board={defaultBoard} />);
    expect(screen.queryByText('ugc.gallery.staffPick')).not.toBeInTheDocument();
  });

  it('shows personal best score when provided', () => {
    render(<BoardCard board={defaultBoard} personalBest={1500} />);
    expect(screen.getByText(/1500/)).toBeInTheDocument();
  });

  it('shows Improve button text when personalBest is provided', () => {
    render(<BoardCard board={defaultBoard} personalBest={1500} />);
    expect(screen.getByText('ugc.gallery.improve')).toBeInTheDocument();
  });

  it('calls onPlay callback when play button is clicked', () => {
    const onPlay = vi.fn();
    render(<BoardCard board={defaultBoard} onPlay={onPlay} />);
    fireEvent.click(screen.getByText('ugc.gallery.play'));
    expect(onPlay).toHaveBeenCalledWith('ABC123');
  });

  it('shows no rating text when rating_count is zero', () => {
    render(<BoardCard board={{ ...defaultBoard, rating_count: 0, rating_sum: 0 }} />);
    // When no ratings, star section just doesn't show (no avgRating)
    expect(screen.queryByText('3.8')).not.toBeInTheDocument();
  });

  it('renders difficulty accent strip', () => {
    const { container } = render(<BoardCard board={defaultBoard} />);
    const strip = container.querySelector('.h-1\\.5');
    expect(strip).toBeInTheDocument();
  });
});

describe('BoardCard (compact variant)', () => {
  it('renders board title in compact mode', () => {
    render(<BoardCard board={defaultBoard} variant="compact" />);
    expect(screen.getByText('My Awesome Board')).toBeInTheDocument();
  });

  it('renders as a button in compact mode', () => {
    render(<BoardCard board={defaultBoard} variant="compact" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onPlay when compact card is clicked', () => {
    const onPlay = vi.fn();
    render(<BoardCard board={defaultBoard} variant="compact" onPlay={onPlay} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onPlay).toHaveBeenCalledWith('ABC123');
  });

  it('shows difficulty badge in compact mode', () => {
    render(<BoardCard board={defaultBoard} variant="compact" />);
    expect(screen.getByText('ugc.difficulty.medium')).toBeInTheDocument();
  });

  it('shows play count in compact mode', () => {
    render(<BoardCard board={defaultBoard} variant="compact" />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('shows staff pick badge in compact mode when featured', () => {
    render(<BoardCard board={{ ...defaultBoard, featured: true }} variant="compact" />);
    expect(screen.getByText('ugc.gallery.staffPick')).toBeInTheDocument();
  });

  it('shows personal best in compact mode', () => {
    render(<BoardCard board={defaultBoard} variant="compact" personalBest={2000} />);
    expect(screen.getByText('2000')).toBeInTheDocument();
  });

  it('crops grid to 3x3 center in compact mode', () => {
    const largeBoard = {
      ...defaultBoard,
      grid: [
        ['A', 'B', 'C', 'D'],
        ['E', 'F', 'G', 'H'],
        ['I', 'J', 'K', 'L'],
        ['M', 'N', 'O', 'P'],
      ],
      grid_size: 4,
    };
    const { container } = render(<BoardCard board={largeBoard} variant="compact" />);
    // Should show 3x3 = 9 cells, not 4x4 = 16
    const cells = container.querySelectorAll('.w-5.h-5');
    expect(cells.length).toBe(9);
  });
});
