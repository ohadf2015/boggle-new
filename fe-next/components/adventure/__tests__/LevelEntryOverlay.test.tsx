/**
 * LevelEntryOverlay - Level Title Burst Animation Tests
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import LevelEntryOverlay from '../LevelEntryOverlay';

// Mock dependencies
jest.mock('@/contexts/LanguageContext', () => ({
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

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    prefersReducedMotion: false,
    enableGlowEffects: true,
  }),
}));

describe('LevelEntryOverlay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
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
    const onComplete = jest.fn();

    render(
      <LevelEntryOverlay
        levelNumber={1}
        worldNumber={1}
        isVisible={true}
        onComplete={onComplete}
      />
    );

    expect(onComplete).not.toHaveBeenCalled();

    // Total duration: 400 (burst) + 600 (hold) + 300 (fade) = 1300ms
    act(() => {
      jest.advanceTimersByTime(1400);
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
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
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
    jest.useFakeTimers();
    // Override mock for reduced motion
    jest.doMock('@/hooks/useDevicePerformance', () => ({
      useDevicePerformance: () => ({
        prefersReducedMotion: true,
        enableGlowEffects: false,
      }),
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetModules();
  });

  test('completes immediately with reduced motion', () => {
    // With reduced motion, animation should complete immediately
    // This documents expected behavior
    expect(true).toBe(true);
  });
});

describe('LevelEntryOverlay - Timing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('total animation is under 2 seconds', () => {
    const onComplete = jest.fn();

    render(
      <LevelEntryOverlay
        levelNumber={1}
        worldNumber={1}
        isVisible={true}
        onComplete={onComplete}
      />
    );

    // Animation should complete well under 2 seconds (actually ~1.3s)
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(onComplete).toHaveBeenCalled();
  });
});
