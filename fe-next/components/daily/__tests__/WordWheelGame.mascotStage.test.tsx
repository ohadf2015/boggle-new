import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/utils/growthTracking', () => ({
  trackGameStart: vi.fn(),
  trackGameEnd: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('@/contexts/SoundEffectsContext', () => ({
  useSoundEffects: () => ({
    playTileSelectSound: vi.fn(),
    playWordAcceptedSound: vi.fn(),
    playWordRejectedSound: vi.fn(),
    playComboSound: vi.fn(),
    playLegendaryWordSound: vi.fn(),
    playEpicVictorySound: vi.fn(),
    playCountdownBeep: vi.fn(),
    playBoardShuffleSound: vi.fn(),
    playButtonClickSound: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWordWheelKeyboard', () => ({
  useWordWheelKeyboard: () => ({ keyboardFocused: false }),
}));

vi.mock('../WordWheelPixiRing', () => ({
  __esModule: true,
  default: () => <div data-testid="pixi-ring-stub" />,
}));

vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => () => <div data-testid="dynamic-stub" />,
}));

vi.mock('@/utils/dailyChallenge/wordWheelGeneration', () => ({
  isValidWordWheelWord: () => true,
}));

vi.mock('@/utils/dailyChallenge/wordWheelScoring', () => ({
  scoreWord: () => 5,
}));

const mascotProps = vi.hoisted(() => ({ current: null as null | Record<string, unknown> }));
vi.mock('@/components/mascot/GameMascotReactions', () => ({
  GameMascotReactions: (props: Record<string, unknown>) => {
    mascotProps.current = props;
    return null;
  },
}));
import WordWheelGame from '../WordWheelGame';
import type { WordWheelPuzzle } from '@/utils/dailyChallenge/wordWheelGeneration';

const puzzle = {
  centerLetter: 'A', outerLetters: ['B', 'C', 'D', 'E', 'F', 'G'], validWords: ['CAB'], language: 'en',
} as unknown as WordWheelPuzzle;

const renderGame = () =>
  render(<WordWheelGame puzzle={puzzle} duration={60} onComplete={vi.fn()} onValidateWord={vi.fn().mockResolvedValue(true)} onEffect={vi.fn()} language="en" />);

const realMatchMedia = window.matchMedia;
function onDesktop(matches: boolean) {
  window.matchMedia = ((q: string) => ({
    matches, media: q, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}
const stages = () => (mascotProps.current?.stages ?? []) as Array<HTMLElement | null>;

beforeEach(() => {
  mascotProps.current = null;
  global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
});
afterEach(() => {
  window.matchMedia = realMatchMedia;
});

describe('Word Wheel mascot stage', () => {
  it('Given a phone, gags get the free band above the word line, clear of the word and the found-words row', () => {
    onDesktop(false);
    renderGame();
    const band = screen.getByTestId('wheel-mascot-stage');
    expect(stages()).toContain(band);
    expect(band.contains(screen.getByTestId('word-builder'))).toBe(false);
    expect(band.contains(screen.getByTestId('found-words-slot'))).toBe(false);
    expect(screen.getByTestId('wheel-cluster').contains(band)).toBe(true);
  });

  it('Given a short phone, the last-resort stage still sits in the wheel cluster, never the HUD strip', () => {
    onDesktop(false);
    renderGame();
    const all = stages().filter(Boolean) as HTMLElement[];
    const last = all[all.length - 1];
    expect(all.indexOf(screen.getByTestId('wheel-mascot-stage'))).toBeLessThan(all.length - 1);
    expect(last.contains(screen.getByTestId('word-builder'))).toBe(true);
    expect(last.contains(screen.getByTestId('wheel-orbit'))).toBe(false);
  });

  it('Given a phone, the band above the word line takes all of the cluster slack, so the space under the actions never grows', () => {
    onDesktop(false);
    renderGame();
    const cluster = screen.getByTestId('wheel-cluster');
    const orbit = screen.getByTestId('wheel-orbit');
    const below = [...cluster.children].slice([...cluster.children].indexOf(orbit) + 1) as HTMLElement[];
    expect(below.length).toBeGreaterThan(0);
    for (const el of below) expect(el.className.split(' ').filter((c) => c.startsWith('flex-['))).toEqual([]);
    expect(stages()[2]?.className).toContain('flex-[1_0_auto]');
  });

  it('Given the desktop shell, gags play in the rail mascot spot first', () => {
    onDesktop(true);
    renderGame();
    expect(stages()[0]).toBe(screen.getByTestId('shell-mascot'));
  });
});
