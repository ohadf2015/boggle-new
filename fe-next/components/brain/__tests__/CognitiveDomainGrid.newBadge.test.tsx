/**
 * CognitiveDomainGrid — "NEW" badge state (game 1 of the analysis window).
 *
 * Locks the visible behavior before swapping the standalone NewBadge for
 * GameBadge (variant="new-feature", animate="pulse") — same lime color and
 * pulse animation values, one fewer bespoke badge component.
 */

import { render, screen } from '@testing-library/react';
import CognitiveDomainGrid from '../CognitiveDomainGrid';

vi.mock('@/utils/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => (key === 'brain.newBadge' ? 'NEW!' : key),
  }),
}));

const domains = {
  processingSpeed: { score: 50, trend: 'stable' as const },
  workingMemory: { score: 50, trend: 'stable' as const },
  attention: { score: 50, trend: 'stable' as const },
  flexibility: { score: 50, trend: 'stable' as const },
  vocabulary: { score: 50, trend: 'stable' as const },
};

describe('CognitiveDomainGrid — new badge', () => {
  it('shows the NEW badge on every domain after game 1', () => {
    render(<CognitiveDomainGrid domains={domains} gamesAnalyzed={1} />);
    expect(screen.getAllByText('NEW!')).toHaveLength(5);
  });

  it('does not show the NEW badge once trend data exists (3+ games)', () => {
    render(<CognitiveDomainGrid domains={domains} gamesAnalyzed={3} />);
    expect(screen.queryByText('NEW!')).not.toBeInTheDocument();
  });
});
