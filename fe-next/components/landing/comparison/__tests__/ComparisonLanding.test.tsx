import React from 'react';
import { render, screen } from '@testing-library/react';
import { ComparisonLanding, type ComparisonLandingProps } from '../ComparisonLanding';

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/components/navigation/TopBackLink', () => ({
  TopBackLink: () => <span data-testid="top-back-link">back</span>,
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
    const cta = screen.getByRole('link', { name: 'Play Now' });
    expect(cta).toHaveAttribute('href', '/en/singleplayer');
  });

  it('renders all quick CTA buttons with their hrefs', () => {
    render(<ComparisonLanding {...baseProps()} />);
    expect(screen.getByRole('link', { name: 'Play Solo' })).toHaveAttribute(
      'href',
      '/en/singleplayer',
    );
    expect(screen.getByRole('link', { name: 'Daily Challenge' })).toHaveAttribute(
      'href',
      '/en/daily',
    );
  });

  // --- brand-correctness (the design contract, not just "it renders") ---

  it('frames the scoreboard with the canonical thick black border, never the off-brand gray border', () => {
    const { container } = render(<ComparisonLanding {...baseProps()} />);
    const frame = container.querySelector('[data-testid="scoreboard-frame"]');
    expect(frame).not.toBeNull();
    expect(frame?.className).toMatch(/border-neo-thick/);
    // the old vs-pages used border-neo-gray-400 on the table — must be gone
    expect(container.innerHTML).not.toMatch(/border-neo-gray/);
  });

  it('uses no translucent /40 accent borders anywhere (the soft AI-tell look)', () => {
    const { container } = render(<ComparisonLanding {...baseProps()} />);
    expect(container.innerHTML).not.toMatch(/border-[\w-]+\/40/);
  });

  it('marks the LexiClash column as the winner with the cyan accent, and mutes the competitor column', () => {
    const { container } = render(<ComparisonLanding {...baseProps()} />);
    const winner = container.querySelector('[data-testid="winner-col-header"]');
    const loser = container.querySelector('[data-testid="competitor-col-header"]');
    expect(winner?.textContent).toMatch(/LexiClash/);
    expect(winner?.className).toMatch(/neo-cyan/);
    expect(loser?.textContent).toMatch(/Wordle/);
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

  it('shows the back link only when showBackLink is set', () => {
    const { rerender } = render(<ComparisonLanding {...baseProps()} />);
    expect(screen.queryByTestId('top-back-link')).toBeNull();
    rerender(<ComparisonLanding {...baseProps({ showBackLink: true })} />);
    expect(screen.getByTestId('top-back-link')).toBeInTheDocument();
  });
});
