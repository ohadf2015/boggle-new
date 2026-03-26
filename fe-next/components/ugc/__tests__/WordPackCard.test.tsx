/**
 * Tests for WordPackCard component
 * TDD: RED phase
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WordPackCard from '../WordPackCard';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    language: 'en',
  }),
}));

vi.mock('@/components/Avatar', () => ({
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
    const onPlay = vi.fn();
    const user = userEvent.setup();
    render(<WordPackCard pack={basePack} onPlay={onPlay} />);
    const playBtn = screen.getByText('ugc.pack.card.play');
    await user.click(playBtn);
    expect(onPlay).toHaveBeenCalledWith('pack-1');
  });

  it('calls onUpvote with packId when Upvote button clicked', async () => {
    const onUpvote = vi.fn();
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

  it('renders accent strip at top', () => {
    const { container } = render(<WordPackCard pack={basePack} />);
    const strip = container.querySelector('.h-1\\.5');
    expect(strip).toBeInTheDocument();
  });

  it('shows filled thumbs up icon when upvoted', () => {
    const { container } = render(<WordPackCard pack={basePack} isUpvoted />);
    const thumbIcon = container.querySelector('.fill-white');
    expect(thumbIcon).toBeInTheDocument();
  });
});

describe('WordPackCard (compact variant)', () => {
  it('renders pack name in compact mode', () => {
    render(<WordPackCard pack={basePack} variant="compact" />);
    expect(screen.getByText('Animal Kingdom')).toBeInTheDocument();
  });

  it('renders as a button in compact mode', () => {
    render(<WordPackCard pack={basePack} variant="compact" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onPlay when compact card is clicked', async () => {
    const onPlay = vi.fn();
    const user = userEvent.setup();
    render(<WordPackCard pack={basePack} variant="compact" onPlay={onPlay} />);
    await user.click(screen.getByRole('button'));
    expect(onPlay).toHaveBeenCalledWith('pack-1');
  });

  it('shows word count in compact mode', () => {
    render(<WordPackCard pack={basePack} variant="compact" />);
    expect(screen.getByText(/25/)).toBeInTheDocument();
  });

  it('shows theme emoji in compact mode', () => {
    render(<WordPackCard pack={basePack} variant="compact" />);
    expect(screen.getByText('🦁')).toBeInTheDocument();
  });

  it('renders fallback icon when no emoji', () => {
    const packNoEmoji = { ...basePack, theme_emoji: null };
    const { container } = render(<WordPackCard pack={packNoEmoji} variant="compact" />);
    // Should show a Hash icon inside a pink container
    expect(container.querySelector('.text-neo-pink')).toBeInTheDocument();
  });
});
