import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// GSAP can't run DOM tweens in jsdom; stub it so the component logic is testable.
vi.mock('gsap', () => ({
  default: {
    context: (fn: () => void) => { fn(); return { revert: vi.fn() }; },
    fromTo: vi.fn(),
    to: vi.fn(),
    utils: { toArray: () => [] },
  },
}));

let reduceMotion = false;
vi.mock('@/contexts/AccessibilityContext', () => ({
  useShouldReduceMotion: () => reduceMotion,
}));

let enableComplexAnimations = true;
vi.mock('@/components/grid/performanceUtils', () => ({
  getPerformanceConfig: () => ({ enableComplexAnimations }),
}));

import DrillRewardBurst from '../DrillRewardBurst';

describe('DrillRewardBurst — satisfying collect spray', () => {
  beforeEach(() => {
    reduceMotion = false;
    enableComplexAnimations = true;
  });

  it('emits particles + label when a collect fires', async () => {
    const { container } = render(
      <DrillRewardBurst trigger={3} magnitude={0.8} seedKey="CAT-3" label="+50" />,
    );
    await waitFor(() => {
      expect(container.querySelectorAll('[data-burst-dot]').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('+50')).toBeInTheDocument();
  });

  it('renders nothing before the first collect (trigger 0)', () => {
    const { container } = render(<DrillRewardBurst trigger={0} magnitude={0.5} />);
    expect(container.querySelectorAll('[data-burst-dot]').length).toBe(0);
  });

  it('renders nothing for reduced-motion players', async () => {
    reduceMotion = true;
    const { container } = render(<DrillRewardBurst trigger={5} magnitude={1} label="+99" />);
    // Give effects a tick; nothing should ever appear.
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelectorAll('[data-burst-dot]').length).toBe(0);
    expect(screen.queryByText('+99')).not.toBeInTheDocument();
  });

  it('renders nothing on low-end devices (complex animations disabled)', async () => {
    enableComplexAnimations = false;
    const { container } = render(<DrillRewardBurst trigger={5} magnitude={1} />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container.querySelectorAll('[data-burst-dot]').length).toBe(0);
  });
});
