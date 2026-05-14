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
    'wordHunt.mobile.words': 'words',
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
  it('renders word count with label', () => {
    render(<DiscoveredWordsList words={[makeWord('cat', 1), makeWord('dog', 2)]} t={t} />);
    expect(screen.getByText(/2\s+words/)).toBeInTheDocument();
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
});
