import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameResultsHero } from '../GameResultsHero';
import { ResultsNextBar } from '../ResultsNextBar';
import { ResultsStatCards, statTiming } from '../ResultsStatCards';

vi.mock('@/components/Avatar', () => ({
  default: ({ mood }: { mood?: string }) => <div data-testid="avatar" data-mood={mood} />,
}));
vi.mock('@/hooks/useReducedMotion', () => ({ default: () => false }));

const stats = [
  { key: 'score', label: 'Score', value: 120, tone: 'yellow' as const },
  { key: 'words', label: 'Words', value: 9, tone: 'cyan' as const },
  { key: 'coins', label: 'Coins', value: 15, prefix: '+', tone: 'orange' as const },
];

describe('GameResultsHero', () => {
  it('renders the player avatar, the title as the page heading, badges and every stat', () => {
    render(
      <GameResultsHero
        title="2nd place"
        subtitle="12 of 40 words"
        accentHex="#22d3ee"
        cheering
        avatar={{ userId: 'u1' }}
        badges={[{ key: 'best', label: 'New best', tone: 'yellow' }]}
        stats={stats}
      />
    );
    expect(screen.getByRole('heading', { level: 1, name: '2nd place' })).toBeTruthy();
    expect(screen.getByText('12 of 40 words')).toBeTruthy();
    expect(screen.getByTestId('avatar')).toBeTruthy();
    expect(screen.getByText('New best')).toBeTruthy();
    expect(screen.getAllByTestId(/^results-stat-/)).toHaveLength(3);
  });

  it('skips confetti when there is nothing to cheer', () => {
    render(<GameResultsHero title="Round over" accentHex="#fff" cheering={false} avatar={{ userId: 'u1' }} stats={stats} />);
    expect(screen.queryByTestId('quick-confetti')).toBeNull();
  });
});

describe('ResultsStatCards', () => {
  it('lands each card after the previous one has counted', () => {
    expect(statTiming(0)).toEqual({ appear: 150, count: 300 });
    expect(statTiming(1)).toEqual({ appear: 700, count: 850 });
    expect(statTiming(2)).toEqual({ appear: 1250, count: 1400 });
  });

  it('shows final values straight away when motion is off', () => {
    render(<ResultsStatCards items={stats} animate={false} />);
    expect(screen.getByTestId('results-stat-coins').textContent).toContain('+15');
  });
});

describe('ResultsNextBar', () => {
  it('fires the primary and secondary actions', () => {
    const next = vi.fn();
    const home = vi.fn();
    render(
      <ResultsNextBar
        primary={{ label: 'Play again', onClick: next }}
        secondary={{ label: 'Home', icon: <span />, onClick: home }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Home' }));
    expect(next).toHaveBeenCalledTimes(1);
    expect(home).toHaveBeenCalledTimes(1);
  });
});
