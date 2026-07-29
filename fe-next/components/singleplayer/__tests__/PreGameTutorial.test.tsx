/**
 * PreGameTutorial Tests
 *
 * Tests for the 3-step mascot-guided pre-game tutorial
 * TDD: Written FIRST (RED phase), then implementation (GREEN phase)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => {
  const React = require('react');
  const motion = new Proxy({}, {
    get: (_target: unknown, prop: string) => {
      const MotionComponent = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
        const { children, initial, animate, exit, transition, variants, whileHover, whileTap, ...rest } = props;
        return React.createElement(prop, { ...rest, ref }, children);
      });
      MotionComponent.displayName = `m.${prop}`;
      return MotionComponent;
    },
  });
  return {
    motion,
    m: motion,
    LazyMotion: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    domAnimation: {},
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

// Mock LanguageContext
vi.mock('@/components/boosts/BoostButton', () => ({ BoostButton: () => null }));
vi.mock('@/components/boosts/BoostPicker', () => ({ BoostPicker: () => null }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock Mascot components
vi.mock('@/components/ui/Mascot', () => ({
  Mascot: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-${variant}`} />
  ),
  MascotWithEntrance: ({ variant }: { variant: string }) => (
    <div data-testid={`mascot-entrance-${variant}`} />
  ),
}));

// Mock MiniGrid
const mockOnDemoComplete = vi.fn();
vi.mock('@/components/onboarding/MiniGrid', () => {
  return { default: function MockMiniGrid({ onDemoComplete }: { onDemoComplete: () => void }) {
    mockOnDemoComplete.mockImplementation(onDemoComplete);
    return <div data-testid="mini-grid" onClick={onDemoComplete} />;
  } };
});

// Mock AvatarBuilderModal
vi.mock('@/components/avatar/AvatarBuilderModal', () => {
  const MockAvatarBuilderModal = ({ isOpen }: { isOpen: boolean }) => {
    return isOpen ? <div data-testid="avatar-builder-modal" /> : null;
  };
  return { default: MockAvatarBuilderModal };
});

// Mock useDevicePerformance (used by Mascot)
vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: false,
    enableComplexAnimations: true,
    tier: 'high',
  }),
}));

import PreGameTutorial from '../PreGameTutorial';

describe('PreGameTutorial', () => {
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // GIVEN: PreGameTutorial renders
  // WHEN: Initial render
  // THEN: Shows step 1 (welcome) with mascot
  it('renders step 1 (welcome) with mascot and speech bubble', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} />);

    // Should show the welcome mascot
    expect(screen.getByTestId('mascot-entrance-happy')).toBeInTheDocument();

    // Should show welcome text (translation keys)
    expect(screen.getByText('preGameTutorial.welcome.title')).toBeInTheDocument();
    expect(screen.getByText('preGameTutorial.welcome.subtitle')).toBeInTheDocument();

    // Should show Next button
    expect(screen.getByText('preGameTutorial.next')).toBeInTheDocument();
  });

  // GIVEN: User is on step 1
  // WHEN: Click "Next" button
  // THEN: Advances to step 2 (practice)
  it('"Next" button advances to step 2 (practice)', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} />);

    fireEvent.click(screen.getByText('preGameTutorial.next'));

    // Should show practice instruction
    expect(screen.getByText('preGameTutorial.practice.instruction')).toBeInTheDocument();

    // Should show MiniGrid
    expect(screen.getByTestId('mini-grid')).toBeInTheDocument();

    // Should show gaming mascot
    expect(screen.getByTestId('mascot-gaming')).toBeInTheDocument();
  });

  // GIVEN: User is on any step
  // WHEN: Click "Skip" button
  // THEN: Calls onComplete
  it('"Skip" button calls onComplete', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} />);

    fireEvent.click(screen.getByText('preGameTutorial.skip'));

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  // GIVEN: User is on step 2 (practice)
  // WHEN: MiniGrid demo completes
  // THEN: Auto-advances to step 3
  it('MiniGrid demo completion advances to step 3', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} />);

    // Advance to step 2
    fireEvent.click(screen.getByText('preGameTutorial.next'));

    // Simulate demo completion
    fireEvent.click(screen.getByTestId('mini-grid'));

    // Should show tips (step 3)
    expect(screen.getByText('preGameTutorial.tips.title')).toBeInTheDocument();
    expect(screen.getByText('preGameTutorial.letsPlay')).toBeInTheDocument();
  });

  // GIVEN: User is on step 3 (tips)
  // WHEN: Click "Let's Play!" button
  // THEN: Calls onComplete
  it('"Let\'s Play!" button on step 3 calls onComplete', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} />);

    // Advance to step 2, then step 3
    fireEvent.click(screen.getByText('preGameTutorial.next'));
    fireEvent.click(screen.getByTestId('mini-grid')); // demo complete -> step 3

    fireEvent.click(screen.getByText('preGameTutorial.letsPlay'));

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  // GIVEN: PreGameTutorial renders at various steps
  // WHEN: Checking progress dots
  // THEN: All 3 dots are present
  it('progress dots are rendered for all steps', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} />);

    const dots = screen.getAllByTestId(/^progress-dot-/);
    expect(dots).toHaveLength(3);

    // Dots use framer-motion animate for styling (not CSS classes),
    // so we verify they exist and are associated with each step index
    expect(screen.getByTestId('progress-dot-0')).toBeInTheDocument();
    expect(screen.getByTestId('progress-dot-1')).toBeInTheDocument();
    expect(screen.getByTestId('progress-dot-2')).toBeInTheDocument();
  });

  // GIVEN: All text in PreGameTutorial
  // WHEN: Checking for hardcoded strings
  // THEN: All text uses t() translation keys
  it('all text uses translation keys (no hardcoded strings)', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} />);

    // Welcome step should use translation keys
    const welcomeTitle = screen.getByText('preGameTutorial.welcome.title');
    expect(welcomeTitle).toBeInTheDocument();

    // Skip button should use translation key
    const skipButton = screen.getByText('preGameTutorial.skip');
    expect(skipButton).toBeInTheDocument();

    // Next button should use translation key
    const nextButton = screen.getByText('preGameTutorial.next');
    expect(nextButton).toBeInTheDocument();
  });

  // GIVEN: User is on step 2 (practice) and hasn't done demo
  // WHEN: Click forward nav arrow manually
  // THEN: Can still advance to step 3
  it('allows manual forward navigation on step 2 even without demo completion', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} />);

    // Advance to step 2
    fireEvent.click(screen.getByText('preGameTutorial.next'));

    // Click the forward nav arrow (bottom navigation)
    const dots = screen.getAllByTestId(/^progress-dot-/);
    // Click on dot 2 (step 3) to navigate forward
    fireEvent.click(dots[2]);

    // Should be on step 3
    expect(screen.getByText('preGameTutorial.tips.title')).toBeInTheDocument();
  });

  // GIVEN: User is on step 2
  // WHEN: Click back nav arrow
  // THEN: Returns to step 1
  it('back navigation returns to previous step', () => {
    render(<PreGameTutorial onComplete={mockOnComplete} />);

    // Advance to step 2
    fireEvent.click(screen.getByText('preGameTutorial.next'));
    expect(screen.getByTestId('mini-grid')).toBeInTheDocument();

    // Click back via progress dot 0
    const dots = screen.getAllByTestId(/^progress-dot-/);
    fireEvent.click(dots[0]);

    // Should be back on step 1
    expect(screen.getByText('preGameTutorial.welcome.title')).toBeInTheDocument();
  });
});
