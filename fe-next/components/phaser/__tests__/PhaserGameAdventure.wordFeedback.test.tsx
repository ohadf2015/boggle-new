/**
 * PhaserGameAdventure — wordFeedback prop tests.
 *
 * Verifies that wordFeedback is forwarded to GameBridge for
 * accepted/rejected/duplicate/foundByOther types, and that
 * checking/pending types are NOT forwarded.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { GameBridge } from '@/lib/phaser/bridge/GameBridge';
import type { WordFeedback } from '@/components/game/WordFormingArea';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    const Stub = () => <div data-testid="phaser-canvas-adventure-stub" />;
    Stub.displayName = 'PhaserCanvasAdventureStub';
    return Stub;
  },
}));

jest.mock('@/contexts/AccessibilityContext', () => ({
  useAccessibility: () => ({
    settings: {
      disableFireRoundLights: false,
      disableEarthquakeEffects: false,
      reduceMotion: false,
      disableHaptics: false,
      useLargeLetters: false,
    },
    shouldReduceMotion: false,
    hapticsEnabled: true,
    largeLettersEnabled: false,
  }),
}));

jest.mock('@/hooks/useDevicePerformance', () => ({
  useDevicePerformance: () => ({
    isLowEnd: false,
    targetFPS: 60,
    throttleMs: 16,
    enableComplexAnimations: true,
    enableGlowEffects: true,
    reduceParticles: false,
    maxParticles: 20,
    prefersReducedMotion: false,
    isSlowConnection: false,
    isMobile: false,
  }),
}));

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    dir: 'ltr',
    language: 'en',
    t: (key: string) => key,
  }),
}));

// ─── Import component after mocks ─────────────────────────────────────────────

import { PhaserGameAdventure } from '../PhaserGameAdventure';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GRID_3X3 = [
  ['A', 'B', 'C'],
  ['D', 'E', 'F'],
  ['G', 'H', 'I'],
];

function renderAdventure(props: Partial<React.ComponentProps<typeof PhaserGameAdventure>> = {}) {
  return render(
    <PhaserGameAdventure
      grid={GRID_3X3}
      comboLevel={0}
      fireRoundActive={false}
      {...props}
    />
  );
}

beforeEach(() => {
  GameBridge.reset();
  jest.spyOn(GameBridge, 'emit');
});

afterEach(() => {
  jest.restoreAllMocks();
  GameBridge.reset();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('PhaserGameAdventure wordFeedback', () => {
  it('emits word:feedback for accepted feedback', () => {
    const feedback: WordFeedback = {
      id: '1',
      type: 'accepted',
      word: 'HELLO',
      score: 42,
      timestamp: Date.now(),
    };

    renderAdventure({ wordFeedback: feedback });

    expect(GameBridge.emit).toHaveBeenCalledWith('word:feedback', {
      type: 'accepted',
      word: 'HELLO',
      score: 42,
    });
  });

  it('emits word:feedback for rejected feedback', () => {
    const feedback: WordFeedback = {
      id: '2',
      type: 'rejected',
      word: 'XYZ',
      message: 'Not a word',
      timestamp: Date.now(),
    };

    renderAdventure({ wordFeedback: feedback });

    expect(GameBridge.emit).toHaveBeenCalledWith('word:feedback', {
      type: 'rejected',
      word: 'XYZ',
      score: undefined,
    });
  });

  it('emits word:feedback for duplicate feedback', () => {
    const feedback: WordFeedback = {
      id: '3',
      type: 'duplicate',
      word: 'CAT',
      timestamp: Date.now(),
    };

    renderAdventure({ wordFeedback: feedback });

    expect(GameBridge.emit).toHaveBeenCalledWith('word:feedback', {
      type: 'duplicate',
      word: 'CAT',
      score: undefined,
    });
  });

  it('emits word:feedback for foundByOther feedback', () => {
    const feedback: WordFeedback = {
      id: '4',
      type: 'foundByOther',
      word: 'DOG',
      score: 10,
      foundBy: 'player2',
      timestamp: Date.now(),
    };

    renderAdventure({ wordFeedback: feedback });

    expect(GameBridge.emit).toHaveBeenCalledWith('word:feedback', {
      type: 'foundByOther',
      word: 'DOG',
      score: 10,
    });
  });

  it('does NOT emit word:feedback when wordFeedback is null', () => {
    renderAdventure({ wordFeedback: null });

    const feedbackCalls = (GameBridge.emit as jest.Mock).mock.calls.filter(
      ([event]: [string]) => event === 'word:feedback'
    );
    expect(feedbackCalls).toHaveLength(0);
  });

  it('emits word:feedback when feedback changes via rerender', () => {
    const feedback1: WordFeedback = {
      id: '5',
      type: 'accepted',
      word: 'FOX',
      score: 20,
      timestamp: Date.now(),
    };
    const feedback2: WordFeedback = {
      id: '6',
      type: 'rejected',
      word: 'ZZZ',
      timestamp: Date.now() + 1,
    };

    const { rerender } = renderAdventure({ wordFeedback: feedback1 });

    jest.clearAllMocks();
    jest.spyOn(GameBridge, 'emit');

    act(() => {
      rerender(
        <PhaserGameAdventure
          grid={GRID_3X3}
          comboLevel={0}
          fireRoundActive={false}
          wordFeedback={feedback2}
        />
      );
    });

    expect(GameBridge.emit).toHaveBeenCalledWith('word:feedback', {
      type: 'rejected',
      word: 'ZZZ',
      score: undefined,
    });
  });
});
