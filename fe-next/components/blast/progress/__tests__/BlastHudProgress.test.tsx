import './testT';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playAchievementSound: vi.fn() }) }));

import { BlastHudProgressRow, comboTier } from '../BlastHudProgress';

const progress = { baseScore: 600, baseDiamonds: 2, recordWave: 0, personalBest: null, rivals: [{ name: 'Zoe', score: 700 }] };

describe('BlastHudProgressRow', () => {
  it('chases targets with the run total, not the wave score', () => {
    render(<BlastHudProgressRow progress={progress} wave={3} waveScore={40} waveDiamonds={1} />);
    expect(screen.getByTestId('blast-target-chip')).toHaveTextContent('"points":"60"');
  });

  it('counts diamonds across the whole run', () => {
    render(<BlastHudProgressRow progress={progress} wave={3} waveScore={0} waveDiamonds={1} />);
    expect(screen.getByTestId('blast-hud-diamonds')).toHaveTextContent('3');
  });
});

describe('comboTier', () => {
  it('escalates with the streak level', () => {
    expect([0, 1, 2, 3, 5, 8].map(comboTier)).toEqual([0, 1, 1, 2, 3, 3]);
  });
});
