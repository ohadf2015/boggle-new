import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConnectionsHero from '../ConnectionsHero';
import { getConnectionsLandingCopy } from '@/app/[locale]/connections/content';

const sampleRevealed = vi.fn();
const ctaClick = vi.fn();

vi.mock('@/lib/connections/landingTelemetry', () => ({
  trackLandingSampleRevealed: (...args: unknown[]) => sampleRevealed(...args),
  trackLandingCtaClick: (...args: unknown[]) => ctaClick(...args),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, ...rest }: { children: React.ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...rest}>{children}</a>
  ),
}));

beforeEach(() => {
  sampleRevealed.mockClear();
  ctaClick.mockClear();
});

describe('ConnectionsHero', () => {
  it('renders H1 + both demo words', () => {
    const copy = getConnectionsLandingCopy('en');
    render(<ConnectionsHero locale="en" copy={copy} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText(copy.demo.puzzle.word1)).toBeInTheDocument();
    expect(screen.getByText(copy.demo.puzzle.word2)).toBeInTheDocument();
  });

  it('hides bridge word until middle slot tapped, then reveals + tracks', () => {
    const copy = getConnectionsLandingCopy('en');
    render(<ConnectionsHero locale="en" copy={copy} />);
    // Bridge button shows '???' initially
    expect(screen.getByRole('button', { name: /\?\?\?/ })).toBeInTheDocument();
    expect(screen.queryByText(copy.demo.puzzle.bridge)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /\?\?\?/ }));

    expect(screen.getByText(copy.demo.puzzle.bridge)).toBeInTheDocument();
    expect(sampleRevealed).toHaveBeenCalledWith({ locale: 'en', position: 'hero' });
  });

  it('fires landing_cta_click on primary CTA click', () => {
    const copy = getConnectionsLandingCopy('en');
    render(<ConnectionsHero locale="en" copy={copy} />);
    fireEvent.click(screen.getByTestId('hero-cta-primary'));
    expect(ctaClick).toHaveBeenCalledWith({ locale: 'en', position: 'hero' });
  });

  it('renders Hebrew demo puzzle on locale=he', () => {
    const copy = getConnectionsLandingCopy('he');
    render(<ConnectionsHero locale="he" copy={copy} />);
    expect(screen.getByText(copy.demo.puzzle.word1)).toBeInTheDocument();
    expect(screen.getByText(copy.demo.puzzle.word2)).toBeInTheDocument();
  });
});
