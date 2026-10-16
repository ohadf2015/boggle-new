/**
 * Tests for DiscoveredWordsList — extracted from DailyWordHuntSurvival.
 * Sorts by most recent, supports obfuscate toggle, color-codes by word length.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiscoveredWordsList } from '../DiscoveredWordsList';
import type { WordDiscovery } from '../survival/types';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  m: new Proxy({}, { get: () => (props: Record<string, unknown>) => {
    const { children, ...rest } = props as { children?: React.ReactNode } & Record<string, unknown>;
    return <span {...(rest as React.HTMLAttributes<HTMLSpanElement>)}>{children}</span>;
  } }),
}));

const t = (key: string) => {
  const dict: Record<string, string> = {
    'wordHunt.mobile.found': 'Found',
    'common.show': 'Show',
    'common.hide': 'Hide',
  };
  return dict[key] ?? key;
};

const makeWord = (word: string, timestamp: number): WordDiscovery => ({
  word,
  timestamp,
  lifeGained: 0,
  tokensGained: 0,
});

describe('DiscoveredWordsList', () => {
  it('renders a Found label with the count in its own badge, so one word never reads "1 words"', () => {
    render(<DiscoveredWordsList words={[makeWord('cat', 1)]} t={t} />);
    expect(screen.getByText('Found')).toBeInTheDocument();
    expect(screen.getByTestId('found-count')).toHaveTextContent(/^1$/);
  });

  it('shows most recent word first', () => {
    const { container } = render(
      <DiscoveredWordsList words={[makeWord('old', 100), makeWord('new', 200)]} t={t} />
    );
    const chips = container.querySelectorAll('.inline-flex');
    expect(chips[0]).toHaveTextContent('new');
    expect(chips[1]).toHaveTextContent('old');
  });

  it('toggles obfuscation — words become bullets on Hide click', () => {
    render(<DiscoveredWordsList words={[makeWord('puzzle', 1)]} t={t} />);
    expect(screen.getByText('puzzle')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Hide'));
    expect(screen.queryByText('puzzle')).not.toBeInTheDocument();
    expect(screen.getByText('••••••')).toBeInTheDocument();
  });

  it('Given many found words, Then they stay on one row that scrolls sideways (never wraps and grows taller)', () => {
    const words = Array.from({ length: 20 }, (_, i) => makeWord(`word${i}`, i));
    render(<DiscoveredWordsList words={words} t={t} />);
    const row = screen.getByTestId('found-words-row');
    expect(row.className).not.toMatch(/flex-wrap/);
    expect(row.className).toMatch(/flex-nowrap/);
    expect(row.className).toMatch(/overflow-x-auto/);
    for (const chip of Array.from(row.children)) expect((chip as HTMLElement).className).toMatch(/shrink-0/);
  });
});
