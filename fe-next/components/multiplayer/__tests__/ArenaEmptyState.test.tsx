import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

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

vi.mock('@/components/ui/Loader', () => ({
  Loader: () => <span data-testid="loader" />,
}));

import ArenaEmptyState from '../ArenaEmptyState';

describe('ArenaEmptyState', () => {
  beforeEach(() => {
    tMock.mockClear();
  });
  afterEach(() => {
    cleanup();
  });

  it('renders mascot, headline, subhead', () => {
    const { container } = render(<ArenaEmptyState />);
    expect(screen.getByTestId('arena-empty-state')).toBeInTheDocument();
    expect(screen.getByText('multiplayerFlow.roomList.noRoomsYet')).toBeInTheDocument();
    expect(screen.getByText('multiplayerFlow.roomList.beTheLegend')).toBeInTheDocument();
    const mascot = container.querySelector('img');
    expect(mascot).toHaveAttribute('src', '/mascot/flexing.webp');
  });

  it('renders 4 mode teaser chips with localized labels', () => {
    render(<ArenaEmptyState />);
    expect(screen.getByText('multiplayerFlow.roomList.gameModes.classic')).toBeInTheDocument();
    expect(screen.getByText('multiplayerFlow.roomList.gameModes.blast')).toBeInTheDocument();
    expect(screen.getByText('multiplayerFlow.roomList.gameModes.wordHunt')).toBeInTheDocument();
    expect(screen.getByText('multiplayerFlow.roomList.gameModes.wheelRush')).toBeInTheDocument();
  });

  it('omits Quick Start CTA when onQuickPlay is undefined', () => {
    render(<ArenaEmptyState />);
    expect(screen.queryByRole('button', { name: 'multiplayerFlow.roomList.quickStart' })).toBeNull();
  });

  it('renders Quick Start CTA when onQuickPlay is provided and triggers it on click', () => {
    const onQuickPlay = vi.fn();
    render(<ArenaEmptyState onQuickPlay={onQuickPlay} />);
    const cta = screen.getByRole('button', { name: 'multiplayerFlow.roomList.quickStart' });
    fireEvent.click(cta);
    expect(onQuickPlay).toHaveBeenCalledTimes(1);
  });

  it('disables CTA and shows loader while quick-play is loading', () => {
    const onQuickPlay = vi.fn();
    render(<ArenaEmptyState onQuickPlay={onQuickPlay} isQuickPlayLoading />);
    const cta = screen.getByRole('button', { name: 'multiplayerFlow.roomList.quickStart' });
    expect(cta).toBeDisabled();
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('mascot image is decorative (empty alt -> presentation role, screen readers skip)', () => {
    const { container } = render(<ArenaEmptyState />);
    const mascot = container.querySelector('img');
    expect(mascot).toHaveAttribute('alt', '');
    // Empty alt strips the implicit `img` role → not queryable as role=img.
    // This is a11y-correct: meaning is carried by the adjacent h3.
    expect(screen.queryByRole('img')).toBeNull();
  });
});
