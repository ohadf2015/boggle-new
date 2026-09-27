/**
 * BlastComboFlash — stuck-overlay regression (cosy / low-end / app reduced-motion).
 *
 * The combo flash ("GOLDEN POWER!" etc.) dismisses ONLY via onAnimationComplete →
 * onComplete → parent sets comboFlash=null. Under AdaptiveMotion's skip path
 * (cosy mode, low-end device, or app-level reduced-motion) the animation is
 * replaced by a static div and onAnimationComplete never fires, so the orange
 * flash overlay sticks on screen forever.
 *
 * The component's own early-return guard used framer's useReducedMotion() (OS
 * media query) only, which does NOT cover the app/cosy/low-end skip signal that
 * AdaptiveMotion actually keys off — hence the mismatch. The fix ORs in
 * useSkipAnimations() so the proven ReducedMotionFlash dismissal path is taken
 * whenever animations are skipped, by ANY signal.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

let mockReduceMotion = false;
let mockSkip = false;

vi.mock('framer-motion', () => ({
  useReducedMotion: () => mockReduceMotion,
}));

vi.mock('@/components/motion/AdaptiveMotion', () => {
  const Div = ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
    // Drop framer-only props so they don't leak to the DOM (mirrors the real
    // skip path, where the animated control props are not applied).
    const {
      initial: _i, animate: _a, exit: _e, transition: _t,
      onAnimationComplete: _oac, onAnimationStart: _oas,
      whileHover: _wh, whileTap: _wt, whileFocus: _wf, whileDrag: _wd, whileInView: _wi,
      layout: _l, layoutId: _lid,
      ...rest
    } = props;
    void _i; void _a; void _e; void _t; void _oac; void _oas; void _wh; void _wt; void _wf; void _wd; void _wi; void _l; void _lid;
    return <div {...(rest as Record<string, unknown>)}>{children}</div>;
  };
  return {
    useSkipAnimations: () => mockSkip,
    AdaptiveMotion: { div: Div, span: Div },
    AdaptiveAnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

vi.mock('../blastEffectVariations', () => ({
  getRandomComboFlash: () => ({ type: 'circle', rotation: 0, scaleRange: [0.3, 1.5], extraElements: 0 }),
  generateAccentParticles: () => [],
}));

import { BlastComboFlash } from '../BlastComboFlash';

describe('BlastComboFlash stuck-overlay guard', () => {
  beforeEach(() => {
    mockReduceMotion = false;
    mockSkip = false;
    vi.clearAllMocks();
  });

  it('dismisses without rendering the overlay when animations are skipped (cosy/low-end) and OS reduced-motion is OFF', () => {
    // The exact reported condition: cream/cosy board → useSkipAnimations() true,
    // but framer useReducedMotion() (OS media query) false.
    mockReduceMotion = false;
    mockSkip = true;
    const onComplete = vi.fn();

    const { queryByTestId } = render(
      <BlastComboFlash flash={{ id: 'f1', tier: 3 }} onComplete={onComplete} comboTypeName="GOLDEN POWER!" />,
    );

    // Overlay must NOT render via the animated path (which can't dismiss under skip).
    expect(queryByTestId('combo-flash')).toBeNull();
    // It must dismiss immediately through the proven reduced-motion path.
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('still renders the animated overlay when motion is enabled', () => {
    mockReduceMotion = false;
    mockSkip = false;
    const onComplete = vi.fn();

    const { queryByTestId } = render(
      <BlastComboFlash flash={{ id: 'f1', tier: 3 }} onComplete={onComplete} comboTypeName="GOLDEN POWER!" />,
    );

    expect(queryByTestId('combo-flash')).not.toBeNull();
  });

  it('dismisses via reduced-motion path when OS reduced-motion is ON', () => {
    mockReduceMotion = true;
    mockSkip = false;
    const onComplete = vi.fn();

    const { queryByTestId } = render(
      <BlastComboFlash flash={{ id: 'f1', tier: 2 }} onComplete={onComplete} comboTypeName="COMBO!" />,
    );

    expect(queryByTestId('combo-flash')).toBeNull();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
