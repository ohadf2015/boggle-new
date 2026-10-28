import './testT';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playAchievementSound: vi.fn() }) }));

import { BlastTargetChip } from '../BlastTargetChip';

const rivals = [{ name: 'Zoe', score: 500 }, { name: 'Max', score: 900 }];

describe('BlastTargetChip', () => {
  it('shows how many points to pass the nearest rival', () => {
    render(<BlastTargetChip runScore={380} personalBest={null} rivals={rivals} />);
    expect(screen.getByTestId('blast-target-chip')).toHaveTextContent('blastProgress.toPass{"points":"120","name":"Zoe"}');
  });

  it('chases the personal best when no rival is nearer', () => {
    render(<BlastTargetChip runScore={100} personalBest={300} rivals={[]} />);
    expect(screen.getByTestId('blast-target-chip')).toHaveTextContent('blastProgress.toBest{"points":"200"}');
  });

  it('celebrates passing a rival', () => {
    const { rerender } = render(<BlastTargetChip runScore={480} personalBest={null} rivals={rivals} />);
    rerender(<BlastTargetChip runScore={520} personalBest={null} rivals={rivals} />);
    expect(screen.getByTestId('blast-target-passed')).toHaveTextContent('blastProgress.passed{"name":"Zoe"}');
    expect(screen.getByTestId('blast-target-chip')).toHaveTextContent('"name":"Max"');
  });

  it('claims #1 only when the whole ladder above was fetched and beaten', () => {
    render(<BlastTargetChip runScore={1000} personalBest={null} rivals={rivals} />);
    expect(screen.getByTestId('blast-target-chip')).toHaveTextContent('blastProgress.top');
  });

  it('renders nothing for a guest with no targets', () => {
    const { container } = render(<BlastTargetChip runScore={10} personalBest={null} rivals={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
