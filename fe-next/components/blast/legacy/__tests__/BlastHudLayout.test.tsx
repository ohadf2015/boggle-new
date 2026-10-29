import '../../progress/__tests__/testT';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playAchievementSound: vi.fn() }) }));
vi.mock('../BlastComboStreakBadge', () => ({ BlastComboStreakBadge: () => <div data-testid="combo-streak-badge" /> }));

import { BlastHUD } from '../BlastHUD';
import type { BlastObjectiveProgress } from '../types';

const t = (key: string, fallback?: string) => fallback ?? key;
const base = {
  score: 0, wordsFoundCount: 0, movesRemaining: 10, totalMoves: 12, waveNumber: 1,
  tilesCleared: 9, totalTiles: 36, onQuit: vi.fn(), t,
};
const progress = { baseScore: 0, baseDiamonds: 2, recordWave: 0, personalBest: null, rivals: [] };
const objectives: BlastObjectiveProgress[] = [
  { objective: { type: 'clear_percent', target: 75 }, current: 25, isComplete: false },
  { objective: { type: 'word_length', target: 4, minWordLength: 3 }, current: 1, isComplete: false },
];

function utilityStrip() {
  const hud = screen.getByTestId('blast-hud');
  return Array.from(hud.children).find((c) => c.querySelector('[data-testid="blast-quit-btn"]')) as HTMLElement;
}

describe('BlastHUD layout', () => {
  it('given low moves, when moves drop to 3 and 2, then the moves badge escalates tension', () => {
    const { rerender } = render(<BlastHUD {...base} />);
    expect(screen.getByTestId('blast-hud-moves').getAttribute('data-tension')).toBe('calm');
    rerender(<BlastHUD {...base} movesRemaining={3} />);
    expect(screen.getByTestId('blast-hud-moves').getAttribute('data-tension')).toBe('tense');
    rerender(<BlastHUD {...base} movesRemaining={2} />);
    expect(screen.getByTestId('blast-hud-moves').getAttribute('data-tension')).toBe('critical');
  });

  it('given a wave with side objectives, then the goal label, bar and objectives share one goal element', () => {
    render(<BlastHUD {...base} progress={progress} objectives={objectives} />);
    const goal = screen.getByTestId('blast-hud-goal');
    expect(within(goal).getByText(/Clear 75% of the board/)).toBeInTheDocument();
    expect(within(goal).getByTestId('blast-progress-fill')).toBeInTheDocument();
    expect(within(goal).getByTestId('blast-objective-row-0')).toHaveTextContent('1 / 4');
  });

  it('keeps moves, score and the clear bar out of the strip that holds quit (the MP frame hides that strip)', () => {
    render(<BlastHUD {...base} isMultiplayer totalMoves={Infinity} wordsFoundCount={5} />);
    const strip = utilityStrip();
    expect(strip).toBeTruthy();
    expect(within(strip).queryByTestId('blast-score-label')).toBeNull();
    expect(within(strip).queryByTestId('blast-progress-label')).toBeNull();
    expect(within(strip).queryByTestId('blast-hud-moves')).toBeNull();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows only moves, score, wave goal and combo: no score-to-beat chip, no upcoming-wave ladder', () => {
    render(<BlastHUD {...base} progress={{ ...progress, rivals: [{ name: 'Zoe', score: 700 }] }} objectives={objectives} />);
    expect(screen.queryByTestId('blast-target-chip')).toBeNull();
    expect(screen.queryByTestId('blast-run-ribbon')).toBeNull();
    expect(within(screen.getByTestId('blast-hud-goal')).getByTestId('blast-hud-wave')).toHaveTextContent('1');
  });

  it('given no streak, then the combo slot shows a resident idle ×1 ring', () => {
    render(<BlastHUD {...base} />);
    expect(within(screen.getByTestId('blast-combo-slot')).getByTestId('blast-combo-idle')).toHaveTextContent('×1');
  });

  it('given a score objective, then its target sits with the score and not as a goal chip', () => {
    const withScore: BlastObjectiveProgress[] = [
      ...objectives,
      { objective: { type: 'score_target', target: 350 }, current: 120, isComplete: false },
    ];
    render(<BlastHUD {...base} progress={progress} objectives={withScore} />);
    expect(screen.getByTestId('blast-hud-score-target')).toHaveTextContent('120 / 350');
    const goal = screen.getByTestId('blast-hud-goal');
    expect(within(goal).queryByText(/350/)).toBeNull();
    expect(within(goal).getByTestId('blast-objective-row-0')).toHaveTextContent('1 / 4');
  });

  it('given a wave modifier, then it renders inside the goal card', () => {
    render(<BlastHUD {...base} progress={progress} modifierSlot={<span data-testid="mod">FEATHER</span>} />);
    expect(within(screen.getByTestId('blast-hud-goal')).getByTestId('mod')).toBeInTheDocument();
  });

  it('keeps the score and diamond fly targets', () => {
    const { container } = render(<BlastHUD {...base} progress={progress} />);
    expect(container.querySelector('[data-board-score-target]')).not.toBeNull();
    expect(container.querySelector('[data-board-diamond-target]')).not.toBeNull();
    expect(screen.getByTestId('blast-hud-progress')).toBeInTheDocument();
  });
});
