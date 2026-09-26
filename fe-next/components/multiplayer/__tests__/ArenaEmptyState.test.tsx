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

/**
 * MP rebuild (DESIGN §b.1): the empty state is ONE mascot line — "No open
 * arenas — Quick Start fills the seats with bots" — and no buttons. The old
 * QUICK PLAY / DAILY CHALLENGE CTAs competed with the footer's QUICK START
 * (four lime/pink CTAs on one phone screen) and DAILY linked out of MP.
 */
describe('ArenaEmptyState (one mascot line, no buttons)', () => {
  beforeEach(() => {
    tMock.mockClear();
  });
  afterEach(() => {
    cleanup();
  });

  it('renders the spectating mascot, headline and the bots line', () => {
    const { container } = render(<ArenaEmptyState />);
    expect(screen.getByTestId('arena-empty-state')).toBeInTheDocument();
    expect(screen.getByText('mpUi.entry.emptyTitle')).toBeInTheDocument();
    expect(screen.getByText('mpUi.entry.emptyLine')).toBeInTheDocument();
    const mascot = container.querySelector('img');
    expect(mascot).toHaveAttribute('src', '/mascot/spectating.webp');
  });

  // With no open arena the mascot is the entry's LCP element (Next warned in
  // dev); a lazy image would start loading only after layout.
  it('loads the mascot eagerly — it is the LCP element of an empty entry', () => {
    const { container } = render(<ArenaEmptyState />);
    expect(container.querySelector('img')).toHaveAttribute('loading', 'eager');
  });

  it('renders no buttons or links (the footer owns QUICK START; nothing leaves MP)', () => {
    const { container } = render(<ArenaEmptyState />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(container.querySelector('a')).toBeNull();
    expect(screen.queryByText('mp.dailyChallengeAction')).toBeNull();
  });

  it('does NOT render mode-teaser chips (decluttered)', () => {
    render(<ArenaEmptyState />);
    expect(screen.queryByText('multiplayerFlow.roomList.gameModes.classic')).toBeNull();
    expect(screen.queryByText('multiplayerFlow.roomList.gameModes.blast')).toBeNull();
    expect(screen.queryByText('multiplayerFlow.roomList.gameModes.wordHunt')).toBeNull();
    expect(screen.queryByText('multiplayerFlow.roomList.gameModes.wheelRush')).toBeNull();
  });

  it('mascot image is decorative (empty alt)', () => {
    const { container } = render(<ArenaEmptyState />);
    const mascot = container.querySelector('img');
    expect(mascot).toHaveAttribute('alt', '');
    expect(screen.queryByRole('img')).toBeNull();
  });
});
