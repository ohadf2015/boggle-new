import './testT';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastRunRibbon } from '../BlastRunRibbon';
import { getWaveTheme } from '../waveTheme';

describe('BlastRunRibbon', () => {
  it('shows the current wave and the themes ahead', () => {
    render(<BlastRunRibbon wave={4} recordWave={0} />);
    const steps = screen.getAllByTestId('blast-ribbon-step');
    expect(steps.map((s) => s.getAttribute('data-theme'))).toEqual([4, 5, 6, 7].map((w) => getWaveTheme(w).id));
    expect(steps[0]).toHaveAttribute('data-current', 'true');
    expect(screen.getByTestId('blast-run-ribbon')).toHaveAttribute('aria-label', 'blastProgress.runLabel{"wave":4}');
  });

  it('flags the step that sets a new furthest wave', () => {
    render(<BlastRunRibbon wave={4} recordWave={5} />);
    const flagged = screen.getAllByTestId('blast-ribbon-step').filter((s) => s.getAttribute('data-record') === 'true');
    expect(flagged.map((s) => s.textContent)).toEqual(['6']);
  });
});
