import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastResultsHero } from '../BlastResultsHero';
import type { BlastResultsView } from '../blastResultsViewModel';

vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => false, default: () => false }));
vi.mock('@/components/results/stage/ResultsAvatarStage', () => ({ ResultsAvatarStage: () => <div data-testid="avatar-stage" /> }));

const t = (k: string) => k;
const view = {
  score: 1240,
  tier: 'mid',
  isNewBest: false,
  pbDelta: null,
  rank: null,
  nextGoal: { kind: 'personalBest', gap: 260 },
  nearMiss: false,
  collectionBonus: null,
  celebrate: { coins: false, diamonds: false, confetti: false },
} as unknown as BlastResultsView;

describe('BlastResultsHero celebration', () => {
  it('counts the score up from zero instead of printing it at once', () => {
    render(<BlastResultsHero view={view} t={t} locale="en" avatar={{ userId: 'u' }} />);
    const score = screen.getByTestId('blast-results-score');
    expect(score.textContent).not.toContain('1,240');
  });

  it('fills the next-goal bar with a spring progress labelled by the goal', () => {
    render(<BlastResultsHero view={view} t={t} locale="en" avatar={{ userId: 'u' }} />);
    const bar = screen.getByTestId('blast-results-next-goal').querySelector('[role="progressbar"]');
    expect(bar).toHaveAttribute('aria-label', 'blast.results.reveal.goalBest');
    expect(bar).toHaveAttribute('aria-valuenow', '83');
  });
});
