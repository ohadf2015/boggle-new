/**
 * Tests for BoardCard component
 * TDD: RED phase
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BoardCard from '../BoardCard';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    language: 'en',
  }),
}));

jest.mock('@/components/Avatar', () => {
  const MockAvatar = () => (
    <div data-testid="avatar" />
  );
  MockAvatar.displayName = 'Avatar';
  return MockAvatar;
});

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

describe('BoardCard', () => {
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
    // rating_sum / rating_count = 38 / 10 = 3.8
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
    expect(screen.getByText('1500')).toBeInTheDocument();
  });

  it('shows Improve button text when personalBest is provided', () => {
    render(<BoardCard board={defaultBoard} personalBest={1500} />);
    expect(screen.getByText('ugc.gallery.improve')).toBeInTheDocument();
  });

  it('calls onPlay callback when play button is clicked', () => {
    const onPlay = jest.fn();
    render(<BoardCard board={defaultBoard} onPlay={onPlay} />);
    fireEvent.click(screen.getByText('ugc.gallery.play'));
    expect(onPlay).toHaveBeenCalledWith('ABC123');
  });

  it('shows zero rating when rating_count is zero', () => {
    render(<BoardCard board={{ ...defaultBoard, rating_count: 0, rating_sum: 0 }} />);
    expect(screen.getByText('ugc.gallery.noRating')).toBeInTheDocument();
  });
});
