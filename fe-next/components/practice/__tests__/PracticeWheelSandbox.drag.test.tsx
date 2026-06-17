/**
 * PracticeWheelSandbox drag-spell parity test — mirrors real WordWheelGame
 * pointer drag flow. Verifies that dragging across letters builds the word
 * and a drag-release with ≥3 letters auto-submits.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const validatorCheck = vi.fn();
vi.mock('@/lib/practice/usePracticeValidator', () => ({
  usePracticeValidator: () => ({ check: validatorCheck }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
// useSoundEffects() destructured by WordWheelGame — a bare {} makes every
// sound function undefined → crash. Proxy yields a no-op for any key.
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => new Proxy({}, { get: () => () => {} }),
}));
vi.mock('@/contexts/NavigationContext', () => ({
  useHideNavigation: () => () => {},
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
// next/dynamic wraps in Suspense + lazy load — bypass to render synchronously
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>) => {
    let Resolved: React.ComponentType<Record<string, unknown>> | null = null;
    const promise = loader().then((m) => { Resolved = m.default; });
    return function Dynamic(props: Record<string, unknown>) {
      if (!Resolved) throw promise;
      return React.createElement(Resolved, props);
    };
  },
}));
vi.mock('@/components/daily/WordWheelPixiRing', () => ({
  default: () => <div data-testid="pixi-ring" />,
}));
// Mock WheelLetter as a plain button so document.elementFromPoint can
// return real DOM nodes with data-wheel-letter / data-wheel-index attributes.
vi.mock('@/components/daily/WordWheelParts', () => ({
  WheelLetter: ({
    letter, index, onPress,
  }: { letter: string; index: number; onPress?: (l: string, i: number, el: HTMLButtonElement) => void }) => (
    <button
      type="button"
      data-wheel-index={index}
      data-wheel-letter={letter}
      data-wheel-used="false"
      onClick={(e) => onPress?.(letter, index, e.currentTarget as HTMLButtonElement)}
    >
      {letter}
    </button>
  ),
  WordTile: ({ letter }: { letter: string }) => <span>{letter}</span>,
}));
vi.mock('pixi.js', () => ({
  Application: class {
    canvas = document.createElement('canvas');
    screen = { width: 320, height: 240 };
    stage = { addChild: vi.fn(), removeChild: vi.fn(), removeChildren: vi.fn() };
    ticker = { add: vi.fn(), remove: vi.fn() };
    init = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
  },
  Graphics: class {
    x = 0;
    y = 0;
    alpha = 1;
    scale = { set: vi.fn() };
    circle = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    clear = vi.fn().mockReturnThis();
    moveTo = vi.fn().mockReturnThis();
    lineTo = vi.fn().mockReturnThis();
    stroke = vi.fn().mockReturnThis();
    destroy = vi.fn();
  },
}));

import PracticeWheelSandbox from '../PracticeWheelSandbox';

beforeEach(() => {
  validatorCheck.mockReset();
  validatorCheck.mockResolvedValue({ isValid: true, source: 'dictionary' });
  window.localStorage.clear();
});

/**
 * Mock document.elementFromPoint so drag hit-test can resolve. Maps a
 * sequence of (x, y) to the wheel-letter button at that position. Real
 * positions don't matter — we just return the requested button by index.
 */
const mockElementFromPoint = (indexSequence: number[]) => {
  let i = 0;
  vi.spyOn(document, 'elementFromPoint').mockImplementation(() => {
    const idx = indexSequence[Math.min(i, indexSequence.length - 1)];
    i += 1;
    return document.querySelector(`[data-wheel-index="${idx}"]`) as Element;
  });
};

describe('PracticeWheelSandbox drag-spell parity', () => {
  it('drag across 3 outer letters then release auto-submits', async () => {
    await act(async () => { render(<PracticeWheelSandbox />); });
    const wheel = screen.getByTestId('wheel-orbit');
    // Sequence: pointerdown@idx 1 (outer), pointermove@idx 0 (different outer →
    // engages drag, adds idx 1 then idx 0), pointermove@idx 2 (adds idx 2),
    // pointerup → auto-submit (3 letters, ≥3 required → submit fires).
    mockElementFromPoint([1, 0, 2]);
    fireEvent.pointerDown(wheel, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(wheel, { clientX: 20, clientY: 10 });
    fireEvent.pointerMove(wheel, { clientX: 30, clientY: 10 });
    fireEvent.pointerUp(wheel, { clientX: 30, clientY: 10 });
    await waitFor(() => {
      expect(validatorCheck).toHaveBeenCalled();
    });
  });

  it('single tap on a letter does NOT engage drag (drag requires move to a different letter)', async () => {
    await act(async () => { render(<PracticeWheelSandbox />); });
    const wheel = screen.getByTestId('wheel-orbit');
    mockElementFromPoint([1, 1, 1]); // pointer never moves to a different letter
    fireEvent.pointerDown(wheel, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(wheel, { clientX: 11, clientY: 10 });
    fireEvent.pointerUp(wheel, { clientX: 11, clientY: 10 });
    // Drag never engaged → no auto-submit + validator untouched.
    await new Promise((r) => setTimeout(r, 50));
    expect(validatorCheck).not.toHaveBeenCalled();
  });
});
