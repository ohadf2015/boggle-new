import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ClassroomSummary } from '@/shared/types/classroom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('@/lib/education/motion/useEduReducedMotion', () => ({ useEduReducedMotion: () => true }));

import { ClassroomResultsCardSteps } from '../ClassroomResultsCardSteps';

const summary: ClassroomSummary = {
  teacherName: 'Ms. Cohen',
  lessonNames: ['Physics 101'],
  lessonIds: ['lesson-1'],
  totalWords: 3,
  coverage: [
    { word: 'atom', foundBy: ['Noa'] },
    { word: 'neutron', foundBy: [] },
    { word: 'quark', foundBy: [] },
  ],
  missedWords: ['neutron', 'quark'],
  classFoundCount: 1,
  masteryByPlayer: { Noa: { found: 1, total: 3 } },
};
const standings = [{ username: 'Noa', score: 70 }, { username: 'Maya', score: 40 }];

const renderScore = () =>
  render(<ClassroomResultsCardSteps summary={summary} username="Noa" standings={standings} onFinish={() => {}} />);

describe('ClassroomResultsCardSteps footer and celebration', () => {
  it('given misses, when the footer shows, then review is a quiet text button and never a second heavy button', () => {
    renderScore();
    const ghost = screen.getByTestId('results-steps-ghost');
    expect(ghost.className).toContain('text-neo-white/60');
    expect(ghost.className).not.toMatch(/bg-neo-lime|shadow-\[0_4px|border-neo-white(\s|$)/);
    expect(ghost.className).not.toContain('w-full');
  });

  it('given the footer, when read in order, then CONTINUE comes first and the band spreads the pair apart on wide screens', () => {
    renderScore();
    const footer = screen.getByTestId('results-steps-footer');
    const buttons = within(footer).getAllByRole('button');
    expect(buttons.map((b) => b.dataset.testid)).toEqual(['results-steps-primary', 'results-steps-ghost']);
    expect(buttons[0].parentElement?.className).toContain('sm:justify-between');
  });

  it('given a scored round, when it opens, then the mascot and each stat tile enter on their own beat', () => {
    renderScore();
    const step = screen.getByTestId('results-step-score');
    expect(within(step).getByTestId('results-mascot')).toBeInTheDocument();
    const tileBeats = within(step)
      .getAllByTestId('results-stat-tile')
      .map((tile) => tile.closest('[data-testid="edu-reveal"]'));
    expect(tileBeats.every((beat) => beat && step.contains(beat))).toBe(true);
    expect(new Set(tileBeats).size).toBe(2);
  });
});
