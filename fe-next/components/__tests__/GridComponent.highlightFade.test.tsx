/**
 * Test for highlighted path (hint/clue trail) animation and fade-out behavior
 * Ensures that when a hint is shown, it blinks/animates and then fades out
 * instead of staying static on the board
 */

import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GridComponent, { HighlightedCell } from '../GridComponent';
import type { LetterGrid } from '@/types';

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => {
  const passthrough = ({ children, animate, initial, ...props }: any) => <div {...props}>{children}</div>;
  return {
    m: { div: passthrough },
    m: { div: passthrough },
    AnimatePresence: ({ children }: any) => <>{children}</>,
    LazyMotion: ({ children }: any) => <>{children}</>,
    domAnimation: {},
    domMax: {},
    useAnimation: () => ({ start: vi.fn(), set: vi.fn(), stop: vi.fn() }),
  };
});

// Mock hooks
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
  }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
  useLanguageSafe: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/hooks/useMediaQuery', () => ({
  useIsDesktop: () => true,
}));

vi.mock('@/contexts/AccessibilityContext', () => ({
  useSuppressTimerUrgency: () => false,
  useDisableFireRoundLights: () => false,
  useDisableEarthquakeEffects: () => false,
  useLargeLetters: () => false,
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    prefersReducedMotion: false,
    enableGlowEffects: true,
    enableComplexAnimations: true,
  }),
}));

vi.mock('@/hooks/useEarthquakeAnimation', () => ({
  useEarthquakeAnimation: () => ({
    earthquakePhase: 'idle',
    earthquakeParticles: [],
    earthquakeDust: [],
    showCracks: false,
    dustPhase: 'idle',
    getShakeOffset: () => ({ x: 0, y: 0, rotate: 0, scale: 1, delay: 0 }),
    getPhaseAnimation: {
      rumble: { animate: {}, transition: {} },
      quake: { animate: {}, transition: {} },
      settle: { animate: {}, transition: {} },
    },
    useEnhancedMode: false,
  }),
}));

describe('GridComponent - Highlighted Path Animation and Fade-out', () => {
  const mockGrid: LetterGrid = [
    ['A', 'B', 'C', 'D'],
    ['E', 'F', 'G', 'H'],
    ['I', 'J', 'K', 'L'],
    ['M', 'N', 'O', 'P'],
  ];

  const highlightedPath: HighlightedCell[] = [
    { row: 0, col: 0 }, // A
    { row: 0, col: 1 }, // B
    { row: 1, col: 1 }, // F
  ];

  it('should apply animation class to highlighted cells when path is provided', () => {
    const { container } = render(
      <GridComponent
        grid={mockGrid}
        interactive={false}
        highlightedPath={highlightedPath}
      />
    );

    // Find cells at the highlighted positions
    const cellA = container.querySelector('[data-row="0"][data-col="0"]');
    const cellB = container.querySelector('[data-row="0"][data-col="1"]');
    const cellF = container.querySelector('[data-row="1"][data-col="1"]');
    const cellG = container.querySelector('[data-row="1"][data-col="2"]'); // Not highlighted

    // Highlighted cells should have animation class
    expect(cellA).toHaveClass('animate-hint-blink');
    expect(cellB).toHaveClass('animate-hint-blink');
    expect(cellF).toHaveClass('animate-hint-blink');

    // Non-highlighted cell should not have animation class
    expect(cellG).not.toHaveClass('animate-hint-blink');
  });

  it('should apply fade-out class after blink animation completes', async () => {
    vi.useFakeTimers();

    const { container } = render(
      <GridComponent
        grid={mockGrid}
        interactive={false}
        highlightedPath={highlightedPath}
      />
    );

    const cellA = container.querySelector('[data-row="0"][data-col="0"]');

    // Initially should have blink animation
    expect(cellA).toHaveClass('animate-hint-blink');

    // After 1.5 seconds (blink duration), should transition to fade-out
    vi.advanceTimersByTime(1500);

    await waitFor(() => {
      expect(cellA).not.toHaveClass('animate-hint-blink');
      expect(cellA).toHaveClass('animate-hint-fadeout');
    });

    vi.useRealTimers();
  });

  it('should maintain hint glow effect during blink animation', () => {
    const { container } = render(
      <GridComponent
        grid={mockGrid}
        interactive={false}
        highlightedPath={highlightedPath}
      />
    );

    const cellA = container.querySelector('[data-row="0"][data-col="0"]');

    // Should have the lime background and glow effect
    expect(cellA).toHaveClass('bg-neo-lime');
    expect(cellA?.className).toMatch(/shadow-\[0_0_12px/); // Glow shadow
  });

  it('should handle empty highlighted path without errors', () => {
    const { container } = render(
      <GridComponent
        grid={mockGrid}
        interactive={false}
        highlightedPath={[]}
      />
    );

    // All cells should be in normal state
    const cells = container.querySelectorAll('[data-row]');
    cells.forEach(cell => {
      expect(cell).not.toHaveClass('animate-hint-blink');
      expect(cell).not.toHaveClass('bg-neo-lime');
    });
  });

  it('should work correctly across different game modes (single-player, survival, drills)', () => {
    // This test verifies that the animation behavior is consistent
    // regardless of which game mode passes the highlightedPath prop

    const modes = [
      { name: 'single-player', path: highlightedPath },
      { name: 'survival', path: [{ row: 1, col: 1 }, { row: 1, col: 2 }] },
      { name: 'drills', path: [{ row: 2, col: 0 }] },
    ];

    modes.forEach(mode => {
      const { container, unmount } = render(
        <GridComponent
          grid={mockGrid}
          interactive={false}
          highlightedPath={mode.path}
        />
      );

      mode.path.forEach(cell => {
        const element = container.querySelector(`[data-row="${cell.row}"][data-col="${cell.col}"]`);
        expect(element).toHaveClass('animate-hint-blink');
      });

      unmount();
    });
  });
});
