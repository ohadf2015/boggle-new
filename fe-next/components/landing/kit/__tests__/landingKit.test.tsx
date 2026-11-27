import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  CheckList,
  CompareTable,
  CtaBand,
  FaqList,
  LandingButton,
  LandingHero,
  LandingPage,
  Section,
  Steps,
  TileGrid,
} from '..';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

describe('landing kit', () => {
  it('top bar links home and to the given play destination', () => {
    render(<LandingPage locale="sv" play={{ href: '/sv/multiplayer', label: 'Spela' }}>x</LandingPage>);
    expect(screen.getByRole('link', { name: /lexiclash/i })).toHaveAttribute('href', '/sv');
    expect(screen.getByRole('link', { name: 'Spela' })).toHaveAttribute('href', '/sv/multiplayer');
  });

  it('omits the top bar when the page brings its own header', () => {
    render(<LandingPage locale="en" topBar={false}>x</LandingPage>);
    expect(screen.queryByRole('link', { name: /lexiclash/i })).toBeNull();
  });

  it('hero renders one h1, keeps the long copy in the DOM and sizes the art', () => {
    render(
      <LandingHero
        title="Play words"
        lead="Short line."
        more={<p>The long indexed paragraph.</p>}
        actions={<LandingButton href="/en/multiplayer">Play</LandingButton>}
        art={{ src: '/landing/kit/lp-friends.webp', alt: 'Two mascots', width: 640, height: 568 }}
      />,
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('The long indexed paragraph.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Play' })).toHaveAttribute('href', '/en/multiplayer');
    const img = screen.getByRole('img', { name: 'Two mascots' });
    expect(img).toHaveAttribute('width', '640');
    expect(img).toHaveAttribute('height', '568');
  });

  it('section exposes an h2', () => {
    render(<Section title="How it works">body</Section>);
    expect(screen.getByRole('heading', { level: 2, name: 'How it works' })).toBeInTheDocument();
  });

  it('steps are an ordered list with titles and bodies', () => {
    render(<Steps items={[{ title: 'One', body: 'a' }, { title: 'Two', body: 'b' }]} />);
    expect(screen.getByRole('list').tagName).toBe('OL');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 3, name: 'Two' })).toBeInTheDocument();
  });

  it('tiles become links only when they have an href', () => {
    render(<TileGrid items={[{ title: 'Linked', href: '/en/daily' }, { title: 'Plain', body: 'p' }]} />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /linked/i })).toHaveAttribute('href', '/en/daily');
  });

  it('tile titles take the heading level the page outline needs', () => {
    render(<TileGrid headingLevel={2} items={[{ title: 'Solver' }]} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Solver' })).toBeInTheDocument();
  });

  it('check list renders every item', () => {
    render(<CheckList items={['a', 'b', 'c']} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('compare table has column headers and row headers', () => {
    render(<CompareTable columns={['Feature', 'LexiClash', 'Other']} rows={[['Price', 'Free', '$5']]} />);
    expect(screen.getByRole('columnheader', { name: 'LexiClash' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: 'Price' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '$5' })).toBeInTheDocument();
  });

  it('faq keeps answers in the DOM while closed', () => {
    const { container } = render(<FaqList items={[{ q: 'Free?', a: 'Yes.' }]} />);
    expect(container.querySelector('details')).not.toHaveAttribute('open');
    expect(screen.getByText('Free?').closest('summary')).not.toBeNull();
    expect(screen.getByText('Yes.')).toBeInTheDocument();
  });

  it('names a table with its caption, hidden or shown', () => {
    const { container } = render(<CompareTable columns={['A', 'B']} rows={[['1', '2']]} caption="Scores" captionHidden />);
    expect(screen.getByRole('table', { name: 'Scores' })).toBeInTheDocument();
    expect(container.querySelector('caption')).toHaveClass('sr-only');
  });

  it('faq can open its first answer and keep only one open', () => {
    const { container } = render(<FaqList items={[{ q: 'a', a: '1' }, { q: 'b', a: '2' }]} openFirst exclusive="faq" />);
    const [first, second] = container.querySelectorAll('details');
    expect(first).toHaveAttribute('open');
    expect(second).not.toHaveAttribute('open');
    expect(second).toHaveAttribute('name', 'faq');
  });

  it('page can force a reading direction', () => {
    render(<LandingPage locale="en" dir="rtl">x</LandingPage>);
    expect(screen.getByRole('main')).toHaveAttribute('dir', 'rtl');
  });

  it('cta band renders its heading and actions', () => {
    render(<CtaBand title="Ready?" actions={<LandingButton href="/en/daily" variant="secondary">Daily</LandingButton>} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Ready?' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Daily' })).toBeInTheDocument();
  });
});
