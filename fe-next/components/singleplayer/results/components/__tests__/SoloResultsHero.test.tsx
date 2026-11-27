import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SoloResultsHero } from '../SoloResultsHero';

vi.mock('@/components/Avatar', () => ({ default: () => <div data-testid="avatar" /> }));
vi.mock('@/hooks/useReducedMotion', () => ({ default: () => true }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, fb?: unknown) => (typeof fb === 'string' ? fb : k) }),
}));

const base = {
  title: 'Victory!',
  subtitle: 'Found 12 words',
  score: 140,
  words: 12,
  avatar: { userId: 'u1' },
  isNewHighScore: false,
};

describe('SoloResultsHero', () => {
  it('shows the placement against bots', () => {
    render(<SoloResultsHero {...base} rank={2} totalPlayers={4} />);
    expect(screen.getByTestId('results-badge-rank').textContent).toBe('#2 results.of 4');
  });

  it('shows no placement when the player was alone, and still the full stat row', () => {
    render(<SoloResultsHero {...base} rank={1} totalPlayers={1} />);
    expect(screen.queryByTestId('results-badge-rank')).toBeNull();
    expect(screen.getByTestId('results-stat-score').textContent).toContain('140');
  });

  it('never shows a separate coins tile (coins live on the one reward line)', () => {
    render(<SoloResultsHero {...base} rank={1} totalPlayers={1} />);
    expect(screen.queryByTestId('results-stat-coins')).toBeNull();
  });

  it('Given found words, Then the third tile is the best word and the top three pop in as chips', () => {
    render(<SoloResultsHero {...base} rank={1} totalPlayers={1} topWords={['quartz', 'stone', 'rate', 'ten']} />);
    expect(screen.getAllByTestId(/^results-stat-/)).toHaveLength(3);
    expect(screen.getByTestId('results-stat-best').textContent).toContain('quartz');
    expect(screen.getAllByTestId('results-top-word').map((c) => c.textContent)).toEqual(['quartz', 'stone', 'rate']);
  });

  it('Given no words, Then the row keeps its shape with an empty best-word tile', () => {
    render(<SoloResultsHero {...base} score={0} words={0} rank={1} totalPlayers={1} topWords={[]} />);
    expect(screen.getAllByTestId(/^results-stat-/)).toHaveLength(3);
    expect(screen.getByTestId('results-stat-best').textContent).toContain('mpUi.results.bestWordNone');
    expect(screen.queryAllByTestId('results-top-word')).toHaveLength(0);
  });
});
