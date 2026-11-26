import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const perf = vi.hoisted(() => ({ prefersReducedMotion: false }));
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({ isLowEnd: false, prefersReducedMotion: perf.prefersReducedMotion, enableGlowEffects: false, enableComplexAnimations: true }),
}));
vi.mock('@/contexts/AccessibilityContext', () => ({ useShouldReduceMotion: () => perf.prefersReducedMotion }));
vi.mock('@/components/grid/performanceUtils', () => ({
  getPerformanceConfig: () => ({ isLowEnd: false, enableComplexAnimations: true }),
}));
vi.mock('@number-flow/react', () => ({ default: ({ value }: { value: number }) => <span>{value}</span> }));
vi.mock('@/components/effects/InlineConfetti', () => ({ InlineConfetti: () => <div data-testid="confetti" /> }));
vi.mock('@/lib/native/webViewLayerFlash', () => ({ prefersStaticFullscreenOverlay: () => false }));

import { CelebrationMoment } from '../CelebrationMoment';
import { CountUp } from '../CountUp';

const mascot = <span role="img" aria-label="lexi" />;

describe('CountUp', () => {
  beforeEach(() => { perf.prefersReducedMotion = false; });

  it('lands on the final value', () => {
    render(<CountUp value={1234} />);
    expect(screen.getByText('1234')).toBeInTheDocument();
  });

  it('shows the final value at once under reduced motion', () => {
    perf.prefersReducedMotion = true;
    render(<CountUp value={1234} />);
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });
});

describe('CelebrationMoment', () => {
  beforeEach(() => { perf.prefersReducedMotion = false; });

  const props = {
    headline: 'Lesson done',
    stats: [
      { key: 'xp', label: 'XP', value: 40 },
      { key: 'acc', label: 'Accuracy', value: 92, format: (n: number) => `${n}%` },
    ],
    continueLabel: 'Continue',
    mascot,
  };

  it('shows headline, every stat and one continue button', async () => {
    const onContinue = vi.fn();
    render(<CelebrationMoment {...props} onContinue={onContinue} />);
    expect(screen.getByRole('heading', { name: 'Lesson done' })).toBeInTheDocument();
    expect(screen.getByText('XP')).toBeInTheDocument();
    expect(await screen.findByText('92%')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('pops the mascot and fires the bounded confetti', () => {
    render(<CelebrationMoment {...props} onContinue={() => {}} />);
    expect(screen.getByTestId('mascot-rig')).toHaveAttribute('data-state', 'hop');
    expect(screen.getByTestId('confetti')).toBeInTheDocument();
  });

  it('is fully static under reduced motion', () => {
    perf.prefersReducedMotion = true;
    render(<CelebrationMoment {...props} onContinue={() => {}} />);
    expect(screen.queryByTestId('confetti')).toBeNull();
    expect(screen.getByTestId('mascot-rig').className).not.toContain('neo-mascot-idle');
    expect(screen.getByText('40')).toBeInTheDocument();
    for (const el of document.querySelectorAll<HTMLElement>('[style]')) {
      expect(el.style.transform).toBe('');
    }
  });
});
