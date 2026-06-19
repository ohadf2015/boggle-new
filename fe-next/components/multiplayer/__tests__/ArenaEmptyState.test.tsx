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

import ArenaEmptyState from '../ArenaEmptyState';

describe('ArenaEmptyState (focused / decluttered)', () => {
  beforeEach(() => {
    tMock.mockClear();
  });
  afterEach(() => {
    cleanup();
  });

  it('renders the spectating mascot, headline, subhead', () => {
    const { container } = render(<ArenaEmptyState />);
    expect(screen.getByTestId('arena-empty-state')).toBeInTheDocument();
    expect(screen.getByText('multiplayerFlow.roomList.noRoomsYet')).toBeInTheDocument();
    expect(screen.getByText('multiplayerFlow.roomList.beTheLegend')).toBeInTheDocument();
    const mascot = container.querySelector('img');
    expect(mascot).toHaveAttribute('src', '/mascot/spectating.webp');
  });

  it('does NOT render mode-teaser chips (decluttered — CTAStrip owns actions)', () => {
    render(<ArenaEmptyState />);
    expect(screen.queryByText('multiplayerFlow.roomList.gameModes.classic')).toBeNull();
    expect(screen.queryByText('multiplayerFlow.roomList.gameModes.blast')).toBeNull();
    expect(screen.queryByText('multiplayerFlow.roomList.gameModes.wordHunt')).toBeNull();
    expect(screen.queryByText('multiplayerFlow.roomList.gameModes.wheelRush')).toBeNull();
  });

  it('does NOT render its own Quick Start CTA (the CTA strip is the single source of action)', () => {
    render(<ArenaEmptyState />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('mascot has no hard offset-box shadow (opaque webp + hard shadow = visible square; must blend into the navy pane)', () => {
    const { container } = render(<ArenaEmptyState />);
    const mascot = container.querySelector('img');
    // The spectating.webp has a baked-in opaque navy square; a hard pixel
    // drop-shadow casts off its rectangle edge -> ugly offset border. Forbid it.
    expect(mascot?.className).not.toMatch(/drop-shadow-\[\d+px_\d+px_0/);
  });

  it('mascot image is decorative (empty alt -> presentation, screen readers skip)', () => {
    const { container } = render(<ArenaEmptyState />);
    const mascot = container.querySelector('img');
    expect(mascot).toHaveAttribute('alt', '');
    // Empty alt strips the implicit `img` role → not queryable as role=img.
    // Meaning is carried by the adjacent h3.
    expect(screen.queryByRole('img')).toBeNull();
  });
});
