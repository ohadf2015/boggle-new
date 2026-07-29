/**
 * Verifies PracticeWheelSandbox maps originIndex (0=center, 1-6=outer)
 * to the convention expected by WordWheelPixiRing (-1=center, 0-5=outer).
 * Without this mapping, connector arcs are drawn 60° clockwise from the
 * actual letter position.
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const pixiRingProps = vi.fn();

// next/dynamic wraps in Suspense + lazy load — bypass to render synchronously in JSDOM
vi.mock('next/dynamic', () => ({
  default: (loader: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>) => {
    let Resolved: React.ComponentType<Record<string, unknown>> | null = null;
    const promise = loader().then((m) => { Resolved = m.default; });
    return function Dynamic(props: Record<string, unknown>) {
      if (!Resolved) throw promise; // triggers Suspense
      return React.createElement(Resolved, props);
    };
  },
}));

vi.mock('@/lib/practice/usePracticeValidator', () => ({
  usePracticeValidator: () => ({ check: vi.fn().mockResolvedValue({ isValid: true }) }),
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));
vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({}),
}));
vi.mock('pixi.js', () => ({
  Application: class {
    canvas = document.createElement('canvas');
    stage = { addChild: vi.fn() };
    ticker = { add: vi.fn() };
    init = vi.fn().mockResolvedValue(undefined);
    destroy = vi.fn();
  },
  Graphics: class {
    circle = vi.fn().mockReturnThis();
    fill = vi.fn().mockReturnThis();
    clear = vi.fn().mockReturnThis();
    moveTo = vi.fn().mockReturnThis();
    lineTo = vi.fn().mockReturnThis();
    stroke = vi.fn().mockReturnThis();
    destroy = vi.fn();
  },
}));
vi.mock('@/components/daily/WordWheelPixiRing', () => ({
  default: (props: { selectedIndices: number[] }) => {
    pixiRingProps(props);
    return <div data-testid="pixi-ring" />;
  },
}));
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
  WordTile: ({ letter, index }: { letter: string; index: number }) => (
    <span data-testid={`tile-${index}`}>{letter}</span>
  ),
}));

import PracticeWheelSandbox from '../PracticeWheelSandbox';

beforeEach(() => {
  pixiRingProps.mockClear();
  window.localStorage.clear();
});

describe('PracticeWheelSandbox — Pixi selectedIndices convention mapping', () => {
  it('passes -1 for center letter (originIndex 0 → Pixi convention -1)', async () => {
    await act(async () => { render(<PracticeWheelSandbox />); });
    const center = document.querySelector('[data-wheel-index="0"]') as HTMLElement;
    await act(async () => { fireEvent.click(center); });
    const calls = pixiRingProps.mock.calls;
    const lastCall = calls[calls.length - 1]?.[0];
    expect(lastCall?.selectedIndices).toContain(-1);
    expect(lastCall?.selectedIndices).not.toContain(0);
  });

  it('passes 0-based outer index for first outer letter (originIndex 1 → Pixi 0)', async () => {
    await act(async () => { render(<PracticeWheelSandbox />); });
    const outer1 = document.querySelector('[data-wheel-index="1"]') as HTMLElement;
    await act(async () => { fireEvent.click(outer1); });
    const calls = pixiRingProps.mock.calls;
    const lastCall = calls[calls.length - 1]?.[0];
    expect(lastCall?.selectedIndices).toContain(0);
    expect(lastCall?.selectedIndices).not.toContain(1);
  });

  it('maps center + outer correctly together', async () => {
    await act(async () => { render(<PracticeWheelSandbox />); });
    const center = document.querySelector('[data-wheel-index="0"]') as HTMLElement;
    const outer2 = document.querySelector('[data-wheel-index="2"]') as HTMLElement;
    await act(async () => { fireEvent.click(center); });
    await act(async () => { fireEvent.click(outer2); });
    const calls = pixiRingProps.mock.calls;
    const lastCall = calls[calls.length - 1]?.[0];
    expect(lastCall?.selectedIndices).toContain(-1); // center
    expect(lastCall?.selectedIndices).toContain(1);  // outer idx 2 → Pixi 1
    expect(lastCall?.selectedIndices).not.toContain(0);
    expect(lastCall?.selectedIndices).not.toContain(2);
  });
});
