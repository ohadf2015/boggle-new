/**
 * Tests for WordPackCard component
 * TDD: RED phase
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WordPackCard from '../WordPackCard';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    language: 'en',
  }),
}));

jest.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: ({ size }: { size?: string }) => <div data-testid="avatar" data-size={size} />,
}));

const basePack = {
  id: 'pack-1',
  name: 'Animal Kingdom',
  description: 'All about animals',
  theme_emoji: '🦁',
  word_count: 25,
  play_count: 150,
  upvote_count: 42,
  tags: ['Animals', 'Nature'],
  creator_display_name: 'WordMaster',
  creator_avatar: null,
};

describe('WordPackCard', () => {
  it('renders pack name', () => {
    render(<WordPackCard pack={basePack} />);
    expect(screen.getByText('Animal Kingdom')).toBeInTheDocument();
  });

  it('renders theme emoji', () => {
    render(<WordPackCard pack={basePack} />);
    expect(screen.getByText('🦁')).toBeInTheDocument();
  });

  it('renders pack description', () => {
    render(<WordPackCard pack={basePack} />);
    expect(screen.getByText('All about animals')).toBeInTheDocument();
  });

  it('renders creator display name', () => {
    render(<WordPackCard pack={basePack} />);
    expect(screen.getByText('WordMaster')).toBeInTheDocument();
  });

  it('renders word count', () => {
    render(<WordPackCard pack={basePack} />);
    expect(screen.getByText(/25/)).toBeInTheDocument();
  });

  it('renders play count', () => {
    render(<WordPackCard pack={basePack} />);
    expect(screen.getByText(/150/)).toBeInTheDocument();
  });

  it('renders upvote count', () => {
    render(<WordPackCard pack={basePack} />);
    expect(screen.getByText(/42/)).toBeInTheDocument();
  });

  it('renders tag chips', () => {
    render(<WordPackCard pack={basePack} />);
    expect(screen.getByText('Animals')).toBeInTheDocument();
    expect(screen.getByText('Nature')).toBeInTheDocument();
  });

  it('renders avatar', () => {
    render(<WordPackCard pack={basePack} />);
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });

  it('calls onPlay with packId when Play button clicked', async () => {
    const onPlay = jest.fn();
    const user = userEvent.setup();
    render(<WordPackCard pack={basePack} onPlay={onPlay} />);
    const playBtn = screen.getByText('ugc.pack.card.play');
    await user.click(playBtn);
    expect(onPlay).toHaveBeenCalledWith('pack-1');
  });

  it('calls onUpvote with packId when Upvote button clicked', async () => {
    const onUpvote = jest.fn();
    const user = userEvent.setup();
    render(<WordPackCard pack={basePack} onUpvote={onUpvote} />);
    const upvoteBtn = screen.getByRole('button', { name: /42/i });
    await user.click(upvoteBtn);
    expect(onUpvote).toHaveBeenCalledWith('pack-1');
  });

  it('upvote button has active styling when isUpvoted is true', () => {
    render(<WordPackCard pack={basePack} isUpvoted={true} />);
    const upvoteBtn = screen.getByRole('button', { name: /42/i });
    expect(upvoteBtn.className).toMatch(/neo-pink|upvoted/);
  });

  it('renders without description gracefully', () => {
    const packNoDesc = { ...basePack, description: null };
    expect(() => render(<WordPackCard pack={packNoDesc} />)).not.toThrow();
  });

  it('renders without tags gracefully', () => {
    const packNoTags = { ...basePack, tags: null };
    expect(() => render(<WordPackCard pack={packNoTags} />)).not.toThrow();
  });

  it('renders without emoji gracefully', () => {
    const packNoEmoji = { ...basePack, theme_emoji: null };
    render(<WordPackCard pack={packNoEmoji} />);
    expect(screen.getByText('Animal Kingdom')).toBeInTheDocument();
  });
});
