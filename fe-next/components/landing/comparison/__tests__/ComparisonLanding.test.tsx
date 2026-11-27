import React from 'react';
import { render, screen } from '@testing-library/react';
import { ComparisonLanding, type ComparisonLandingProps } from '../ComparisonLanding';

vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

function baseProps(overrides: Partial<ComparisonLandingProps> = {}): ComparisonLandingProps {
  return {
    locale: 'en',
    h1: 'LexiClash vs Wordle: The Honest Verdict',
    intro: ['Wordle gives you one puzzle a day. LexiClash gives you unlimited rounds.'],
    quickCtas: [
      { href: '/en/singleplayer', label: 'Play Solo', variant: 'lime' },
      { href: '/en/daily', label: 'Daily Challenge', variant: 'cyan' },
    ],
    competitorName: 'Wordle',
    comparisonRows: [
      ['Games per day', 'Unlimited', '1'],
      ['Multiplayer', 'Real-time 2-20+', 'None'],
    ],
    featuresTitle: "What LexiClash Does That Wordle Doesn't",
    features: [
      { title: 'Keep Playing', desc: 'No daily cap.' },
      { title: 'Competitive Multiplayer', desc: 'Same board, same timer.' },
    ],
    featuresStyle: 'positive',
    faqs: [
      { q: 'Is LexiClash like Wordle?', a: 'Not really — both just use words.' },
      { q: 'Can I play more than once a day?', a: 'As many times as you want.' },
    ],
    moreComparisons: [
      { href: '/en/lexiclash-vs-scrabble', title: 'vs Scrabble', subtitle: 'Grid vs rack' },
    ],
    finalCta: {
      title: 'Just Try It',
      body: ['It is free and instant.'],
      href: '/en/singleplayer',
      label: 'Play Now',
    },
    ...overrides,
  };
}

describe('ComparisonLanding', () => {
  it('renders the h1 verbatim', () => {
    render(<ComparisonLanding {...baseProps()} />);
    expect(
      screen.getByRole('heading', { level: 1, name: /LexiClash vs Wordle/i }),
    ).toBeInTheDocument();
  });

  it('renders every comparison row: feature + both values', () => {
    render(<ComparisonLanding {...baseProps()} />);
    expect(screen.getByText('Games per day')).toBeInTheDocument();
    expect(screen.getByText('Unlimited')).toBeInTheDocument();
    expect(screen.getByText('Multiplayer')).toBeInTheDocument();
    expect(screen.getByText('Real-time 2-20+')).toBeInTheDocument();
  });

  it('renders every FAQ question and answer', () => {
    render(<ComparisonLanding {...baseProps()} />);
    expect(screen.getByText('Is LexiClash like Wordle?')).toBeInTheDocument();
    expect(screen.getByText(/both just use words/i)).toBeInTheDocument();
    expect(screen.getByText('Can I play more than once a day?')).toBeInTheDocument();
  });

  it('renders the final CTA as a link with the correct href and label', () => {
    render(<ComparisonLanding {...baseProps()} />);
    const cta = screen.getAllByRole('link', { name: 'Play Now' })[0];
    expect(cta).toHaveAttribute('href', '/en/singleplayer');
  });

  it('renders all quick CTA buttons with their hrefs', () => {
    render(<ComparisonLanding {...baseProps()} />);
    for (const link of screen.getAllByRole('link', { name: 'Play Solo' })) {
      expect(link).toHaveAttribute('href', '/en/singleplayer');
    }
    expect(screen.getByRole('link', { name: 'Daily Challenge' })).toHaveAttribute(
      'href',
      '/en/daily',
    );
  });

  // --- brand-correctness (the design contract, not just "it renders") ---

  it('frames the scoreboard with a solid black border, never the off-brand gray border', () => {
    const { container } = render(<ComparisonLanding {...baseProps()} />);
    const frame = container.querySelector('[data-testid="scoreboard-frame"] table')?.parentElement;
    expect(frame?.className).toMatch(/border-neo-black/);
    // the old vs-pages used border-neo-gray-400 on the table — must be gone
    expect(container.innerHTML).not.toMatch(/border-neo-gray/);
  });

  it('uses no translucent /40 accent borders anywhere (the soft AI-tell look)', () => {
    const { container } = render(<ComparisonLanding {...baseProps()} />);
    expect(container.innerHTML).not.toMatch(/border-[\w-]+\/40/);
  });

  it('marks the LexiClash column as the winner and leaves the competitor column plain', () => {
    const { container } = render(<ComparisonLanding {...baseProps()} />);
    const [, winner, loser] = Array.from(container.querySelectorAll('thead th'));
    expect(winner?.textContent).toMatch(/LexiClash/);
    expect(winner?.className).toMatch(/neo-lime/);
    expect(loser?.textContent).toMatch(/Wordle/);
    expect(loser?.className).not.toMatch(/neo-lime/);
  });

  it('applies a muted, struck-through treatment when featuresStyle is "pain"', () => {
    const { container } = render(
      <ComparisonLanding {...baseProps({ featuresStyle: 'pain' })} />,
    );
    const featureSection = container.querySelector('[data-testid="features-section"]');
    expect(featureSection?.innerHTML).toMatch(/line-through/);
  });

  it('renders the optional gameplay section only when provided', () => {
    const { rerender } = render(<ComparisonLanding {...baseProps()} />);
    expect(screen.queryByTestId('gameplay-section')).toBeNull();
    rerender(
      <ComparisonLanding
        {...baseProps({
          gameplaySection: {
            title: 'Grid vs Rack',
            subsections: [{ game: 'LexiClash', description: 'Find words on a grid.' }],
          },
        })}
      />,
    );
    expect(screen.getByTestId('gameplay-section')).toBeInTheDocument();
    expect(screen.getByText('Grid vs Rack')).toBeInTheDocument();
  });

  it('offers one lime primary and one cream secondary in the hero, extra CTAs as plain pills', () => {
    const { container } = render(
      <ComparisonLanding
        {...baseProps({ quickCtas: [...baseProps().quickCtas, { href: '/en/multiplayer', label: 'Friends' }] })}
      />,
    );
    const heroButtons = Array.from(container.querySelectorAll('header a.min-h-14'));
    expect(heroButtons.map((a) => a.className.match(/bg-neo-(lime|cream)/)?.[1])).toEqual(['lime', 'cream']);
    expect(screen.getByRole('link', { name: 'Friends' })).toHaveAttribute('href', '/en/multiplayer');
  });
});
