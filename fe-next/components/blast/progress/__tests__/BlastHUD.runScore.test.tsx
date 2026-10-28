import './testT';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playAchievementSound: vi.fn() }) }));
vi.mock('@/components/blast/legacy/BlastComboStreakBadge', () => ({ BlastComboStreakBadge: () => null }));

import { BlastHUD } from '@/components/blast/legacy/BlastHUD';

const base = {
  score: 40, wordsFoundCount: 2, movesRemaining: 8, totalMoves: 10, waveNumber: 3,
  tilesCleared: 4, totalTiles: 36, onQuit: vi.fn(), t: (k: string) => k,
};
const progress = { baseScore: 600, baseDiamonds: 0, recordWave: 0, personalBest: null, rivals: [{ name: 'Zoe', score: 700 }] };

describe('BlastHUD run score', () => {
  it('shows the run total in single-player', () => {
    render(<BlastHUD {...base} progress={progress} />);
    expect(screen.getByText('640')).toBeInTheDocument();
  });

  it('keeps the plain score when there is no run context', () => {
    render(<BlastHUD {...base} />);
    expect(screen.getByText('40')).toBeInTheDocument();
  });
});
