/**
 * The hand coach has to appear on a board the player has NOT touched yet.
 *
 * That makes it uniquely sensitive to ref timing: `gridRef.current` is null on
 * GridComponent's first render, and populating a ref schedules no re-render, so
 * an overlay that reads `.current` during render never sees the board and
 * silently renders nothing — indistinguishable from "nothing to show" (Class 4
 * in .claude/rules/60-recurring-pitfalls.md). GridConnectorOverlay survives the
 * same pattern only because dragging re-renders it anyway; the coach cannot wait
 * for a drag, because its whole job is to happen first.
 *
 * BoardHandCoach's own unit tests hand it a ready-made element, so they cannot
 * catch this. This one goes through the real component.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GridComponent from '@/components/GridComponent';
import type { LetterGrid } from '@/types';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string, fallback?: string) => fallback ?? key, language: 'en', dir: 'ltr' }),
  useLanguageSafe: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/hooks/useMobileLandscape', () => ({
  useMobileLandscape: () => false,
}));

vi.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    enableComplexAnimations: true,
    prefersReducedMotion: false,
  }),
}));

vi.mock('@/contexts/AccessibilityContext', () => ({
  useSuppressTimerUrgency: () => false,
  useDisableFireRoundLights: () => false,
  useDisableEarthquakeEffects: () => false,
  useLargeLetters: () => false,
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playEarthquakeRumble: vi.fn(),
    playEarthquakeShake: vi.fn(),
  }),
}));

vi.mock('@/hooks/useEarthquakeAnimation', () => ({
  useEarthquakeAnimation: () => ({
    earthquakePhase: 'idle',
    earthquakeParticles: [],
    earthquakeDust: [],
    getShakeOffset: () => ({ x: 0, y: 0, rotate: 0, scale: 1, delay: 0 }),
    getPhaseAnimation: {
      rumble: { animate: {}, transition: {} },
      quake: { animate: {}, transition: {} },
      settle: { animate: {}, transition: {} },
    },
    useEnhancedMode: false,
  }),
}));

const mockGrid: LetterGrid = [
  ['T', 'E', 'S', 'T'],
  ['W', 'O', 'R', 'D'],
  ['H', 'U', 'N', 'T'],
  ['G', 'A', 'M', 'E'],
];

describe('GridComponent — first-play hand coach', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the coach on an untouched board, before any interaction', () => {
    render(<GridComponent grid={mockGrid} interactive showHandCoach />);
    expect(screen.getByTestId('board-hand-coach')).toBeInTheDocument();
  });

  it('stays absent unless the board asks for it', () => {
    render(<GridComponent grid={mockGrid} interactive />);
    expect(screen.queryByTestId('board-hand-coach')).not.toBeInTheDocument();
  });

  it('does not come back on a later game', () => {
    const { unmount } = render(<GridComponent grid={mockGrid} interactive showHandCoach />);
    expect(screen.getByTestId('board-hand-coach')).toBeInTheDocument();
    unmount();

    render(<GridComponent grid={mockGrid} interactive showHandCoach />);
    expect(screen.queryByTestId('board-hand-coach')).not.toBeInTheDocument();
  });
});
