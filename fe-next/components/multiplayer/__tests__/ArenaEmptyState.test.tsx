import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

const tMock = vi.fn((key: string) => key);
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: tMock, dir: 'ltr', language: 'en' }),
}));

vi.mock('next/image', () => ({
  default: function MockImage({ alt, src, ...rest }: { alt?: string; src?: string } & Record<string, unknown>) {
    // Strip non-DOM props to avoid React warnings
    const { fill, priority, ...domRest } = rest as Record<string, unknown>;
    void fill; void priority;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt ?? ''} src={src} {...(domRest as Record<string, unknown>)} />;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) =>
    children,
}));

import ArenaEmptyState from '../ArenaEmptyState';

describe('ArenaEmptyState with action CTAs', () => {
  beforeEach(() => {
    tMock.mockClear();
  });
  afterEach(() => {
    cleanup();
  });

  it('renders the spectating mascot, headline, subhead with new keys', () => {
    const { container } = render(<ArenaEmptyState onQuickPlay={vi.fn()} />);
    expect(screen.getByTestId('arena-empty-state')).toBeInTheDocument();
    expect(screen.getByText('mp.noRoomsYet')).toBeInTheDocument();
    expect(screen.getByText('mp.emptyStateCaption')).toBeInTheDocument();
    const mascot = container.querySelector('img');
    expect(mascot).toHaveAttribute('src', '/mascot/spectating.webp');
  });

  it('renders Quick Play and Daily Challenge action CTAs', () => {
    render(<ArenaEmptyState onQuickPlay={vi.fn()} />);
    expect(screen.getByText('mp.quickPlayAction')).toBeInTheDocument();
    expect(screen.getByText('mp.dailyChallengeAction')).toBeInTheDocument();
  });

  it('calls onQuickPlay callback when Quick Play button clicked', () => {
    const mockQuickPlay = vi.fn();
    const { getByText } = render(<ArenaEmptyState onQuickPlay={mockQuickPlay} />);

    const quickPlayButton = getByText('mp.quickPlayAction').closest('button');
    quickPlayButton?.click();

    expect(mockQuickPlay).toHaveBeenCalled();
  });

  it('disables Quick Play button during loading', () => {
    render(<ArenaEmptyState onQuickPlay={vi.fn()} isQuickPlayLoading={true} />);
    const button = screen.getByText('common.starting').closest('button');
    expect(button).toBeDisabled();
  });

  it('does NOT render mode-teaser chips (decluttered)', () => {
    render(<ArenaEmptyState onQuickPlay={vi.fn()} />);
    expect(screen.queryByText('multiplayerFlow.roomList.gameModes.classic')).toBeNull();
    expect(screen.queryByText('multiplayerFlow.roomList.gameModes.blast')).toBeNull();
    expect(screen.queryByText('multiplayerFlow.roomList.gameModes.wordHunt')).toBeNull();
    expect(screen.queryByText('multiplayerFlow.roomList.gameModes.wheelRush')).toBeNull();
  });

  it('mascot image is decorative (empty alt)', () => {
    const { container } = render(<ArenaEmptyState onQuickPlay={vi.fn()} />);
    const mascot = container.querySelector('img');
    expect(mascot).toHaveAttribute('alt', '');
    expect(screen.queryByRole('img')).toBeNull();
  });
});
