/**
 * BlastObjectiveDisplay - Tests for objective progress UI component.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BlastObjectiveDisplay } from '../BlastObjectiveDisplay';
import type { BlastObjectiveProgress } from '../types';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const MockDiv = React.forwardRef(function MockDiv({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) {
    return <div ref={ref} {...props}>{children}</div>;
  });
  return {
    motion: { div: MockDiv },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Target: () => <span data-testid="icon-target" />,
  Star: () => <span data-testid="icon-star" />,
  Gem: () => <span data-testid="icon-gem" />,
  Zap: () => <span data-testid="icon-zap" />,
  Check: () => <span data-testid="icon-check" />,
  Snowflake: () => <span data-testid="icon-snowflake" />,
  Bomb: () => <span data-testid="icon-bomb" />,
  Type: () => <span data-testid="icon-type" />,
}));

const mockT = (key: string) => {
  const translations: Record<string, string> = {
    'blast.objective.scoreTarget': 'Score {target} pts',
    'blast.objective.collectType': 'Collect {target} {tileType}',
    'blast.objective.clearAllType': 'Clear all {tileType}',
    'blast.objective.wordLength': '{target} words of {minWordLength}+ letters',
  };
  return translations[key] || key;
};

describe('BlastObjectiveDisplay', () => {
  it('renders each objective with progress', () => {
    const progress: BlastObjectiveProgress[] = [
      {
        objective: { type: 'score_target', target: 20 },
        current: 10,
        isComplete: false,
      },
    ];

    render(<BlastObjectiveDisplay objectiveProgress={progress} t={mockT} />);
    expect(screen.getByText('10/20')).toBeInTheDocument();
  });

  it('shows checkmark for completed objectives', () => {
    const progress: BlastObjectiveProgress[] = [
      {
        objective: { type: 'score_target', target: 20 },
        current: 25,
        isComplete: true,
      },
    ];

    render(<BlastObjectiveDisplay objectiveProgress={progress} t={mockT} />);
    expect(screen.getByTestId('icon-check')).toBeInTheDocument();
  });

  it('renders multiple objectives', () => {
    const progress: BlastObjectiveProgress[] = [
      {
        objective: { type: 'clear_all_type', tileType: 'ice', target: 5 },
        current: 3,
        isComplete: false,
      },
      {
        objective: { type: 'score_target', target: 40 },
        current: 40,
        isComplete: true,
      },
    ];

    render(<BlastObjectiveDisplay objectiveProgress={progress} t={mockT} />);
    expect(screen.getByText('3/5')).toBeInTheDocument();
    expect(screen.getByText('40/40')).toBeInTheDocument();
  });

  it('renders collect_type objectives', () => {
    const progress: BlastObjectiveProgress[] = [
      {
        objective: { type: 'collect_type', tileType: 'gem', target: 3 },
        current: 1,
        isComplete: false,
      },
    ];

    render(<BlastObjectiveDisplay objectiveProgress={progress} t={mockT} />);
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('renders word_length objectives', () => {
    const progress: BlastObjectiveProgress[] = [
      {
        objective: { type: 'word_length', target: 2, minWordLength: 5 },
        current: 1,
        isComplete: false,
      },
    ];

    render(<BlastObjectiveDisplay objectiveProgress={progress} t={mockT} />);
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('renders nothing when no objectives', () => {
    const { container } = render(
      <BlastObjectiveDisplay objectiveProgress={[]} t={mockT} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
