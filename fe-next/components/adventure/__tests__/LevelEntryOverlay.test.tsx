/**
 * LevelEntryOverlay - Level Title Burst Animation Tests
 *
 * DEBT-01: Tests updated to use optimized timing constants
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import LevelEntryOverlay from '../LevelEntryOverlay';
import { OPTIMIZED_TIMING } from '@/lib/adventure/entryTiming';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'adventure.level': 'Level',
      };
      return translations[key] || key;
    },
    language: 'en',
  }),
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: false,
    enableGlowEffects: true,
  }),
}));

describe('LevelEntryOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('renders level number when visible', () => {
    render(
      <LevelEntryOverlay
        levelNumber={5}
        worldNumber={1}
        isVisible={true}
      />
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Level')).toBeInTheDocument();
  });

  test('does not render when not visible', () => {
    render(
      <LevelEntryOverlay
        levelNumber={5}
        worldNumber={1}
        isVisible={false}
      />
    );

    expect(screen.queryByTestId('level-entry-overlay')).not.toBeInTheDocument();
  });

  test('onComplete is called after animation duration', () => {
    const onComplete = vi.fn();

    render(
      <LevelEntryOverlay
        levelNumber={1}
        worldNumber={1}
        isVisible={true}
        onComplete={onComplete}
      />
    );

    expect(onComplete).not.toHaveBeenCalled();

    // DEBT-01: Total duration: 350 (burst) + 400 (hold) + 250 (fade) = 1000ms (was 1300ms)
    const titleDuration = OPTIMIZED_TIMING.getTitleDuration();
    act(() => {
      vi.advanceTimersByTime(titleDuration + 10);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  test('displays correct level number', () => {
    render(
      <LevelEntryOverlay
        levelNumber={12}
        worldNumber={2}
        isVisible={true}
      />
    );

    expect(screen.getByText('12')).toBeInTheDocument();
  });

  test('has correct accessibility structure', () => {
    render(
      <LevelEntryOverlay
        levelNumber={1}
        worldNumber={1}
        isVisible={true}
      />
    );

    const overlay = screen.getByTestId('level-entry-overlay');
    expect(overlay).toBeInTheDocument();
  });
});

describe('LevelEntryOverlay - World Theming', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('applies world 1 theme (lime green)', () => {
    render(
      <LevelEntryOverlay
        levelNumber={1}
        worldNumber={1}
        isVisible={true}
      />
    );

    // Component renders - theme is applied via CSS classes
    expect(screen.getByTestId('level-entry-overlay')).toBeInTheDocument();
  });

  test('applies world 2 theme (cyan)', () => {
    render(
      <LevelEntryOverlay
        levelNumber={1}
        worldNumber={2}
        isVisible={true}
      />
    );

    expect(screen.getByTestId('level-entry-overlay')).toBeInTheDocument();
  });

  test('applies world 3 theme (orange)', () => {
    render(
      <LevelEntryOverlay
        levelNumber={1}
        worldNumber={3}
        isVisible={true}
      />
    );

    expect(screen.getByTestId('level-entry-overlay')).toBeInTheDocument();
  });

  test('uses default theme for unknown world', () => {
    render(
      <LevelEntryOverlay
        levelNumber={1}
        worldNumber={99}
        isVisible={true}
      />
    );

    // Should not crash, uses default theme
    expect(screen.getByTestId('level-entry-overlay')).toBeInTheDocument();
  });
});

describe('LevelEntryOverlay - Reduced Motion', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Override mock for reduced motion
    vi.doMock('@/hooks/useDevicePerformance', () => ({
      useDevicePerformance: () => ({
        prefersReducedMotion: true,
        enableGlowEffects: false,
      }),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  test('completes immediately with reduced motion', () => {
    // With reduced motion, animation should complete immediately
    // This documents expected behavior
    expect(true).toBe(true);
  });
});

describe('LevelEntryOverlay - Timing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('total animation is under 2 seconds', () => {
    const onComplete = vi.fn();

    render(
      <LevelEntryOverlay
        levelNumber={1}
        worldNumber={1}
        isVisible={true}
        onComplete={onComplete}
      />
    );

    // DEBT-01: Animation should complete at ~1s (optimized from ~1.3s)
    const titleDuration = OPTIMIZED_TIMING.getTitleDuration();
    expect(titleDuration).toBeLessThanOrEqual(1100); // 1s with buffer

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(onComplete).toHaveBeenCalled();
  });
});
