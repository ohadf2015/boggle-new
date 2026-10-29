import './testT';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/SoundEffectsContext', () => ({ useSoundEffects: () => ({ playAchievementSound: vi.fn() }) }));

import { BlastHudDiamonds, comboTier } from '../BlastHudProgress';

const progress = { baseScore: 600, baseDiamonds: 2, recordWave: 0, personalBest: null, rivals: [{ name: 'Zoe', score: 700 }] };

describe('BlastHud progress pieces', () => {
  it('counts diamonds across the whole run', () => {
    render(<BlastHudDiamonds progress={progress} waveDiamonds={1} />);
    expect(screen.getByTestId('blast-hud-diamonds')).toHaveTextContent('3');
  });
});

describe('comboTier', () => {
  it('escalates with the streak level', () => {
    expect([0, 1, 2, 3, 5, 8].map(comboTier)).toEqual([0, 1, 1, 2, 3, 3]);
  });
});
