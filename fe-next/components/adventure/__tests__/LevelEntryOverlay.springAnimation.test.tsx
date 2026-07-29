/**
 * Test to verify LevelEntryOverlay doesn't use multi-keyframe spring animations
 *
 * Framer Motion spring animations only support 2 keyframes.
 * Using 3+ keyframes with spring type causes runtime error:
 * "Only two keyframes currently supported with spring and inertia animations"
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock contexts
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key === 'adventure.level' ? 'Level' : key,
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: false,
    enableGlowEffects: true,
  }),
}));

// Track m.div props to verify animation configuration
const capturedAnimations: Array<{
  animate: unknown;
  transition: unknown;
}> = [];

vi.mock('framer-motion', () => {
  const actual = vi.importActual('framer-motion');
  return {
    ...actual,
    m: {
      ...actual.motion,
      div: vi.fn().mockImplementation(({ children, animate, transition, ...props }) => {
        // Capture animation props for verification
        if (animate && transition) {
          capturedAnimations.push({ animate, transition });
        }
        return <div data-testid="motion-div" {...props}>{children}</div>;
      }),
      span: vi.fn().mockImplementation(({ children, ...props }) => (
        <span {...props}>{children}</span>
      )),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

import LevelEntryOverlay from '../LevelEntryOverlay';

describe('LevelEntryOverlay spring animation constraint', () => {
  beforeEach(() => {
    capturedAnimations.length = 0;
  });

  it('should not use spring transition with more than 2 keyframes', () => {
    // GIVEN: Component renders with visible state
    render(
      <LevelEntryOverlay
        levelNumber={1}
        worldNumber={1}
        isVisible={true}
      />
    );

    // WHEN: We examine all captured animations
    // THEN: No spring/inertia animations should have 3+ keyframes
    capturedAnimations.forEach(({ animate, transition }) => {
      if (typeof animate === 'object' && animate !== null) {
        const animateObj = animate as Record<string, unknown>;
        const transitionObj = transition as Record<string, unknown> | undefined;

        Object.entries(animateObj).forEach(([prop, value]) => {
          // Check if this property has an array with 3+ values (multi-keyframe)
          if (Array.isArray(value) && value.length > 2) {
            // Get the transition type for this property
            const propTransition = transitionObj?.[prop] as Record<string, unknown> | undefined;
            const transitionType = propTransition?.type;

            // Spring and inertia don't support 3+ keyframes
            expect(transitionType).not.toBe('spring');
            expect(transitionType).not.toBe('inertia');
          }
        });
      }
    });
  });

  it('should render without Framer Motion errors', () => {
    // GIVEN: Console error spy
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // WHEN: Component renders
    render(
      <LevelEntryOverlay
        levelNumber={5}
        worldNumber={2}
        isVisible={true}
      />
    );

    // THEN: No errors about keyframe constraints
    const keyframeErrors = consoleSpy.mock.calls.filter(
      call => call.some(arg =>
        typeof arg === 'string' &&
        arg.includes('keyframes') &&
        arg.includes('spring')
      )
    );

    expect(keyframeErrors).toHaveLength(0);

    consoleSpy.mockRestore();
  });
});
