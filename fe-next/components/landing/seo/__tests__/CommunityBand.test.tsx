// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => <div data-testid="mascot" data-variant={variant} />,
}));

import { CommunityBand } from '../CommunityBand';

const stats = [
  { value: '40+', label: 'Countries' },
  { value: '5', label: 'Languages' },
  { value: '∞', label: 'Words to Find' },
];

describe('CommunityBand', () => {
  it('renders heading, body, and every stat', () => {
    render(
      <CommunityBand
        heading="Join thousands"
        body="Players span 40+ countries."
        stats={stats}
        ctaLabel="Play free now"
        ctaHref="/en"
        instagramHandle="@lexi.clash"
      />
    );
    expect(screen.getByRole('heading', { name: /join thousands/i })).toBeInTheDocument();
    expect(screen.getByText(/players span 40\+ countries/i)).toBeInTheDocument();
    for (const s of stats) {
      expect(screen.getByText(s.value)).toBeInTheDocument();
      expect(screen.getByText(s.label)).toBeInTheDocument();
    }
  });

  it('renders a play CTA link to the locale home', () => {
    render(
      <CommunityBand heading="x" body="y" stats={stats} ctaLabel="Play free now" ctaHref="/he" instagramHandle="@lexi.clash" />
    );
    const cta = screen.getByRole('link', { name: /play free now/i });
    expect(cta).toHaveAttribute('href', '/he');
  });

  it('renders the instagram handle', () => {
    render(
      <CommunityBand heading="x" body="y" stats={stats} ctaLabel="z" ctaHref="/en" instagramHandle="@lexi.clash" />
    );
    expect(screen.getByText('@lexi.clash')).toBeInTheDocument();
  });
});
